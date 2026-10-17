begin;
-- Reservations are commitments, never stock movements. Existing FEFO consumption
-- and finished-batch/sale allocation ledgers remain the physical stock authority.
create table public.production_reservations (
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id),
 source_type text not null check(source_type in('batch','order')),source_id uuid not null,
 ingredient_id uuid not null references ingredients(id),quantity numeric(14,3) not null check(quantity>0),
 updated_at timestamptz not null default now(),unique(shop_id,source_type,source_id,ingredient_id)
);
create index production_reservation_ingredient on production_reservations(shop_id,ingredient_id);
alter table production_reservations enable row level security;
create policy reservation_read on production_reservations for select to authenticated using(shop_id=current_shop_id() and ops_has_permission('operations_view'));
create table public.ingredient_demand_forecasts (
 shop_id uuid not null references shops(id),ingredient_id uuid not null references ingredients(id),
 quantity numeric(14,3) not null check(quantity>=0),expires_on date not null,
 note text not null,updated_by uuid not null,updated_at timestamptz not null default now(),primary key(shop_id,ingredient_id)
);
alter table ingredient_demand_forecasts enable row level security;
create policy forecast_read on ingredient_demand_forecasts for select to authenticated using(shop_id=current_shop_id() and ops_has_permission('operations_view'));
create or replace function ingredient_reserved_quantity(p_id uuid) returns numeric language sql stable security definer set search_path=public as $$
 select coalesce(sum(quantity),0) from production_reservations where shop_id=current_shop_id() and ingredient_id=p_id and ops_has_permission('operations_view')
$$;
create or replace function ingredient_forecast_quantity(p_id uuid) returns numeric language sql stable security definer set search_path=public as $$
 select coalesce((select quantity from ingredient_demand_forecasts where shop_id=current_shop_id() and ingredient_id=p_id and expires_on>=current_date and ops_has_permission('operations_view')),0)
$$;
-- Internal trigger helper cannot be called by a browser, including another tenant.
create function sync_production_reservations(p_shop uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_shop::text,8511));
 delete from production_reservations where shop_id=p_shop;
 insert into production_reservations(shop_id,source_type,source_id,ingredient_id,quantity)
 select p_shop,'batch',b.id,q.ingredient_id,round(sum(q.quantity),3) from production_batches b
 join product_recipes r on r.product_id=b.product_id and r.shop_id=b.shop_id and r.active
 cross join lateral(
 select ri.ingredient_id,greatest(0,ri.quantity_required*b.planned_quantity/(r.batch_yield*(1-r.expected_waste_percent/100))-coalesce((select sum(bs.original_quantity_replaced) from production_batch_substitutions bs join recipe_substitution_rules sr on sr.id=bs.rule_id where bs.production_batch_id=b.id and sr.original_ingredient_id=ri.ingredient_id),0)) quantity from recipe_items ri where ri.recipe_id=r.id
 union all select sr.substitute_ingredient_id,bs.substitute_quantity_planned from production_batch_substitutions bs join recipe_substitution_rules sr on sr.id=bs.rule_id where bs.production_batch_id=b.id
 )q where b.shop_id=p_shop and b.status='scheduled' group by b.id,q.ingredient_id having round(sum(q.quantity),3)>0;
 -- A linked scheduled or completed batch covers order demand. A cancelled batch
 -- releases its commitment and lets an active order's unmet demand reappear.
 insert into production_reservations(shop_id,source_type,source_id,ingredient_id,quantity)
 select p_shop,'order',o.id,ri.ingredient_id,round(sum(ri.quantity_required*greatest(0,x.qty*x.scale-coalesce(b.covered,0))/(r.batch_yield*(1-r.expected_waste_percent/100))),3)
 from scheduled_customer_orders o cross join lateral(
 select (j->>'product_id')::uuid product_id,nullif(j->>'variant_id','')::uuid variant_id,
 sum((j->>'qty')::numeric) qty,coalesce((j->'__variant_snapshot'->>'recipe_scale')::numeric,1) scale
 from jsonb_array_elements(o.normalized_items)j group by 1,2,4
 )x join product_recipes r on r.product_id=x.product_id and r.shop_id=o.shop_id and r.active join recipe_items ri on ri.recipe_id=r.id
 left join lateral(select sum(planned_quantity) covered from production_batches where shop_id=p_shop and scheduled_order_id=o.id and product_id=x.product_id and variant_id is not distinct from x.variant_id and status<>'cancelled')b on true
 where o.shop_id=p_shop and o.status in('confirmed','preparing') group by o.id,ri.ingredient_id
 having round(sum(ri.quantity_required*greatest(0,x.qty*x.scale-coalesce(b.covered,0))/(r.batch_yield*(1-r.expected_waste_percent/100))),3)>0;
 -- One pending need per ingredient, refreshed in the same transaction. Never
 -- silently alter a need that has already been approved or ordered.
 update ingredient_purchase_needs set source_key=source_key||':history:'||id where shop_id=p_shop and source_key='production:'||ingredient_id and status in('ordered','rejected');
 insert into ingredient_purchase_needs(shop_id,ingredient_id,supplier_id,quantity,unit_cost,status,source_key,note,created_by)
 select i.shop_id,i.id,i.preferred_supplier_id,ceil((greatest(i.target_level,i.reorder_level)-i.current_quantity+coalesce(d.qty,0)+coalesce(f.quantity,0)-coalesce(po.qty,0))/coalesce(pi.package_quantity,1))*coalesce(pi.package_quantity,1),i.average_unit_cost,'pending','production:'||i.id,'Production reservation shortage',coalesce(auth.uid(),(select created_by from production_batches where shop_id=p_shop order by created_at limit 1))
 from ingredients i left join lateral(select sum(quantity) qty from production_reservations where shop_id=p_shop and ingredient_id=i.id)d on true
 left join ingredient_demand_forecasts f on f.shop_id=i.shop_id and f.ingredient_id=i.id and f.expires_on>=current_date
 left join ingredient_purchase_identification pi on pi.ingredient_id=i.id and pi.shop_id=i.shop_id
 left join lateral(select sum(oi.ordered_quantity-oi.received_quantity) qty from ingredient_purchase_order_items oi join ingredient_purchase_orders h on h.id=oi.order_id where h.shop_id=p_shop and oi.ingredient_id=i.id and h.status in('ordered','partially_received'))po on true
 where i.shop_id=p_shop and i.active and coalesce(d.qty,0)+coalesce(f.quantity,0)>0 and i.current_quantity+coalesce(po.qty,0)-coalesce(d.qty,0)-coalesce(f.quantity,0)<i.reorder_level and auth.uid() is not null
 on conflict(shop_id,source_key) do update set quantity=excluded.quantity where ingredient_purchase_needs.status='pending';
 update ingredient_purchase_needs n set status='rejected',note=coalesce(note,'')||' · Reservation released or incoming stock covers demand',source_key=source_key||':released:'||id where n.shop_id=p_shop and n.status='pending' and n.source_key='production:'||n.ingredient_id and not exists(select 1 from ingredients i where i.id=n.ingredient_id and i.shop_id=p_shop and i.active and i.current_quantity+coalesce((select sum(oi.ordered_quantity-oi.received_quantity) from ingredient_purchase_order_items oi join ingredient_purchase_orders h on h.id=oi.order_id where h.shop_id=p_shop and oi.ingredient_id=i.id and h.status in('ordered','partially_received')),0)-coalesce((select sum(quantity) from production_reservations where shop_id=p_shop and ingredient_id=i.id),0)-coalesce((select quantity from ingredient_demand_forecasts where shop_id=p_shop and ingredient_id=i.id and expires_on>=current_date),0)<i.reorder_level);
end $$;
revoke all on function sync_production_reservations(uuid) from public,anon,authenticated;
create function production_reservation_changed() returns trigger language plpgsql security definer set search_path=public as $$
declare s uuid;
begin
 s:=case when TG_OP='DELETE' then old.shop_id else new.shop_id end;
 if TG_TABLE_NAME='scheduled_customer_orders' then
 if TG_OP='UPDATE' then
 if new.status in('cancelled','completed') then
 update production_batches set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid() where shop_id=s and scheduled_order_id=new.id and status='scheduled';
 end if;
 end if;
 end if;
 if pg_trigger_depth()<2 then perform sync_production_reservations(s);end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
create trigger zz_reserve_batch after insert or update or delete on production_batches for each row execute function production_reservation_changed();
create trigger zz_reserve_order after insert or update or delete on scheduled_customer_orders for each row execute function production_reservation_changed();
create trigger zz_reserve_recipe after insert or update or delete on recipe_items for each row execute function production_reservation_changed();
create trigger zz_reserve_recipe_header after update on product_recipes for each row execute function production_reservation_changed();
create trigger zz_reserve_substitute after insert or update or delete on production_batch_substitutions for each row execute function production_reservation_changed();
create trigger zz_reserve_stock after update of current_quantity on ingredients for each row execute function production_reservation_changed();
create trigger zz_reserve_forecast after insert or update or delete on ingredient_demand_forecasts for each row execute function production_reservation_changed();
create trigger zz_reserve_purchase_line after insert or update or delete on ingredient_purchase_order_items for each row execute function production_reservation_changed();
create trigger zz_reserve_purchase after update of status on ingredient_purchase_orders for each row execute function production_reservation_changed();
do $$declare s uuid;begin for s in select id from shops loop perform sync_production_reservations(s);end loop;end $$;

alter table product_recipes add column costing_method text not null default 'latest_approved' check(costing_method in('latest_approved','weighted_average'));
create function set_recipe_costing_method(p_recipe uuid,p_method text) returns void language plpgsql security definer set search_path=public as $$
declare previous text;
begin
 if not ops_has_permission('costs_view') or not ops_has_permission('production_manage') then raise exception 'Recipe cost management access required';end if;
 if p_method not in('latest_approved','weighted_average') then raise exception 'Invalid costing method';end if;
 select costing_method into previous from product_recipes where id=p_recipe and shop_id=current_shop_id() for update;
 if not found then raise exception 'Recipe not found';end if;
 update product_recipes set costing_method=p_method where id=p_recipe;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),'recipe',p_recipe,'costing_method',jsonb_build_object('old',previous,'new',p_method),auth.uid());
end $$;
create function set_ingredient_forecast(p_ingredient uuid,p_quantity numeric,p_expires date,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare previous jsonb;
begin
 if not ops_has_permission('production_manage') then raise exception 'Production management access required';end if;
 if p_quantity is null or p_quantity<0 or p_expires<current_date or p_expires>current_date+365 or length(trim(coalesce(p_note,'')))<3 then raise exception 'Valid forecast quantity, date and note required';end if;
 if not exists(select 1 from ingredients where id=p_ingredient and shop_id=current_shop_id()) then raise exception 'Ingredient not found';end if;
 select to_jsonb(f) into previous from ingredient_demand_forecasts f where shop_id=current_shop_id() and ingredient_id=p_ingredient;
 insert into ingredient_demand_forecasts values(current_shop_id(),p_ingredient,p_quantity,p_expires,trim(p_note),auth.uid(),now()) on conflict(shop_id,ingredient_id) do update set quantity=excluded.quantity,expires_on=excluded.expires_on,note=excluded.note,updated_by=auth.uid(),updated_at=now();
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),'ingredient',p_ingredient,'forecast_changed',jsonb_build_object('old',previous,'new',jsonb_build_object('quantity',p_quantity,'expires_on',p_expires),'reason',trim(p_note)),auth.uid());
end $$;
create function create_projected_purchase_need(p_ingredient uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare i ingredients%rowtype;need uuid;incoming numeric;pack numeric;qty numeric;
begin
 if not ops_has_permission('purchase_create') then raise exception 'Purchase creation access required';end if;
 select * into i from ingredients where id=p_ingredient and shop_id=current_shop_id() and active for update;
 if not found then raise exception 'Ingredient not found';end if;
 select id into need from ingredient_purchase_needs where shop_id=i.shop_id and ingredient_id=i.id and status in('pending','approved') and (source_key='production:'||i.id or source_key='projected:'||i.id) order by created_at limit 1;
 if need is not null then return need;end if;
 select coalesce(sum(oi.ordered_quantity-oi.received_quantity),0) into incoming from ingredient_purchase_order_items oi join ingredient_purchase_orders h on h.id=oi.order_id where h.shop_id=i.shop_id and oi.ingredient_id=i.id and h.status in('ordered','partially_received');
 select coalesce((select package_quantity from ingredient_supplier_offers where shop_id=i.shop_id and ingredient_id=i.id and approved order by preferred desc,created_at desc limit 1),(select package_quantity from ingredient_purchase_identification where ingredient_id=i.id),1) into pack;
 qty:=ceil(greatest(0,i.target_level-i.current_quantity-incoming+ingredient_reserved_quantity(i.id)+ingredient_forecast_quantity(i.id))/pack)*pack;
 if qty<=0 then raise exception 'No additional purchase is required';end if;
 update ingredient_purchase_needs set source_key=source_key||':history:'||id where shop_id=i.shop_id and source_key='projected:'||i.id and status in('ordered','rejected');
 need:=create_ingredient_purchase_need(i.id,qty,i.preferred_supplier_id,i.average_unit_cost,'Projected stock recommendation');
 update ingredient_purchase_needs set source_key='projected:'||i.id where id=need;
 return need;
end $$;
revoke all on function create_projected_purchase_need(uuid) from public,anon;grant execute on function create_projected_purchase_need(uuid) to authenticated;
create function get_recipe_cost_intelligence() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not ops_has_permission('costs_view') then raise exception 'Cost access required';end if;
 return(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (
 select z.*,round(ingredient_cost+packaging_cost+labor_cost+overhead_cost,2) total_recipe_cost,
 round((ingredient_cost+packaging_cost+labor_cost+overhead_cost)/effective_yield,4) cost_per_unit,
 round(selling_price-(ingredient_cost+packaging_cost+labor_cost+overhead_cost)/effective_yield,2) gross_profit,
 case when selling_price>0 then round(100*(1-(ingredient_cost+packaging_cost+labor_cost+overhead_cost)/effective_yield/selling_price),2) else 0 end gross_margin,
 selling_price<(ingredient_cost+packaging_cost+labor_cost+overhead_cost)/effective_yield/(1-target_margin_percent/100) below_target
 from(select r.id,p.name,r.costing_method,r.target_margin_percent,r.labor_cost,r.overhead_cost,r.batch_yield*(1-r.expected_waste_percent/100) effective_yield,
 r.packaging_cost_per_unit*r.batch_yield*(1-r.expected_waste_percent/100) packaging_cost,p.price selling_price,
 coalesce((select sum(ri.quantity_required*case when r.costing_method='latest_approved' then coalesce((select normalized_unit_cost from ingredient_supplier_offers o where o.shop_id=r.shop_id and o.ingredient_id=i.id and approved order by created_at desc,id desc limit 1),i.average_unit_cost) else i.average_unit_cost end) from recipe_items ri join ingredients i on i.id=ri.ingredient_id where ri.recipe_id=r.id),0) ingredient_cost
 from product_recipes r join products p on p.id=r.product_id where r.shop_id=current_shop_id() and r.active)z
 )q);
end $$;

create function get_supplier_lot_recall(p_lot uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not ops_has_permission('recall_manage') then raise exception 'Recall management access required';end if;
 if not exists(select 1 from ingredient_lots where id=p_lot and shop_id=current_shop_id()) then raise exception 'Lot not found';end if;
 return jsonb_build_object('lot',(select jsonb_build_object('id',l.id,'lot_code',l.lot_code,'supplier_id',l.supplier_id,'ingredient_id',l.ingredient_id,'status',l.status) from ingredient_lots l where l.id=p_lot),
 'batches',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select distinct b.id,b.batch_number,b.product_id,b.product_name,b.status,b.scheduled_order_id,r.id recipe_id from ingredient_lot_allocations a join production_batches b on b.id=a.production_batch_id left join product_recipes r on r.product_id=b.product_id and r.shop_id=b.shop_id where a.lot_id=p_lot and a.shop_id=current_shop_id())q),
 'sales',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select distinct a.sale_id,a.sale_item_id,a.quantity_allocated,a.quantity_returned from ingredient_lot_allocations il join finished_product_batches f on f.production_batch_id=il.production_batch_id join finished_product_batch_sale_allocations a on a.finished_batch_id=f.id where il.lot_id=p_lot and il.shop_id=current_shop_id() union select distinct si.sale_id,va.sale_item_id,va.quantity,va.returned from ingredient_lot_allocations il join variant_stock_lots vl on vl.production_batch_id=il.production_batch_id join variant_stock_allocations va on va.lot_id=vl.id join sale_items si on si.id=va.sale_item_id where il.lot_id=p_lot and il.shop_id=current_shop_id())q),
 'finished_batches',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select distinct f.id,f.batch_code,f.product_id,f.best_before_on,f.status from ingredient_lot_allocations il join finished_product_batches f on f.production_batch_id=il.production_batch_id where il.lot_id=p_lot and il.shop_id=current_shop_id())q),
 'orders',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select distinct o.id,o.order_number,o.status,o.sale_id from ingredient_lot_allocations a join production_batches b on b.id=a.production_batch_id join scheduled_customer_orders o on o.id=b.scheduled_order_id where a.lot_id=p_lot and a.shop_id=current_shop_id())q));
end $$;
create function get_production_operations(p_search text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;s uuid:=current_shop_id();
begin
 if not ops_has_permission('operations_view') then raise exception 'Operations access required';end if;
 if length(coalesce(p_search,''))>100 or p_offset<0 or p_offset>100000 then raise exception 'Invalid operation search';end if;
 select jsonb_build_object('permissions',(select coalesce(jsonb_agg(k),'[]') from unnest(array['production_manage','costs_view','waste_record','recall_manage','purchase_create'])k where ops_has_permission(k)), 'ingredients',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (
 select z.*,on_hand+incoming-reserved-forecast projected_available,
 case when on_hand+incoming-reserved-forecast<=reorder_level then 'Buy Now' when on_hand+incoming-reserved-forecast<target_level then 'Buy Soon' when target_level>0 and on_hand+incoming-reserved-forecast>target_level*1.5 then 'Overstock Risk' else 'Enough Stock' end classification,
 ceil(greatest(0,target_level-(on_hand+incoming-reserved-forecast))/pack_size)*pack_size suggested_quantity
 from(select i.id,i.name,i.base_unit,i.current_quantity on_hand,i.reorder_level,i.target_level,ingredient_reserved_quantity(i.id) reserved,ingredient_forecast_quantity(i.id) forecast,
 coalesce((select sum(oi.ordered_quantity-oi.received_quantity) from ingredient_purchase_order_items oi join ingredient_purchase_orders h on h.id=oi.order_id where h.shop_id=s and oi.ingredient_id=i.id and h.status in('ordered','partially_received')),0) incoming,
 coalesce((select package_quantity from ingredient_supplier_offers where shop_id=s and ingredient_id=i.id and approved order by preferred desc,created_at desc limit 1),(select package_quantity from ingredient_purchase_identification where ingredient_id=i.id and shop_id=s),1) pack_size
 from ingredients i where i.shop_id=s and i.active and i.name ilike '%'||coalesce(p_search,'')||'%' order by i.name limit 50 offset p_offset)z)q),
 'lots',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select l.id,l.ingredient_id,i.name,l.lot_code,l.supplier_id,l.expires_on,l.received_at,l.remaining_quantity,l.status,
 case when l.expires_on<current_date then 'Expired' when l.expires_on<=current_date+14 then 'Expiring Soon' else 'Use First' end expiry_label
 from ingredient_lots l join ingredients i on i.id=l.ingredient_id where l.shop_id=s and l.remaining_quantity>0 and i.name ilike '%'||coalesce(p_search,'')||'%' order by l.expires_on nulls last,l.received_at limit 50 offset p_offset)q),
 'batches',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select b.id,b.batch_number,b.product_name,b.scheduled_date,b.planned_quantity,b.scheduled_order_id,b.status,
 exists(select 1 from production_reservations r join ingredients i on i.id=r.ingredient_id where r.source_id=b.id and r.source_type='batch' and i.current_quantity<ingredient_reserved_quantity(i.id)) blocked
 from production_batches b where b.shop_id=s and b.status='scheduled' order by b.scheduled_date limit 50)q),
 'waste_causes',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select reason_category,count(*) events,sum(quantity) quantity,case when ops_has_permission('costs_view') then sum(total_cost) end cost from inventory_waste_events where shop_id=s and recorded_at>=now()-interval '30 days' group by reason_category order by sum(total_cost) desc)q),
 'waste_items',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select item_name,source_type,unit,sum(quantity) quantity,case when ops_has_permission('costs_view') then sum(total_cost) end cost from inventory_waste_events where shop_id=s and recorded_at>=now()-interval '30 days' group by item_name,source_type,unit order by sum(total_cost) desc limit 10)q),
 'waste_trend',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select recorded_at::date as day,count(*) events,case when ops_has_permission('costs_view') then sum(total_cost) end cost from inventory_waste_events where shop_id=s and recorded_at>=now()-interval '30 days' group by 1 order by 1)q),
 'recipes',case when ops_has_permission('costs_view') then get_recipe_cost_intelligence() else '[]'::jsonb end) into result;
 return result;
end $$;
revoke all on function production_reservation_changed(),ingredient_reserved_quantity(uuid),ingredient_forecast_quantity(uuid),set_recipe_costing_method(uuid,text),set_ingredient_forecast(uuid,numeric,date,text),get_recipe_cost_intelligence(),get_supplier_lot_recall(uuid),get_production_operations(text,integer) from public,anon;
grant execute on function ingredient_reserved_quantity(uuid),ingredient_forecast_quantity(uuid),set_recipe_costing_method(uuid,text),set_ingredient_forecast(uuid,numeric,date,text),get_recipe_cost_intelligence(),get_supplier_lot_recall(uuid),get_production_operations(text,integer) to authenticated;
-- Waste keeps its existing stock/lot ledger transaction and gains the two
-- requested operational categories and permission-scoped access.
alter table inventory_waste_events drop constraint inventory_waste_events_reason_category_check;
alter table inventory_waste_events add constraint inventory_waste_events_reason_category_check check(reason_category in('expired','damaged','quality','overproduction','handling','count_correction','other','preparation_error','customer_return'));
do $$declare definition text;begin
 select pg_get_functiondef('record_inventory_waste(text,uuid,numeric,text,text,uuid)'::regprocedure) into definition;
 definition:=replace(definition,'not public.is_admin()','not public.ops_has_permission(''waste_record'')');
 definition:=replace(definition,'''count_correction'',''other''','''count_correction'',''other'',''preparation_error'',''customer_return''');
 definition:=replace(definition,'''estimated_cost'',round(p_quantity*v_cost,2)','''estimated_cost'',case when ops_has_permission(''costs_view'') then round(p_quantity*v_cost,2) else null end');
 execute definition;
end $$;
create function production_waste_snapshot() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='completed' and old.status<>'completed' and new.waste_quantity>0 then
 insert into inventory_waste_events(shop_id,source_type,product_id,item_name,quantity,unit,unit_cost_snapshot,reason_category,note,production_batch_id,recorded_by)
 select new.shop_id,'product',new.product_id,new.product_name,new.waste_quantity,'each',coalesce(cost_price,0),'preparation_error',coalesce(new.completion_note,'Production completion waste'),new.id,new.completed_by from products where id=new.product_id;
 end if;return new;
end $$;
create trigger z_production_waste after update on production_batches for each row execute function production_waste_snapshot();
revoke all on function production_waste_snapshot() from public,anon,authenticated;

-- A single bounded projection supplies daily dashboard exceptions. IDs describe
-- the underlying problem, so polling and repeated refreshes cannot duplicate it.
alter function ux_workspace() rename to ux_workspace_before_operations;
revoke all on function ux_workspace_before_operations() from public,anon,authenticated;
create function ux_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare base jsonb;items jsonb;s uuid:=current_shop_id();operational jsonb;
begin
 base:=ux_workspace_before_operations();
 if not ops_has_permission('operations_view') then return base;end if;
 operational:=get_production_operations('',0);
 select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object(
 'title_key',case split_part(q.id,':',1) when 'ops-shortage' then 'Production Shortage' when 'ops-low' then 'Low Stock' when 'ops-expiry' then case when exists(select 1 from ingredient_lots where id=q.record_id::uuid and expires_on<current_date) then 'Expired' else 'Expiring Soon' end when 'ops-late' then 'Purchase Order Late' when 'ops-approval' then 'Purchase Approval Required' else 'Abnormal Waste' end,
 'business_label',case when q.kind='ingredient' then (select name from ingredients where id=q.record_id::uuid and shop_id=s) when q.kind='expiry' then (select i.name||' · '||l.lot_code from ingredient_lots l join ingredients i on i.id=l.ingredient_id where l.id=q.record_id::uuid and l.shop_id=s) when q.kind='purchase_order' then (select '#'||order_number from ingredient_purchase_orders where id=q.record_id::uuid and shop_id=s) when q.kind='purchase_need' then (select i.name from ingredient_purchase_needs n join ingredients i on i.id=n.ingredient_id where n.id=q.record_id::uuid and n.shop_id=s) else '' end
 ) order by priority,created_at desc),'[]') into items from (
 select 'ops-shortage:'||i.id id,i.name||' · '||'Production Shortage' title,'critical'::text severity,now() created_at,'planning'::text page,i.id::text record_id,'ingredient'::text kind,0 priority
 from ingredients i where i.shop_id=s and i.active and i.current_quantity<ingredient_reserved_quantity(i.id)
 union all select 'ops-low:'||i.id,i.name||' · Low Stock','warning',i.updated_at,'supply',i.id::text,'ingredient',1 from ingredients i where i.shop_id=s and i.active and i.current_quantity< i.reorder_level and ingredient_reserved_quantity(i.id)<=i.current_quantity
 union all select 'ops-expiry:'||l.id,i.name||' · '||case when l.expires_on<current_date then 'Expired' else 'Expiring Soon' end,'warning',l.received_at,'supply',l.id::text,'expiry',1 from ingredient_lots l join ingredients i on i.id=l.ingredient_id where l.shop_id=s and l.status='active' and l.remaining_quantity>0 and l.expires_on<=current_date+14
 union all select 'ops-late:'||h.id,'Purchase Order Late #'||h.order_number,'warning',h.ordered_at,'purchasing',h.id::text,'purchase_order',1 from ingredient_purchase_orders h where h.shop_id=s and h.status in('ordered','partially_received') and h.expected_date<current_date
 union all select 'ops-approval:'||n.id,'Purchase Approval Required · '||i.name,'warning',n.created_at,'purchasing',n.id::text,'purchase_need',1 from ingredient_purchase_needs n join ingredients i on i.id=n.ingredient_id where n.shop_id=s and n.status='pending' and ops_has_permission('purchase_approve')
 union all select 'ops-waste:'||current_date,'Abnormal Waste','warning',now(),'supply',s::text,'waste',1 where ops_has_permission('costs_view') and (select coalesce(sum(total_cost),0) from inventory_waste_events where shop_id=s and recorded_at::date=current_date)>greatest(100,(select coalesce(sum(total_cost),0)/7*2 from inventory_waste_events where shop_id=s and recorded_at::date>=current_date-7 and recorded_at::date<current_date))
 order by priority,created_at desc limit 50)q;
 return base||jsonb_build_object('operational',operational,'notifications',
 (select coalesce(jsonb_agg(value order by case when value->>'severity'='critical' then 0 else 1 end),'[]') from jsonb_array_elements(items||coalesce(base->'notifications','[]')) where value->>'id' not like 'shortage:%' and value->>'id' not like 'expiry:%'),
 'counts',(base->'counts')||jsonb_build_object('purchase_needs',(select count(*) from ingredient_purchase_needs where shop_id=s and status in('pending','approved')),'waste_today_events',(select count(*) from inventory_waste_events where shop_id=s and recorded_at::date=current_date),'ingredient_shortages',(select count(*) from ingredients i where i.shop_id=s and i.current_quantity<ingredient_reserved_quantity(i.id))));
end $$;
revoke all on function ux_workspace() from public,anon;grant execute on function ux_workspace() to authenticated;
commit;
