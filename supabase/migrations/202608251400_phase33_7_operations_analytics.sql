-- CounterNest POS Phase 33.7: management operations analytics and immutable snapshots.
create table public.operations_analytics_snapshots(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  period_from date not null,period_to date not null,metrics jsonb not null,created_by uuid not null references auth.users(id) on delete restrict,created_at timestamptz not null default now(),check(period_to>=period_from)
);
create index operations_analytics_snapshots_idx on public.operations_analytics_snapshots(shop_id,created_at desc);
alter table public.operations_analytics_snapshots enable row level security;
create policy operations_analytics_admin_read on public.operations_analytics_snapshots for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.calculate_operations_analytics(p_from date,p_to date) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_start timestamptz;v_end timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Valid range of 366 days or less is required';end if;
  v_start:=p_from::timestamptz;v_end:=(p_to+1)::timestamptz;
  return jsonb_build_object(
    'period_from',p_from,'period_to',p_to,
    'sales',jsonb_build_object(
      'orders',(select count(*) from public.sales where shop_id=v_shop and created_at>=v_start and created_at<v_end),
      'gross',(select coalesce(sum(total),0) from public.sales where shop_id=v_shop and created_at>=v_start and created_at<v_end and status<>'voided'),
      'refunds',(select coalesce(sum(refunded_total),0) from public.sales where shop_id=v_shop and created_at>=v_start and created_at<v_end),
      'net',(select coalesce(sum(case when status='voided' then 0 else greatest(total-refunded_total,0) end),0) from public.sales where shop_id=v_shop and created_at>=v_start and created_at<v_end)),
    'tasks',jsonb_build_object(
      'created',(select count(*) from public.operational_tasks where shop_id=v_shop and created_at>=v_start and created_at<v_end),
      'verified',(select count(*) from public.operational_tasks where shop_id=v_shop and verified_at>=v_start and verified_at<v_end and status='verified'),
      'overdue_open',(select count(*) from public.operational_tasks where shop_id=v_shop and status in('open','accepted') and due_at<now()),
      'avg_completion_hours',(select round(coalesce(avg(extract(epoch from(completed_at-created_at))/3600.0),0),2) from public.operational_tasks where shop_id=v_shop and completed_at>=v_start and completed_at<v_end)),
    'incidents',jsonb_build_object(
      'reported',(select count(*) from public.operational_incidents where shop_id=v_shop and reported_at>=v_start and reported_at<v_end),
      'critical',(select count(*) from public.operational_incidents where shop_id=v_shop and severity='critical' and reported_at>=v_start and reported_at<v_end),
      'resolved',(select count(*) from public.operational_incidents where shop_id=v_shop and resolved_at>=v_start and resolved_at<v_end),
      'open_now',(select count(*) from public.operational_incidents where shop_id=v_shop and status<>'resolved')),
    'checklists',jsonb_build_object(
      'scheduled_days',(p_to-p_from+1)*2,
      'completed',(select count(*) from public.daily_checklist_runs where shop_id=v_shop and business_date between p_from and p_to and status in('completed','verified')),
      'verified',(select count(*) from public.daily_checklist_runs where shop_id=v_shop and business_date between p_from and p_to and status='verified')),
    'attendance',jsonb_build_object(
      'entries',(select count(*) from public.staff_attendance_entries where shop_id=v_shop and business_date between p_from and p_to),
      'hours',(select round(coalesce(sum(extract(epoch from(coalesce(clock_out_at,now())-clock_in_at))/3600.0),0),2) from public.staff_attendance_entries where shop_id=v_shop and business_date between p_from and p_to),
      'open_entries',(select count(*) from public.staff_attendance_entries where shop_id=v_shop and status='open')),
    'alerts',jsonb_build_object('active',(select count(*) from public.operational_alerts where shop_id=v_shop and status='active'),'critical',(select count(*) from public.operational_alerts where shop_id=v_shop and status<>'resolved' and severity='critical'))
  );
end $$;

create or replace function public.get_operations_analytics(p_from date default null,p_to date default null) returns jsonb language plpgsql security definer set search_path=public as $$declare v_shop uuid:=public.current_shop_id();v_from date:=coalesce(p_from,current_date-29);v_to date:=coalesce(p_to,current_date);v_metrics jsonb;begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;v_metrics:=public.calculate_operations_analytics(v_from,v_to);return jsonb_build_object('metrics',v_metrics,'snapshots',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'period_from',s.period_from,'period_to',s.period_to,'created_at',s.created_at,'created_by_name',coalesce(sp.display_name,'Former staff')) order by s.created_at desc),'[]'::jsonb) from public.operations_analytics_snapshots s left join public.staff_profiles sp on sp.shop_id=s.shop_id and sp.user_id=s.created_by where s.shop_id=v_shop limit 20));end $$;

create or replace function public.save_operations_analytics_snapshot(p_from date,p_to date) returns uuid language plpgsql security definer set search_path=public as $$declare v_shop uuid:=public.current_shop_id();v_metrics jsonb;v_id uuid;begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;v_metrics:=public.calculate_operations_analytics(p_from,p_to);insert into public.operations_analytics_snapshots(shop_id,period_from,period_to,metrics,created_by) values(v_shop,p_from,p_to,v_metrics,auth.uid()) returning id into v_id;return v_id;end $$;

alter function public.export_business_backup() rename to export_business_backup_phase336_base;revoke all on function public.export_business_backup_phase336_base() from public;revoke all on function public.export_business_backup_phase336_base() from authenticated;
create or replace function public.export_business_backup() returns jsonb language plpgsql security definer set search_path=public as $$declare v_shop uuid:=public.current_shop_id();v_base jsonb;v_export uuid;begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;v_base:=public.export_business_backup_phase336_base();v_export:=(v_base->>'export_id')::uuid;update public.backup_exports set schema_version='1.20.0' where id=v_export and shop_id=v_shop;return(v_base-'schema_version')||jsonb_build_object('schema_version','1.20.0','operations_analytics_snapshots',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.operations_analytics_snapshots t where shop_id=v_shop));end $$;
revoke all on function public.calculate_operations_analytics(date,date) from public;revoke all on function public.get_operations_analytics(date,date) from public;revoke all on function public.save_operations_analytics_snapshot(date,date) from public;revoke all on function public.export_business_backup() from public;
grant execute on function public.get_operations_analytics(date,date) to authenticated;grant execute on function public.save_operations_analytics_snapshot(date,date) to authenticated;grant execute on function public.export_business_backup() to authenticated;
