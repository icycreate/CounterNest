-- CounterNest POS Phase 34.9: smart production planning with recipe/version snapshot and conversion-aware shortages.

alter table public.production_batches add column if not exists smart_plan_snapshot jsonb;
alter table public.production_batches add column if not exists smart_plan_created_at timestamptz;

create or replace function public.preview_smart_production_plan(p_product_id uuid,p_target_quantity numeric)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_recipe uuid;v_preview jsonb;v_line jsonb;v_unresolved boolean:=false;v_conversion_needed boolean:=false;v_shortage numeric;v_source_shortage numeric;v_requirements jsonb:='[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_target_quantity is null or p_target_quantity<=0 then raise exception 'Target quantity must be greater than zero'; end if;
  select id into v_recipe from public.product_recipes where shop_id=v_shop and product_id=p_product_id and active;
  if v_recipe is null then raise exception 'Active recipe not found for this product'; end if;
  v_preview:=public.preview_scaled_recipe(v_recipe,p_target_quantity);
  for v_line in select * from jsonb_array_elements(v_preview->'ingredients') loop
    v_shortage:=coalesce((v_line->>'shortage')::numeric,0);
    if v_shortage>0 then
      if v_line->'conversion' is not null and jsonb_typeof(v_line->'conversion')='object' then
        v_source_shortage:=coalesce((v_line->'conversion'->>'source_shortage')::numeric,0);
        v_conversion_needed:=true;
        if v_source_shortage>0 then v_unresolved:=true; end if;
      else v_unresolved:=true; end if;
    end if;
    v_requirements:=v_requirements||jsonb_build_array(v_line);
  end loop;
  return v_preview||jsonb_build_object('requirements',v_requirements,'conversion_required',v_conversion_needed,'unresolved_shortage',v_unresolved,'can_schedule',not v_unresolved,'warning',case when v_unresolved then 'Unresolved ingredient shortage remains. Receive stock, approve a substitution, or explicitly override the shortage.' when v_conversion_needed then 'Derived ingredients require conversion before production begins.' else null end);
end $$;

create or replace function public.schedule_smart_production_batch(p_product_id uuid,p_scheduled_date date,p_target_quantity numeric,p_note text default null,p_allow_shortage boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_name text;v_preview jsonb;v_id uuid;v_recipe_version integer;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_scheduled_date is null or p_scheduled_date<current_date then raise exception 'Production date must be today or later'; end if;
  select name into v_name from public.products where id=p_product_id and shop_id=v_shop and active;
  if v_name is null then raise exception 'Active product not found'; end if;
  v_preview:=public.preview_smart_production_plan(p_product_id,p_target_quantity);
  if coalesce((v_preview->>'unresolved_shortage')::boolean,false) and not coalesce(p_allow_shortage,false) then raise exception 'Unresolved ingredient shortage detected'; end if;
  v_recipe_version:=nullif(v_preview->>'recipe_version','')::integer;
  insert into public.production_batches(shop_id,product_id,product_name,scheduled_date,planned_quantity,note,created_by,planning_snapshot,shortage_override,planning_recipe_version,smart_plan_snapshot,smart_plan_created_at)
  values(v_shop,p_product_id,v_name,p_scheduled_date,p_target_quantity,nullif(trim(p_note),''),auth.uid(),v_preview,coalesce((v_preview->>'unresolved_shortage')::boolean,false) and coalesce(p_allow_shortage,false),v_recipe_version,v_preview,now()) returning id into v_id;
  return jsonb_build_object('batch_id',v_id,'preview',v_preview,'shortage_override',coalesce((v_preview->>'unresolved_shortage')::boolean,false) and coalesce(p_allow_shortage,false));
end $$;

create or replace function public.get_smart_production_plan_queue(p_from date default current_date,p_to date default current_date+14)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.scheduled_date,x.batch_number),'[]'::jsonb) from(
    select b.id,b.batch_number,b.product_id,b.product_name,b.scheduled_date,b.planned_quantity,b.status,b.shortage_override,b.planning_recipe_version,b.smart_plan_snapshot,b.note,
      coalesce(sp.display_name,'Former staff') created_by_name
    from public.production_batches b left join public.staff_profiles sp on sp.user_id=b.created_by and sp.shop_id=b.shop_id
    where b.shop_id=v_shop and b.scheduled_date between p_from and p_to order by b.scheduled_date,b.batch_number
  )x);
end $$;

revoke all on function public.preview_smart_production_plan(uuid,numeric) from public;
revoke all on function public.schedule_smart_production_batch(uuid,date,numeric,text,boolean) from public;
revoke all on function public.get_smart_production_plan_queue(date,date) from public;
grant execute on function public.preview_smart_production_plan(uuid,numeric) to authenticated;
grant execute on function public.schedule_smart_production_batch(uuid,date,numeric,text,boolean) to authenticated;
grant execute on function public.get_smart_production_plan_queue(date,date) to authenticated;
