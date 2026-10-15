-- CounterNest POS Phase 30.6: ingredient inventory and append-only movements.

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  sku text,
  base_unit text not null check (base_unit in ('g','ml','each')),
  current_quantity numeric(14,3) not null default 0 check (current_quantity >= 0),
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  target_level numeric(14,3) not null default 0 check (target_level >= reorder_level),
  average_unit_cost numeric(14,6) not null default 0 check (average_unit_cost >= 0),
  preferred_supplier_id uuid references public.suppliers(id) on delete set null,
  lead_time_days integer not null default 0 check (lead_time_days between 0 and 365),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, name),
  unique (shop_id, sku)
);

create table if not exists public.ingredient_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening','receipt','adjustment','production','waste','correction')),
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  unit_cost numeric(14,6),
  balance_after numeric(14,3) not null check (balance_after >= 0),
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists ingredients_shop_name_idx on public.ingredients(shop_id, name);
create index if not exists ingredient_movements_shop_date_idx on public.ingredient_inventory_movements(shop_id, created_at desc);
create index if not exists ingredient_movements_ingredient_idx on public.ingredient_inventory_movements(ingredient_id, created_at desc);

alter table public.ingredients enable row level security;
alter table public.ingredient_inventory_movements enable row level security;

drop policy if exists ingredients_admin_select on public.ingredients;
create policy ingredients_admin_select on public.ingredients for select to authenticated
using (shop_id=public.current_shop_id() and public.is_admin());

drop policy if exists ingredient_movements_admin_select on public.ingredient_inventory_movements;
create policy ingredient_movements_admin_select on public.ingredient_inventory_movements for select to authenticated
using (shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.upsert_ingredient(
  p_ingredient_id uuid,
  p_name text,
  p_sku text,
  p_base_unit text,
  p_opening_quantity numeric,
  p_reorder_level numeric,
  p_target_level numeric,
  p_average_unit_cost numeric,
  p_preferred_supplier_id uuid,
  p_lead_time_days integer,
  p_active boolean
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();
  v_id uuid;
  v_existing public.ingredients%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Ingredient name is required'; end if;
  if p_base_unit not in ('g','ml','each') then raise exception 'Base unit must be g, ml, or each'; end if;
  if coalesce(p_opening_quantity,0)<0 or coalesce(p_reorder_level,0)<0 or coalesce(p_target_level,0)<coalesce(p_reorder_level,0) or coalesce(p_average_unit_cost,0)<0 then raise exception 'Invalid ingredient quantities or cost'; end if;
  if p_preferred_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_preferred_supplier_id and shop_id=v_shop and active) then raise exception 'Active supplier not found'; end if;

  if p_ingredient_id is null then
    insert into public.ingredients(shop_id,name,sku,base_unit,current_quantity,reorder_level,target_level,average_unit_cost,preferred_supplier_id,lead_time_days,active)
    values(v_shop,trim(p_name),nullif(trim(p_sku),''),p_base_unit,coalesce(p_opening_quantity,0),coalesce(p_reorder_level,0),coalesce(p_target_level,0),coalesce(p_average_unit_cost,0),p_preferred_supplier_id,coalesce(p_lead_time_days,0),coalesce(p_active,true)) returning id into v_id;
    if coalesce(p_opening_quantity,0)>0 then
      insert into public.ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,created_by)
      values(v_shop,v_id,'opening',p_opening_quantity,p_average_unit_cost,p_opening_quantity,'Opening ingredient balance',auth.uid());
    end if;
  else
    select * into v_existing from public.ingredients where id=p_ingredient_id and shop_id=v_shop for update;
    if v_existing.id is null then raise exception 'Ingredient not found'; end if;
    update public.ingredients set name=trim(p_name),sku=nullif(trim(p_sku),''),base_unit=p_base_unit,reorder_level=coalesce(p_reorder_level,0),target_level=coalesce(p_target_level,0),average_unit_cost=coalesce(p_average_unit_cost,0),preferred_supplier_id=p_preferred_supplier_id,lead_time_days=coalesce(p_lead_time_days,0),active=coalesce(p_active,true),updated_at=now() where id=p_ingredient_id;
    v_id:=p_ingredient_id;
  end if;
  return v_id;
end $$;

create or replace function public.adjust_ingredient_stock(p_ingredient_id uuid,p_quantity_delta numeric,p_reason text)
returns numeric language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_row public.ingredients%rowtype;v_balance numeric;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_quantity_delta is null or p_quantity_delta=0 then raise exception 'Adjustment quantity cannot be zero'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A reason of at least 3 characters is required'; end if;
  select * into v_row from public.ingredients where id=p_ingredient_id and shop_id=v_shop for update;
  if v_row.id is null then raise exception 'Ingredient not found'; end if;
  v_balance:=v_row.current_quantity+p_quantity_delta;
  if v_balance<0 then raise exception 'Ingredient stock cannot become negative'; end if;
  update public.ingredients set current_quantity=v_balance,updated_at=now() where id=v_row.id;
  insert into public.ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,balance_after,reason,created_by)
  values(v_shop,v_row.id,'adjustment',p_quantity_delta,v_balance,trim(p_reason),auth.uid());
  return v_balance;
end $$;

revoke all on function public.upsert_ingredient(uuid,text,text,text,numeric,numeric,numeric,numeric,uuid,integer,boolean) from public;
revoke all on function public.adjust_ingredient_stock(uuid,numeric,text) from public;
grant execute on function public.upsert_ingredient(uuid,text,text,text,numeric,numeric,numeric,numeric,uuid,integer,boolean) to authenticated;
grant execute on function public.adjust_ingredient_stock(uuid,numeric,text) to authenticated;
