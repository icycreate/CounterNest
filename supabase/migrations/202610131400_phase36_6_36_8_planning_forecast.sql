create or replace function public.schedule_planned_production_batch(
  p_product_id uuid,p_scheduled_date date,p_planned_quantity numeric,p_note text default null,p_allow_shortage boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_name text;v_id uuid;v_preview jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_scheduled_date is null or p_scheduled_date<(now() at time zone (select timezone from shops where id=v_shop))::date or p_planned_quantity is null or p_planned_quantity<=0 then raise exception 'A current or future date and valid planned quantity are required'; end if;
  select name into v_name from public.products where id=p_product_id and shop_id=v_shop and active;
  if v_name is null then raise exception 'Active product not found'; end if;
  v_preview:=public.preview_production_plan(p_product_id,p_planned_quantity);
  if coalesce((v_preview->>'has_shortage')::boolean,false) and not p_allow_shortage then raise exception 'Ingredient shortage detected. Review the plan or explicitly allow the shortage override.'; end if;
  insert into public.production_batches(shop_id,product_id,product_name,scheduled_date,planned_quantity,note,created_by,planning_snapshot,shortage_override,planning_recipe_version)
  values(v_shop,p_product_id,v_name,p_scheduled_date,p_planned_quantity,nullif(trim(p_note),''),auth.uid(),v_preview,coalesce((v_preview->>'has_shortage')::boolean,false) and p_allow_shortage,nullif(v_preview->>'recipe_version','')::integer)
  returning id into v_id;
  return jsonb_build_object('batch_id',v_id,'preview',v_preview,'shortage_override',coalesce((v_preview->>'has_shortage')::boolean,false) and p_allow_shortage);
end $$;


create function public.schedule_commercial_production(p_product uuid,p_variant uuid,p_date date,p_quantity numeric,p_order uuid default null,p_override boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare v product_variants%rowtype;v_id uuid;result jsonb;scale numeric:=1;o scheduled_customer_orders%rowtype;
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 if p_variant is not null then select * into v from product_variants where id=p_variant and product_id=p_product and shop_id=current_shop_id() and active;if not found then raise exception 'Variant unavailable';end if;scale:=v.recipe_scale;end if;
 if p_order is not null then
 select * into o from scheduled_customer_orders where id=p_order and shop_id=current_shop_id() for update;if not found or o.status in('completed','cancelled') then raise exception 'Order unavailable';end if;
 if exists(select 1 from production_batches where scheduled_order_id=p_order and product_id=p_product and variant_id is not distinct from p_variant and status<>'cancelled') then raise exception 'Production already scheduled for this order and product/variant';end if;
 if p_date>(o.production_deadline at time zone (select timezone from shops where id=o.shop_id))::date then raise exception 'Production is after the order deadline';end if;
 end if;
 result:=schedule_planned_production_batch(p_product,p_date,p_quantity*scale,case when p_order is null then 'Manager-approved demand forecast' else 'Scheduled customer order '||o.order_number end,p_override);
 v_id:=(result->>'batch_id')::uuid;
 if v_id is null then raise exception 'Production scheduling did not return a batch';end if;
 update production_batches set variant_id=p_variant,variant_scale_snapshot=scale,scheduled_order_id=p_order where id=v_id;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),'production',v_id,'approved',jsonb_build_object('quantity',p_quantity,'scale',scale,'order',p_order),auth.uid());return v_id;
end $$;
create function public.transfer_completed_variant_batch() returns trigger language plpgsql security definer set search_path=public as $$
declare v product_variants%rowtype;b finished_product_batches%rowtype;amount numeric;cost numeric;
begin
 if new.status='completed' and old.status<>'completed' and new.variant_id is not null then
 select * into v from product_variants where id=new.variant_id and shop_id=new.shop_id for update;
 if v.independent_stock then
 select * into b from finished_product_batches where production_batch_id=new.id and status='active' for update;
 if b.id is null then raise exception 'Finished batch was not created for variant production';end if;
 amount:=b.remaining_quantity/new.variant_scale_snapshot;cost:=case when exists(select 1 from product_recipes where product_id=new.product_id and shop_id=new.shop_id and active) then b.unit_cost_snapshot*new.variant_scale_snapshot else coalesce(v.unit_cost,b.unit_cost_snapshot*new.variant_scale_snapshot) end;
 insert into variant_stock_lots(shop_id,product_id,variant_id,batch_code,produced_quantity,remaining_quantity,unit_cost_snapshot,best_before_on,status,created_by,production_batch_id)
 values(new.shop_id,new.product_id,new.variant_id,b.batch_code,amount,amount,cost,b.best_before_on,'active',auth.uid(),new.id);
 update finished_product_batches set remaining_quantity=0,status='depleted' where id=b.id;
 update products set stock=stock-b.remaining_quantity where id=new.product_id;
 update product_variants set stock=stock+amount,unit_cost=cost where id=v.id;
 insert into variant_inventory_events(shop_id,variant_id,delta,reason,performed_by) values(new.shop_id,v.id,amount,'Completed production '||new.id,auth.uid());
 end if;end if;return new;
end $$;
-- Alphabetical trigger ordering runs this after the existing finished_batch_from_production_trigger.
create trigger variant_transfer_completed after update on production_batches for each row execute function transfer_completed_variant_batch();

create function public.get_production_forecast(p_date date,p_lookback integer default 28,p_weekday boolean default true,p_buffer numeric default 10)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=current_shop_id();days_count integer;tz text;today date;
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 if p_date is null or p_lookback not between 7 and 180 or p_buffer not between 0 and 100 then raise exception 'Invalid forecast parameters';end if;
 select timezone into tz from shops where id=v_shop;
 today:=(now() at time zone tz)::date;
 select count(*) into days_count from generate_series(today-p_lookback,today-1,interval '1 day')d where not p_weekday or extract(dow from d)=extract(dow from p_date);
 return jsonb_build_object('eligible_days',days_count,'method',case when p_weekday then 'Mean daily units on matching weekdays, including zero-sales days' else 'Mean daily units across all lookback days, including zero-sales days' end,'products',(
 select coalesce(jsonb_agg(to_jsonb(x) order by x.suggested desc,x.name),'[]') from (
 select p.id,p.name,round(coalesce(h.units,0)/greatest(days_count,1),2) recent_average,
 p.stock+coalesce((select sum(stock*recipe_scale) from product_variants where product_id=p.id and independent_stock and active),0) current_stock,
 coalesce(o.units,0) preorder_units,coalesce(b.units,0) planned_units,
 greatest(0,ceil(coalesce(h.units,0)/greatest(days_count,1)*(1+p_buffer/100)+coalesce(o.units,0)-p.stock-coalesce((select sum(stock*recipe_scale) from product_variants where product_id=p.id and independent_stock and active),0)-coalesce(b.units,0))) suggested
 from products p
 left join lateral(select sum(greatest(si.qty-coalesce((select sum(qty) from sale_refund_items where sale_item_id=si.id),0),0)*coalesce((si.variant_snapshot->>'recipe_scale')::numeric,1)) units from sale_items si join sales s on s.id=si.sale_id where si.product_id=p.id and s.shop_id=v_shop and s.status not in('refunded','voided') and (s.created_at at time zone tz)::date>=today-p_lookback and (s.created_at at time zone tz)::date<today and(not p_weekday or extract(dow from s.created_at at time zone tz)=extract(dow from p_date)))h on true
 left join lateral(select sum((i->>'qty')::numeric*coalesce((i->'__variant_snapshot'->>'recipe_scale')::numeric,1)) units from scheduled_customer_orders q cross join jsonb_array_elements(q.normalized_items)i where q.shop_id=v_shop and q.status in('confirmed','preparing','ready') and(q.pickup_at at time zone tz)::date=p_date and(i->>'product_id')::uuid=p.id)o on true
 left join lateral(select sum(planned_quantity) units from production_batches where shop_id=v_shop and product_id=p.id and scheduled_date=p_date and status='scheduled')b on true
 where p.shop_id=v_shop and p.active)x));
end $$;
revoke all on function public.schedule_commercial_production(uuid,uuid,date,numeric,uuid,boolean),public.get_production_forecast(date,integer,boolean,numeric) from public;
grant execute on function public.schedule_commercial_production(uuid,uuid,date,numeric,uuid,boolean),public.get_production_forecast(date,integer,boolean,numeric) to authenticated;

create function public.schedule_scheduled_order_production(p_order uuid,p_date date,p_override boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o scheduled_customer_orders%rowtype;i record;result jsonb:='[]';batch uuid;
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 select * into o from scheduled_customer_orders where id=p_order and shop_id=current_shop_id() for update;if not found then raise exception 'Order not found';end if;
 for i in select (x->>'product_id')::uuid product_id,nullif(x->>'variant_id','')::uuid variant_id,sum((x->>'qty')::numeric) qty from jsonb_array_elements(o.normalized_items)x group by 1,2 loop
 batch:=schedule_commercial_production(i.product_id,i.variant_id,p_date,i.qty,o.id,p_override);result:=result||jsonb_build_array(batch);end loop;return result;
end $$;
revoke all on function public.schedule_scheduled_order_production(uuid,date,boolean) from public;grant execute on function public.schedule_scheduled_order_production(uuid,date,boolean) to authenticated;

create or replace function public.complete_production_batch_with_trace(p_batch_id uuid,p_actual_quantity numeric,p_waste_quantity numeric,p_completion_note text,p_batch_code text,p_best_before_on date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;v_finished public.finished_product_batches%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if nullif(trim(p_batch_code),'') is null then raise exception 'Finished-product batch code is required'; end if;
  if p_best_before_on is not null and p_best_before_on<current_date then raise exception 'Best-before date cannot be in the past at completion'; end if;
  v_result:=public.complete_production_batch(p_batch_id,p_actual_quantity,p_waste_quantity,p_completion_note);
  select * into v_finished from public.finished_product_batches where production_batch_id=p_batch_id and shop_id=public.current_shop_id() for update;
  if v_finished.id is null then raise exception 'Finished-product traceability batch was not created'; end if;
  update public.finished_product_batches set batch_code=trim(p_batch_code),best_before_on=p_best_before_on,updated_at=now() where id=v_finished.id;
  insert into public.finished_product_batch_events(shop_id,finished_batch_id,action,details,performed_by)
  values(v_finished.shop_id,v_finished.id,'details_updated',jsonb_build_object('batch_code',trim(p_batch_code),'best_before_on',p_best_before_on,'source','production completion'),auth.uid());
  update variant_stock_lots set batch_code=trim(p_batch_code),best_before_on=p_best_before_on where production_batch_id=p_batch_id and shop_id=public.current_shop_id();
  return v_result||jsonb_build_object('finished_batch_id',v_finished.id,'batch_code',trim(p_batch_code),'best_before_on',p_best_before_on);
end $$;

