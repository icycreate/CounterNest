-- CounterNest POS Phase 33.4: opening and closing checklists.
create table public.daily_checklist_templates(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  checklist_type text not null check(checklist_type in('opening','closing')),name text not null,active boolean not null default true,
  created_by uuid references auth.users(id) on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(shop_id,checklist_type,name)
);
create table public.daily_checklist_template_items(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  template_id uuid not null references public.daily_checklist_templates(id) on delete restrict,item_order integer not null check(item_order>0),
  label text not null,required boolean not null default true,admin_only boolean not null default false,evidence_type text not null default 'confirmation' check(evidence_type in('confirmation','note','count')),
  active boolean not null default true,created_at timestamptz not null default now(),unique(template_id,item_order)
);
create table public.daily_checklist_runs(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  business_date date not null,checklist_type text not null check(checklist_type in('opening','closing')),template_id uuid not null references public.daily_checklist_templates(id) on delete restrict,
  status text not null default 'in_progress' check(status in('in_progress','completed','verified','reopened')),
  started_by uuid not null references auth.users(id) on delete restrict,started_at timestamptz not null default now(),completed_by uuid references auth.users(id) on delete restrict,
  completed_at timestamptz,completion_note text,verified_by uuid references auth.users(id) on delete restrict,verified_at timestamptz,verification_note text,updated_at timestamptz not null default now(),
  unique(shop_id,business_date,checklist_type)
);
create table public.daily_checklist_run_items(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  run_id uuid not null references public.daily_checklist_runs(id) on delete restrict,template_item_id uuid not null references public.daily_checklist_template_items(id) on delete restrict,
  item_order integer not null,label text not null,required boolean not null,admin_only boolean not null,evidence_type text not null,
  completed boolean not null default false,evidence text,completed_by uuid references auth.users(id) on delete restrict,completed_at timestamptz,unique(run_id,template_item_id)
);
create table public.daily_checklist_events(
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,run_id uuid not null references public.daily_checklist_runs(id) on delete restrict,
  action text not null,from_status text,to_status text,note text,details jsonb not null default '{}'::jsonb,performed_by uuid not null references auth.users(id) on delete restrict,created_at timestamptz not null default now()
);
create index daily_checklist_runs_shop_date_idx on public.daily_checklist_runs(shop_id,business_date desc);
create index daily_checklist_events_run_idx on public.daily_checklist_events(run_id,created_at);
alter table public.daily_checklist_templates enable row level security;alter table public.daily_checklist_template_items enable row level security;
alter table public.daily_checklist_runs enable row level security;alter table public.daily_checklist_run_items enable row level security;alter table public.daily_checklist_events enable row level security;
create policy checklist_templates_read on public.daily_checklist_templates for select to authenticated using(shop_id=public.current_shop_id());
create policy checklist_template_items_read on public.daily_checklist_template_items for select to authenticated using(shop_id=public.current_shop_id());
create policy checklist_runs_read on public.daily_checklist_runs for select to authenticated using(shop_id=public.current_shop_id());
create policy checklist_run_items_read on public.daily_checklist_run_items for select to authenticated using(shop_id=public.current_shop_id());
create policy checklist_events_read on public.daily_checklist_events for select to authenticated using(shop_id=public.current_shop_id());

create or replace function public.ensure_default_daily_checklists() returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_user uuid:=auth.uid();v_open uuid;v_close uuid;
begin
  if v_shop is null or v_user is null then raise exception 'Active staff access required';end if;
  select id into v_open from public.daily_checklist_templates where shop_id=v_shop and checklist_type='opening' and active order by created_at limit 1;
  if v_open is null then
    insert into public.daily_checklist_templates(shop_id,checklist_type,name,created_by) values(v_shop,'opening','Standard Opening',v_user) returning id into v_open;
    insert into public.daily_checklist_template_items(shop_id,template_id,item_order,label,required,admin_only,evidence_type) values
      (v_shop,v_open,1,'Work area is clean, safe, and ready',true,false,'confirmation'),
      (v_shop,v_open,2,'Required equipment has been checked',true,false,'note'),
      (v_shop,v_open,3,'Opening product and display stock has been reviewed',true,false,'count'),
      (v_shop,v_open,4,'Opening cash declaration or Daily Cash opening has been reviewed',true,true,'note');
  end if;
  select id into v_close from public.daily_checklist_templates where shop_id=v_shop and checklist_type='closing' and active order by created_at limit 1;
  if v_close is null then
    insert into public.daily_checklist_templates(shop_id,checklist_type,name,created_by) values(v_shop,'closing','Standard Closing',v_user) returning id into v_close;
    insert into public.daily_checklist_template_items(shop_id,template_id,item_order,label,required,admin_only,evidence_type) values
      (v_shop,v_close,1,'Sales, refunds, and voids have been reviewed',true,true,'note'),
      (v_shop,v_close,2,'Inventory changes and waste have been recorded',true,false,'note'),
      (v_shop,v_close,3,'Equipment and work areas are secured',true,false,'confirmation'),
      (v_shop,v_close,4,'Daily Cash record is closed and variance reviewed',true,true,'note'),
      (v_shop,v_close,5,'Shift handover or pending work has been recorded',true,false,'note');
  end if;
end $$;

create or replace function public.start_daily_checklist(p_type text,p_business_date date default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_date date:=coalesce(p_business_date,current_date);v_template uuid;v_run uuid;
begin
  if auth.uid() is null or v_shop is null then raise exception 'Active staff access required';end if;
  if p_type not in('opening','closing') then raise exception 'Invalid checklist type';end if;
  perform public.ensure_default_daily_checklists();
  select id into v_template from public.daily_checklist_templates where shop_id=v_shop and checklist_type=p_type and active order by created_at limit 1;
  insert into public.daily_checklist_runs(shop_id,business_date,checklist_type,template_id,started_by) values(v_shop,v_date,p_type,v_template,auth.uid())
    on conflict(shop_id,business_date,checklist_type) do nothing returning id into v_run;
  if v_run is null then select id into v_run from public.daily_checklist_runs where shop_id=v_shop and business_date=v_date and checklist_type=p_type;return v_run;end if;
  insert into public.daily_checklist_run_items(shop_id,run_id,template_item_id,item_order,label,required,admin_only,evidence_type)
    select v_shop,v_run,id,item_order,label,required,admin_only,evidence_type from public.daily_checklist_template_items where template_id=v_template and active order by item_order;
  insert into public.daily_checklist_events(shop_id,run_id,action,to_status,note,performed_by) values(v_shop,v_run,'started','in_progress','Daily checklist started',auth.uid());
  return v_run;
end $$;

create or replace function public.complete_daily_checklist_item(p_item_id uuid,p_completed boolean,p_evidence text default null) returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_item public.daily_checklist_run_items%rowtype;v_run public.daily_checklist_runs%rowtype;
begin
  if auth.uid() is null or v_shop is null then raise exception 'Active staff access required';end if;
  select * into v_item from public.daily_checklist_run_items where id=p_item_id and shop_id=v_shop for update;
  if v_item.id is null then raise exception 'Checklist item not found';end if;
  select * into v_run from public.daily_checklist_runs where id=v_item.run_id and shop_id=v_shop for update;
  if v_run.status not in('in_progress','reopened') then raise exception 'This checklist is not editable';end if;
  if v_item.admin_only and not public.is_admin() then raise exception 'Administrator completion required for this item';end if;
  if p_completed and v_item.evidence_type in('note','count') and length(trim(coalesce(p_evidence,'')))<1 then raise exception 'Evidence is required';end if;
  update public.daily_checklist_run_items set completed=p_completed,evidence=case when p_completed then nullif(trim(p_evidence),'') else null end,completed_by=case when p_completed then auth.uid() else null end,completed_at=case when p_completed then now() else null end where id=v_item.id;
  insert into public.daily_checklist_events(shop_id,run_id,action,note,details,performed_by) values(v_shop,v_run.id,case when p_completed then 'item_completed' else 'item_reopened' end,nullif(trim(p_evidence),''),jsonb_build_object('item_id',v_item.id,'label',v_item.label),auth.uid());
end $$;

create or replace function public.complete_daily_checklist(p_run_id uuid,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_run public.daily_checklist_runs%rowtype;v_missing integer;v_cash_open boolean;
begin
  if auth.uid() is null or v_shop is null then raise exception 'Active staff access required';end if;
  if length(trim(coalesce(p_note,'')))<3 then raise exception 'Completion note must contain at least 3 characters';end if;
  select * into v_run from public.daily_checklist_runs where id=p_run_id and shop_id=v_shop for update;
  if v_run.id is null or v_run.status not in('in_progress','reopened') then raise exception 'Editable checklist not found';end if;
  select count(*) into v_missing from public.daily_checklist_run_items where run_id=v_run.id and required and not completed;
  if v_missing>0 then raise exception 'Complete all required checklist items first';end if;
  if v_run.checklist_type='closing' then select exists(select 1 from public.cash_drawer_sessions where shop_id=v_shop and status='open') into v_cash_open;if v_cash_open then raise exception 'Close the Daily Cash record before completing the closing checklist';end if;end if;
  update public.daily_checklist_runs set status='completed',completed_by=auth.uid(),completed_at=now(),completion_note=trim(p_note),updated_at=now() where id=v_run.id;
  insert into public.daily_checklist_events(shop_id,run_id,action,from_status,to_status,note,performed_by) values(v_shop,v_run.id,'completed',v_run.status,'completed',trim(p_note),auth.uid());
end $$;

create or replace function public.review_daily_checklist(p_run_id uuid,p_action text,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_run public.daily_checklist_runs%rowtype;v_to text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;
  if p_action not in('verify','reopen') or length(trim(coalesce(p_note,'')))<3 then raise exception 'Valid review action and note are required';end if;
  select * into v_run from public.daily_checklist_runs where id=p_run_id and shop_id=v_shop for update;if v_run.id is null then raise exception 'Checklist not found';end if;
  if p_action='verify' then if v_run.status<>'completed' then raise exception 'Only completed checklists can be verified';end if;v_to:='verified';update public.daily_checklist_runs set status=v_to,verified_by=auth.uid(),verified_at=now(),verification_note=trim(p_note),updated_at=now() where id=v_run.id;
  else if v_run.status not in('completed','verified') then raise exception 'Only completed or verified checklists can be reopened';end if;v_to:='reopened';update public.daily_checklist_runs set status=v_to,completed_by=null,completed_at=null,completion_note=null,verified_by=null,verified_at=null,verification_note=null,updated_at=now() where id=v_run.id;end if;
  insert into public.daily_checklist_events(shop_id,run_id,action,from_status,to_status,note,performed_by) values(v_shop,v_run.id,p_action,v_run.status,v_to,trim(p_note),auth.uid());
end $$;

create or replace function public.get_daily_checklist_board(p_business_date date default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_date date:=coalesce(p_business_date,current_date);
begin
  if auth.uid() is null or v_shop is null then raise exception 'Active staff access required';end if;perform public.ensure_default_daily_checklists();
  return jsonb_build_object('business_date',v_date,'runs',(select coalesce(jsonb_agg(to_jsonb(x) order by x.checklist_type),'[]'::jsonb) from(
    select r.id,r.business_date,r.checklist_type,r.status,r.started_at,r.completed_at,r.completion_note,r.verified_at,r.verification_note,
      coalesce(st.display_name,'Former staff') started_by_name,coalesce(cp.display_name,'—') completed_by_name,coalesce(vp.display_name,'—') verified_by_name,
      (select count(*) from public.daily_checklist_run_items i where i.run_id=r.id) total_items,
      (select count(*) from public.daily_checklist_run_items i where i.run_id=r.id and i.completed) completed_items,
      (select coalesce(jsonb_agg(to_jsonb(z) order by z.item_order),'[]'::jsonb) from(select i.id,i.item_order,i.label,i.required,i.admin_only,i.evidence_type,i.completed,i.evidence,i.completed_at,coalesce(sp.display_name,'—') completed_by_name from public.daily_checklist_run_items i left join public.staff_profiles sp on sp.shop_id=i.shop_id and sp.user_id=i.completed_by where i.run_id=r.id)z) items
    from public.daily_checklist_runs r left join public.staff_profiles st on st.shop_id=r.shop_id and st.user_id=r.started_by left join public.staff_profiles cp on cp.shop_id=r.shop_id and cp.user_id=r.completed_by left join public.staff_profiles vp on vp.shop_id=r.shop_id and vp.user_id=r.verified_by where r.shop_id=v_shop and r.business_date=v_date
  )x),'history',(select coalesce(jsonb_agg(to_jsonb(h) order by h.business_date desc),'[]'::jsonb) from(select business_date,checklist_type,status,completed_at,verified_at from public.daily_checklist_runs where shop_id=v_shop and business_date<v_date order by business_date desc limit 20)h));
end $$;

alter function public.export_business_backup() rename to export_business_backup_phase333_base;
revoke all on function public.export_business_backup_phase333_base() from public;revoke all on function public.export_business_backup_phase333_base() from authenticated;
create or replace function public.export_business_backup() returns jsonb language plpgsql security definer set search_path=public as $$declare v_shop uuid:=public.current_shop_id();v_base jsonb;v_export uuid;begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;v_base:=public.export_business_backup_phase333_base();v_export:=(v_base->>'export_id')::uuid;update public.backup_exports set schema_version='1.17.0' where id=v_export and shop_id=v_shop;return(v_base-'schema_version')||jsonb_build_object('schema_version','1.17.0','daily_checklist_templates',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.daily_checklist_templates t where shop_id=v_shop),'daily_checklist_template_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.daily_checklist_template_items t where shop_id=v_shop),'daily_checklist_runs',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.daily_checklist_runs t where shop_id=v_shop),'daily_checklist_run_items',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.daily_checklist_run_items t where shop_id=v_shop),'daily_checklist_events',(select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from public.daily_checklist_events t where shop_id=v_shop));end $$;
revoke all on function public.ensure_default_daily_checklists() from public;revoke all on function public.start_daily_checklist(text,date) from public;revoke all on function public.complete_daily_checklist_item(uuid,boolean,text) from public;revoke all on function public.complete_daily_checklist(uuid,text) from public;revoke all on function public.review_daily_checklist(uuid,text,text) from public;revoke all on function public.get_daily_checklist_board(date) from public;revoke all on function public.export_business_backup() from public;
grant execute on function public.start_daily_checklist(text,date) to authenticated;grant execute on function public.complete_daily_checklist_item(uuid,boolean,text) to authenticated;grant execute on function public.complete_daily_checklist(uuid,text) to authenticated;grant execute on function public.review_daily_checklist(uuid,text,text) to authenticated;grant execute on function public.get_daily_checklist_board(date) to authenticated;grant execute on function public.export_business_backup() to authenticated;
