-- RC18: additive customer push outbox, capability-scoped subscriptions and tracking projection.
begin;
alter function get_catalogue_request_status(uuid) rename to get_catalogue_request_status_before_rc18;
revoke all on function get_catalogue_request_status_before_rc18(uuid) from public,anon,authenticated;
create function public.get_catalogue_request_status(p_token uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare base jsonb;extra jsonb;
begin
 base:=get_catalogue_request_status_before_rc18(p_token);
 select jsonb_build_object('request_id',r.id,'accepted',o.id is not null,'customer_name',r.customer_name,'items',r.summary,'customer_notes',r.customer_note,'instructions',r.customer_instructions,'pickup_at',o.pickup_at,'currency',s.currency,
 'total_kind',case when sale.id is not null then 'paid' when o.id is not null then 'accepted_quote' else 'estimate' end,
 'total',coalesce(sale.total,round(o.quoted_subtotal*(1+s.tax_rate),2),(r.submission_snapshot->>'total')::numeric,r.estimated_subtotal),
 'theme',jsonb_build_object('primary',s.theme->>'primary','background',s.theme->>'background','text',s.theme->>'text','appearance',s.theme->>'appearance'),'shop_name',s.name,'pickup_location',s.address,'business_phone',s.phone,'business_email',s.email,'timezone',s.timezone,'logo_url',s.logo_url,
 'catalogue_token',case when cfg.enabled then cfg.access_token end) into extra
 from catalogue_preorder_requests r join shops s on s.id=r.shop_id join customer_display_configs cfg on cfg.id=r.display_config_id
 left join scheduled_customer_orders o on o.id=r.scheduled_order_id and o.shop_id=r.shop_id left join sales sale on sale.id=o.sale_id and sale.shop_id=r.shop_id
 where r.status_token=p_token;
 return base||extra;
end$$;
revoke all on function get_catalogue_request_status(uuid) from public;
grant execute on function get_catalogue_request_status(uuid) to anon,authenticated;

create table public.customer_order_push_devices(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id) on delete cascade,
 request_id uuid not null references catalogue_preorder_requests(id) on delete cascade,
 endpoint text not null,subscription jsonb not null,preferences jsonb not null,updated_at timestamptz not null default now(),unique(request_id,endpoint)
);
create table public.customer_order_notification_events(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id) on delete cascade,
 request_id uuid not null references catalogue_preorder_requests(id) on delete cascade,
 kind text not null check(kind in('accepted','preparing','ready')),created_at timestamptz not null default now(),unique(request_id,kind)
);
create table public.customer_order_push_deliveries(
 event_id uuid not null references customer_order_notification_events(id) on delete cascade,
 device_id uuid not null references customer_order_push_devices(id) on delete cascade,
 state text not null default 'pending' check(state in('pending','sending','sent','failed')),
 attempts int not null default 0,lease_until timestamptz,last_error text,primary key(event_id,device_id)
);
alter table customer_order_push_devices enable row level security;
alter table customer_order_notification_events enable row level security;
alter table customer_order_push_deliveries enable row level security;
revoke all on customer_order_push_devices,customer_order_notification_events,customer_order_push_deliveries from public,anon,authenticated;
create index customer_order_notification_time on customer_order_notification_events(created_at);

create function public.register_customer_order_push(p_token uuid,p_subscription jsonb,p_preferences jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare r catalogue_preorder_requests%rowtype;ep text:=p_subscription->>'endpoint';device uuid;
begin
 select * into r from catalogue_preorder_requests where status_token=p_token for update;
 if not found or exists(select 1 from workspace_recovery where shop_id=r.shop_id and pending_at is not null) then raise exception 'Request unavailable';end if;
 if r.status in('collected','cancelled','declined','no_response') then raise exception 'This order no longer accepts notification subscriptions';end if;
 if jsonb_typeof(p_subscription) is distinct from 'object' or octet_length(p_subscription::text)>6000 or length(coalesce(ep,'')) not between 20 and 2048 or ep !~ '^https://' or ep ~ '[[:space:]@#]' or length(coalesce(p_subscription#>>'{keys,p256dh}','')) not between 40 and 200 or length(coalesce(p_subscription#>>'{keys,auth}','')) not between 16 and 100 then raise exception 'Invalid push subscription';end if;
 if jsonb_typeof(p_preferences) is distinct from 'object' or not p_preferences ?& array['accepted','preparing','ready','language'] or exists(select 1 from jsonb_each(p_preferences) where (key in('accepted','preparing','ready') and jsonb_typeof(value)<>'boolean') or (key='language' and coalesce(value#>>'{}','') not in('en','es','zh-TW','zh-CN')) or key not in('accepted','preparing','ready','language')) then raise exception 'Invalid alert preferences';end if;
 if not exists(select 1 from customer_order_push_devices where request_id=r.id and endpoint=ep) and (select count(*) from customer_order_push_devices where request_id=r.id)>=10 then raise exception 'Device limit reached';end if;
 insert into customer_order_push_devices(shop_id,request_id,endpoint,subscription,preferences) values(r.shop_id,r.id,ep,p_subscription,p_preferences)
 on conflict(request_id,endpoint) do update set subscription=excluded.subscription,preferences=excluded.preferences,updated_at=now() returning id into device;
 -- Registering after a transition may deliver that current milestone once, never stale earlier stages.
 insert into customer_order_push_deliveries(event_id,device_id)
 select e.id,device from customer_order_notification_events e where e.request_id=r.id and e.kind=case when r.status='ready' then 'ready' when r.status='in_production' then 'preparing' when r.scheduled_order_id is not null and r.status in('confirmed','scheduled') then 'accepted' end and (p_preferences->>e.kind)::boolean on conflict do nothing;
 return jsonb_build_object('subscription_id',device,'request_id',r.id);
end$$;
create function public.remove_customer_order_push(p_token uuid,p_endpoint text) returns void language plpgsql security definer set search_path=public as $$
declare request uuid;
begin
 select id into request from catalogue_preorder_requests where status_token=p_token;
 if request is null then raise exception 'Request unavailable';end if;
 delete from customer_order_push_devices where request_id=request and endpoint=p_endpoint;
end$$;
create function public.get_customer_order_push(p_token uuid,p_endpoint text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare request uuid;result jsonb;
begin
 select id into request from catalogue_preorder_requests where status_token=p_token;
 if request is null then raise exception 'Request unavailable';end if;
 select jsonb_build_object('subscription_id',id,'request_id',request_id,'preferences',preferences) into result from customer_order_push_devices where request_id=request and endpoint=p_endpoint;
 return result;
end$$;
create function public.queue_customer_order_update() returns trigger language plpgsql security definer set search_path=public as $$
declare stage text;event uuid;
begin
 if new.status is not distinct from old.status and new.scheduled_order_id is not distinct from old.scheduled_order_id then return new;end if;
 stage:=case when new.status='ready' then 'ready' when new.status='in_production' then 'preparing' when new.scheduled_order_id is not null and new.status in('confirmed','scheduled') then 'accepted' end;
 if stage is null then return new;end if;
 insert into customer_order_notification_events(shop_id,request_id,kind) values(new.shop_id,new.id,stage) on conflict do nothing returning id into event;
 if event is not null then
  insert into customer_order_push_deliveries(event_id,device_id) select event,d.id from customer_order_push_devices d where d.request_id=new.id and d.shop_id=new.shop_id and coalesce((d.preferences->>stage)::boolean,false) on conflict do nothing;
 end if;
 return new;
end$$;
create trigger queue_customer_order_update after update of status,scheduled_order_id on catalogue_preorder_requests for each row execute function queue_customer_order_update();

create function public.lease_customer_order_push() returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 with eligible as(
 select q.event_id,q.device_id from customer_order_push_deliveries q join customer_order_push_devices d on d.id=q.device_id join customer_order_notification_events e on e.id=q.event_id and e.shop_id=d.shop_id and e.request_id=d.request_id join catalogue_preorder_requests r on r.id=e.request_id and r.shop_id=e.shop_id
 where (q.state='pending' or q.state='sending' and q.lease_until<now()) and q.attempts<5 and e.created_at>now()-interval '1 day'
 and e.kind=case when r.status='ready' then 'ready' when r.status='in_production' then 'preparing' when r.scheduled_order_id is not null and r.status in('confirmed','scheduled') then 'accepted' end
 and coalesce((d.preferences->>e.kind)::boolean,false) and not exists(select 1 from workspace_recovery w where w.shop_id=d.shop_id and w.pending_at is not null)
 order by e.created_at limit 50 for update of q skip locked
 ),leased as(update customer_order_push_deliveries q set state='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes' from eligible x where q.event_id=x.event_id and q.device_id=x.device_id returning q.*)
 select coalesce(jsonb_agg(jsonb_build_object('customer',true,'event_id',e.id,'kind',e.kind,'record_id',e.request_id,'device_id',d.id,'attempts',q.attempts,'subscription',d.subscription,'language',d.preferences->>'language','shop_name',s.name,'order_number',r.request_number)),'[]') into result from leased q join customer_order_notification_events e on e.id=q.event_id join customer_order_push_devices d on d.id=q.device_id join shops s on s.id=e.shop_id join catalogue_preorder_requests r on r.id=e.request_id;
 return result;
end$$;
-- Use existing status mutation/audit and stock/payment protections, adding optimistic concurrency.
do $$declare f record;d text;begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in('set_scheduled_order_status','set_preparation_order_status') loop
 d:=pg_get_functiondef(f.oid);execute replace(d,$x$in('admin','cashier','production')$x$,$x$in('admin','manager','cashier','production')$x$);
 end loop;
end$$;
create function public.advance_pickup_order(p_id uuid,p_expected text,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare current_status text;scheduled boolean:=false;
begin
 if coalesce(current_workspace_role(),'') not in('admin','manager','cashier','production') then raise exception 'Production access required';end if;
 select status into current_status from scheduled_customer_orders where id=p_id and shop_id=current_shop_id() for update;
 scheduled:=found;
 if not scheduled then select status into current_status from customer_selection_requests where id=p_id and shop_id=current_shop_id() for update;end if;
 if current_status is null then raise exception 'Request unavailable';end if;
 if current_status=p_status then return;end if;
 if current_status is distinct from case when scheduled and p_expected='received' then 'confirmed' else p_expected end then raise exception 'Request changed; refresh before continuing';end if;
 if scheduled then perform set_scheduled_order_status(p_id,p_status);else perform set_preparation_order_status(p_id,p_status);end if;
end$$;
revoke all on function register_customer_order_push(uuid,jsonb,jsonb),remove_customer_order_push(uuid,text),get_customer_order_push(uuid,text),queue_customer_order_update(),lease_customer_order_push(),advance_pickup_order(uuid,text,text) from public,anon,authenticated;
grant execute on function register_customer_order_push(uuid,jsonb,jsonb),remove_customer_order_push(uuid,text),get_customer_order_push(uuid,text) to anon,authenticated;
grant execute on function advance_pickup_order(uuid,text,text) to authenticated;
grant execute on function lease_customer_order_push() to service_role;
grant select,update,delete on customer_order_push_devices,customer_order_push_deliveries to service_role;
grant select on customer_order_notification_events to service_role;
commit;
