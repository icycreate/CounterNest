-- RC1 security fixes. Append-only upgrade from migration 77; no historical rows are removed.
begin;

-- A temporary-password account may read its own status and change its password,
-- but must not operate a shop through direct API calls before completing setup.
create or replace function public.current_shop_id()
returns uuid language sql stable security definer set search_path=public as $$
  select shop_id from public.staff_profiles
  where user_id=auth.uid() and active and not must_change_password limit 1;
$$;

create or replace function public.current_staff_role()
returns public.staff_role language sql stable security definer set search_path=public as $$
  select role from public.staff_profiles
  where user_id=auth.uid() and active and not must_change_password limit 1;
$$;

create policy staff_own_setup_status on public.staff_profiles
  for select to authenticated using(user_id=auth.uid() and active);

-- Support the existing FEFO, refund, kitchen and pickup queries as history grows.
create index if not exists rc1_variant_lots_fefo
  on public.variant_stock_lots(variant_id,best_before_on,produced_at,id)
  where status='active' and remaining_quantity>0;
create index if not exists rc1_variant_allocations_sale_item
  on public.variant_stock_allocations(sale_item_id,lot_id);
create index if not exists rc1_selection_kitchen
  on public.customer_selection_requests(shop_id,status,created_at);
create index if not exists rc1_scheduled_pickup
  on public.scheduled_customer_orders(shop_id,pickup_at);

-- One checkout intent commits one sale, including cash tender. A retry after a
-- lost response returns the first result rather than deducting inventory again.
create table public.pos_checkout_requests(
  shop_id uuid not null references public.shops(id),
  checkout_id uuid not null,
  staff_user_id uuid not null references auth.users(id),
  request_payload jsonb not null,
  sale_id uuid references public.sales(id),
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key(shop_id,checkout_id)
);
alter table public.pos_checkout_requests enable row level security;
revoke all on public.pos_checkout_requests from anon,authenticated;
grant select on public.pos_checkout_requests to authenticated;
create policy checkout_intent_read on public.pos_checkout_requests
  for select to authenticated using(shop_id=public.current_shop_id() and (staff_user_id=auth.uid() or public.is_admin()));
create index rc1_checkout_sale on public.pos_checkout_requests(sale_id);

create function public.complete_pos_checkout(
  p_checkout_id uuid,p_customer_id uuid,p_payment_method text,p_items jsonb,
  p_reward_id uuid default null,p_request_id uuid default null,p_cash_received numeric default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();
  v_payload jsonb;
  v_attempt public.pos_checkout_requests%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null or v_shop is null then raise exception 'Active staff with a private password required'; end if;
  if p_checkout_id is null then raise exception 'Checkout reference required'; end if;
  if p_payment_method not in ('cash','card','qr') then raise exception 'Invalid payment method'; end if;
  if p_payment_method='cash' and (p_cash_received is null or p_cash_received<0 or p_cash_received::text in ('NaN','Infinity','-Infinity')) then raise exception 'Valid cash tender required'; end if;
  if p_payment_method<>'cash' and p_cash_received is not null then raise exception 'Cash tender applies only to cash sales'; end if;
  v_payload:=jsonb_build_object('customer',p_customer_id,'method',p_payment_method,'items',p_items,'reward',p_reward_id,'request',p_request_id,'cash_received',p_cash_received);
  insert into public.pos_checkout_requests(shop_id,checkout_id,staff_user_id,request_payload)
    values(v_shop,p_checkout_id,auth.uid(),v_payload) on conflict do nothing;
  select * into v_attempt from public.pos_checkout_requests
    where shop_id=v_shop and checkout_id=p_checkout_id for update;
  if v_attempt.staff_user_id<>auth.uid() then raise exception 'Checkout reference belongs to another staff member'; end if;
  if v_attempt.request_payload is distinct from v_payload then raise exception 'Checkout reference already used for a different order'; end if;
  if v_attempt.result is not null then return v_attempt.result||jsonb_build_object('replayed',true); end if;
  v_result:=public.complete_catalogue_sale(p_customer_id,p_payment_method,p_items,p_reward_id,p_request_id);
  if p_payment_method='cash' then
    v_result:=v_result||public.record_cash_tender((v_result->>'sale_id')::uuid,p_cash_received);
  end if;
  update public.pos_checkout_requests set sale_id=(v_result->>'sale_id')::uuid,result=v_result,completed_at=now()
    where shop_id=v_shop and checkout_id=p_checkout_id;
  insert into public.commercial_events(shop_id,entity_type,entity_id,action,details,performed_by)
    values(v_shop,'checkout',p_checkout_id,'completed',jsonb_build_object('sale_id',v_result->>'sale_id','total',v_result->'total'),auth.uid());
  return v_result||jsonb_build_object('replayed',false);
end $$;
revoke all on function public.complete_pos_checkout(uuid,uuid,text,jsonb,uuid,uuid,numeric) from public;
grant execute on function public.complete_pos_checkout(uuid,uuid,text,jsonb,uuid,uuid,numeric) to authenticated;

-- A physical stock count must compare the operator's snapshot while holding
-- the same product lock used by sales; stale screens cannot silently set stock.
create function public.set_product_stock_checked(p_product_id uuid,p_expected_stock numeric,p_target_stock numeric,p_reason text)
returns numeric language plpgsql security definer set search_path=public as $$
declare v_stock numeric;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_target_stock is null or p_target_stock<0 or p_target_stock::text in ('NaN','Infinity','-Infinity') then raise exception 'Valid target stock required'; end if;
  select stock into v_stock from public.products where id=p_product_id and shop_id=public.current_shop_id() for update;
  if not found then raise exception 'Product not found'; end if;
  if v_stock is distinct from p_expected_stock then raise exception 'Stock changed since this count was opened. Refresh the balance and review the count before saving again.'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A stock-count reason is required'; end if;
  if v_stock=p_target_stock then return v_stock; end if;
  return public.adjust_stock(p_product_id,p_target_stock-v_stock,p_reason);
end $$;
revoke all on function public.set_product_stock_checked(uuid,numeric,numeric,text) from public;
grant execute on function public.set_product_stock_checked(uuid,numeric,numeric,text) to authenticated;

-- Preserve the existing portable format and append records introduced after
-- its last extension. Auth secrets and staff PIN hashes remain excluded.
alter function public.export_business_backup() rename to export_business_backup_pre_rc1;
revoke all on function public.export_business_backup_pre_rc1() from public,anon,authenticated;
create function public.export_business_backup()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_base jsonb;v_records jsonb:='{}';v_rows jsonb;v_table text;
begin
  if auth.uid() is null or v_shop is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  v_base:=public.export_business_backup_pre_rc1();
  foreach v_table in array array[
    'customer_display_configs','customer_selection_requests','customer_selection_items','inventory_supply_attachments',
    'ingredient_conversion_rules','ingredient_conversion_outputs','ingredient_conversion_runs','ingredient_conversion_run_outputs','ingredient_conversion_lot_links',
    'recipe_preparation_guides','recipe_preparation_steps','recipe_substitution_rules','production_batch_substitutions','production_variance_reviews','production_variance_lines',
    'production_training_acknowledgements','production_suite_acceptance_runs','supply_document_reviews','catalogue_product_options','catalogue_price_history','catalogue_view_events',
    'product_variants','variant_inventory_events','commercial_events','variant_stock_lots','variant_stock_allocations','catalogue_combos','customer_order_counters',
    'scheduled_customer_orders','scheduled_order_deposits','production_shortage_alerts','pos_checkout_requests'
  ] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from public.%I t where t.shop_id=$1',v_table) into v_rows using v_shop;
    v_records:=v_records||jsonb_build_object(v_table,v_rows);
  end loop;
  update public.backup_exports set schema_version='2.0.0-rc.1' where id=(v_base->>'export_id')::uuid and shop_id=v_shop;
  return (v_base-'schema_version')||jsonb_build_object('schema_version','2.0.0-rc.1','rc1_records',v_records);
end $$;
revoke all on function public.export_business_backup() from public,anon;
grant execute on function public.export_business_backup() to authenticated;

commit;
