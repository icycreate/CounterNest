-- CounterNest POS Phase 30.7: versioned product recipes and batch costing.

create table if not exists public.product_recipes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  batch_yield numeric(12,3) not null check (batch_yield>0),
  labor_cost numeric(12,2) not null default 0 check (labor_cost>=0),
  overhead_cost numeric(12,2) not null default 0 check (overhead_cost>=0),
  packaging_cost_per_unit numeric(12,4) not null default 0 check (packaging_cost_per_unit>=0),
  expected_waste_percent numeric(6,3) not null default 0 check (expected_waste_percent>=0 and expected_waste_percent<100),
  target_margin_percent numeric(6,3) not null default 60 check (target_margin_percent>=0 and target_margin_percent<100),
  pricing_enabled boolean not null default true,
  active boolean not null default true,
  version integer not null default 1 check (version>0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id,product_id)
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  recipe_id uuid not null references public.product_recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity_required numeric(14,3) not null check (quantity_required>0),
  created_at timestamptz not null default now(),
  unique(recipe_id,ingredient_id)
);

create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  recipe_id uuid not null references public.product_recipes(id) on delete restrict,
  version integer not null,
  snapshot jsonb not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  unique(recipe_id,version)
);

create index if not exists product_recipes_shop_idx on public.product_recipes(shop_id,active,updated_at desc);
create index if not exists recipe_items_recipe_idx on public.recipe_items(recipe_id);
create index if not exists recipe_versions_recipe_idx on public.recipe_versions(recipe_id,version desc);

alter table public.product_recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.recipe_versions enable row level security;

drop policy if exists product_recipes_admin_select on public.product_recipes;
create policy product_recipes_admin_select on public.product_recipes for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
drop policy if exists recipe_items_admin_select on public.recipe_items;
create policy recipe_items_admin_select on public.recipe_items for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
drop policy if exists recipe_versions_admin_select on public.recipe_versions;
create policy recipe_versions_admin_select on public.recipe_versions for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.upsert_product_recipe(
  p_recipe_id uuid,
  p_product_id uuid,
  p_batch_yield numeric,
  p_labor_cost numeric,
  p_overhead_cost numeric,
  p_packaging_cost_per_unit numeric,
  p_expected_waste_percent numeric,
  p_target_margin_percent numeric,
  p_pricing_enabled boolean,
  p_active boolean,
  p_items jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();v_id uuid;v_version integer;v_item record;v_count integer:=0;v_snapshot jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists(select 1 from public.products where id=p_product_id and shop_id=v_shop) then raise exception 'Product not found'; end if;
  if p_batch_yield is null or p_batch_yield<=0 then raise exception 'Batch yield must be greater than zero'; end if;
  if coalesce(p_labor_cost,0)<0 or coalesce(p_overhead_cost,0)<0 or coalesce(p_packaging_cost_per_unit,0)<0 then raise exception 'Recipe costs cannot be negative'; end if;
  if coalesce(p_expected_waste_percent,0)<0 or coalesce(p_expected_waste_percent,0)>=100 or coalesce(p_target_margin_percent,0)<0 or coalesce(p_target_margin_percent,0)>=100 then raise exception 'Waste and margin percentages must be between 0 and 99.999'; end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'Add at least one ingredient to the recipe'; end if;

  if p_recipe_id is null then
    insert into public.product_recipes(shop_id,product_id,batch_yield,labor_cost,overhead_cost,packaging_cost_per_unit,expected_waste_percent,target_margin_percent,pricing_enabled,active,created_by,updated_by)
    values(v_shop,p_product_id,p_batch_yield,coalesce(p_labor_cost,0),coalesce(p_overhead_cost,0),coalesce(p_packaging_cost_per_unit,0),coalesce(p_expected_waste_percent,0),coalesce(p_target_margin_percent,60),coalesce(p_pricing_enabled,true),coalesce(p_active,true),auth.uid(),auth.uid()) returning id,version into v_id,v_version;
  else
    update public.product_recipes set product_id=p_product_id,batch_yield=p_batch_yield,labor_cost=coalesce(p_labor_cost,0),overhead_cost=coalesce(p_overhead_cost,0),packaging_cost_per_unit=coalesce(p_packaging_cost_per_unit,0),expected_waste_percent=coalesce(p_expected_waste_percent,0),target_margin_percent=coalesce(p_target_margin_percent,60),pricing_enabled=coalesce(p_pricing_enabled,true),active=coalesce(p_active,true),version=version+1,updated_by=auth.uid(),updated_at=now()
    where id=p_recipe_id and shop_id=v_shop returning id,version into v_id,v_version;
    if v_id is null then raise exception 'Recipe not found'; end if;
    delete from public.recipe_items where recipe_id=v_id;
  end if;

  for v_item in select * from jsonb_to_recordset(p_items) as x(ingredient_id uuid,quantity_required numeric) loop
    if v_item.quantity_required is null or v_item.quantity_required<=0 then raise exception 'Every ingredient quantity must be greater than zero'; end if;
    if not exists(select 1 from public.ingredients where id=v_item.ingredient_id and shop_id=v_shop and active) then raise exception 'Active ingredient not found'; end if;
    insert into public.recipe_items(shop_id,recipe_id,ingredient_id,quantity_required) values(v_shop,v_id,v_item.ingredient_id,v_item.quantity_required);
    v_count:=v_count+1;
  end loop;
  if v_count=0 then raise exception 'Add at least one ingredient to the recipe'; end if;

  select jsonb_build_object('product_id',r.product_id,'batch_yield',r.batch_yield,'labor_cost',r.labor_cost,'overhead_cost',r.overhead_cost,'packaging_cost_per_unit',r.packaging_cost_per_unit,'expected_waste_percent',r.expected_waste_percent,'target_margin_percent',r.target_margin_percent,'pricing_enabled',r.pricing_enabled,'active',r.active,'items',(select jsonb_agg(jsonb_build_object('ingredient_id',ri.ingredient_id,'quantity_required',ri.quantity_required) order by ri.created_at) from public.recipe_items ri where ri.recipe_id=r.id)) into v_snapshot from public.product_recipes r where r.id=v_id;
  insert into public.recipe_versions(shop_id,recipe_id,version,snapshot,changed_by) values(v_shop,v_id,v_version,v_snapshot,auth.uid());
  return v_id;
end $$;

revoke all on function public.upsert_product_recipe(uuid,uuid,numeric,numeric,numeric,numeric,numeric,numeric,boolean,boolean,jsonb) from public;
grant execute on function public.upsert_product_recipe(uuid,uuid,numeric,numeric,numeric,numeric,numeric,numeric,boolean,boolean,jsonb) to authenticated;
