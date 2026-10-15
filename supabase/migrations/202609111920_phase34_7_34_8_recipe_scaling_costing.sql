-- CounterNest POS Phases 34.7-34.8: recipe scaling, derived ingredient requirements, and costing analysis.

create or replace function public.preview_scaled_recipe(p_recipe_id uuid,p_target_yield numeric)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();v_recipe public.product_recipes%rowtype;v_product public.products%rowtype;v_effective_yield numeric;v_scale numeric;v_item record;v_required numeric;v_shortage numeric;v_items jsonb:='[]'::jsonb;v_conversion jsonb;v_source_required numeric;v_source_unit text;v_source_available numeric;v_has_shortage boolean:=false;
begin
  if auth.uid() is null then raise exception 'Staff sign-in is required'; end if;
  if p_target_yield is null or p_target_yield<=0 then raise exception 'Target output must be greater than zero'; end if;
  select * into v_recipe from public.product_recipes where id=p_recipe_id and shop_id=v_shop and active;
  if v_recipe.id is null then raise exception 'Active recipe not found'; end if;
  select * into v_product from public.products where id=v_recipe.product_id and shop_id=v_shop;
  v_effective_yield:=v_recipe.batch_yield*(1-v_recipe.expected_waste_percent/100);
  if v_effective_yield<=0 then raise exception 'Recipe effective yield must be greater than zero'; end if;
  v_scale:=p_target_yield/v_effective_yield;
  for v_item in
    select ri.ingredient_id,i.name,i.base_unit,i.current_quantity,i.average_unit_cost,ri.quantity_required
    from public.recipe_items ri join public.ingredients i on i.id=ri.ingredient_id where ri.recipe_id=v_recipe.id order by i.name
  loop
    v_required:=round(v_item.quantity_required*v_scale,3);
    v_shortage:=greatest(0,round(v_required-v_item.current_quantity,3));v_conversion:=null;
    if v_shortage>0 then
      select jsonb_build_object('rule_id',r.id,'rule_name',r.name,'source_ingredient_id',si.id,'source_name',si.name,'source_unit',si.base_unit,'source_available',si.current_quantity,'source_quantity_per_conversion',r.source_quantity,'output_quantity_per_conversion',o.output_quantity),
        case when si.base_unit='each' then ceil(v_shortage/o.output_quantity*r.source_quantity) else round(v_shortage/o.output_quantity*r.source_quantity,3) end,si.base_unit,si.current_quantity
      into v_conversion,v_source_required,v_source_unit,v_source_available
      from public.ingredient_conversion_outputs o join public.ingredient_conversion_rules r on r.id=o.rule_id and r.shop_id=v_shop and r.active
      join public.ingredients si on si.id=r.source_ingredient_id and si.shop_id=v_shop and si.active
      where o.ingredient_id=v_item.ingredient_id and o.track_inventory
      order by case when si.base_unit='each' then ceil(v_shortage/o.output_quantity*r.source_quantity) else v_shortage/o.output_quantity*r.source_quantity end asc limit 1;
      if v_conversion is not null then v_conversion:=v_conversion||jsonb_build_object('source_required',v_source_required,'source_shortage',greatest(0,v_source_required-v_source_available)); end if;
      v_has_shortage:=true;
    end if;
    v_items:=v_items||jsonb_build_array(jsonb_build_object('ingredient_id',v_item.ingredient_id,'name',v_item.name,'base_unit',v_item.base_unit,'required',v_required,'available',v_item.current_quantity,'shortage',v_shortage,'unit_cost',v_item.average_unit_cost,'conversion',v_conversion));
  end loop;
  return jsonb_build_object('recipe_id',v_recipe.id,'recipe_version',v_recipe.version,'product_id',v_product.id,'product_name',v_product.name,'target_yield',p_target_yield,'batch_yield',v_recipe.batch_yield,'expected_waste_percent',v_recipe.expected_waste_percent,'effective_batch_yield',round(v_effective_yield,3),'scale',round(v_scale,6),'has_shortage',v_has_shortage,'ingredients',v_items);
end $$;

create or replace function public.get_recipe_costing_analysis(p_recipe_id uuid,p_target_yield numeric default null)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();v_recipe public.product_recipes%rowtype;v_product public.products%rowtype;v_target numeric;v_preview jsonb;v_scale numeric;v_ingredient_cost numeric;v_labor numeric;v_overhead numeric;v_packaging numeric;v_total numeric;v_unit numeric;v_recommended numeric;v_margin numeric;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into v_recipe from public.product_recipes where id=p_recipe_id and shop_id=v_shop and active;
  if v_recipe.id is null then raise exception 'Active recipe not found'; end if;
  select * into v_product from public.products where id=v_recipe.product_id and shop_id=v_shop;
  v_target:=coalesce(p_target_yield,v_recipe.batch_yield*(1-v_recipe.expected_waste_percent/100));
  v_preview:=public.preview_scaled_recipe(v_recipe.id,v_target);v_scale:=coalesce((v_preview->>'scale')::numeric,1);
  select coalesce(sum((x->>'required')::numeric*(x->>'unit_cost')::numeric),0) into v_ingredient_cost from jsonb_array_elements(v_preview->'ingredients') x;
  v_labor:=round(v_recipe.labor_cost*v_scale,2);v_overhead:=round(v_recipe.overhead_cost*v_scale,2);v_packaging:=round(v_recipe.packaging_cost_per_unit*v_target,2);
  v_total:=round(v_ingredient_cost+v_labor+v_overhead+v_packaging,2);v_unit:=round(v_total/nullif(v_target,0),4);
  v_recommended:=case when v_recipe.target_margin_percent>=100 then null else round(v_unit/(1-v_recipe.target_margin_percent/100),2) end;
  v_margin:=case when v_product.price>0 then round((v_product.price-v_unit)/v_product.price*100,2) else 0 end;
  return jsonb_build_object('recipe_id',v_recipe.id,'product_id',v_product.id,'product_name',v_product.name,'target_yield',v_target,'scale',v_scale,'ingredient_cost',round(v_ingredient_cost,2),'labor_cost',v_labor,'overhead_cost',v_overhead,'packaging_cost',v_packaging,'total_cost',v_total,'unit_cost',v_unit,'current_price',v_product.price,'current_margin_percent',v_margin,'target_margin_percent',v_recipe.target_margin_percent,'recommended_price',v_recommended,'preview',v_preview);
end $$;

revoke all on function public.preview_scaled_recipe(uuid,numeric) from public;
revoke all on function public.get_recipe_costing_analysis(uuid,numeric) from public;
grant execute on function public.preview_scaled_recipe(uuid,numeric) to authenticated;
grant execute on function public.get_recipe_costing_analysis(uuid,numeric) to authenticated;
