-- CounterNest POS Phase 33.5: server-evaluated alerts and management escalation.
create table public.operational_alert_rules(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  rule_key text not null,display_name text not null,severity text not null check(severity in('warning','high','critical')),enabled boolean not null default true,
  threshold_minutes integer not null default 0 check(threshold_minutes>=0),created_by uuid references auth.users(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(shop_id,rule_key)
);
create table public.operational_alerts(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  alert_key text not null,title text not null,description text not null,severity text not null check(severity in('warning','high','critical')),
  source_type text not null check(source_type in('task','incident','checklist','security','manual')),source_id uuid,source_reference text,
  status text not null default 'active' check(status in('active','acknowledged','resolved')),first_detected_at timestamptz not null default now(),last_detected_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id) on delete restrict,acknowledged_at timestamptz,acknowledgement_note text,resolved_by uuid references auth.users(id) on delete restrict,resolved_at timestamptz,resolution_note text,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(shop_id,alert_key)
);
create table public.operational_alert_events(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,alert_id uuid not null references public.operational_alerts(id) on delete restrict,
  action text not null,from_status text,to_status text,note text,performed_by uuid not null references auth.users(id) on delete restrict,created_at timestamptz not null default now()
);
create index operational_alerts_active_idx on public.operational_alerts(shop_id,status,severity,last_detected_at desc);
alter table public.operational_alert_rules enable row level security;alter table public.operational_alerts enable row level security;alter table public.operational_alert_events enable row level security;
create policy alert_rules_admin_read on public.operational_alert_rules for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
create policy alerts_admin_read on public.operational_alerts for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
create policy alert_events_admin_read on public.operational_alert_events for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.ensure_operational_alert_rules() returns void language plpgsql security definer set search_path=public as $$declare v_shop uuid:=public.current_shop_id();begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;insert into public.operational_alert_rules(shop_id,rule_key,display_name,severity,threshold_minutes,created_by) values
  (v_shop,'overdue_task','Operational task overdue','high',0,auth.uid()),
  (v_shop,'critical_incident','Critical incident remains active','critical',30,auth.uid()),
  (v_shop,'unverified_closing','Prior closing checklist is not verified','warning',0,auth.uid())
  on conflict(shop_id,rule_key) do nothing;end $$;

create or replace function public.refresh_operational_alerts() returns integer language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_count integer:=0;r record;v_key text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;perform public.ensure_operational_alert_rules();
  for r in select t.id,t.title,'TASK-'||to_char(t.business_date,'YYYYMMDD')||'-'||lpad(t.task_number::text,6,'0') reference from public.operational_tasks t join public.operational_alert_rules ar on ar.shop_id=t.shop_id and ar.rule_key='overdue_task' and ar.enabled where t.shop_id=v_shop and t.status in('open','accepted') and t.due_at<now() loop
    v_key:='task:'||r.id;insert into public.operational_alerts(shop_id,alert_key,title,description,severity,source_type,source_id,source_reference) values(v_shop,v_key,'Overdue operational task',r.title,'high','task',r.id,r.reference) on conflict(shop_id,alert_key) do update set last_detected_at=now(),updated_at=now(),status=case when public.operational_alerts.status='resolved' then 'active' else public.operational_alerts.status end;v_count:=v_count+1;
  end loop;
  for r in select i.id,i.title,'INC-'||extract(year from i.reported_at)::integer||'-'||lpad(i.incident_number::text,6,'0') reference from public.operational_incidents i join public.operational_alert_rules ar on ar.shop_id=i.shop_id and ar.rule_key='critical_incident' and ar.enabled where i.shop_id=v_shop and i.severity='critical' and i.status<>'resolved' and i.reported_at<now()-(ar.threshold_minutes||' minutes')::interval loop
    v_key:='incident:'||r.id;insert into public.operational_alerts(shop_id,alert_key,title,description,severity,source_type,source_id,source_reference) values(v_shop,v_key,'Critical incident needs escalation',r.title,'critical','incident',r.id,r.reference) on conflict(shop_id,alert_key) do update set last_detected_at=now(),updated_at=now(),status=case when public.operational_alerts.status='resolved' then 'active' else public.operational_alerts.status end;v_count:=v_count+1;
  end loop;
  for r in select c.id,c.business_date from public.daily_checklist_runs c join public.operational_alert_rules ar on ar.shop_id=c.shop_id and ar.rule_key='unverified_closing' and ar.enabled where c.shop_id=v_shop and c.checklist_type='closing' and c.business_date<current_date and c.status<>'verified' loop
    v_key:='checklist:'||r.id;insert into public.operational_alerts(shop_id,alert_key,title,description,severity,source_type,source_id,source_reference) values(v_shop,v_key,'Closing checklist needs verification','Closing checklist for '||r.business_date||' is not verified.','warning','checklist',r.id,'CLOSE-'||to_char(r.business_date,'YYYYMMDD')) on conflict(shop_id,alert_key) do update set last_detected_at=now(),updated_at=now(),status=case when public.operational_alerts.status='resolved' then 'active' else public.operational_alerts.status end;v_count:=v_count+1;
  end loop;return v_count;
end $$;

create or replace function public.review_operational_alert(p_alert_id uuid,p_action text,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_row public.operational_alerts%rowtype;v_to text;
begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;if p_action not in('acknowledge','resolve','reopen') or length(trim(coalesce(p_note,'')))<3 then raise exception 'Valid action and note are required';end if;
select * into v_row from public.operational_alerts where id=p_alert_id and shop_id=v_shop for update;if v_row.id is null then raise exception 'Alert not found';end if;
if p_action='acknowledge' then if v_row.status<>'active' then raise exception 'Only active alerts can be acknowledged';end if;v_to:='acknowledged';update public.operational_alerts set status=v_to,acknowledged_by=auth.uid(),acknowledged_at=now(),acknowledgement_note=trim(p_note),updated_at=now() where id=v_row.id;
elsif p_action='resolve' then if v_row.status not in('active','acknowledged') then raise exception 'Alert is already resolved';end if;v_to:='resolved';update public.operational_alerts set status=v_to,resolved_by=auth.uid(),resolved_at=now(),resolution_note=trim(p_note),updated_at=now() where id=v_row.id;
else if v_row.status<>'resolved' then raise exception 'Only resolved alerts can be reopened';end if;v_to:='active';update public.operational_alerts set status=v_to,resolved_by=null,resolved_at=null,resolution_note=null,updated_at=now() where id=v_row.id;end if;
insert into public.operational_alert_events(shop_id,alert_id,action,from_status,to_status,note,performed_by) values(v_shop,v_row.id,p_action,v_row.status,v_to,trim(p_note),auth.uid());end $$;

create or replace function public.get_operational_alert_board(p_limit integer default 100) returns jsonb language plpgsql security definer set search_path=public as $$declare v_shop uuid:=public.current_shop_id();begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;perform public.refresh_operational_alerts();return jsonb_build_object(
  'metrics',jsonb_build_object('active',(select count(*) from public.operational_alerts where shop_id=v_shop and status='active'),'critical',(select count(*) from public.operational_alerts where shop_id=v_shop and status<>'resolved' and severity='critical'),'acknowledged',(select count(*) from public.operational_alerts where shop_id=v_shop and status='acknowledged'),'resolved',(select count(*) from public.operational_alerts where shop_id=v_shop and status='resolved')),
  'rules',(select coalesce(jsonb_agg(to_jsonb(r) order by r.display_name),'[]'::jsonb) from public.operational_alert_rules r where shop_id=v_shop),
  'alerts',(select coalesce(jsonb_agg(to_jsonb(x) order by case x.severity when 'critical' then 1 when 'high' then 2 else 3 end,x.last_detected_at desc),'[]'::jsonb) from(select a.*,coalesce(ak.display_name,'—') acknowledged_by_name,coalesce(rs.display_name,'—') resolved_by_name,(select count(*) from public.operational_alert_events e where e.alert_id=a.id) event_count from public.operational_alerts a left join public.staff_profiles ak on ak.shop_id=a.shop_id and ak.user_id=a.acknowledged_by left join public.staff_profiles rs on rs.shop_id=a.shop_id and rs.user_id=a.resolved_by where a.shop_id=v_shop order by a.last_detected_at desc limit greatest(1,least(coalesce(p_limit,100),200)))x));end $$;

alter function public.export_business_backup() rename to export_business_backup_phase334_base;revoke all on function public.export_business_backup_phase334_base() from public;revoke all on function public.export_business_backup_phase334_base() from authenticated;
create or replace function public.export_business_backup() returns jsonb language plpgsql security definer set search_path=public as $$declare v_shop uuid:=public.current_shop_id();v_base jsonb;v_export uuid;begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;v_base:=public.export_business_backup_phase334_base();v_export:=(v_base->>'export_id')::uuid;update public.backup_exports set schema_version='1.18.0' where id=v_export and shop_id=v_shop;return(v_base-'schema_version')||jsonb_build_object('schema_version','1.18.0','operational_alert_rules',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.operational_alert_rules t where shop_id=v_shop),'operational_alerts',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.operational_alerts t where shop_id=v_shop),'operational_alert_events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.operational_alert_events t where shop_id=v_shop));end $$;
revoke all on function public.ensure_operational_alert_rules() from public;revoke all on function public.refresh_operational_alerts() from public;revoke all on function public.review_operational_alert(uuid,text,text) from public;revoke all on function public.get_operational_alert_board(integer) from public;revoke all on function public.export_business_backup() from public;
grant execute on function public.refresh_operational_alerts() to authenticated;grant execute on function public.review_operational_alert(uuid,text,text) to authenticated;grant execute on function public.get_operational_alert_board(integer) to authenticated;grant execute on function public.export_business_backup() to authenticated;
