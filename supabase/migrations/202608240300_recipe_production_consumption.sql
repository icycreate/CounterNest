-- CounterNest POS Phase 30.8: atomically consume recipe ingredients when production is completed.

create table if not exists public.production_ingredient_consumption (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  production_batch_id uuid not null references public.production_batches(id) on delete restrict,
  recipe_id uuid not null references public.product_recipes(id) on delete restrict,
  recipe_version integer not null,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity_consumed numeric(14,3) not null check(quantity_consumed>0),
  unit_cost_snapshot numeric(14,6) not null check(unit_cost_snapshot>=0),
  total_cost numeric(14,4) generated always as(round(quantity_consumed*unit_cost_snapshot,4)) stored,
  created_at timestamptz not null default now(),
  unique(production_batch_id,ingredient_id)
);

create index if not exists production_consumption_batch_idx on public.production_ingredient_consumption(production_batch_id);
alter table public.production_ingredient_consumption enable row level security;
drop policy if exists production_consumption_admin_select on public.production_ingredient_consumption;
create policy production_consumption_admin_select on public.production_ingredient_consumption for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.complete_production_batch(p_batch_id uuid,p_actual_quantity numeric,p_waste_quantity numeric,p_completion_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();v_batch public.production_batches%rowtype;v_recipe public.product_recipes%rowtype;
  v_has_recipe boolean:=false;v_item record;v_scale numeric;v_required numeric;v_balance numeric;v_stock numeric;v_cost numeric;
  v_ingredient_batch_cost numeric:=0;v_effective_yield numeric;v_standard_unit_cost numeric;v_consumed jsonb:='[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_actual_quantity is null or p_waste_quantity is null or p_actual_quantity<0 or p_waste_quantity<0 or p_actual_quantity+p_waste_quantity<=0 then raise exception 'Valid sellable and waste quantities are required'; end if;
  select * into v_batch from public.production_batches where id=p_batch_id and shop_id=v_shop for update;
  if v_batch.id is null or v_batch.status<>'scheduled' then raise exception 'Scheduled batch not found'; end if;

  select * into v_recipe from public.product_recipes where shop_id=v_shop and product_id=v_batch.product_id and active for update;
  v_has_recipe:=found;
  if v_has_recipe then
    v_scale:=(p_actual_quantity+p_waste_quantity)/v_recipe.batch_yield;
    for v_item in
      select ri.ingredient_id,ri.quantity_required,i.name,i.current_quantity,i.average_unit_cost
      from public.recipe_items ri join public.ingredients i on i.id=ri.ingredient_id
      where ri.recipe_id=v_recipe.id order by i.id for update of i
    loop
      v_required:=round(v_item.quantity_required*v_scale,3);
      if v_required>0 and v_item.current_quantity<v_required then
        raise exception 'Insufficient ingredient stock: % requires %, available % %',v_item.name,v_required,v_item.current_quantity,(select base_unit from public.ingredients where id=v_item.ingredient_id);
      end if;
      v_balance:=v_item.current_quantity-v_required;
      update public.ingredients set current_quantity=v_balance,updated_at=now() where id=v_item.ingredient_id;
      insert into public.ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,reference_type,reference_id,created_by)
      values(v_shop,v_item.ingredient_id,'production',-v_required,v_item.average_unit_cost,v_balance,'Production batch B-'||v_batch.batch_number,'production_batch',v_batch.id,auth.uid());
      insert into public.production_ingredient_consumption(shop_id,production_batch_id,recipe_id,recipe_version,ingredient_id,quantity_consumed,unit_cost_snapshot)
      values(v_shop,v_batch.id,v_recipe.id,v_recipe.version,v_item.ingredient_id,v_required,v_item.average_unit_cost);
      v_consumed:=v_consumed||jsonb_build_array(jsonb_build_object('ingredient_id',v_item.ingredient_id,'name',v_item.name,'quantity',v_required,'balance_after',v_balance));
    end loop;

    select coalesce(sum(ri.quantity_required*i.average_unit_cost),0) into v_ingredient_batch_cost from public.recipe_items ri join public.ingredients i on i.id=ri.ingredient_id where ri.recipe_id=v_recipe.id;
    v_effective_yield:=v_recipe.batch_yield*(1-v_recipe.expected_waste_percent/100);
    v_standard_unit_cost:=round(((v_ingredient_batch_cost+v_recipe.labor_cost+v_recipe.overhead_cost)/nullif(v_effective_yield,0))+v_recipe.packaging_cost_per_unit,2);
  end if;

  update public.products set stock=stock+p_actual_quantity,cost_price=case when v_has_recipe and p_actual_quantity>0 then v_standard_unit_cost else cost_price end,updated_at=now()
  where id=v_batch.product_id and shop_id=v_shop returning stock,cost_price into v_stock,v_cost;
  update public.production_batches set status='completed',actual_quantity=p_actual_quantity,waste_quantity=p_waste_quantity,completion_note=nullif(trim(p_completion_note),''),completed_by=auth.uid(),completed_at=now() where id=v_batch.id;
  insert into public.inventory_adjustments(shop_id,product_id,delta,reason,created_by) values(v_shop,v_batch.product_id,p_actual_quantity,'Production batch B-'||v_batch.batch_number||' completed; waste '||p_waste_quantity,auth.uid());
  return jsonb_build_object('batch_id',v_batch.id,'product_id',v_batch.product_id,'new_stock',v_stock,'cost_price',v_cost,'recipe_applied',v_has_recipe,'ingredients_consumed',v_consumed);
end $$;

revoke all on function public.complete_production_batch(uuid,numeric,numeric,text) from public;
grant execute on function public.complete_production_batch(uuid,numeric,numeric,text) to authenticated;
