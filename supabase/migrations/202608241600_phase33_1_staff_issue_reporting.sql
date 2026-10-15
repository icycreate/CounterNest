-- CounterNest POS v1.14.0 / Phase 33.1
-- Protected staff issue reporting with administrator-only triage.

create or replace function public.report_operational_issue(
  p_urgency text,p_category text,p_title text,p_description text,p_impact text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_id uuid;v_number bigint;v_reference text;v_severity text;
begin
  if auth.uid() is null or v_shop is null or not exists(
    select 1 from public.staff_profiles where user_id=auth.uid() and shop_id=v_shop and active
  ) then raise exception 'Active staff access required'; end if;
  if p_urgency not in('low','normal','urgent') then raise exception 'Invalid issue urgency'; end if;
  if p_category not in('checkout','payment','inventory','loyalty','daily_cash','authentication','device','network','printing','data','other') then raise exception 'Invalid issue category'; end if;
  if length(trim(coalesce(p_title,'')))<5 then raise exception 'Issue title must contain at least 5 characters'; end if;
  if length(trim(coalesce(p_description,'')))<10 then raise exception 'Issue description must contain at least 10 characters'; end if;
  v_severity:=case p_urgency when 'low' then 'low' when 'urgent' then 'high' else 'medium' end;
  insert into public.operational_incidents(shop_id,severity,category,title,description,impact,reported_by)
  values(v_shop,v_severity,p_category,trim(p_title),trim(p_description),nullif(trim(p_impact),''),auth.uid())
  returning id,incident_number into v_id,v_number;
  v_reference:='INC-'||to_char(public.current_business_date(),'YYYY')||'-'||lpad(v_number::text,6,'0');
  insert into public.operational_incident_events(shop_id,incident_id,action,to_status,note,details,performed_by)
  values(v_shop,v_id,'opened','open',trim(p_description),jsonb_build_object('reference',v_reference,'source','staff_report','urgency',p_urgency,'severity',v_severity,'category',p_category,'impact',nullif(trim(p_impact),'')),auth.uid());
  return jsonb_build_object('id',v_id,'incident_number',v_number,'reference',v_reference,'status','open','severity',v_severity);
end $$;

create or replace function public.get_my_operational_issues() returns jsonb
language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or v_shop is null or not exists(
    select 1 from public.staff_profiles where user_id=auth.uid() and shop_id=v_shop and active
  ) then raise exception 'Active staff access required'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.reported_at desc) from(
    select i.id,'INC-'||to_char(i.reported_at at time zone coalesce(sh.timezone,'UTC'),'YYYY')||'-'||lpad(i.incident_number::text,6,'0') reference,
      i.severity,i.category,i.title,i.description,i.impact,i.status,i.reported_at,i.updated_at,i.resolved_at,
      case when i.status='resolved' then i.resolution_note else null end resolution_note,
      (select count(*) from public.operational_incident_events e where e.incident_id=i.id) event_count
    from public.operational_incidents i join public.shops sh on sh.id=i.shop_id
    where i.shop_id=v_shop and i.reported_by=auth.uid()
    order by i.reported_at desc limit 100
  )x),'[]'::jsonb);
end $$;

create or replace function public.triage_operational_incident(
  p_incident_id uuid,p_severity text,p_category text,p_status text,p_note text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_row public.operational_incidents%rowtype;v_action text;v_reference text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_severity not in('low','medium','high','critical') then raise exception 'Invalid incident severity'; end if;
  if p_category not in('checkout','payment','inventory','loyalty','daily_cash','authentication','device','network','printing','data','other') then raise exception 'Invalid incident category'; end if;
  if p_status not in('open','investigating','monitoring','resolved') then raise exception 'Invalid incident status'; end if;
  if length(trim(coalesce(p_note,'')))<5 then raise exception 'A triage note of at least 5 characters is required'; end if;
  select * into v_row from public.operational_incidents where id=p_incident_id and shop_id=v_shop for update;
  if v_row.id is null then raise exception 'Operational incident not found'; end if;
  if p_status='resolved' then v_action:='resolved';
  elsif v_row.status='resolved' then v_action:='reopened';
  elsif p_status=v_row.status and p_severity=v_row.severity and p_category=v_row.category then v_action:='note_added';
  else v_action:='status_changed'; end if;
  update public.operational_incidents set
    severity=p_severity,category=p_category,status=p_status,updated_at=now(),
    resolved_by=case when p_status='resolved' then auth.uid() else null end,
    resolved_at=case when p_status='resolved' then now() else null end,
    resolution_note=case when p_status='resolved' then trim(p_note) else resolution_note end
  where id=v_row.id;
  insert into public.operational_incident_events(shop_id,incident_id,action,from_status,to_status,note,details,performed_by)
  values(v_shop,v_row.id,v_action,v_row.status,p_status,trim(p_note),jsonb_build_object('old_severity',v_row.severity,'severity',p_severity,'old_category',v_row.category,'category',p_category),auth.uid());
  v_reference:='INC-'||to_char(v_row.reported_at at time zone coalesce((select timezone from public.shops where id=v_shop),'UTC'),'YYYY')||'-'||lpad(v_row.incident_number::text,6,'0');
  return jsonb_build_object('id',v_row.id,'reference',v_reference,'severity',p_severity,'category',p_category,'status',p_status,'action',v_action,'updated_at',now());
end $$;

revoke all on function public.report_operational_issue(text,text,text,text,text) from public;
revoke all on function public.get_my_operational_issues() from public;
revoke all on function public.triage_operational_incident(uuid,text,text,text,text) from public;
grant execute on function public.report_operational_issue(text,text,text,text,text) to authenticated;
grant execute on function public.get_my_operational_issues() to authenticated;
grant execute on function public.triage_operational_incident(uuid,text,text,text,text) to authenticated;
