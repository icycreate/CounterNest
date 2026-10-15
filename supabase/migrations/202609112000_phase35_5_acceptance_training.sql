-- CounterNest POS Phase 35.5: cumulative production-suite acceptance and role training acknowledgement.

create table if not exists public.production_training_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  training_module text not null check(training_module in('admin_production','production_staff','cashier_customer_display')),
  release_version text not null default '1.38.0',
  acknowledged_at timestamptz not null default now(),
  unique(shop_id,user_id,training_module,release_version)
);

create table if not exists public.production_suite_acceptance_runs (
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

create index if not exists production_training_shop_idx on public.production_training_acknowledgements(shop_id,acknowledged_at desc);
create index if not exists production_acceptance_shop_idx on public.production_suite_acceptance_runs(shop_id,run_at desc);

alter table public.production_training_acknowledgements enable row level security;
alter table public.production_suite_acceptance_runs enable row level security;
create policy production_training_self_select on public.production_training_acknowledgements for select to authenticated using(shop_id=public.current_shop_id() and(user_id=auth.uid() or public.is_admin()));
create policy production_acceptance_admin_select on public.production_suite_acceptance_runs for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.acknowledge_production_training(p_module text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_id uuid;
begin
  if auth.uid() is null then raise exception 'Staff sign-in is required'; end if;
  if p_module not in('admin_production','production_staff','cashier_customer_display') then raise exception 'Unknown training module'; end if;
  insert into public.production_training_acknowledgements(shop_id,user_id,training_module,release_version)
  values(v_shop,auth.uid(),p_module,'1.38.0')
  on conflict(shop_id,user_id,training_module,release_version) do update set acknowledged_at=now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.get_production_training_status() returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null then raise exception 'Staff sign-in is required'; end if;
  return jsonb_build_object(
    'my_acknowledgements',(select coalesce(jsonb_agg(jsonb_build_object('training_module',training_module,'release_version',release_version,'acknowledged_at',acknowledged_at) order by acknowledged_at desc),'[]'::jsonb) from public.production_training_acknowledgements where shop_id=v_shop and user_id=auth.uid()),
    'shop_summary',case when public.is_admin() then (select coalesce(jsonb_agg(to_jsonb(x) order by x.training_module),'[]'::jsonb) from(select training_module,count(distinct user_id) acknowledged_staff,max(acknowledged_at) latest_acknowledgement from public.production_training_acknowledgements where shop_id=v_shop and release_version='1.38.0' group by training_module)x) else '[]'::jsonb end
  );
end $$;

create or replace function public.run_phase35_5_acceptance(p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_shop uuid:=public.current_shop_id();v_rules integer;v_bad_cost integer;v_guides integer;v_stale_guides integer;v_unreviewed_variances integer;v_docs integer;v_pending_docs integer;v_lot_gaps integer;v_training integer;v_checks jsonb;v_status text;v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select count(*) into v_rules from public.ingredient_conversion_rules where shop_id=v_shop and active;
  select count(*) into v_bad_cost from public.ingredient_conversion_rules r where r.shop_id=v_shop and r.active and abs(coalesce((select sum(o.cost_share_percent) from public.ingredient_conversion_outputs o where o.rule_id=r.id and o.track_inventory),0)-100)>0.01;
  select count(*) into v_guides from public.recipe_preparation_guides where shop_id=v_shop and status='approved';
  select count(*) into v_stale_guides from public.recipe_preparation_guides g join public.product_recipes pr on pr.id=g.recipe_id where g.shop_id=v_shop and g.status='approved' and g.approved_recipe_version<>pr.version;
  select count(*) into v_unreviewed_variances from public.production_batches b where b.shop_id=v_shop and b.status='completed' and b.completed_at>=now()-interval '30 days' and not exists(select 1 from public.production_variance_reviews vr where vr.production_batch_id=b.id);
  select count(*) into v_docs from public.inventory_supply_attachments where shop_id=v_shop;
  select count(*) into v_pending_docs from public.inventory_supply_attachments a left join public.supply_document_reviews r on r.attachment_id=a.id where a.shop_id=v_shop and coalesce(r.status,'pending')='pending';
  select count(*) into v_lot_gaps from public.ingredients i where i.shop_id=v_shop and abs(i.current_quantity-coalesce((select sum(l.remaining_quantity) from public.ingredient_lots l where l.ingredient_id=i.id),0))>0.001;
  select count(*) into v_training from public.production_training_acknowledgements where shop_id=v_shop and release_version='1.38.0';
  v_checks:=jsonb_build_array(
    jsonb_build_object('id','lot_consistency','label','Ingredient lot totals match inventory balances','required',true,'status',case when v_lot_gaps=0 then 'pass' else 'fail' end,'detail',v_lot_gaps||' mismatch(es)'),
    jsonb_build_object('id','conversion_costs','label','Active conversion cost shares total 100%','required',true,'status',case when v_bad_cost=0 then 'pass' else 'fail' end,'detail',v_bad_cost||' invalid conversion rule(s)'),
    jsonb_build_object('id','recipe_guides','label','Approved recipe preparation guides available','required',false,'status',case when v_guides>0 then 'pass' else 'warning' end,'detail',v_guides||' approved guide(s)'),
    jsonb_build_object('id','recipe_guide_versions','label','Approved guides match current recipe versions','required',false,'status',case when v_stale_guides=0 then 'pass' else 'warning' end,'detail',v_stale_guides||' guide(s) need reapproval'),
    jsonb_build_object('id','production_variance','label','Recent completed production has variance review','required',false,'status',case when v_unreviewed_variances=0 then 'pass' else 'warning' end,'detail',v_unreviewed_variances||' recent batch(es) without variance review'),
    jsonb_build_object('id','supply_documents','label','Supply documents reviewed','required',false,'status',case when v_pending_docs=0 then 'pass' else 'warning' end,'detail',v_pending_docs||' pending of '||v_docs||' attachment(s)'),
    jsonb_build_object('id','training','label','Production-suite training acknowledgements recorded','required',false,'status',case when v_training>0 then 'pass' else 'warning' end,'detail',v_training||' acknowledgement(s)')
  );
  v_status:=case when v_lot_gaps>0 or v_bad_cost>0 then 'failed' when v_guides=0 or v_stale_guides>0 or v_unreviewed_variances>0 or v_pending_docs>0 or v_training=0 then 'warning' else 'passed' end;
  insert into public.production_suite_acceptance_runs(shop_id,release_version,phase,status,checks,notes,run_by)
  values(v_shop,'1.38.0','35.5',v_status,v_checks,nullif(trim(p_notes),''),auth.uid()) returning id into v_id;
  return jsonb_build_object('id',v_id,'release_version','1.38.0','phase','35.5','status',v_status,'checks',v_checks,'run_at',now());
end $$;

revoke all on function public.acknowledge_production_training(text) from public;
revoke all on function public.get_production_training_status() from public;
revoke all on function public.run_phase35_5_acceptance(text) from public;
grant execute on function public.acknowledge_production_training(text) to authenticated;
grant execute on function public.get_production_training_status() to authenticated;
grant execute on function public.run_phase35_5_acceptance(text) to authenticated;
