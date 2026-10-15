-- RC1 update: public request intake is not a sale or stock reservation.
begin;
alter table public.customer_display_configs
 add column public_base_url text,
 add column preorder_enabled boolean not null default true,
 add column contact_methods text[] not null default array['whatsapp','phone','email'],
 add column receipt_catalogue_qr boolean not null default false;
alter table public.cash_drawer_sessions add column station_label text not null default 'Main Register';

create table public.catalogue_preorder_requests(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id),
 display_config_id uuid not null references public.customer_display_configs(id),request_number bigint generated always as identity,
 client_key uuid not null,payload jsonb not null,customer_name text not null,preferred_method text not null,
 contact_value text not null,customer_note text,items jsonb not null,summary jsonb not null,estimated_subtotal numeric(12,2) not null,
 status text not null default 'new_request' check(status in('new_request','under_review','customer_contacted','awaiting_confirmation','confirmed','awaiting_deposit','scheduled','in_production','ready','collected','cancelled','declined','no_response')),
 scheduled_order_id uuid unique references public.scheduled_customer_orders(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(shop_id,client_key)
);
create index catalogue_requests_queue_idx on public.catalogue_preorder_requests(shop_id,status,created_at desc);
create index catalogue_requests_contact_rate_idx on public.catalogue_preorder_requests(display_config_id,contact_value,created_at desc);
create table public.catalogue_request_events(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id),
 request_id uuid not null references public.catalogue_preorder_requests(id),action text not null,details jsonb not null default '{}',
 performed_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create index catalogue_request_events_history_idx on public.catalogue_request_events(shop_id,request_id,created_at);
alter table public.catalogue_preorder_requests enable row level security;
alter table public.catalogue_request_events enable row level security;
create policy catalogue_requests_staff_read on public.catalogue_preorder_requests for select to authenticated using(shop_id=public.current_shop_id());
create policy catalogue_request_events_staff_read on public.catalogue_request_events for select to authenticated using(shop_id=public.current_shop_id());
revoke all on public.catalogue_preorder_requests,public.catalogue_request_events from anon,authenticated;
grant select on public.catalogue_preorder_requests,public.catalogue_request_events to authenticated;

create function public.save_customer_contact_settings(p_methods text[],p_enabled boolean,p_base_url text,p_receipt_qr boolean) returns void
language plpgsql security definer set search_path=public as $$
declare cfg customer_display_configs%rowtype;v_base text:=nullif(rtrim(trim(p_base_url),'/'),'');
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 if p_methods is null or not p_methods<@array['whatsapp','phone','sms','email','messenger','line','wechat','other']::text[] or array_position(p_methods,null) is not null then raise exception 'Invalid contact methods';end if;
 if p_enabled is null or p_receipt_qr is null then raise exception 'Settings required';end if;
 if p_enabled and cardinality(p_methods)=0 then raise exception 'Enable at least one contact method';end if;
 if v_base is not null and (length(v_base)>250 or v_base !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' and v_base !~ '^http://(localhost|127[.]0[.]0[.]1)(:[0-9]+)?$') then raise exception 'Use an HTTPS origin without path, query or credentials';end if;
 perform ensure_customer_display_config();
 update customer_display_configs set contact_methods=array(select distinct x from unnest(p_methods)x order by x),preorder_enabled=p_enabled,public_base_url=v_base,receipt_catalogue_qr=p_receipt_qr where shop_id=current_shop_id() returning * into cfg;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(cfg.shop_id,'display',cfg.id,'contact_settings',jsonb_build_object('methods',cfg.contact_methods,'preorder_enabled',p_enabled,'base_url',v_base,'receipt_qr',p_receipt_qr),auth.uid());
end $$;
revoke all on function public.save_customer_contact_settings(text[],boolean,text,boolean) from public;
grant execute on function public.save_customer_contact_settings(text[],boolean,text,boolean) to authenticated;

-- Reuse the existing customer-safe projection; only public request settings are added.
alter function public.get_commercial_catalogue(text) rename to get_commercial_catalogue_pre_requests;
revoke all on function public.get_commercial_catalogue_pre_requests(text) from public,anon,authenticated;
create function public.get_commercial_catalogue(p_token text default null) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare payload jsonb;cfg customer_display_configs%rowtype;
begin
 payload:=get_commercial_catalogue_pre_requests(p_token);
 select * into cfg from customer_display_configs where (p_token is not null and access_token=p_token and enabled) or (p_token is null and shop_id=current_shop_id());
 return payload||jsonb_build_object('customer_options',jsonb_build_object('methods',cfg.contact_methods,'preorder_enabled',cfg.preorder_enabled,'public_base_url',cfg.public_base_url));
end $$;
revoke all on function public.get_commercial_catalogue(text) from public;
grant execute on function public.get_commercial_catalogue(text) to anon,authenticated;

create function public.submit_catalogue_preorder(p_token text,p_key uuid,p_items jsonb,p_customer jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare cfg customer_display_configs%rowtype;prior catalogue_preorder_requests%rowtype;v_payload jsonb;normalized jsonb;clean_items jsonb;safe_summary jsonb;line jsonb;v_total numeric;v_id uuid;v_number bigint;v_name text;v_method text;v_contact text;v_note text;
begin
 select * into cfg from customer_display_configs where access_token=p_token and enabled for update;
 if not found or not cfg.preorder_enabled then raise exception 'Pre-order requests unavailable';end if;
 if p_key is null or jsonb_typeof(p_customer) is distinct from 'object' or octet_length(p_customer::text)>5000 or jsonb_typeof(p_customer->'name') is distinct from 'string' or jsonb_typeof(p_customer->'method') is distinct from 'string' or jsonb_typeof(p_customer->'contact') is distinct from 'string' or coalesce(jsonb_typeof(p_customer->'note'),'null') not in('string','null') then raise exception 'Invalid customer information';end if;
 v_name:=trim(p_customer->>'name');v_method:=p_customer->>'method';v_contact:=trim(p_customer->>'contact');v_note:=trim(p_customer->>'note');
 if coalesce(length(v_name),0) not between 2 and 100 or coalesce(length(v_contact),0) not between 3 and 180 or coalesce(length(v_note),0)>1000 then raise exception 'Name, selected contact details and valid notes required';end if;
 if v_method is null or not v_method=any(cfg.contact_methods) then raise exception 'Contact method unavailable';end if;
 if v_method='email' and v_contact !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Valid email required';end if;
 if v_method in('whatsapp','phone','sms') and v_contact !~ '^[+]?[0-9 ()-]{6,30}$' then raise exception 'Valid phone number with country code required';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 25 or octet_length(p_items::text)>25000 then raise exception 'Request must contain 1 to 25 items';end if;
 select jsonb_agg(jsonb_build_object('product_id',x->'product_id','variant_id',x->'variant_id','option_label',x->'option_label','combo_id',x->'combo_id','choices',x->'choices','qty',x->'qty','expected_unit_price',x->'expected_unit_price')) into clean_items from jsonb_array_elements(p_items)x;
 v_payload:=jsonb_build_object('items',clean_items,'name',v_name,'method',v_method,'contact',v_contact,'note',v_note);
 select * into prior from catalogue_preorder_requests where shop_id=cfg.shop_id and client_key=p_key;
 if found then
  if prior.payload is distinct from v_payload then raise exception 'Request reference already used with different details';end if;
  return jsonb_build_object('request_number',prior.request_number,'status','received','replayed',true);
 end if;
 if (select count(*) from catalogue_preorder_requests where display_config_id=cfg.id and contact_value=v_contact and created_at>now()-interval '10 minutes')>=3 or (select count(*) from catalogue_preorder_requests where display_config_id=cfg.id and created_at>now()-interval '1 day')>=500 then raise exception 'Request limit reached; please contact the shop';end if;
 for line in select value from jsonb_array_elements(clean_items) loop if (line->>'qty')::numeric>20 then raise exception 'Maximum quantity is 20 per item';end if;end loop;
 normalized:=normalize_commercial_items(cfg.shop_id,clean_items,true,true);
 select sum((x->>'__line_total')::numeric),jsonb_agg(jsonb_build_object('name',x->>'__name','qty',x->'qty','unit_price',x->'__unit_price','line_total',x->'__line_total','product_id',x->'product_id','variant_id',x->'variant_id')) into v_total,safe_summary from jsonb_array_elements(normalized)x;
 insert into catalogue_preorder_requests(shop_id,display_config_id,client_key,payload,customer_name,preferred_method,contact_value,customer_note,items,summary,estimated_subtotal)
 values(cfg.shop_id,cfg.id,p_key,v_payload,v_name,v_method,v_contact,v_note,clean_items,safe_summary,v_total) returning id,request_number into v_id,v_number;
 insert into catalogue_request_events(shop_id,request_id,action,details) values(cfg.shop_id,v_id,'submitted',jsonb_build_object('method',v_method,'estimated_subtotal',v_total));
 return jsonb_build_object('request_number',v_number,'status','received','replayed',false);
end $$;
revoke all on function public.submit_catalogue_preorder(text,uuid,jsonb,jsonb) from public;
grant execute on function public.submit_catalogue_preorder(text,uuid,jsonb,jsonb) to anon,authenticated;

create function public.get_catalogue_preorders() returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 return jsonb_build_object('requests',(select coalesce(jsonb_agg(to_jsonb(r) - 'payload' order by r.created_at desc),'[]') from catalogue_preorder_requests r where shop_id=current_shop_id()),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at desc),'[]') from (select * from catalogue_request_events where shop_id=current_shop_id() order by created_at desc limit 300)e));
end $$;
revoke all on function public.get_catalogue_preorders() from public;
grant execute on function public.get_catalogue_preorders() to authenticated;

create function public.set_catalogue_preorder_status(p_id uuid,p_expected text,p_status text,p_note text default null) returns void
language plpgsql security definer set search_path=public as $$
declare r catalogue_preorder_requests%rowtype;v_next text;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 select * into r from catalogue_preorder_requests where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Request not found';end if;
 if r.status is distinct from p_expected then raise exception 'Request changed; refresh before continuing';end if;
 if r.scheduled_order_id is not null then raise exception 'Use the linked scheduled order for production, deposits and collection';end if;
 v_next:=case r.status when 'new_request' then 'under_review' when 'under_review' then 'customer_contacted' when 'customer_contacted' then 'awaiting_confirmation' when 'awaiting_confirmation' then 'confirmed' when 'confirmed' then 'awaiting_deposit' end;
 if p_status is null or not (coalesce(p_status=v_next,false) or p_status in('cancelled','declined','no_response')) or r.status in('collected','cancelled','declined','no_response') then raise exception 'Invalid request transition';end if;
 if p_status in('cancelled','declined','no_response') and length(trim(coalesce(p_note,'')))<5 then raise exception 'A reason of at least 5 characters is required';end if;
 update catalogue_preorder_requests set status=p_status,updated_at=now() where id=r.id;
 insert into catalogue_request_events(shop_id,request_id,action,details,performed_by) values(r.shop_id,r.id,'status_changed',jsonb_build_object('before',r.status,'after',p_status,'note',left(p_note,1000)),auth.uid());
end $$;
revoke all on function public.set_catalogue_preorder_status(uuid,text,text,text) from public;
grant execute on function public.set_catalogue_preorder_status(uuid,text,text,text) to authenticated;

create function public.prepare_catalogue_contact(p_id uuid,p_method text,p_override_reason text default null,p_override_destination text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r catalogue_preorder_requests%rowtype;destination text;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 select * into r from catalogue_preorder_requests where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Request not found';end if;
 if p_method is null or not p_method=any(array['whatsapp','phone','sms','email','messenger','line','wechat','other']) then raise exception 'Invalid contact method';end if;
 destination:=r.contact_value;
 if p_method<>r.preferred_method then
  if not is_admin() then raise exception 'Administrator override required';end if;
  if length(trim(coalesce(p_override_reason,'')))<5 or length(trim(coalesce(p_override_destination,''))) not between 3 and 180 then raise exception 'Override reason and alternate contact details required';end if;
  destination:=trim(p_override_destination);
 end if;
 insert into catalogue_request_events(shop_id,request_id,action,details,performed_by) values(r.shop_id,r.id,case when p_method=r.preferred_method then 'contact_prepared' else 'contact_override' end,jsonb_build_object('preferred',r.preferred_method,'method',p_method,'reason',left(p_override_reason,500)),auth.uid());
 return jsonb_build_object('method',p_method,'destination',destination,'message','Hello '||r.customer_name||', regarding your pre-order request #'||r.request_number||': ');
end $$;
revoke all on function public.prepare_catalogue_contact(uuid,text,text,text) from public;
grant execute on function public.prepare_catalogue_contact(uuid,text,text,text) to authenticated;

create function public.schedule_catalogue_preorder(p_id uuid,p_customer uuid,p_pickup timestamptz,p_deadline timestamptz) returns uuid
language plpgsql security definer set search_path=public as $$
declare r catalogue_preorder_requests%rowtype;o_id uuid;v_items jsonb;
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 select * into r from catalogue_preorder_requests where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Request not found';end if;
 if r.scheduled_order_id is not null then return r.scheduled_order_id;end if;
 if r.status not in('confirmed','awaiting_deposit') then raise exception 'Confirm request with customer before scheduling';end if;
 if p_pickup is null or p_deadline is null or p_deadline>p_pickup or p_pickup<=now() then raise exception 'Future pickup and valid production deadline required';end if;
 select jsonb_agg(x||jsonb_build_object('name',coalesce((select name from catalogue_combos where id=(x->>'combo_id')::uuid and shop_id=r.shop_id),(select p.name||coalesce(' — '||v.name,'') from products p left join product_variants v on v.id=(x->>'variant_id')::uuid and v.product_id=p.id where p.id=(x->>'product_id')::uuid and p.shop_id=r.shop_id)))) into v_items from jsonb_array_elements(r.items)x;
 o_id:=save_scheduled_order(null,r.id,jsonb_build_object('kind','preorder','customer_id',p_customer,'pickup_at',p_pickup,'production_deadline',p_deadline,'items',v_items,'note',r.customer_note,'details',jsonb_build_object('catalogue_request',r.request_number)));
 update catalogue_preorder_requests set scheduled_order_id=o_id,status='scheduled',updated_at=now() where id=r.id;
 insert into catalogue_request_events(shop_id,request_id,action,details,performed_by) values(r.shop_id,r.id,'scheduled',jsonb_build_object('order_id',o_id,'pickup',p_pickup),auth.uid());
 return o_id;
end $$;
revoke all on function public.schedule_catalogue_preorder(uuid,uuid,timestamptz,timestamptz) from public;
grant execute on function public.schedule_catalogue_preorder(uuid,uuid,timestamptz,timestamptz) to authenticated;

create function public.sync_catalogue_request_order() returns trigger language plpgsql security definer set search_path=public as $$
declare r catalogue_preorder_requests%rowtype;stage text;
begin
 select * into r from catalogue_preorder_requests where scheduled_order_id=new.id;
 if not found then return new;end if;
 stage:=case new.status when 'preparing' then 'in_production' when 'ready' then 'ready' when 'completed' then 'collected' when 'cancelled' then 'cancelled' else 'scheduled' end;
 if stage is distinct from r.status then
 update catalogue_preorder_requests set status=stage,updated_at=now() where id=r.id;
 insert into catalogue_request_events(shop_id,request_id,action,details,performed_by) values(r.shop_id,r.id,'order_status',jsonb_build_object('before',r.status,'after',stage,'order_id',new.id),auth.uid());
 end if;return new;
end $$;
revoke all on function public.sync_catalogue_request_order() from public;
create trigger sync_catalogue_order after update of status on public.scheduled_customer_orders for each row execute function public.sync_catalogue_request_order();

-- Preserve legacy callers while requiring the same admin/station/audit path.
alter function public.open_cash_drawer(numeric,text) rename to open_cash_drawer_pre_station;
revoke all on function public.open_cash_drawer_pre_station(numeric,text) from public,anon,authenticated;
create function public.open_register(p_opening_amount numeric,p_station text,p_note text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_shop uuid:=current_shop_id();
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 if p_opening_amount is null or p_opening_amount::text in('NaN','Infinity','-Infinity') or p_opening_amount<0 or p_opening_amount>9999999999.99 then raise exception 'Valid opening cash required';end if;
 if length(trim(coalesce(p_station,''))) not between 1 and 60 then raise exception 'Register/station required';end if;
 -- Serialize opens and preserve the existing one-register-per-shop/day invariant.
 perform 1 from shops where id=v_shop for update;
 v_id:=open_cash_drawer_pre_station(p_opening_amount,p_note);
 update cash_drawer_sessions set station_label=trim(p_station) where id=v_id;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(v_shop,'register',v_id,'opened',jsonb_build_object('station',trim(p_station),'opening_amount',round(p_opening_amount,2),'opened_at',now()),auth.uid());
 return v_id;
end $$;
create function public.open_cash_drawer(p_opening_amount numeric,p_note text default null) returns uuid
language plpgsql security definer set search_path=public as $$
begin return open_register(p_opening_amount,'Main Register',p_note);end $$;
revoke all on function public.open_register(numeric,text,text),public.open_cash_drawer(numeric,text) from public;
grant execute on function public.open_register(numeric,text,text),public.open_cash_drawer(numeric,text) to authenticated;
-- Old daily declarations are retained read-only for historical reporting.
revoke execute on function public.submit_staff_opening_cash(numeric,text) from public,anon,authenticated;

alter function public.export_business_backup() rename to export_business_backup_pre_requests;
revoke all on function public.export_business_backup_pre_requests() from public,anon,authenticated;
create function public.export_business_backup() returns jsonb language plpgsql security definer set search_path=public as $$
declare base jsonb;
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 base:=export_business_backup_pre_requests();
 return base||jsonb_build_object('customer_request_records',jsonb_build_object('requests',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from catalogue_preorder_requests r where shop_id=current_shop_id()),'events',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from catalogue_request_events e where shop_id=current_shop_id())));
end $$;
revoke all on function public.export_business_backup() from public,anon;
grant execute on function public.export_business_backup() to authenticated;
create function public.get_receipt_catalogue_link() returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 return (select jsonb_build_object('enabled',enabled and receipt_catalogue_qr,'token',case when enabled and receipt_catalogue_qr then access_token else null end,'public_base_url',public_base_url) from customer_display_configs where shop_id=current_shop_id());
end $$;
revoke all on function public.get_receipt_catalogue_link() from public,anon;
grant execute on function public.get_receipt_catalogue_link() to authenticated;
alter function public.get_catalogue_admin() rename to get_catalogue_admin_pre_requests;
revoke all on function public.get_catalogue_admin_pre_requests() from public,anon,authenticated;
create function public.get_catalogue_admin() returns jsonb language plpgsql security definer stable set search_path=public as $$
declare result jsonb;
begin
 result:=get_catalogue_admin_pre_requests();
 return jsonb_set(result,'{settings}',coalesce(result->'settings','{}')||jsonb_build_object('public_base_url',(select public_base_url from customer_display_configs where shop_id=current_shop_id())));
end $$;
revoke all on function public.get_catalogue_admin() from public,anon;
grant execute on function public.get_catalogue_admin() to authenticated;
create index catalogue_request_events_audit_idx on public.catalogue_request_events(shop_id,created_at desc);
alter function public.get_audit_log(timestamptz,timestamptz,int) rename to get_audit_log_pre_requests;
revoke all on function public.get_audit_log_pre_requests(timestamptz,timestamptz,int) from public,anon,authenticated;
create function public.get_audit_log(p_from timestamptz,p_to timestamptz,p_limit int default 500) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare base jsonb;extra jsonb;v_limit int:=least(greatest(coalesce(p_limit,500),1),500);
begin
 -- Existing feed validates admin, effective shop and the maximum date span.
 base:=get_audit_log_pre_requests(p_from,p_to,p_limit);
 select coalesce(jsonb_agg(row),'[]') into extra from(
  select jsonb_build_object('id',e.id,'event_time',e.created_at,'category','catalogue_request','action',e.action,'actor_name',coalesce(s.display_name,'Customer'),'target','Request #'||r.request_number,'details',e.details) row
  from catalogue_request_events e join catalogue_preorder_requests r on r.id=e.request_id and r.shop_id=e.shop_id
  left join staff_profiles s on s.user_id=e.performed_by and s.shop_id=e.shop_id
  where e.shop_id=current_shop_id() and e.created_at between p_from and p_to
  union all
  select jsonb_build_object('id',e.id,'event_time',e.created_at,'category','cash_drawer','action','register_opened','actor_name',coalesce(s.display_name,'Administrator'),'target',e.details->>'station','details',e.details)
  from commercial_events e left join staff_profiles s on s.user_id=e.performed_by and s.shop_id=e.shop_id
  where e.shop_id=current_shop_id() and e.entity_type='register' and e.action='opened' and e.created_at between p_from and p_to
 )x;
 return (select coalesce(jsonb_agg(row order by (row->>'event_time')::timestamptz desc),'[]') from(select value row from jsonb_array_elements(base||extra) order by (value->>'event_time')::timestamptz desc limit v_limit)x);
end $$;
revoke all on function public.get_audit_log(timestamptz,timestamptz,int) from public,anon;
grant execute on function public.get_audit_log(timestamptz,timestamptz,int) to authenticated;
commit;

