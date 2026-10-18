-- RC11: explicit public contacts and per-device order alerts. No historical records rewritten.
begin;
alter table public.catalogue_preorder_requests add column request_type text not null default 'preorder' check(request_type in('preorder','custom_cake'));
update workspace_backup_tables set columns=array_append(columns,'request_type') where table_name='catalogue_preorder_requests' and not 'request_type'=any(columns);
-- Keep normal request replay payloads byte-equivalent; add metadata only for an explicit cake request.
do $$declare definition text;needle text:=$n$v_payload:=jsonb_build_object('items',clean_items,'name',v_name,'method',v_method,'contact',v_contact,'note',v_note);$n$;begin
 definition:=pg_get_functiondef('public.submit_catalogue_preorder_before_tracking(text,uuid,jsonb,jsonb)'::regprocedure);
 if position(needle in definition)=0 then raise exception 'Request intake definition changed; inspect before upgrade';end if;
 execute replace(definition,needle,needle||$n$ if p_customer->>'request_type'='custom_cake' then v_payload:=v_payload||'{"request_type":"custom_cake"}'::jsonb;end if;$n$);
 definition:=pg_get_functiondef('public.accept_catalogue_preorder(uuid,jsonb)'::regprocedure);
 if position($n$r.id,'preorder',customer,pickup$n$ in definition)=0 then raise exception 'Acceptance definition changed; inspect before upgrade';end if;
 execute replace(definition,$n$r.id,'preorder',customer,pickup$n$,$n$r.id,case when r.request_type='custom_cake' then 'cake' else 'preorder' end,customer,pickup$n$);
end$$;
create function public.classify_order_request() returns trigger language plpgsql set search_path=public as $$begin if new.payload->>'request_type'='custom_cake' then new.request_type:='custom_cake';end if;return new;end$$;
revoke all on function classify_order_request() from public,anon,authenticated;
create trigger classify_order_request before insert on catalogue_preorder_requests for each row execute function classify_order_request();
alter table public.customer_display_configs add column business_contacts jsonb not null default '[]';
create function public.save_business_contacts(p_contacts jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare c jsonb;
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 if jsonb_typeof(p_contacts)<>'array' or jsonb_array_length(p_contacts)>20 then raise exception 'Invalid contacts';end if;
 for c in select value from jsonb_array_elements(p_contacts) loop
  if coalesce(c->>'kind','') not in('whatsapp','phone','sms','email','messenger','line','wechat','other') or length(coalesce(c->>'value',''))>500 or length(coalesce(c->>'label',''))>80 or length(coalesce(c->>'note',''))>250 or length(coalesce(c->>'qr',''))>1000 then raise exception 'Invalid contact';end if;
  if jsonb_typeof(c->'enabled')<>'boolean' or jsonb_typeof(c->'preferred')<>'boolean' or jsonb_typeof(c->'sort')<>'number' then raise exception 'Invalid contact options';end if;
  if coalesce(c->>'qr','')<>'' and c->>'qr' !~ '^https://[^[:space:]<>]+$' then raise exception 'Use an HTTPS QR image';end if;
  if coalesce((c->>'enabled')::boolean,false) and trim(coalesce(c->>'value',''))='' then raise exception 'Enabled contact requires a value';end if;
 end loop;
 perform ensure_customer_display_config();
 update customer_display_configs set business_contacts=p_contacts,updated_at=now() where shop_id=current_shop_id();
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),'shop',current_shop_id(),'business_contacts_update',jsonb_build_object('count',jsonb_array_length(p_contacts)),auth.uid());
end$$;
update workspace_backup_tables set columns=array_append(columns,'business_contacts') where table_name='customer_display_configs' and not 'business_contacts'=any(columns);
alter function public.get_commercial_catalogue(text) rename to get_commercial_catalogue_before_rc11;
revoke all on function public.get_commercial_catalogue_before_rc11(text) from public,anon,authenticated;
create function public.get_commercial_catalogue(p_token text default null) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;contacts jsonb;tenant uuid;
begin
 result:=get_commercial_catalogue_before_rc11(p_token);
 if p_token is null then tenant:=current_shop_id();else select shop_id into tenant from customer_display_configs where access_token=p_token and enabled;end if;
 select coalesce(jsonb_agg(x order by coalesce((x->>'preferred')::boolean,false) desc,coalesce((x->>'sort')::int,0)),'[]') into contacts from customer_display_configs c,jsonb_array_elements(c.business_contacts) x where c.shop_id=tenant and coalesce((x->>'enabled')::boolean,false);
 return result||jsonb_build_object('business_contacts',contacts);
end$$;
create table public.order_alert_events(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id) on delete cascade,
 kind text not null check(kind in('preorder','catalogue','custom_cake')),record_id uuid not null,
 created_at timestamptz not null default now(),unique(kind,record_id)
);
create index order_alert_events_tenant_time on order_alert_events(shop_id,created_at);
create table public.order_push_devices(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,endpoint text not null unique,
 subscription jsonb not null,preferences jsonb not null default '{}',updated_at timestamptz not null default now()
);
create table public.order_push_deliveries(
 event_id uuid not null references order_alert_events(id) on delete cascade,device_id uuid not null references order_push_devices(id) on delete cascade,
 state text not null default 'pending' check(state in('pending','sending','sent','failed')),attempts int not null default 0,
 lease_until timestamptz,last_error text,primary key(event_id,device_id)
);
alter table order_alert_events enable row level security;
alter table order_push_devices enable row level security;
alter table order_push_deliveries enable row level security;
revoke all on order_alert_events,order_push_devices,order_push_deliveries from anon,authenticated;
create function public.register_order_push(p_subscription jsonb,p_preferences jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare device uuid;ep text:=p_subscription->>'endpoint';
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 if length(coalesce(ep,'')) not between 20 and 2048 or ep !~ '^https://' or ep ~ '[[:space:]@#]' or length(coalesce(p_subscription#>>'{keys,p256dh}','')) not between 40 and 200 or length(coalesce(p_subscription#>>'{keys,auth}','')) not between 16 and 100 then raise exception 'Invalid push subscription';end if;
 if jsonb_typeof(p_preferences)<>'object' then raise exception 'Invalid preferences';end if;
 if exists(select 1 from jsonb_each(p_preferences) where (key<>'language' and (key not in('preorder','catalogue','sound','repeat','desktop','mobile','badge','push') or jsonb_typeof(value)<>'boolean')) or (key='language' and coalesce(value#>>'{}','') not in('en','es','zh-TW','zh-CN'))) then raise exception 'Invalid preferences';end if;
 if not exists(select 1 from order_push_devices where endpoint=ep) and (select count(*) from order_push_devices where user_id=auth.uid())>=20 then raise exception 'Device limit reached';end if;
 if exists(select 1 from order_push_devices where endpoint=ep and user_id<>auth.uid()) then raise exception 'Unregister the previous account on this device first';end if;
 insert into order_push_devices(shop_id,user_id,endpoint,subscription,preferences) values(current_shop_id(),auth.uid(),ep,p_subscription,p_preferences)
 on conflict(endpoint) do update set shop_id=excluded.shop_id,subscription=excluded.subscription,preferences=excluded.preferences,updated_at=now() returning id into device;
 return device;
end$$;
create function public.unregister_order_push(p_endpoint text) returns void language sql security definer set search_path=public as $$delete from order_push_devices where endpoint=p_endpoint and user_id=auth.uid()$$;
create function public.get_order_alerts(p_since timestamptz,p_after uuid default '00000000-0000-0000-0000-000000000000') returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 if p_since is null then return jsonb_build_object('events','[]'::jsonb,'since',clock_timestamp());end if;
 return jsonb_build_object('events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from (select id,kind,record_id,created_at from order_alert_events where shop_id=current_shop_id() and created_at>now()-interval '1 day' and (created_at,id)>(p_since,p_after) order by created_at,id limit 100)e),'[]'),'since',p_since);
end$$;
create function public.queue_order_alert() returns trigger language plpgsql security definer set search_path=public as $$
declare k text;event uuid;
begin
 k:=case when tg_table_name='customer_selection_requests' then 'catalogue' when to_jsonb(new)->>'request_type'='custom_cake' or to_jsonb(new)#>>'{payload,request_type}'='custom_cake' or to_jsonb(new)#>>'{payload,type}'='custom_cake' then 'custom_cake' else 'preorder' end;
 insert into order_alert_events(shop_id,kind,record_id) values(new.shop_id,k,new.id) on conflict do nothing returning id into event;
 if event is not null then
 insert into order_push_deliveries(event_id,device_id) select event,d.id from order_push_devices d where d.shop_id=new.shop_id and coalesce((d.preferences->>case when k='catalogue' then 'catalogue' else 'preorder' end)::boolean,true) and coalesce((d.preferences->>'push')::boolean,true) on conflict do nothing;
 end if;
 return new;
end$$;
create trigger catalogue_order_alert after insert on customer_selection_requests for each row execute function queue_order_alert();
create trigger preorder_order_alert after insert on catalogue_preorder_requests for each row execute function queue_order_alert();
-- Only the server's service role may lease dispatch work. Recheck current staff authorization at send time.
create function public.lease_order_push() returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 with eligible as (
 select q.event_id,q.device_id from order_push_deliveries q join order_push_devices d on d.id=q.device_id join staff_profiles s on s.user_id=d.user_id and s.shop_id=d.shop_id join order_alert_events e on e.id=q.event_id
 where (q.state='pending' or q.state='sending' and q.lease_until<now()) and q.attempts<5 and e.created_at>now()-interval '1 day'
 and s.active and not s.must_change_password and (s.role='admin' or s.workspace_role='cashier')
 and not exists(select 1 from workspace_recovery w where w.shop_id=d.shop_id and w.pending_at is not null)
 and coalesce((d.preferences->>'push')::boolean,true) and coalesce((d.preferences->>case when e.kind='catalogue' then 'catalogue' else 'preorder' end)::boolean,true)
 order by e.created_at limit 50 for update of q skip locked
 ),leased as(update order_push_deliveries q set state='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes' from eligible x where q.event_id=x.event_id and q.device_id=x.device_id returning q.*)
 select coalesce(jsonb_agg(jsonb_build_object('event_id',e.id,'kind',e.kind,'record_id',e.record_id,'device_id',d.id,'attempts',q.attempts,'user_id',d.user_id,'subscription',d.subscription,'language',coalesce(d.preferences->>'language','en'),'badge',coalesce((d.preferences->>'badge')::boolean,true))),'[]') into result from leased q join order_alert_events e on e.id=q.event_id join order_push_devices d on d.id=q.device_id;
 return result;
end$$;
revoke all on function save_business_contacts(jsonb),get_commercial_catalogue(text),register_order_push(jsonb,jsonb),unregister_order_push(text),get_order_alerts(timestamptz,uuid),queue_order_alert(),lease_order_push() from public,anon,authenticated;
grant execute on function get_commercial_catalogue(text) to anon,authenticated;
grant execute on function save_business_contacts(jsonb),register_order_push(jsonb,jsonb),unregister_order_push(text),get_order_alerts(timestamptz,uuid) to authenticated;
grant execute on function lease_order_push() to service_role;
grant select,update,delete on order_push_devices,order_push_deliveries to service_role;
grant select on order_alert_events to service_role;
commit;
