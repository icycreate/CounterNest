-- CounterNest POS Phase 31.2: daily/weekly planning, recipe scaling and material coverage.

alter table public.production_batches add column if not exists planning_snapshot jsonb;
alter table public.production_batches add column if not exists shortage_override boolean not null default false;
alter table public.production_batches add column if not exists planning_recipe_version integer;

create or replace function public.preview_production_plan(p_product_id uuid,p_planned_quantity numeric) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_product_name text;v_recipe public.product_recipes%rowtype;v_effective_yield numeric;v_scale numeric;v_row record;v_items jsonb:='[]'::jsonb;v_has_shortage boolean:=false;v_max numeric:=null;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_planned_quantity is null or p_planned_quantity<=0 then raise exception 'Planned quantity must be greater than zero'; end if;
  select name into v_product_name from public.products where id=p_product_id and shop_id=v_shop and active;
  if v_product_name is null then raise exception 'Active product not found'; end if;
  select * into v_recipe from public.product_recipes where shop_id=v_shop and product_id=p_product_id and active;
  if not found then return jsonb_build_object('product_id',p_product_id,'product_name',v_product_name,'recipe_applied',false,'can_schedule',true,'has_shortage',false,'maximum_producible',null,'ingredients','[]'::jsonb,'warning','No active recipe. Ingredient coverage cannot be calculated.'); end if;
  v_effective_yield:=v_recipe.batch_yield*(1-v_recipe.expected_waste_percent/100);
  if v_effective_yield<=0 then raise exception 'Recipe effective yield must be greater than zero'; end if;
  v_scale:=p_planned_quantity/v_effective_yield;
  for v_row in
    with committed as (
      select ri.ingredient_id,coalesce(sum(ri.quantity_required*pb.planned_quantity/nullif(pr.batch_yield*(1-pr.expected_waste_percent/100),0)),0) quantity
      from public.production_batches pb join public.product_recipes pr on pr.product_id=pb.product_id and pr.shop_id=pb.shop_id and pr.active
      join public.recipe_items ri on ri.recipe_id=pr.id where pb.shop_id=v_shop and pb.status='scheduled' group by ri.ingredient_id
    )
    select i.id ingredient_id,i.name,i.base_unit,i.current_quantity,ri.quantity_required,
      round(coalesce(c.quantity,0),3) committed_quantity,round(ri.quantity_required*v_scale,3) required_quantity,
      greatest(0,round(i.current_quantity-coalesce(c.quantity,0),3)) available_after_commitments
    from public.recipe_items ri join public.ingredients i on i.id=ri.ingredient_id left join committed c on c.ingredient_id=i.id
    where ri.recipe_id=v_recipe.id order by i.name
  loop
    if v_row.required_quantity>v_row.available_after_commitments then v_has_shortage:=true; end if;
    if v_row.quantity_required>0 then v_max:=least(coalesce(v_max,999999999),greatest(0,v_row.available_after_commitments/v_row.quantity_required*v_effective_yield)); end if;
    v_items:=v_items||jsonb_build_array(jsonb_build_object(
      'ingredient_id',v_row.ingredient_id,'name',v_row.name,'base_unit',v_row.base_unit,'available',v_row.current_quantity,
      'committed',v_row.committed_quantity,'available_after_commitments',v_row.available_after_commitments,
      'required',v_row.required_quantity,'shortage',greatest(0,v_row.required_quantity-v_row.available_after_commitments)
    ));
  end loop;
  return jsonb_build_object('product_id',p_product_id,'product_name',v_product_name,'recipe_applied',true,'recipe_id',v_recipe.id,'recipe_version',v_recipe.version,
    'effective_batch_yield',round(v_effective_yield,3),'scale',round(v_scale,4),'can_schedule',not v_has_shortage,'has_shortage',v_has_shortage,
    'maximum_producible',round(coalesce(v_max,0),3),'ingredients',v_items,
    'warning',case when v_has_shortage then 'Additional ingredient stock is required, or an administrator must explicitly schedule with a shortage override.' else null end);
end $$;

create or replace function public.schedule_planned_production_batch(
  p_product_id uuid,p_scheduled_date date,p_planned_quantity numeric,p_note text default null,p_allow_shortage boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_name text;v_id uuid;v_preview jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_scheduled_date is null or p_scheduled_date<current_date or p_planned_quantity is null or p_planned_quantity<=0 then raise exception 'A current or future date and valid planned quantity are required'; end if;
  select name into v_name from public.products where id=p_product_id and shop_id=v_shop and active;
  if v_name is null then raise exception 'Active product not found'; end if;
  v_preview:=public.preview_production_plan(p_product_id,p_planned_quantity);
  if coalesce((v_preview->>'has_shortage')::boolean,false) and not p_allow_shortage then raise exception 'Ingredient shortage detected. Review the plan or explicitly allow the shortage override.'; end if;
  insert into public.production_batches(shop_id,product_id,product_name,scheduled_date,planned_quantity,note,created_by,planning_snapshot,shortage_override,planning_recipe_version)
  values(v_shop,p_product_id,v_name,p_scheduled_date,p_planned_quantity,nullif(trim(p_note),''),auth.uid(),v_preview,coalesce((v_preview->>'has_shortage')::boolean,false) and p_allow_shortage,nullif(v_preview->>'recipe_version','')::integer)
  returning id into v_id;
  return jsonb_build_object('batch_id',v_id,'preview',v_preview,'shortage_override',coalesce((v_preview->>'has_shortage')::boolean,false) and p_allow_shortage);
end $$;

create or replace function public.get_production_planning(p_from date,p_to date) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_from is null or p_to is null or p_from>p_to or p_to-p_from>92 then raise exception 'Choose a valid planning range of 93 days or less'; end if;
  return jsonb_build_object(
    'batches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.scheduled_date,x.batch_number),'[]'::jsonb) from (
      select b.id,b.batch_number,b.product_id,b.product_name,b.status,b.scheduled_date,b.planned_quantity,b.note,b.shortage_override,b.planning_recipe_version,
        case when b.planning_snapshot is null then 'not_calculated' when coalesce((b.planning_snapshot->>'has_shortage')::boolean,false) then 'shortage' else 'covered' end coverage_status,
        coalesce(sp.display_name,'Former staff') created_by_name
      from public.production_batches b left join public.staff_profiles sp on sp.user_id=b.created_by and sp.shop_id=b.shop_id
      where b.shop_id=v_shop and b.scheduled_date between p_from and p_to and b.status='scheduled'
    ) x),
    'daily',(select coalesce(jsonb_agg(to_jsonb(x) order by x.plan_date),'[]'::jsonb) from (
      select scheduled_date plan_date,count(*) batch_count,sum(planned_quantity) planned_units from public.production_batches
      where shop_id=v_shop and status='scheduled' and scheduled_date between p_from and p_to group by scheduled_date
    ) x),
    'requirements',(select coalesce(jsonb_agg(to_jsonb(x) order by x.stock_status desc,x.ingredient_name),'[]'::jsonb) from (
      with demand as (
        select ri.ingredient_id,sum(ri.quantity_required*pb.planned_quantity/nullif(pr.batch_yield*(1-pr.expected_waste_percent/100),0)) required_quantity
        from public.production_batches pb join public.product_recipes pr on pr.product_id=pb.product_id and pr.shop_id=pb.shop_id and pr.active
        join public.recipe_items ri on ri.recipe_id=pr.id where pb.shop_id=v_shop and pb.status='scheduled' and pb.scheduled_date between p_from and p_to group by ri.ingredient_id
      )
      select i.id ingredient_id,i.name ingredient_name,i.base_unit,i.current_quantity,round(d.required_quantity,3) required_quantity,
        greatest(0,round(d.required_quantity-i.current_quantity,3)) shortage_quantity,
        case when i.current_quantity>=d.required_quantity then 'covered' else 'shortage' end stock_status,
        s.name preferred_supplier
      from demand d join public.ingredients i on i.id=d.ingredient_id left join public.suppliers s on s.id=i.preferred_supplier_id
    ) x),
    'summary',(select jsonb_build_object('scheduled_batches',count(*),'planned_units',coalesce(sum(planned_quantity),0),'planning_days',count(distinct scheduled_date)) from public.production_batches where shop_id=v_shop and status='scheduled' and scheduled_date between p_from and p_to)
  );
end $$;

revoke all on function public.preview_production_plan(uuid,numeric) from public;
revoke all on function public.schedule_planned_production_batch(uuid,date,numeric,text,boolean) from public;
revoke all on function public.get_production_planning(date,date) from public;
grant execute on function public.preview_production_plan(uuid,numeric) to authenticated;
grant execute on function public.schedule_planned_production_batch(uuid,date,numeric,text,boolean) to authenticated;
grant execute on function public.get_production_planning(date,date) to authenticated;
