-- Direct acceptance keeps pricing, deposits, preparation and collection in the existing ledger.
begin;
alter table scheduled_customer_orders alter column pickup_at drop not null,alter column production_deadline drop not null;
alter table catalogue_preorder_requests add column accepted_by uuid references auth.users(id),add column accepted_at timestamptz,add column customer_instructions text;
create index scheduled_orders_active_queue on scheduled_customer_orders(shop_id,status,created_at) where status in('confirmed','preparing','ready');

alter function public.get_commercial_catalogue(text) rename to get_commercial_catalogue_before_finalization;
revoke all on function public.get_commercial_catalogue_before_finalization(text) from public,anon,authenticated;
create function public.get_commercial_catalogue(p_token text default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare payload jsonb;shop uuid;logo text;
begin
 payload:=get_commercial_catalogue_before_finalization(p_token);
 if p_token is null then shop:=current_shop_id();else select shop_id into shop from customer_display_configs where access_token=p_token and enabled;end if;
 select coalesce(nullif(logo_url,''),'/counternest-default-logo.svg') into logo from shops where id=shop;
 return payload||jsonb_build_object('logo_url',logo);
end $$;
revoke all on function public.get_commercial_catalogue(text) from public;
grant execute on function public.get_commercial_catalogue(text) to anon,authenticated;

create function public.quote_catalogue_preorder(p_id uuid,p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare normalized jsonb;subtotal numeric;clean jsonb;v_summary jsonb;tax numeric;
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 if not exists(select 1 from catalogue_preorder_requests where id=p_id and shop_id=current_shop_id() and scheduled_order_id is null) then raise exception 'Request not found or already accepted';end if;
 normalized:=normalize_commercial_items(current_shop_id(),p_items,false,false);
 select jsonb_agg(jsonb_build_object('product_id',x->'product_id','variant_id',x->'variant_id','option_label',x->'option_label','qty',x->'qty','expected_unit_price',x->'__unit_price','name',x->'__name')),jsonb_agg(jsonb_build_object('name',x->'__name','qty',x->'qty','unit_price',x->'__unit_price','line_total',x->'__line_total')),sum((x->>'__line_total')::numeric) into clean,v_summary,subtotal from jsonb_array_elements(normalized)x;
 -- Keep bundle definitions intact for the second, expected-price validation at
 -- acceptance; allocated component prices are not standalone master prices.
 if exists(select 1 from jsonb_array_elements(p_items)x where nullif(x->>'combo_id','') is not null) then
  select jsonb_agg(jsonb_build_object('product_id',x->'product_id','variant_id',x->'variant_id','option_label',x->'option_label','combo_id',x->'combo_id','choices',x->'choices','qty',coalesce(x->'qty',x->'quantity'),'expected_unit_price',case when nullif(x->>'combo_id','') is not null then(select price from catalogue_combos where id=(x->>'combo_id')::uuid and shop_id=current_shop_id()) else sku_effective_price((x->>'product_id')::uuid,nullif(x->>'variant_id','')::uuid) end)) into clean from jsonb_array_elements(p_items)x;
 end if;
 select round(subtotal*tax_rate,2) into tax from shops where id=current_shop_id();
 return jsonb_build_object('items',clean,'summary',v_summary,'subtotal',subtotal,'tax',tax,'total',subtotal+tax);
end $$;

create function public.accept_catalogue_preorder(p_id uuid,p_values jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare r catalogue_preorder_requests%rowtype;normalized jsonb;clean jsonb;v_summary jsonb;subtotal numeric;customer uuid;order_id uuid;pickup timestamptz;deadline timestamptz;instructions text;staffnote text;deposit jsonb;
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 select * into r from catalogue_preorder_requests where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Request not found';end if;
 if r.scheduled_order_id is not null then return jsonb_build_object('request_id',r.id,'order_id',r.scheduled_order_id,'status','confirmed','replayed',true);end if;
 if r.status not in('new_request','under_review','customer_contacted','awaiting_confirmation','confirmed','awaiting_deposit') then raise exception 'Request cannot be accepted';end if;
 if jsonb_typeof(p_values) is distinct from 'object' or octet_length(p_values::text)>50000 then raise exception 'Invalid acceptance details';end if;
 pickup:=nullif(p_values->>'pickup_at','')::timestamptz;deadline:=nullif(p_values->>'production_deadline','')::timestamptz;
 if pickup is not null and pickup<=now() then raise exception 'Pickup must be in the future';end if;
 if deadline is not null and (deadline<now() or (pickup is not null and deadline>pickup)) then raise exception 'Invalid production deadline';end if;
 instructions:=trim(coalesce(p_values->>'customer_instructions',''));staffnote:=trim(coalesce(p_values->>'staff_note',''));
 if length(instructions)>2000 or length(staffnote)>4000 then raise exception 'Notes are too long';end if;
 -- Lock current master records before quoting. No stock is deducted or reserved here.
 perform 1 from products where shop_id=r.shop_id order by id for update;
 normalized:=normalize_commercial_items(r.shop_id,p_values->'items',false,true);
 select jsonb_agg(jsonb_build_object('product_id',x->'product_id','variant_id',x->'variant_id','option_label',x->'option_label','qty',x->'qty','expected_unit_price',x->'__unit_price','name',x->'__name')),
 jsonb_agg(jsonb_build_object('product_id',x->'product_id','variant_id',x->'variant_id','name',x->'__name','variant',x#>'{__variant_snapshot,name}','qty',x->'qty','unit_price',x->'__unit_price','line_total',x->'__line_total')),
 sum((x->>'__line_total')::numeric) into clean,v_summary,subtotal from jsonb_array_elements(normalized)x;
 -- Use an exact same-shop name/contact match only; never infer identity from name alone.
 select c.id into customer from customers c where c.shop_id=r.shop_id and c.name=r.customer_name and ((r.preferred_method='email' and c.email=r.contact_value) or(r.preferred_method in('phone','sms','whatsapp') and c.phone=r.contact_value)) order by c.created_at limit 1;
 if customer is null then insert into customers(shop_id,name,email,phone) values(r.shop_id,r.customer_name,case when r.preferred_method='email' then r.contact_value end,case when r.preferred_method in('phone','sms','whatsapp') then r.contact_value end) returning id into customer;end if;
 insert into scheduled_customer_orders(shop_id,client_key,kind,customer_id,pickup_at,production_deadline,items,normalized_items,details,note,quoted_subtotal,created_by)
 values(r.shop_id,r.id,'preorder',customer,pickup,deadline,clean,normalized,jsonb_build_object('catalogue_request',r.request_number,'catalogue_request_id',r.id),instructions,subtotal,auth.uid()) returning id into order_id;
 update catalogue_preorder_requests set scheduled_order_id=order_id,status='confirmed',accepted_by=auth.uid(),accepted_at=now(),customer_instructions=instructions,staff_notes=case when staffnote='' then staff_notes else staffnote end,items=clean,summary=v_summary,estimated_subtotal=subtotal,updated_at=now() where id=r.id;
 deposit:=p_values->'deposit';
 if deposit is not null and deposit<>'null'::jsonb then
  if jsonb_typeof(deposit) is distinct from 'object' or nullif(deposit->>'key','') is null then raise exception 'Deposit key required';end if;
  perform record_scheduled_deposit(order_id,(deposit->>'key')::uuid,(deposit->>'amount')::numeric,deposit->>'method');
 end if;
 insert into catalogue_request_events(shop_id,request_id,action,details,performed_by) values(r.shop_id,r.id,'accepted',jsonb_build_object('before',r.status,'after','confirmed','order_id',order_id,'subtotal',subtotal,'pickup_at',pickup),auth.uid());
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(r.shop_id,'scheduled_order',order_id,'accepted_catalogue_request',jsonb_build_object('request_id',r.id,'quote',subtotal),auth.uid());
 return jsonb_build_object('request_id',r.id,'order_id',order_id,'status','confirmed','replayed',false);
end $$;

create function public.decline_catalogue_preorder(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare r catalogue_preorder_requests%rowtype;
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 if length(trim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'Decline reason must contain 5 to 2000 characters';end if;
 select * into r from catalogue_preorder_requests where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Request not found';end if;
 if r.status='declined' then return;end if;
 if r.scheduled_order_id is not null or r.status not in('new_request','under_review','customer_contacted','awaiting_confirmation','confirmed','awaiting_deposit','no_response') then raise exception 'Request cannot be declined; use the linked order cancellation workflow';end if;
 update catalogue_preorder_requests set status='declined',updated_at=now() where id=r.id;
 insert into catalogue_request_events(shop_id,request_id,action,details,performed_by) values(r.shop_id,r.id,'declined',jsonb_build_object('before',r.status,'after','declined','reason',trim(p_reason)),auth.uid());
end $$;

create function public.get_catalogue_preorder_receipt(p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 select jsonb_build_object('shop_name',s.name,'logo_url',coalesce(nullif(s.logo_url,''),'/counternest-default-logo.svg'),'request_number',r.request_number,'order_id',o.id,'order_number',o.order_number,'date',coalesce(r.accepted_at,o.created_at),'customer_name',r.customer_name,'customer_contact',r.contact_value,'preferred_method',r.preferred_method,
 'items',(select jsonb_agg(jsonb_build_object('product_id',x->'product_id','variant_id',x->'variant_id','name',x->'__name','variant',x#>'{__variant_snapshot,name}','qty',x->'qty','unit_price',x->'__unit_price','line_total',x->'__line_total')) from jsonb_array_elements(o.normalized_items)x),
 'subtotal',coalesce(paid.subtotal,o.quoted_subtotal),'tax',coalesce(paid.tax,round(o.quoted_subtotal*s.tax_rate,2)),'total',coalesce(paid.total,round(o.quoted_subtotal*(1+s.tax_rate),2)),'deposit_paid',o.deposit_total,'remaining_balance',case when paid.id is not null then 0 else round(o.quoted_subtotal*(1+s.tax_rate),2)-o.deposit_total end,'paid',paid.id is not null,'pickup_at',o.pickup_at,'customer_notes',concat_ws(E'\n',nullif(r.customer_note,''),nullif(r.customer_instructions,'')),'accepted_by',sp.display_name,'status',case when o.status='cancelled' then 'cancelled' else 'confirmed' end,'order_status',o.status)
 into result from catalogue_preorder_requests r join scheduled_customer_orders o on o.id=r.scheduled_order_id and o.shop_id=r.shop_id join shops s on s.id=r.shop_id left join sales paid on paid.id=o.sale_id and paid.shop_id=o.shop_id left join staff_profiles sp on sp.user_id=coalesce(r.accepted_by,o.created_by) and sp.shop_id=r.shop_id where r.id=p_id and r.shop_id=current_shop_id() and o.status<>'cancelled';
 if result is null then raise exception 'Accepted pre-order receipt unavailable';end if;return result;
end $$;

-- The existing deposit ledger is reused; reject an idempotency key belonging to
-- another order or another payment rather than silently reporting it as paid.
alter function record_scheduled_deposit(uuid,uuid,numeric,text) rename to record_scheduled_deposit_before_finalization;
revoke all on function record_scheduled_deposit_before_finalization(uuid,uuid,numeric,text) from public,anon,authenticated;
create function public.record_scheduled_deposit(p_order uuid,p_key uuid,p_amount numeric,p_method text) returns void language plpgsql security definer set search_path=public as $$
declare prior scheduled_order_deposits%rowtype;
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 if p_key is null or p_method is null or p_method not in('cash','card','qr') then raise exception 'Valid deposit key and payment method required';end if;
 perform pg_advisory_xact_lock(hashtextextended(current_shop_id()::text||p_key::text,0));
 select * into prior from scheduled_order_deposits where shop_id=current_shop_id() and client_key=p_key;
 if found then
  if prior.order_id is distinct from p_order or prior.amount is distinct from p_amount or prior.payment_method is distinct from p_method then raise exception 'Deposit key was already used with different details';end if;
  return;
 end if;
 perform record_scheduled_deposit_before_finalization(p_order,p_key,p_amount,p_method);
end $$;

-- Preparation reads the accepted order itself; no duplicate selection or batch
-- is manufactured. Approved ingredient production remains the existing planner.
alter function get_preparation_orders() rename to get_preparation_orders_before_finalization;
revoke all on function get_preparation_orders_before_finalization() from public,anon,authenticated;
create function public.get_preparation_orders() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare base jsonb;accepted jsonb;
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier','production') then raise exception 'Production access required';end if;
 base:=get_preparation_orders_before_finalization();
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'number',coalesce('PO-'||r.request_number,o.order_number::text),'source','scheduled','status',case when o.status='confirmed' then 'received' else o.status end,'station','Pre-Orders','note',coalesce(r.customer_instructions,o.note),'created_at',o.created_at,'pickup_at',o.pickup_at,'paid',o.sale_id is not null,'items',(select jsonb_agg(jsonb_build_object('name',x->'__name','variant',x#>'{__variant_snapshot,name}','quantity',x->'qty')) from jsonb_array_elements(o.normalized_items)x)) order by o.created_at),'[]') into accepted from scheduled_customer_orders o left join catalogue_preorder_requests r on r.scheduled_order_id=o.id and r.shop_id=o.shop_id where o.shop_id=current_shop_id() and o.status in('confirmed','preparing','ready') and o.id in(select id from scheduled_customer_orders where shop_id=current_shop_id() and status in('confirmed','preparing','ready') order by created_at desc limit 100);
 return base||accepted;
end $$;
alter function set_preparation_order_status(uuid,text) rename to set_preparation_order_status_before_finalization;
revoke all on function set_preparation_order_status_before_finalization(uuid,text) from public,anon,authenticated;
create function public.set_preparation_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier','production') then raise exception 'Production access required';end if;
 if exists(select 1 from scheduled_customer_orders where id=p_id and shop_id=current_shop_id()) then perform set_scheduled_order_status(p_id,p_status);else perform set_preparation_order_status_before_finalization(p_id,p_status);end if;
end $$;

alter function ux_workspace() rename to ux_workspace_before_finalization;
revoke all on function ux_workspace_before_finalization() from public,anon,authenticated;
create function public.ux_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare base jsonb;queue jsonb:='[]';alerts jsonb;activity jsonb:='[]';
begin
 base:=ux_workspace_before_finalization();
 if current_workspace_role() in('admin','cashier','production') then
  select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'request_id',r.id,'request_number',r.request_number,'order_number',o.order_number,'status',o.status,'pickup_at',o.pickup_at,'production_deadline',o.production_deadline,'created_at',o.created_at,'customer_instructions',coalesce(r.customer_instructions,o.note),'items',(select jsonb_agg(jsonb_build_object('product_id',x->'product_id','variant_id',x->'variant_id','name',x->'__name','qty',x->'qty')) from jsonb_array_elements(o.normalized_items)x),'customer_name',case when current_workspace_role() in('admin','cashier') then r.customer_name end,'balance_due',case when current_workspace_role() in('admin','cashier') then round(o.quoted_subtotal*(1+s.tax_rate),2)-o.deposit_total end,'has_production',exists(select 1 from production_batches b where b.shop_id=o.shop_id and b.scheduled_order_id=o.id and b.status<>'cancelled')) order by o.created_at),'[]') into queue from scheduled_customer_orders o join catalogue_preorder_requests r on r.scheduled_order_id=o.id and r.shop_id=o.shop_id join shops s on s.id=o.shop_id where o.shop_id=current_shop_id() and o.status in('confirmed','preparing','ready') and o.id in(select id from scheduled_customer_orders where shop_id=current_shop_id() and status in('confirmed','preparing','ready') order by created_at desc limit 100);
 end if;
 select coalesce(jsonb_agg(case when n->>'id' like 'request:%' then n||coalesce((select jsonb_build_object('request_number',r.request_number,'customer_name',r.customer_name,'item_count',(select coalesce(sum((x->>'qty')::numeric),0) from jsonb_array_elements(r.items)x),'preferred_method',r.preferred_method,'kind','preorder') from catalogue_preorder_requests r where r.id::text=n->>'record_id' and r.shop_id=current_shop_id() and current_workspace_role() in('admin','cashier')),'{}') else n end),'[]') into alerts from jsonb_array_elements(base->'notifications')n;
 if current_workspace_role()='admin' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]') into activity from (select e.id,e.action,e.entity_type,e.created_at,sp.display_name as actor_name from commercial_events e left join staff_profiles sp on sp.user_id=e.performed_by and sp.shop_id=e.shop_id where e.shop_id=current_shop_id() order by e.created_at desc,e.id limit 8)x;
 end if;
 return base||jsonb_build_object('accepted_orders',queue,'notifications',alerts,'activity',activity);
end $$;

-- Authorized search may match customer names on cakes/orders; production search
-- remains number-only and never receives customer identities.
do $$ declare definition text;begin
 select pg_get_functiondef('public.ux_search(text)'::regprocedure) into definition;
 definition:=replace(definition,'and order_number::text ilike q order by pickup_at desc limit 4','and (order_number::text ilike q or (r in(''admin'',''cashier'') and exists(select 1 from customers c where c.id=scheduled_customer_orders.customer_id and c.shop_id=s and c.name ilike q))) order by pickup_at desc limit 4');
 execute definition;
 select pg_get_functiondef('public.ux_save_contact_template(text,text)'::regprocedure) into definition;
 definition:=replace(definition,'''confirmation'',''deposit'',''ready'',''decline'',''more_information''','''confirmation'',''deposit'',''ready'',''decline'',''more_information'',''pickup''');execute definition;
 select pg_get_functiondef('public.get_catalogue_request_status(uuid)'::regprocedure) into definition;
 definition:=replace(definition,'r.status in(''scheduled'',''in_production'',''ready'',''collected'')','r.status in(''confirmed'',''awaiting_deposit'',''scheduled'',''in_production'',''ready'',''collected'')');execute definition;
end $$;
-- Realtime delivery uses the existing RLS-protected table and stable request ID.
-- A local PostgreSQL test database need not have the Supabase publication.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='catalogue_preorder_requests') then alter publication supabase_realtime add table public.catalogue_preorder_requests;end if;
end $$;
revoke all on function quote_catalogue_preorder(uuid,jsonb),accept_catalogue_preorder(uuid,jsonb),decline_catalogue_preorder(uuid,text),get_catalogue_preorder_receipt(uuid),record_scheduled_deposit(uuid,uuid,numeric,text),get_preparation_orders(),set_preparation_order_status(uuid,text),ux_workspace() from public,anon;
grant execute on function quote_catalogue_preorder(uuid,jsonb),accept_catalogue_preorder(uuid,jsonb),decline_catalogue_preorder(uuid,text),get_catalogue_preorder_receipt(uuid),record_scheduled_deposit(uuid,uuid,numeric,text),get_preparation_orders(),set_preparation_order_status(uuid,text),ux_workspace() to authenticated;
commit;



