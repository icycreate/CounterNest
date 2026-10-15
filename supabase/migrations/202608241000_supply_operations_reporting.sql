-- CounterNest POS Phase 31.6: supply-operations dashboard and operational variance reporting.

create or replace function public.get_supply_operations(p_from date,p_to date) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Invalid date range'; end if;
  return jsonb_build_object(
    'suppliers',(select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb) from(
      select s.id,s.name,s.contact_name,s.phone,s.email,s.address,s.payment_terms_days,s.notes,s.active,
        count(distinct po.id) filter(where po.status in('ordered','partially_received')) open_orders,
        coalesce(sum(i.line_total) filter(where po.status in('ordered','partially_received')),0) open_value
      from public.suppliers s left join public.ingredient_purchase_orders po on po.supplier_id=s.id
      left join public.ingredient_purchase_order_items i on i.order_id=po.id where s.shop_id=v_shop group by s.id
    )x),
    'ingredients',(select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]'::jsonb) from(
      select id,name,base_unit,current_quantity,reorder_level,target_level,average_unit_cost,preferred_supplier_id,active from public.ingredients where shop_id=v_shop and active
    )x),
    'orders',(select coalesce(jsonb_agg(to_jsonb(x) order by x.ordered_at desc),'[]'::jsonb) from(
      select po.id,po.order_number,po.supplier_id,s.name supplier_name,po.status,po.expected_date,po.note,po.ordered_at,
        coalesce(sum(i.line_total),0) expected_total,
        coalesce(sum(i.ordered_quantity-i.received_quantity),0) remaining_quantity,
        (select coalesce(jsonb_agg(jsonb_build_object('id',li.id,'ingredient_id',li.ingredient_id,'ingredient_name',li.ingredient_name,'base_unit',li.base_unit,'ordered_quantity',li.ordered_quantity,'received_quantity',li.received_quantity,'remaining_quantity',li.ordered_quantity-li.received_quantity,'expected_unit_cost',li.expected_unit_cost,'line_total',li.line_total) order by li.ingredient_name),'[]'::jsonb) from public.ingredient_purchase_order_items li where li.order_id=po.id) items
      from public.ingredient_purchase_orders po join public.suppliers s on s.id=po.supplier_id left join public.ingredient_purchase_order_items i on i.order_id=po.id
      where po.shop_id=v_shop group by po.id,s.name order by po.ordered_at desc limit 150
    )x),
    'receipts',(select coalesce(jsonb_agg(to_jsonb(x) order by x.received_at desc),'[]'::jsonb) from(
      select r.id,r.receipt_number,r.order_id,po.order_number,s.name supplier_name,r.invoice_reference,r.note,r.received_at,coalesce(sp.display_name,'Former staff') received_by_name,
        coalesce(sum(i.actual_total),0) actual_total,coalesce(sum(i.cost_variance),0) cost_variance,
        jsonb_agg(jsonb_build_object('ingredient_name',i.ingredient_name,'base_unit',i.base_unit,'quantity_received',i.quantity_received,'expected_unit_cost',i.expected_unit_cost,'actual_unit_cost',i.actual_unit_cost,'cost_variance',i.cost_variance) order by i.ingredient_name) items
      from public.ingredient_purchase_receipts r join public.ingredient_purchase_orders po on po.id=r.order_id join public.suppliers s on s.id=r.supplier_id
      join public.ingredient_purchase_receipt_items i on i.receipt_id=r.id left join public.staff_profiles sp on sp.user_id=r.received_by and sp.shop_id=r.shop_id
      where r.shop_id=v_shop and r.received_at::date between p_from and p_to group by r.id,po.order_number,s.name,sp.display_name order by r.received_at desc limit 150
    )x),
    'waste',(select coalesce(jsonb_agg(to_jsonb(x) order by x.recorded_at desc),'[]'::jsonb) from(
      select w.id,w.waste_number,w.source_type,w.item_name,w.quantity,w.unit,w.unit_cost_snapshot,w.total_cost,w.reason_category,w.note,w.recorded_at,coalesce(sp.display_name,'Former staff') recorded_by_name
      from public.inventory_waste_events w left join public.staff_profiles sp on sp.user_id=w.recorded_by and sp.shop_id=w.shop_id
      where w.shop_id=v_shop and w.recorded_at::date between p_from and p_to order by w.recorded_at desc limit 200
    )x),
    'performance',jsonb_build_object(
      'summary',(with sold as(
          select coalesce(sum(si.line_total),0) revenue,coalesce(sum(si.qty*si.unit_cost_snapshot),0) cost from public.sale_items si join public.sales s on s.id=si.sale_id where si.shop_id=v_shop and s.created_at::date between p_from and p_to and s.status<>'voided'
        ),returned as(
          select coalesce(sum(ri.line_total),0) revenue,coalesce(sum(ri.qty*si.unit_cost_snapshot),0) cost from public.sale_refund_items ri join public.sale_items si on si.id=ri.sale_item_id join public.sale_refunds r on r.id=ri.refund_id where ri.shop_id=v_shop and r.created_at::date between p_from and p_to
        ),waste as(select coalesce(sum(total_cost),0) cost,count(*) events from public.inventory_waste_events where shop_id=v_shop and recorded_at::date between p_from and p_to),variance as(select coalesce(sum(cost_variance),0) amount from public.ingredient_purchase_receipt_items i join public.ingredient_purchase_receipts r on r.id=i.receipt_id where i.shop_id=v_shop and r.received_at::date between p_from and p_to),production as(select count(*) filter(where status='completed') completed,coalesce(sum(planned_quantity) filter(where status='completed'),0) planned,coalesce(sum(actual_quantity) filter(where status='completed'),0) actual,coalesce(sum(waste_quantity) filter(where status='completed'),0) waste from public.production_batches where shop_id=v_shop and coalesce(completed_at,created_at)::date between p_from and p_to)
        select jsonb_build_object('net_sales',s.revenue-r.revenue,'net_cogs',s.cost-r.cost,'gross_profit',(s.revenue-r.revenue)-(s.cost-r.cost),'manual_waste_cost',w.cost,'waste_events',w.events,'purchase_cost_variance',v.amount,'tracked_contribution',(s.revenue-r.revenue)-(s.cost-r.cost)-w.cost-greatest(v.amount,0),'completed_batches',p.completed,'planned_output',p.planned,'actual_output',p.actual,'production_waste',p.waste,'plan_attainment_percent',case when p.planned=0 then 0 else round(p.actual/p.planned*100,1) end) from sold s,returned r,waste w,variance v,production p),
      'waste_categories',(select coalesce(jsonb_agg(to_jsonb(x) order by x.cost desc),'[]'::jsonb) from(select reason_category,count(*) events,sum(quantity) quantity,sum(total_cost) cost from public.inventory_waste_events where shop_id=v_shop and recorded_at::date between p_from and p_to group by reason_category)x),
      'suppliers',(select coalesce(jsonb_agg(to_jsonb(x) order by x.actual_spend desc),'[]'::jsonb) from(select s.name supplier_name,count(distinct r.id) deliveries,coalesce(sum(i.actual_total),0) actual_spend,coalesce(sum(i.cost_variance),0) cost_variance from public.suppliers s left join public.ingredient_purchase_receipts r on r.supplier_id=s.id and r.received_at::date between p_from and p_to left join public.ingredient_purchase_receipt_items i on i.receipt_id=r.id where s.shop_id=v_shop group by s.id)x)
    )
  );
end $$;

create or replace function public.export_supply_operations_backup() returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return jsonb_build_object(
    'schema_version','1.8.0','exported_at',now(),'shop_id',v_shop,
    'ingredient_purchase_orders',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.ingredient_purchase_orders t where shop_id=v_shop),
    'ingredient_purchase_order_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.ingredient_purchase_order_items t where shop_id=v_shop),
    'ingredient_purchase_order_events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.ingredient_purchase_order_events t where shop_id=v_shop),
    'ingredient_purchase_receipts',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.ingredient_purchase_receipts t where shop_id=v_shop),
    'ingredient_purchase_receipt_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.ingredient_purchase_receipt_items t where shop_id=v_shop),
    'inventory_waste_events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.inventory_waste_events t where shop_id=v_shop)
  );
end $$;

-- Refresh the Phase 31 acceptance identity and include the new supply controls.
create or replace function public.run_phase31_operational_acceptance(p_notes text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();v_admins integer;v_products integer;v_negative integer;v_empty_recipes integer;v_invalid_recipe_items integer;
  v_overdue_batches integer;v_uncosted integer;v_recent_backup boolean;v_invalid_orders integer;v_overdue_orders integer;v_checks jsonb;v_status text;v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select count(*) into v_admins from public.staff_profiles where shop_id=v_shop and active and role='admin';
  select count(*) into v_products from public.products where shop_id=v_shop and active;
  select count(*) into v_negative from public.ingredients where shop_id=v_shop and current_quantity<0;
  select count(*) into v_empty_recipes from public.product_recipes pr where pr.shop_id=v_shop and pr.active and not exists(select 1 from public.recipe_items ri where ri.recipe_id=pr.id);
  select count(*) into v_invalid_recipe_items from public.recipe_items ri join public.product_recipes pr on pr.id=ri.recipe_id join public.ingredients i on i.id=ri.ingredient_id where pr.shop_id=v_shop and(ri.shop_id<>v_shop or i.shop_id<>v_shop or not i.active);
  select count(*) into v_overdue_batches from public.production_batches where shop_id=v_shop and status='scheduled' and scheduled_date<current_date;
  select count(*) into v_uncosted from public.products where shop_id=v_shop and active and coalesce(cost_price,0)=0;
  select exists(select 1 from public.backup_exports where shop_id=v_shop and requested_at>=now()-interval '30 days') into v_recent_backup;
  select count(*) into v_invalid_orders from public.ingredient_purchase_orders po join public.suppliers s on s.id=po.supplier_id where po.shop_id=v_shop and po.status in('ordered','partially_received') and(not s.active or not exists(select 1 from public.ingredient_purchase_order_items i where i.order_id=po.id));
  select count(*) into v_overdue_orders from public.ingredient_purchase_orders where shop_id=v_shop and status in('ordered','partially_received') and expected_date<current_date;
  v_checks:=jsonb_build_array(
    jsonb_build_object('id','active_admin','label','At least one active administrator','status',case when v_admins>0 then 'pass' else 'fail' end,'required',true,'detail',v_admins||' active administrator(s)'),
    jsonb_build_object('id','active_products','label','Active product catalog','status',case when v_products>0 then 'pass' else 'fail' end,'required',true,'detail',v_products||' active product(s)'),
    jsonb_build_object('id','ingredient_balances','label','No negative ingredient balances','status',case when v_negative=0 then 'pass' else 'fail' end,'required',true,'detail',v_negative||' invalid balance(s)'),
    jsonb_build_object('id','recipe_items','label','Active recipes contain ingredients','status',case when v_empty_recipes=0 then 'pass' else 'fail' end,'required',true,'detail',v_empty_recipes||' empty active recipe(s)'),
    jsonb_build_object('id','recipe_scope','label','Recipe ingredients are active and shop-scoped','status',case when v_invalid_recipe_items=0 then 'pass' else 'fail' end,'required',true,'detail',v_invalid_recipe_items||' invalid recipe line(s)'),
    jsonb_build_object('id','supply_orders','label','Open ingredient orders have active suppliers and lines','status',case when v_invalid_orders=0 then 'pass' else 'fail' end,'required',true,'detail',v_invalid_orders||' invalid open order(s)'),
    jsonb_build_object('id','recent_backup','label','Verified backup created in the last 30 days','status',case when v_recent_backup then 'pass' else 'fail' end,'required',true,'detail',case when v_recent_backup then 'Recent backup record found' else 'Create and verify a fresh backup' end),
    jsonb_build_object('id','overdue_batches','label','No overdue scheduled production','status',case when v_overdue_batches=0 then 'pass' else 'warning' end,'required',false,'detail',v_overdue_batches||' overdue batch(es)'),
    jsonb_build_object('id','overdue_supply','label','No overdue ingredient deliveries','status',case when v_overdue_orders=0 then 'pass' else 'warning' end,'required',false,'detail',v_overdue_orders||' overdue ingredient order(s)'),
    jsonb_build_object('id','product_costs','label','Active products have a unit cost','status',case when v_uncosted=0 then 'pass' else 'warning' end,'required',false,'detail',v_uncosted||' uncosted product(s)')
  );
  v_status:=case when v_admins=0 or v_products=0 or v_negative>0 or v_empty_recipes>0 or v_invalid_recipe_items>0 or v_invalid_orders>0 or not v_recent_backup then 'failed' when v_overdue_batches>0 or v_overdue_orders>0 or v_uncosted>0 then 'warning' else 'passed' end;
  insert into public.operational_acceptance_runs(shop_id,release_version,phase,status,checks,notes,run_by)
  values(v_shop,'1.8.0','31.6',v_status,v_checks,nullif(trim(p_notes),''),auth.uid()) returning id into v_id;
  return jsonb_build_object('id',v_id,'release_version','1.8.0','phase','31.6','status',v_status,'checks',v_checks,'notes',nullif(trim(p_notes),''),'run_at',now());
end $$;

revoke all on function public.get_supply_operations(date,date) from public;
revoke all on function public.export_supply_operations_backup() from public;
revoke all on function public.run_phase31_operational_acceptance(text) from public;
grant execute on function public.get_supply_operations(date,date) to authenticated;
grant execute on function public.export_supply_operations_backup() to authenticated;
grant execute on function public.run_phase31_operational_acceptance(text) to authenticated;
