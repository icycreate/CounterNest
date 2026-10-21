-- RC17. Apply manually after the supplied RC16 migration chain. No historical row rewrites.
begin;
create function public.can_handle_order_requests() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(current_workspace_role() in ('admin','manager','cashier'),false)
 and not exists(select 1 from workspace_recovery where shop_id=current_shop_id() and pending_at is not null);
$$;
revoke all on function can_handle_order_requests() from public,anon;
grant execute on function can_handle_order_requests() to authenticated;

alter table catalogue_preorder_requests add column submission_snapshot jsonb;
update workspace_backup_tables set columns=array_append(columns,'submission_snapshot') where table_name='catalogue_preorder_requests' and not 'submission_snapshot'=any(columns);
-- Extend the existing canonical idempotency payload only when a phone is supplied.
-- Old clients/retry keys remain byte-equivalent; all original validation is retained.
do $$declare d text;n text:=$n$v_payload:=jsonb_build_object('items',clean_items,'name',v_name,'method',v_method,'contact',v_contact,'note',v_note);$n$;
begin
 d:=pg_get_functiondef('public.submit_catalogue_preorder_before_tracking(text,uuid,jsonb,jsonb)'::regprocedure);
 if position(n in d)=0 then raise exception 'Unexpected intake definition; migration requires the supplied RC16 baseline';end if;
 d:=replace(d,$x$'variant_id',x->'variant_id')) into v_total$x$,$x$'variant_id',x->'variant_id','option_label',x->'option_label')) into v_total$x$);
 execute replace(d,n,n||$n$
 if p_customer ? 'phone' then
  if jsonb_typeof(p_customer->'phone') is distinct from 'string' or nullif(trim(p_customer->>'phone'),'') is null then raise exception 'Phone number with country code required';end if;
  v_payload:=v_payload||jsonb_build_object('phone',normalize_international_phone(p_customer->>'phone'));
 elsif v_method not in('phone','sms','whatsapp') and not exists(select 1 from catalogue_preorder_requests where shop_id=cfg.shop_id and client_key=p_key) then
  raise exception 'Phone number with country code required';
 end if;
 $n$);
end$$;
create function public.capture_preorder_submission() returns trigger language plpgsql security definer set search_path=public as $$
declare rate numeric;currency_code text;lines jsonb;
begin
 if tg_op='UPDATE' then
  if new.submission_snapshot is distinct from old.submission_snapshot then raise exception 'Submitted snapshot is immutable';end if;
  return new;
 end if;
 if new.submission_snapshot is not null then return new;end if; -- trusted existing backup restore
 select tax_rate,currency into rate,currency_code from shops where id=new.shop_id;
 select jsonb_agg(x||jsonb_build_object('variant',coalesce((select v.name from product_variants v join products p on p.id=v.product_id where v.id=nullif(x->>'variant_id','')::uuid and p.shop_id=new.shop_id),''),'option_label',coalesce(x->>'option_label',''))) into lines from jsonb_array_elements(new.summary)x;
 new.submission_snapshot:=jsonb_build_object('request_id',new.id,'client_key',new.client_key,'request_number',new.request_number,'submitted_at',new.created_at,'customer_name',new.customer_name,'phone',coalesce(new.payload->>'phone',case when new.preferred_method in('phone','sms','whatsapp') then new.contact_value end),'preferred_method',new.preferred_method,'contact_value',new.contact_value,'notes',new.customer_note,'items',lines,'submitted_items',new.items,'subtotal',new.estimated_subtotal,'tax',round(new.estimated_subtotal*coalesce(rate,0),2),'total',new.estimated_subtotal+round(new.estimated_subtotal*coalesce(rate,0),2),'currency',currency_code);
 return new;
end$$;
revoke all on function capture_preorder_submission() from public,anon,authenticated;
create trigger capture_preorder_submission before insert or update of submission_snapshot on catalogue_preorder_requests for each row execute function capture_preorder_submission();

-- Extend order-handling RPCs, not POS payment/refund permissions or general financial access.
do $$declare f record;d text;begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname=any(array['get_catalogue_preorders','quote_catalogue_preorder','accept_catalogue_preorder','decline_catalogue_preorder','prepare_catalogue_contact','ux_save_request_notes','get_catalogue_preorder_receipt','get_catalogue_preorder_receipt_rc3','get_scheduled_orders','get_scheduled_deposits','record_scheduled_deposit','record_scheduled_deposit_before_finalization']) loop
  d:=pg_get_functiondef(f.oid);
  d:=replace(d,$x$in('admin','cashier')$x$,$x$in('admin','manager','cashier')$x$);
  execute d;
 end loop;
end$$;

create table public.order_alert_acknowledgements(
 event_id uuid not null references order_alert_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 acknowledged_at timestamptz not null default now(),primary key(event_id,user_id)
);
alter table order_alert_acknowledgements enable row level security;
create index order_alert_acknowledgements_user_time on order_alert_acknowledgements(user_id,acknowledged_at desc);
revoke all on order_alert_acknowledgements from public,anon,authenticated;
create table public.order_alert_presentations(
 event_id uuid not null references order_alert_events(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 presented_at timestamptz not null default now(),primary key(event_id,user_id)
);
alter table order_alert_presentations enable row level security;
revoke all on order_alert_presentations from public,anon,authenticated;
create function public.claim_order_alert_presentation(p_event uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not can_handle_order_requests() or not exists(select 1 from order_alert_events where id=p_event and shop_id=current_shop_id()) then raise exception 'Order alert unavailable';end if;
 if exists(select 1 from order_alert_acknowledgements where event_id=p_event and user_id=auth.uid()) then return false;end if;
 insert into order_alert_presentations(event_id,user_id) values(p_event,auth.uid()) on conflict do nothing;
 return found;
end$$;

create function public.get_order_alert_inbox() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not can_handle_order_requests() then raise exception 'Order handling access required';end if;
 return jsonb_build_object('unread_count',(select count(*) from order_alert_events e where e.shop_id=current_shop_id() and not exists(select 1 from order_alert_acknowledgements a where a.event_id=e.id and a.user_id=auth.uid())),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.presented,e.created_at,e.id) from (select e.id,e.kind,e.record_id,e.created_at,exists(select 1 from order_alert_presentations p where p.event_id=e.id and p.user_id=auth.uid()) as presented from order_alert_events e where e.shop_id=current_shop_id() and not exists(select 1 from order_alert_acknowledgements a where a.event_id=e.id and a.user_id=auth.uid()) order by presented,e.created_at,e.id limit 50)e),'[]'),
 'acknowledged',coalesce((select jsonb_agg(a.event_id) from (select a.event_id from order_alert_acknowledgements a join order_alert_events e on e.id=a.event_id where a.user_id=auth.uid() and e.shop_id=current_shop_id() order by a.acknowledged_at desc limit 100)a),'[]'));
end$$;
create function public.decide_catalogue_preorder(p_id uuid,p_action text,p_expected timestamptz,p_values jsonb default '{}',p_reason text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r catalogue_preorder_requests%rowtype;
begin
 if not can_handle_order_requests() then raise exception 'Order handling access required';end if;
 select * into r from catalogue_preorder_requests where id=p_id and shop_id=current_shop_id() for update;
 if not found or p_expected is null or r.updated_at is distinct from p_expected then raise exception 'Request changed; refresh before continuing';end if;
 if p_action='accept' then
  if coalesce((p_values->>'availability_confirmed')::boolean,false) is not true then raise exception 'Confirm availability and quoted price';end if;
  return accept_catalogue_preorder(p_id,p_values);
 elsif p_action='decline' then perform decline_catalogue_preorder(p_id,p_reason);return jsonb_build_object('request_id',p_id,'status','declined');
 else raise exception 'Invalid order decision';end if;
end$$;
create function public.acknowledge_order_alert(p_event uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not can_handle_order_requests() or not exists(select 1 from order_alert_events where id=p_event and shop_id=current_shop_id()) then raise exception 'Order alert unavailable';end if;
 insert into order_alert_acknowledgements(event_id,user_id) values(p_event,auth.uid()) on conflict do nothing;
end$$;
create function public.get_order_request_detail(p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not can_handle_order_requests() then raise exception 'Order handling access required';end if;
 select (to_jsonb(r)-'payload'-'status_token')||jsonb_build_object('currency',s.currency) into result from catalogue_preorder_requests r join shops s on s.id=r.shop_id where r.id=p_id and r.shop_id=current_shop_id();
 if result is null then raise exception 'Request unavailable';end if;
 return result;
end$$;
create function public.list_order_push_devices() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not can_handle_order_requests() then raise exception 'Order handling access required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'updated_at',updated_at,'enabled',coalesce((preferences->>'push')::boolean,false),'label',coalesce(preferences->>'device_label','Device')) order by updated_at desc) from order_push_devices where user_id=auth.uid() and shop_id=current_shop_id()),'[]');
end$$;
create function public.remove_order_push_device(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not can_handle_order_requests() then raise exception 'Order handling access required';end if;
 delete from order_push_devices where id=p_id and user_id=auth.uid() and shop_id=current_shop_id();
end$$;
-- Keep strict subscription validation in the original implementation; store only allowed extras.
alter function register_order_push(jsonb,jsonb) rename to register_order_push_before_rc17;
revoke all on function register_order_push_before_rc17(jsonb,jsonb) from public,anon,authenticated;
do $$declare d text;begin d:=pg_get_functiondef('public.register_order_push_before_rc17(jsonb,jsonb)'::regprocedure);execute replace(d,$x$in('admin','cashier')$x$,$x$in('admin','manager','cashier')$x$);end$$;
create function public.register_order_push(p_subscription jsonb,p_preferences jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare device uuid;clean jsonb;
begin
 if not can_handle_order_requests() then raise exception 'Order handling access required';end if;
 if coalesce(p_preferences->>'tone','chime') not in('chime','bell','gentle') or coalesce((p_preferences->>'repeatCount')::int,3) not between 1 and 5 or length(coalesce(p_preferences->>'device_label',''))>80 then raise exception 'Invalid alert preferences';end if;
 clean:=p_preferences-'tone'-'repeatCount'-'device_label'-'enabled';
 if p_preferences ? 'enabled' and jsonb_typeof(p_preferences->'enabled')<>'boolean' then raise exception 'Invalid alert preferences';end if;
 if not coalesce((p_preferences->>'enabled')::boolean,true) then clean:=clean||'{"push":false}'::jsonb;end if;
 device:=register_order_push_before_rc17(p_subscription,clean);
 update order_push_devices set preferences=preferences||jsonb_build_object('tone',coalesce(p_preferences->>'tone','chime'),'repeatCount',coalesce((p_preferences->>'repeatCount')::int,3),'device_label',left(coalesce(p_preferences->>'device_label','Device'),80),'enabled',coalesce((p_preferences->>'enabled')::boolean,true)) where id=device;
 return device;
end$$;
-- A server insert already creates exactly one event and an outbox row per subscribed device.
-- Recheck manager/cashier/admin authorization and acknowledgement at dispatch time.
do $$declare d text;begin
 d:=pg_get_functiondef('public.lease_order_push()'::regprocedure);
 d:=replace(d,$x$s.workspace_role='cashier'$x$,$x$s.workspace_role in('cashier','manager')$x$);
 d:=replace(d,$x$and s.active$x$,$x$and e.shop_id=d.shop_id and not exists(select 1 from order_alert_acknowledgements a where a.event_id=e.id and a.user_id=d.user_id) and s.active$x$);
 execute d;
end$$;
revoke all on function get_order_alert_inbox(),acknowledge_order_alert(uuid),get_order_request_detail(uuid),list_order_push_devices(),remove_order_push_device(uuid),register_order_push(jsonb,jsonb),claim_order_alert_presentation(uuid),decide_catalogue_preorder(uuid,text,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function get_order_alert_inbox(),acknowledge_order_alert(uuid),get_order_request_detail(uuid),list_order_push_devices(),remove_order_push_device(uuid),register_order_push(jsonb,jsonb),claim_order_alert_presentation(uuid),decide_catalogue_preorder(uuid,text,timestamptz,jsonb,text) to authenticated;
commit;
