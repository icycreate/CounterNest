-- CounterNest POS Phases 35.0-35.1: production variance and approved ingredient substitutions.

create table if not exists public.recipe_substitution_rules (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  recipe_id uuid not null references public.product_recipes(id) on delete cascade,
  original_ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  substitute_ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  substitute_per_original numeric(14,6) not null check(substitute_per_original>0),
  allergen_impact text,
  process_note text,
  quality_note text,
  active boolean not null default true,
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint substitution_different_ingredients check(original_ingredient_id<>substitute_ingredient_id),
  unique(recipe_id,original_ingredient_id,substitute_ingredient_id)
);

create table if not exists public.production_batch_substitutions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  production_batch_id uuid not null references public.production_batches(id) on delete cascade,
  rule_id uuid not null references public.recipe_substitution_rules(id) on delete restrict,
  original_quantity_replaced numeric(14,3) not null check(original_quantity_replaced>0),
  substitute_quantity_planned numeric(14,3) not null check(substitute_quantity_planned>0),
  note text,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique(production_batch_id,rule_id)
);

create table if not exists public.production_variance_reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  production_batch_id uuid not null references public.production_batches(id) on delete restrict,
  note text,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  unique(production_batch_id)
);

create table if not exists public.production_variance_lines (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  review_id uuid not null references public.production_variance_reviews(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  expected_quantity numeric(14,3) not null check(expected_quantity>=0),
  actual_quantity numeric(14,3) not null check(actual_quantity>=0),
  difference numeric(14,3) not null,
  unit_cost_snapshot numeric(14,6) not null default 0,
  unique(review_id,ingredient_id)
);

create index if not exists substitution_rules_recipe_idx on public.recipe_substitution_rules(recipe_id,active);
create index if not exists batch_substitutions_batch_idx on public.production_batch_substitutions(production_batch_id);
create index if not exists production_variance_shop_idx on public.production_variance_reviews(shop_id,reviewed_at desc);

alter table public.recipe_substitution_rules enable row level security;
alter table public.production_batch_substitutions enable row level security;
alter table public.production_variance_reviews enable row level security;
alter table public.production_variance_lines enable row level security;

create policy recipe_substitution_admin_select on public.recipe_substitution_rules for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
create policy batch_substitution_admin_select on public.production_batch_substitutions for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
create policy production_variance_admin_select on public.production_variance_reviews for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
create policy production_variance_lines_admin_select on public.production_variance_lines for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.upsert_recipe_substitution_rule(p_rule_id uuid,p_recipe_id uuid,p_original_ingredient_id uuid,p_substitute_ingredient_id uuid,p_ratio numeric,p_allergen_impact text,p_process_note text,p_quality_note text,p_active boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_ratio is null or p_ratio<=0 then raise exception 'Substitution ratio must be greater than zero'; end if;
  if not exists(select 1 from public.product_recipes where id=p_recipe_id and shop_id=v_shop) then raise exception 'Recipe not found'; end if;
  if not exists(select 1 from public.recipe_items where recipe_id=p_recipe_id and ingredient_id=p_original_ingredient_id) then raise exception 'Original ingredient is not in this recipe'; end if;
  if not exists(select 1 from public.ingredients where id=p_substitute_ingredient_id and shop_id=v_shop and active) then raise exception 'Active substitute ingredient not found'; end if;
  if p_rule_id is null then
    insert into public.recipe_substitution_rules(shop_id,recipe_id,original_ingredient_id,substitute_ingredient_id,substitute_per_original,allergen_impact,process_note,quality_note,active,approved_by)
    values(v_shop,p_recipe_id,p_original_ingredient_id,p_substitute_ingredient_id,p_ratio,nullif(trim(p_allergen_impact),''),nullif(trim(p_process_note),''),nullif(trim(p_quality_note),''),coalesce(p_active,true),auth.uid()) returning id into v_id;
  else
    update public.recipe_substitution_rules set substitute_per_original=p_ratio,allergen_impact=nullif(trim(p_allergen_impact),''),process_note=nullif(trim(p_process_note),''),quality_note=nullif(trim(p_quality_note),''),active=coalesce(p_active,true),approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=p_rule_id and shop_id=v_shop returning id into v_id;
    if v_id is null then raise exception 'Substitution rule not found'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.record_production_substitution(p_batch_id uuid,p_rule_id uuid,p_original_quantity_replaced numeric,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_batch public.production_batches%rowtype;v_rule public.recipe_substitution_rules%rowtype;v_recipe public.product_recipes%rowtype;v_item numeric;v_expected numeric;v_scale numeric;v_sub numeric;v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_original_quantity_replaced is null or p_original_quantity_replaced<=0 then raise exception 'Replaced quantity must be greater than zero'; end if;
  select * into v_batch from public.production_batches where id=p_batch_id and shop_id=v_shop and status='scheduled' for update;
  if v_batch.id is null then raise exception 'Scheduled production batch not found'; end if;
  select * into v_rule from public.recipe_substitution_rules where id=p_rule_id and shop_id=v_shop and active;
  if v_rule.id is null then raise exception 'Approved active substitution rule not found'; end if;
  select * into v_recipe from public.product_recipes where id=v_rule.recipe_id and shop_id=v_shop and product_id=v_batch.product_id and active;
  if v_recipe.id is null then raise exception 'Substitution rule does not belong to the active batch recipe'; end if;
  select quantity_required into v_item from public.recipe_items where recipe_id=v_recipe.id and ingredient_id=v_rule.original_ingredient_id;
  v_scale:=v_batch.planned_quantity/nullif(v_recipe.batch_yield*(1-v_recipe.expected_waste_percent/100),0);v_expected:=round(v_item*v_scale,3);
  if p_original_quantity_replaced>v_expected then raise exception 'Replacement quantity exceeds the planned original ingredient requirement'; end if;
  v_sub:=round(p_original_quantity_replaced*v_rule.substitute_per_original,3);
  insert into public.production_batch_substitutions(shop_id,production_batch_id,rule_id,original_quantity_replaced,substitute_quantity_planned,note,recorded_by)
  values(v_shop,v_batch.id,v_rule.id,p_original_quantity_replaced,v_sub,nullif(trim(p_note),''),auth.uid())
  on conflict(production_batch_id,rule_id) do update set original_quantity_replaced=excluded.original_quantity_replaced,substitute_quantity_planned=excluded.substitute_quantity_planned,note=excluded.note,recorded_by=auth.uid(),recorded_at=now() returning id into v_id;
  return jsonb_build_object('id',v_id,'original_quantity_replaced',p_original_quantity_replaced,'substitute_quantity',v_sub);
end $$;

-- Replace Phase 30.8 completion so approved batch substitutions are consumed instead of double-consuming the original ingredient.
create or replace function public.complete_production_batch(p_batch_id uuid,p_actual_quantity numeric,p_waste_quantity numeric,p_completion_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();v_batch public.production_batches%rowtype;v_recipe public.product_recipes%rowtype;v_item record;v_sub record;
  v_scale numeric;v_required numeric;v_replaced numeric;v_original_consume numeric;v_sub_qty numeric;v_balance numeric;v_stock numeric;v_cost numeric;v_ingredient_batch_cost numeric:=0;v_effective_yield numeric;v_standard_unit_cost numeric;v_consumed jsonb:='[]'::jsonb;v_ing public.ingredients%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_actual_quantity is null or p_waste_quantity is null or p_actual_quantity<0 or p_waste_quantity<0 or p_actual_quantity+p_waste_quantity<=0 then raise exception 'Valid sellable and waste quantities are required'; end if;
  select * into v_batch from public.production_batches where id=p_batch_id and shop_id=v_shop for update;
  if v_batch.id is null or v_batch.status<>'scheduled' then raise exception 'Scheduled batch not found'; end if;
  select * into v_recipe from public.product_recipes where shop_id=v_shop and product_id=v_batch.product_id and active for update;
  if v_recipe.id is not null then
    v_scale:=(p_actual_quantity+p_waste_quantity)/v_recipe.batch_yield;
    for v_item in select ri.ingredient_id,ri.quantity_required,i.name from public.recipe_items ri join public.ingredients i on i.id=ri.ingredient_id where ri.recipe_id=v_recipe.id order by i.id loop
      v_required:=round(v_item.quantity_required*v_scale,3);
      select coalesce(sum(bs.original_quantity_replaced*((p_actual_quantity+p_waste_quantity)/nullif(v_batch.planned_quantity/(1-v_recipe.expected_waste_percent/100),0))),0) into v_replaced from public.production_batch_substitutions bs join public.recipe_substitution_rules sr on sr.id=bs.rule_id where bs.production_batch_id=v_batch.id and sr.original_ingredient_id=v_item.ingredient_id;
      v_replaced:=least(v_replaced,v_required);v_original_consume:=greatest(0,v_required-v_replaced);
      if v_original_consume>0 then
        select * into v_ing from public.ingredients where id=v_item.ingredient_id and shop_id=v_shop for update;
        if v_ing.current_quantity<v_original_consume then raise exception 'Insufficient ingredient stock: %',v_ing.name; end if;
        v_balance:=v_ing.current_quantity-v_original_consume;update public.ingredients set current_quantity=v_balance,updated_at=now() where id=v_ing.id;
        insert into public.ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,reference_type,reference_id,created_by)
        values(v_shop,v_ing.id,'production',-v_original_consume,v_ing.average_unit_cost,v_balance,'Production batch B-'||v_batch.batch_number,'production_batch',v_batch.id,auth.uid());
        insert into public.production_ingredient_consumption(shop_id,production_batch_id,recipe_id,recipe_version,ingredient_id,quantity_consumed,unit_cost_snapshot)
        values(v_shop,v_batch.id,v_recipe.id,v_recipe.version,v_ing.id,v_original_consume,v_ing.average_unit_cost);
        v_consumed:=v_consumed||jsonb_build_array(jsonb_build_object('ingredient_id',v_ing.id,'name',v_ing.name,'quantity',v_original_consume,'kind','recipe'));
      end if;
    end loop;
    for v_sub in select bs.*,sr.substitute_ingredient_id,si.name substitute_name from public.production_batch_substitutions bs join public.recipe_substitution_rules sr on sr.id=bs.rule_id join public.ingredients si on si.id=sr.substitute_ingredient_id where bs.production_batch_id=v_batch.id loop
      v_sub_qty:=round(bs.substitute_quantity_planned*((p_actual_quantity+p_waste_quantity)/nullif(v_batch.planned_quantity/(1-v_recipe.expected_waste_percent/100),0)),3);
      select * into v_ing from public.ingredients where id=v_sub.substitute_ingredient_id and shop_id=v_shop for update;
      if v_ing.current_quantity<v_sub_qty then raise exception 'Insufficient substitute ingredient stock: %',v_ing.name; end if;
      v_balance:=v_ing.current_quantity-v_sub_qty;update public.ingredients set current_quantity=v_balance,updated_at=now() where id=v_ing.id;
      insert into public.ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,reference_type,reference_id,created_by)
      values(v_shop,v_ing.id,'substitution',-v_sub_qty,v_ing.average_unit_cost,v_balance,'Approved substitution for production batch B-'||v_batch.batch_number,'production_batch',v_batch.id,auth.uid());
      insert into public.production_ingredient_consumption(shop_id,production_batch_id,recipe_id,recipe_version,ingredient_id,quantity_consumed,unit_cost_snapshot)
      values(v_shop,v_batch.id,v_recipe.id,v_recipe.version,v_ing.id,v_sub_qty,v_ing.average_unit_cost)
      on conflict(production_batch_id,ingredient_id) do update set quantity_consumed=public.production_ingredient_consumption.quantity_consumed+excluded.quantity_consumed;
      v_consumed:=v_consumed||jsonb_build_array(jsonb_build_object('ingredient_id',v_ing.id,'name',v_ing.name,'quantity',v_sub_qty,'kind','substitute'));
    end loop;
    select coalesce(sum(c.quantity_consumed*c.unit_cost_snapshot),0) into v_ingredient_batch_cost from public.production_ingredient_consumption c where c.production_batch_id=v_batch.id;
    v_effective_yield:=v_recipe.batch_yield*(1-v_recipe.expected_waste_percent/100);v_standard_unit_cost:=case when p_actual_quantity>0 then round(((v_ingredient_batch_cost+(v_recipe.labor_cost*v_scale)+(v_recipe.overhead_cost*v_scale))/p_actual_quantity)+v_recipe.packaging_cost_per_unit,2) else null end;
  end if;
  update public.products set stock=stock+p_actual_quantity,cost_price=case when v_recipe.id is not null and p_actual_quantity>0 then v_standard_unit_cost else cost_price end,updated_at=now() where id=v_batch.product_id and shop_id=v_shop returning stock,cost_price into v_stock,v_cost;
  update public.production_batches set status='completed',actual_quantity=p_actual_quantity,waste_quantity=p_waste_quantity,completion_note=nullif(trim(p_completion_note),''),completed_by=auth.uid(),completed_at=now() where id=v_batch.id;
  insert into public.inventory_adjustments(shop_id,product_id,delta,reason,created_by) values(v_shop,v_batch.product_id,p_actual_quantity,'Production batch B-'||v_batch.batch_number||' completed; waste '||p_waste_quantity,auth.uid());
  return jsonb_build_object('batch_id',v_batch.id,'product_id',v_batch.product_id,'new_stock',v_stock,'cost_price',v_cost,'recipe_applied',v_recipe.id is not null,'ingredients_consumed',v_consumed);
end $$;

create or replace function public.record_production_variance(p_batch_id uuid,p_actual_usage jsonb,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_batch public.production_batches%rowtype;v_review uuid;v_line record;v_actual numeric;v_difference numeric;v_ing public.ingredients%rowtype;v_balance numeric;v_results jsonb:='[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into v_batch from public.production_batches where id=p_batch_id and shop_id=v_shop and status='completed';
  if v_batch.id is null then raise exception 'Completed production batch not found'; end if;
  if exists(select 1 from public.production_variance_reviews where production_batch_id=v_batch.id) then raise exception 'Production variance has already been recorded for this batch'; end if;
  insert into public.production_variance_reviews(shop_id,production_batch_id,note,reviewed_by) values(v_shop,v_batch.id,nullif(trim(p_note),''),auth.uid()) returning id into v_review;
  for v_line in select c.ingredient_id,sum(c.quantity_consumed) expected_quantity,max(c.unit_cost_snapshot) unit_cost from public.production_ingredient_consumption c where c.production_batch_id=v_batch.id group by c.ingredient_id loop
    select coalesce((x->>'actual_quantity')::numeric,v_line.expected_quantity) into v_actual from jsonb_array_elements(coalesce(p_actual_usage,'[]'::jsonb)) x where x->>'ingredient_id'=v_line.ingredient_id::text limit 1;
    v_actual:=coalesce(v_actual,v_line.expected_quantity);if v_actual<0 then raise exception 'Actual usage cannot be negative'; end if;
    v_difference:=round(v_actual-v_line.expected_quantity,3);
    select * into v_ing from public.ingredients where id=v_line.ingredient_id and shop_id=v_shop for update;
    if v_difference>0 then
      if v_ing.current_quantity<v_difference then raise exception 'Variance would make % negative',v_ing.name; end if;
      v_balance:=v_ing.current_quantity-v_difference;update public.ingredients set current_quantity=v_balance,updated_at=now() where id=v_ing.id;
      insert into public.ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,reference_type,reference_id,created_by) values(v_shop,v_ing.id,'variance',-v_difference,v_ing.average_unit_cost,v_balance,'Production actual usage above standard','production_variance',v_review,auth.uid());
    elsif v_difference<0 then
      v_balance:=v_ing.current_quantity+abs(v_difference);update public.ingredients set current_quantity=v_balance,updated_at=now() where id=v_ing.id;
      insert into public.ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,reference_type,reference_id,created_by) values(v_shop,v_ing.id,'variance',abs(v_difference),v_ing.average_unit_cost,v_balance,'Production actual usage below standard; quantity returned','production_variance',v_review,auth.uid());
    else v_balance:=v_ing.current_quantity; end if;
    insert into public.production_variance_lines(shop_id,review_id,ingredient_id,expected_quantity,actual_quantity,difference,unit_cost_snapshot) values(v_shop,v_review,v_ing.id,v_line.expected_quantity,v_actual,v_difference,v_line.unit_cost);
    v_results:=v_results||jsonb_build_array(jsonb_build_object('ingredient_id',v_ing.id,'name',v_ing.name,'expected',v_line.expected_quantity,'actual',v_actual,'difference',v_difference,'balance_after',v_balance));
  end loop;
  return jsonb_build_object('review_id',v_review,'batch_id',v_batch.id,'lines',v_results);
end $$;

create or replace function public.get_substitution_variance_overview() returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return jsonb_build_object(
    'substitutions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.product_name,x.original_name),'[]'::jsonb) from(select sr.id,sr.recipe_id,p.id product_id,p.name product_name,sr.original_ingredient_id,oi.name original_name,sr.substitute_ingredient_id,si.name substitute_name,sr.substitute_per_original,sr.allergen_impact,sr.process_note,sr.quality_note,sr.active from public.recipe_substitution_rules sr join public.product_recipes pr on pr.id=sr.recipe_id join public.products p on p.id=pr.product_id join public.ingredients oi on oi.id=sr.original_ingredient_id join public.ingredients si on si.id=sr.substitute_ingredient_id where sr.shop_id=v_shop)x),
    'scheduled_batches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.scheduled_date,x.batch_number),'[]'::jsonb) from(select b.id,b.batch_number,b.product_id,b.product_name,b.scheduled_date,b.planned_quantity,b.planning_recipe_version,coalesce((select jsonb_agg(jsonb_build_object('id',bs.id,'rule_id',bs.rule_id,'original_quantity_replaced',bs.original_quantity_replaced,'substitute_quantity_planned',bs.substitute_quantity_planned,'note',bs.note)) from public.production_batch_substitutions bs where bs.production_batch_id=b.id),'[]'::jsonb) batch_substitutions from public.production_batches b where b.shop_id=v_shop and b.status='scheduled')x),
    'completed_batches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.completed_at desc),'[]'::jsonb) from(select b.id,b.batch_number,b.product_name,b.completed_at,b.actual_quantity,b.waste_quantity,exists(select 1 from public.production_variance_reviews vr where vr.production_batch_id=b.id) variance_recorded from public.production_batches b where b.shop_id=v_shop and b.status='completed' order by b.completed_at desc limit 50)x)
  );
end $$;

revoke all on function public.upsert_recipe_substitution_rule(uuid,uuid,uuid,uuid,numeric,text,text,text,boolean) from public;
revoke all on function public.record_production_substitution(uuid,uuid,numeric,text) from public;
revoke all on function public.record_production_variance(uuid,jsonb,text) from public;
revoke all on function public.get_substitution_variance_overview() from public;
grant execute on function public.upsert_recipe_substitution_rule(uuid,uuid,uuid,uuid,numeric,text,text,text,boolean) to authenticated;
grant execute on function public.record_production_substitution(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.record_production_variance(uuid,jsonb,text) to authenticated;
grant execute on function public.get_substitution_variance_overview() to authenticated;

create or replace function public.get_production_variance_detail(p_batch_id uuid) returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists(select 1 from public.production_batches where id=p_batch_id and shop_id=v_shop and status='completed') then raise exception 'Completed batch not found'; end if;
  return jsonb_build_object(
    'expected',(select coalesce(jsonb_agg(jsonb_build_object('ingredient_id',x.ingredient_id,'name',x.name,'base_unit',x.base_unit,'expected_quantity',x.expected_quantity,'unit_cost',x.unit_cost) order by x.name),'[]'::jsonb) from(
      select c.ingredient_id,i.name,i.base_unit,sum(c.quantity_consumed) expected_quantity,max(c.unit_cost_snapshot) unit_cost from public.production_ingredient_consumption c join public.ingredients i on i.id=c.ingredient_id where c.production_batch_id=p_batch_id group by c.ingredient_id,i.name,i.base_unit
    )x),
    'review',(select to_jsonb(x) from(select vr.id,vr.note,vr.reviewed_at,coalesce(jsonb_agg(jsonb_build_object('ingredient_id',vl.ingredient_id,'expected_quantity',vl.expected_quantity,'actual_quantity',vl.actual_quantity,'difference',vl.difference)) filter(where vl.id is not null),'[]'::jsonb) lines from public.production_variance_reviews vr left join public.production_variance_lines vl on vl.review_id=vr.id where vr.production_batch_id=p_batch_id group by vr.id)x)
  );
end $$;
revoke all on function public.get_production_variance_detail(uuid) from public;
grant execute on function public.get_production_variance_detail(uuid) to authenticated;
