-- CounterNest POS Phase 31.0: auditable operational acceptance checks.

create table if not exists public.operational_acceptance_runs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  release_version text not null,
  phase text not null,
  status text not null check(status in('passed','warning','failed')),
  checks jsonb not null,
  notes text,
  run_by uuid not null references auth.users(id) on delete restrict,
  run_at timestamptz not null default now()
);
create index if not exists operational_acceptance_shop_date_idx on public.operational_acceptance_runs(shop_id,run_at desc);
alter table public.operational_acceptance_runs enable row level security;
drop policy if exists operational_acceptance_admin_select on public.operational_acceptance_runs;
create policy operational_acceptance_admin_select on public.operational_acceptance_runs for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.run_phase31_operational_acceptance(p_notes text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();v_admins integer;v_products integer;v_negative integer;v_empty_recipes integer;
  v_invalid_recipe_items integer;v_overdue_batches integer;v_uncosted integer;v_recent_backup boolean;v_checks jsonb;v_status text;v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select count(*) into v_admins from public.staff_profiles where shop_id=v_shop and active and role='admin';
  select count(*) into v_products from public.products where shop_id=v_shop and active;
  select count(*) into v_negative from public.ingredients where shop_id=v_shop and current_quantity<0;
  select count(*) into v_empty_recipes from public.product_recipes pr where pr.shop_id=v_shop and pr.active and not exists(select 1 from public.recipe_items ri where ri.recipe_id=pr.id);
  select count(*) into v_invalid_recipe_items from public.recipe_items ri join public.product_recipes pr on pr.id=ri.recipe_id join public.ingredients i on i.id=ri.ingredient_id where pr.shop_id=v_shop and (ri.shop_id<>v_shop or i.shop_id<>v_shop or not i.active);
  select count(*) into v_overdue_batches from public.production_batches where shop_id=v_shop and status='scheduled' and scheduled_date<current_date;
  select count(*) into v_uncosted from public.products where shop_id=v_shop and active and coalesce(cost_price,0)=0;
  select exists(select 1 from public.backup_exports where shop_id=v_shop and requested_at>=now()-interval '30 days') into v_recent_backup;
  v_checks:=jsonb_build_array(
    jsonb_build_object('id','active_admin','label','At least one active administrator','status',case when v_admins>0 then 'pass' else 'fail' end,'required',true,'detail',v_admins||' active administrator(s)'),
    jsonb_build_object('id','active_products','label','Active product catalog','status',case when v_products>0 then 'pass' else 'fail' end,'required',true,'detail',v_products||' active product(s)'),
    jsonb_build_object('id','ingredient_balances','label','No negative ingredient balances','status',case when v_negative=0 then 'pass' else 'fail' end,'required',true,'detail',v_negative||' invalid balance(s)'),
    jsonb_build_object('id','recipe_items','label','Active recipes contain ingredients','status',case when v_empty_recipes=0 then 'pass' else 'fail' end,'required',true,'detail',v_empty_recipes||' empty active recipe(s)'),
    jsonb_build_object('id','recipe_scope','label','Recipe ingredients are active and shop-scoped','status',case when v_invalid_recipe_items=0 then 'pass' else 'fail' end,'required',true,'detail',v_invalid_recipe_items||' invalid recipe line(s)'),
    jsonb_build_object('id','recent_backup','label','Verified backup created in the last 30 days','status',case when v_recent_backup then 'pass' else 'fail' end,'required',true,'detail',case when v_recent_backup then 'Recent backup record found' else 'Create and verify a fresh backup' end),
    jsonb_build_object('id','overdue_batches','label','No overdue scheduled production','status',case when v_overdue_batches=0 then 'pass' else 'warning' end,'required',false,'detail',v_overdue_batches||' overdue batch(es)'),
    jsonb_build_object('id','product_costs','label','Active products have a unit cost','status',case when v_uncosted=0 then 'pass' else 'warning' end,'required',false,'detail',v_uncosted||' uncosted product(s)')
  );
  v_status:=case when v_admins=0 or v_products=0 or v_negative>0 or v_empty_recipes>0 or v_invalid_recipe_items>0 or not v_recent_backup then 'failed' when v_overdue_batches>0 or v_uncosted>0 then 'warning' else 'passed' end;
  insert into public.operational_acceptance_runs(shop_id,release_version,phase,status,checks,notes,run_by)
  values(v_shop,'1.7.0','31.0',v_status,v_checks,nullif(trim(p_notes),''),auth.uid()) returning id into v_id;
  return jsonb_build_object('id',v_id,'release_version','1.7.0','phase','31.0','status',v_status,'checks',v_checks,'notes',nullif(trim(p_notes),''),'run_at',now());
end $$;

create or replace function public.get_phase31_acceptance_history() returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.run_at desc),'[]'::jsonb) from (
    select r.id,r.release_version,r.phase,r.status,r.checks,r.notes,r.run_at,coalesce(sp.display_name,'Former staff') run_by_name
    from public.operational_acceptance_runs r left join public.staff_profiles sp on sp.user_id=r.run_by and sp.shop_id=r.shop_id
    where r.shop_id=v_shop order by r.run_at desc limit 25
  ) x);
end $$;

revoke all on function public.run_phase31_operational_acceptance(text) from public;
revoke all on function public.get_phase31_acceptance_history() from public;
grant execute on function public.run_phase31_operational_acceptance(text) to authenticated;
grant execute on function public.get_phase31_acceptance_history() to authenticated;
