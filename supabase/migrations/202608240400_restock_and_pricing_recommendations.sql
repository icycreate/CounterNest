-- CounterNest POS Phase 30.9: restock forecasts and optional profitable-price recommendations.

create table if not exists public.ingredient_stock_receipts (
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,supplier_id uuid references public.suppliers(id) on delete set null,
  packages numeric(12,3) not null check(packages>0),quantity_per_package numeric(14,3) not null check(quantity_per_package>0),
  quantity_received numeric(14,3) generated always as(round(packages*quantity_per_package,3)) stored,
  cost_per_package numeric(12,2) not null check(cost_per_package>=0),invoice_reference text,note text,
  received_by uuid not null references auth.users(id) on delete restrict,received_at timestamptz not null default now()
);

create table if not exists public.product_price_changes (
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,recipe_id uuid references public.product_recipes(id) on delete set null,
  old_price numeric(12,2) not null,new_price numeric(12,2) not null,calculated_unit_cost numeric(12,2) not null,
  target_margin_percent numeric(6,3) not null,reason text not null,changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now()
);

create index if not exists ingredient_receipts_shop_date_idx on public.ingredient_stock_receipts(shop_id,received_at desc);
create index if not exists product_price_changes_shop_date_idx on public.product_price_changes(shop_id,changed_at desc);
alter table public.ingredient_stock_receipts enable row level security;
alter table public.product_price_changes enable row level security;
drop policy if exists ingredient_receipts_admin_select on public.ingredient_stock_receipts;
create policy ingredient_receipts_admin_select on public.ingredient_stock_receipts for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
drop policy if exists product_price_changes_admin_select on public.product_price_changes;
create policy product_price_changes_admin_select on public.product_price_changes for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.receive_ingredient_stock(
  p_ingredient_id uuid,p_supplier_id uuid,p_packages numeric,p_quantity_per_package numeric,p_cost_per_package numeric,p_invoice_reference text default null,p_note text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_row public.ingredients%rowtype;v_added numeric;v_balance numeric;v_base_cost numeric;v_average numeric;v_receipt uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_packages is null or p_packages<=0 or p_quantity_per_package is null or p_quantity_per_package<=0 or p_cost_per_package is null or p_cost_per_package<0 then raise exception 'Valid package quantity, package size, and cost are required'; end if;
  if p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and shop_id=v_shop and active) then raise exception 'Active supplier not found'; end if;
  select * into v_row from public.ingredients where id=p_ingredient_id and shop_id=v_shop and active for update;
  if v_row.id is null then raise exception 'Active ingredient not found'; end if;
  v_added:=round(p_packages*p_quantity_per_package,3);v_balance:=v_row.current_quantity+v_added;v_base_cost:=p_cost_per_package/p_quantity_per_package;
  v_average:=case when v_balance=0 then 0 else ((v_row.current_quantity*v_row.average_unit_cost)+(v_added*v_base_cost))/v_balance end;
  insert into public.ingredient_stock_receipts(shop_id,ingredient_id,supplier_id,packages,quantity_per_package,cost_per_package,invoice_reference,note,received_by)
  values(v_shop,v_row.id,p_supplier_id,p_packages,p_quantity_per_package,round(p_cost_per_package,2),nullif(trim(p_invoice_reference),''),nullif(trim(p_note),''),auth.uid()) returning id into v_receipt;
  update public.ingredients set current_quantity=v_balance,average_unit_cost=round(v_average,6),preferred_supplier_id=coalesce(p_supplier_id,preferred_supplier_id),updated_at=now() where id=v_row.id;
  insert into public.ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,reference_type,reference_id,created_by)
  values(v_shop,v_row.id,'receipt',v_added,v_base_cost,v_balance,'Ingredient stock received'||coalesce(' - invoice '||nullif(trim(p_invoice_reference),''),''),'ingredient_receipt',v_receipt,auth.uid());
  return jsonb_build_object('receipt_id',v_receipt,'ingredient_id',v_row.id,'quantity_received',v_added,'new_balance',v_balance,'average_unit_cost',round(v_average,6));
end $$;

create or replace function public.get_recipe_inventory_overview() returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return jsonb_build_object(
    'suppliers',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) order by s.name),'[]'::jsonb) from public.suppliers s where s.shop_id=v_shop and s.active),
    'ingredients',(
      with scheduled as (
        select ri.ingredient_id,coalesce(sum(ri.quantity_required*pb.planned_quantity/pr.batch_yield),0) scheduled_need
        from public.production_batches pb join public.product_recipes pr on pr.product_id=pb.product_id and pr.shop_id=pb.shop_id and pr.active
        join public.recipe_items ri on ri.recipe_id=pr.id where pb.shop_id=v_shop and pb.status='scheduled' group by ri.ingredient_id
      ) select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb) from (
        select i.id,i.name,i.sku,i.base_unit,i.current_quantity,i.reorder_level,i.target_level,i.average_unit_cost,i.preferred_supplier_id,i.lead_time_days,i.active,
          coalesce(sc.scheduled_need,0) scheduled_need,greatest(0,i.target_level+coalesce(sc.scheduled_need,0)-i.current_quantity) recommended_purchase,
          case when i.current_quantity<=0 then 'out' when i.current_quantity<=i.reorder_level+coalesce(sc.scheduled_need,0) then 'low' else 'ok' end stock_status
        from public.ingredients i left join scheduled sc on sc.ingredient_id=i.id where i.shop_id=v_shop
      ) x
    ),
    'recipes',(
      with costs as (
        select pr.*,p.name product_name,p.price current_price,
          coalesce(sum(ri.quantity_required*i.average_unit_cost),0) ingredient_batch_cost,count(ri.id) ingredient_count
        from public.product_recipes pr join public.products p on p.id=pr.product_id
        left join public.recipe_items ri on ri.recipe_id=pr.id left join public.ingredients i on i.id=ri.ingredient_id
        where pr.shop_id=v_shop group by pr.id,p.name,p.price
      ) select coalesce(jsonb_agg(to_jsonb(x) order by x.product_name),'[]'::jsonb) from (
        select c.id,c.product_id,c.product_name,c.current_price,c.batch_yield,c.labor_cost,c.overhead_cost,c.packaging_cost_per_unit,c.expected_waste_percent,c.target_margin_percent,c.pricing_enabled,c.active,c.version,c.ingredient_batch_cost,c.ingredient_count,
          round(((c.ingredient_batch_cost+c.labor_cost+c.overhead_cost)/nullif(c.batch_yield*(1-c.expected_waste_percent/100),0))+c.packaging_cost_per_unit,2) calculated_unit_cost,
          round((((c.ingredient_batch_cost+c.labor_cost+c.overhead_cost)/nullif(c.batch_yield*(1-c.expected_waste_percent/100),0))+c.packaging_cost_per_unit)/nullif(1-c.target_margin_percent/100,0),2) recommended_price,
          case when c.current_price>0 then round((c.current_price-(((c.ingredient_batch_cost+c.labor_cost+c.overhead_cost)/nullif(c.batch_yield*(1-c.expected_waste_percent/100),0))+c.packaging_cost_per_unit))/c.current_price*100,1) else 0 end current_margin_percent,
          (select coalesce(jsonb_agg(jsonb_build_object('ingredient_id',ri.ingredient_id,'ingredient_name',i.name,'base_unit',i.base_unit,'quantity_required',ri.quantity_required) order by i.name),'[]'::jsonb) from public.recipe_items ri join public.ingredients i on i.id=ri.ingredient_id where ri.recipe_id=c.id) items
        from costs c
      ) x
    ),
    'recent_movements',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (select m.id,m.created_at,i.name ingredient_name,i.base_unit,m.movement_type,m.quantity_delta,m.balance_after,m.reason,coalesce(sp.display_name,'Former staff') staff_name from public.ingredient_inventory_movements m join public.ingredients i on i.id=m.ingredient_id left join public.staff_profiles sp on sp.user_id=m.created_by and sp.shop_id=m.shop_id where m.shop_id=v_shop order by m.created_at desc limit 50)x)
  );
end $$;

create or replace function public.apply_recipe_recommended_price(p_recipe_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_recipe public.product_recipes%rowtype;v_product public.products%rowtype;v_ingredient_cost numeric;v_unit_cost numeric;v_new_price numeric;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into v_recipe from public.product_recipes where id=p_recipe_id and shop_id=v_shop and active for update;
  if v_recipe.id is null then raise exception 'Active recipe not found'; end if;
  if not v_recipe.pricing_enabled then raise exception 'Pricing recommendations are disabled for this recipe'; end if;
  select * into v_product from public.products where id=v_recipe.product_id and shop_id=v_shop for update;
  select coalesce(sum(ri.quantity_required*i.average_unit_cost),0) into v_ingredient_cost from public.recipe_items ri join public.ingredients i on i.id=ri.ingredient_id where ri.recipe_id=v_recipe.id;
  v_unit_cost:=round(((v_ingredient_cost+v_recipe.labor_cost+v_recipe.overhead_cost)/nullif(v_recipe.batch_yield*(1-v_recipe.expected_waste_percent/100),0))+v_recipe.packaging_cost_per_unit,2);
  v_new_price:=round(v_unit_cost/nullif(1-v_recipe.target_margin_percent/100,0),2);
  if v_new_price is null or v_new_price<0 then raise exception 'Recommended price could not be calculated'; end if;
  update public.products set price=v_new_price,updated_at=now() where id=v_product.id;
  insert into public.product_price_changes(shop_id,product_id,recipe_id,old_price,new_price,calculated_unit_cost,target_margin_percent,reason,changed_by)
  values(v_shop,v_product.id,v_recipe.id,v_product.price,v_new_price,v_unit_cost,v_recipe.target_margin_percent,'Administrator applied recipe price recommendation',auth.uid());
  return jsonb_build_object('product_id',v_product.id,'old_price',v_product.price,'new_price',v_new_price,'calculated_unit_cost',v_unit_cost);
end $$;

revoke all on function public.receive_ingredient_stock(uuid,uuid,numeric,numeric,numeric,text,text) from public;
revoke all on function public.get_recipe_inventory_overview() from public;
revoke all on function public.apply_recipe_recommended_price(uuid) from public;
grant execute on function public.receive_ingredient_stock(uuid,uuid,numeric,numeric,numeric,text,text) to authenticated;
grant execute on function public.get_recipe_inventory_overview() to authenticated;
grant execute on function public.apply_recipe_recommended_price(uuid) to authenticated;

-- Extend the administrator backup so the new recipe and ingredient records are portable.
create or replace function public.export_business_backup() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_export uuid;v_now timestamptz:=now();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;
  insert into public.backup_exports(shop_id,schema_version,requested_by) values(v_shop,'1.6.0',auth.uid()) returning id into v_export;
  return jsonb_build_object(
    'schema_version','1.6.0','export_id',v_export,'exported_at',v_now,
    'shop',(select to_jsonb(s) from public.shops s where id=v_shop),
    'staff',(select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'display_name',display_name,'email',email,'role',role,'active',active,'created_at',created_at) order by display_name),'[]'::jsonb) from public.staff_profiles where shop_id=v_shop),
    'categories',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.categories t where shop_id=v_shop),
    'products',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.products t where shop_id=v_shop),
    'customers',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.customers t where shop_id=v_shop),
    'loyalty_programs',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.loyalty_programs t where shop_id=v_shop),
    'loyalty_memberships',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.loyalty_memberships t where shop_id=v_shop),
    'loyalty_rewards',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.loyalty_rewards t where shop_id=v_shop),
    'loyalty_point_transactions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.loyalty_point_transactions t where shop_id=v_shop),
    'loyalty_stamp_transactions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.loyalty_stamp_transactions t where shop_id=v_shop),
    'sales',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.sales t where shop_id=v_shop),
    'sale_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.sale_items t where shop_id=v_shop),
    'sale_refunds',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.sale_refunds t where shop_id=v_shop),
    'sale_refund_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.sale_refund_items t where shop_id=v_shop),
    'receipt_reprints',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.receipt_reprints t where shop_id=v_shop),
    'inventory_adjustments',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.inventory_adjustments t where shop_id=v_shop),
    'cash_drawer_sessions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.cash_drawer_sessions t where shop_id=v_shop),
    'cash_drawer_transactions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.cash_drawer_transactions t where shop_id=v_shop),
    'expense_categories',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.expense_categories t where shop_id=v_shop),
    'expenses',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.expenses t where shop_id=v_shop),
    'suppliers',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.suppliers t where shop_id=v_shop),
    'stock_receipts',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.stock_receipts t where shop_id=v_shop),
    'purchase_orders',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.purchase_orders t where shop_id=v_shop),
    'purchase_order_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.purchase_order_items t where shop_id=v_shop),
    'purchase_order_events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.purchase_order_events t where shop_id=v_shop),
    'production_batches',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.production_batches t where shop_id=v_shop),
    'issued_cards',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.issued_cards t where shop_id=v_shop),
    'card_styles',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.card_styles t where shop_id=v_shop),
    'staff_daily_cash_entries',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.staff_daily_cash_entries t where shop_id=v_shop),
    'entity_translations',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.entity_translations t where shop_id=v_shop),
    'ingredients',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.ingredients t where shop_id=v_shop),
    'ingredient_inventory_movements',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.ingredient_inventory_movements t where shop_id=v_shop),
    'ingredient_stock_receipts',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.ingredient_stock_receipts t where shop_id=v_shop),
    'product_recipes',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.product_recipes t where shop_id=v_shop),
    'recipe_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.recipe_items t where shop_id=v_shop),
    'recipe_versions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.recipe_versions t where shop_id=v_shop),
    'production_ingredient_consumption',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.production_ingredient_consumption t where shop_id=v_shop),
    'product_price_changes',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.product_price_changes t where shop_id=v_shop),
    'staff_access_audit',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.staff_access_audit t where shop_id=v_shop)
  );
end $$;
revoke all on function public.export_business_backup() from public;
grant execute on function public.export_business_backup() to authenticated;
