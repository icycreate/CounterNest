begin;
-- Private, non-transactional drafts. Published records remain the authoritative public source.
create table public.editor_drafts(
 shop_id uuid not null references public.shops(id),kind text not null check(kind in('home','categories','about','profile','product','settings')),
 record_key text not null default 'main' check(length(record_key) between 1 and 100),value jsonb not null,
 base_version jsonb not null default '{}',revision integer not null default 1,last_write uuid not null,
 updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now(),
 primary key(shop_id,kind,record_key),check(octet_length(value::text)<=262144)
);
alter table public.editor_drafts enable row level security;
revoke all on public.editor_drafts from public,anon,authenticated;
grant select on public.editor_drafts to authenticated;
create policy editor_drafts_private on public.editor_drafts for select to authenticated using(shop_id=current_shop_id() and current_workspace_role()='admin');
create function public.editor_draft(p_kind text,p_key text default 'main') returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 return (select to_jsonb(d)-'shop_id' from editor_drafts d where shop_id=current_shop_id() and kind=p_kind and record_key=p_key);
end$$;
create function public.save_editor_draft(p_kind text,p_key text,p_value jsonb,p_base jsonb,p_revision integer,p_operation uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare s uuid:=current_shop_id();d editor_drafts;
begin
 if coalesce(current_workspace_role(),'')<>'admin' or s is null then raise exception 'Administrator access required';end if;
 if p_kind not in('home','categories','about','profile','product','settings') or p_key is null or length(p_key) not between 1 and 100 or p_value is null or jsonb_typeof(p_value) not in('object','array') or octet_length(p_value::text)>262144 or p_operation is null or p_revision is null or p_base is null then raise exception 'Invalid draft';end if;
 if p_kind='product' and p_key<>'new' and not exists(select 1 from products where shop_id=s and id::text=p_key) then raise exception 'Record not found';end if;
 perform pg_advisory_xact_lock(hashtext(s::text||p_kind||p_key));
 select * into d from editor_drafts where shop_id=s and kind=p_kind and record_key=p_key for update;
 if found and d.last_write=p_operation then
  if d.value is distinct from p_value or d.base_version is distinct from p_base then raise exception 'Operation already used';end if;
  return to_jsonb(d)-'shop_id';
 end if;
 if coalesce(d.revision,0)<>p_revision then raise exception 'Draft conflict. Reload or compare before saving.' using errcode='40001';end if;
 insert into editor_drafts(shop_id,kind,record_key,value,base_version,revision,last_write,updated_by) values(s,p_kind,p_key,p_value,p_base,p_revision+1,p_operation,auth.uid())
 on conflict(shop_id,kind,record_key) do update set value=excluded.value,base_version=excluded.base_version,revision=excluded.revision,last_write=excluded.last_write,updated_by=excluded.updated_by,updated_at=now();
 return editor_draft(p_kind,p_key);
end$$;
create function public.discard_editor_draft(p_kind text,p_key text,p_revision integer) returns void language plpgsql security definer set search_path=public as $$
declare s uuid:=current_shop_id();d editor_drafts;
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtext(s::text||p_kind||p_key));
 select * into d from editor_drafts where shop_id=s and kind=p_kind and record_key=p_key for update;
 if not found then return;end if;
 if d.revision<>p_revision then raise exception 'Draft conflict. Reload or compare before saving.' using errcode='40001';end if;
 delete from editor_drafts where shop_id=s and kind=p_kind and record_key=p_key;
end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('onboarding-assets','onboarding-assets',false,8388608,array['image/png','image/jpeg','image/webp']);
create policy onboarding_assets_owner_read on storage.objects for select to authenticated using(bucket_id='onboarding-assets' and split_part(name,'/',1)=auth.uid()::text);
create policy onboarding_assets_owner_insert on storage.objects for insert to authenticated with check(bucket_id='onboarding-assets' and split_part(name,'/',1)=auth.uid()::text);
create policy onboarding_assets_owner_delete on storage.objects for delete to authenticated using(bucket_id='onboarding-assets' and split_part(name,'/',1)=auth.uid()::text);
-- Pre-company profile drafts belong only to the authenticated registering user.
create table public.business_registration_drafts(user_id uuid primary key references auth.users(id),value jsonb not null default '{}',revision integer not null default 1,updated_at timestamptz not null default now());
alter table public.business_registration_drafts enable row level security;
revoke all on public.business_registration_drafts from public,anon,authenticated;
create function public.registration_draft(p_value jsonb default null,p_revision integer default 0) returns jsonb language plpgsql security definer set search_path=public as $$
declare d business_registration_drafts;k text;
begin
 if auth.uid() is null then raise exception 'Sign-in required';end if;
 if current_shop_id() is not null and coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text||'registration'));
 select * into d from business_registration_drafts where user_id=auth.uid() for update;
 if p_value is not null then
  if jsonb_typeof(p_value)<>'object' or octet_length(p_value::text)>12000 then raise exception 'Invalid draft';end if;
  for k in select jsonb_object_keys(p_value) loop if k not in('name','phone','address','logo_path') or jsonb_typeof(p_value->k)<>'string' or length(p_value->>k)>2000 then raise exception 'Invalid draft';end if;end loop;
  if nullif(p_value->>'logo_path','') is not null and (split_part(p_value->>'logo_path','/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='onboarding-assets' and name=p_value->>'logo_path')) then raise exception 'Invalid registration logo';end if;
  if coalesce(d.revision,0)<>p_revision then raise exception 'Draft conflict. Reload or compare before saving.' using errcode='40001';end if;
  insert into business_registration_drafts(user_id,value,revision)values(auth.uid(),p_value,p_revision+1) on conflict(user_id) do update set value=excluded.value,revision=excluded.revision,updated_at=now();
 end if;
 return (select to_jsonb(x)-'user_id' from business_registration_drafts x where user_id=auth.uid());
end$$;
alter table public.ops_setup_progress add column cursor_step integer not null default 0 check(cursor_step between 0 and 6),add column wizard_reviewed text[] not null default '{}',add column wizard_finished boolean not null default false,add column wizard_revision integer not null default 0;
create function public.business_setup_state(p_step integer default null,p_review text default null,p_finish boolean default false,p_revision integer default 0) returns jsonb language plpgsql security definer set search_path=public as $$
declare s uuid:=current_shop_id();d ops_setup_progress;
begin
 if coalesce(current_workspace_role(),'')<>'admin' then raise exception 'Administrator access required';end if;
 insert into ops_setup_progress(shop_id)values(s) on conflict do nothing;
 select * into d from ops_setup_progress where shop_id=s for update;
 if p_step is not null or p_review is not null or p_finish then
  if d.wizard_revision<>p_revision then raise exception 'Setup changed elsewhere. Reload before saving.' using errcode='40001';end if;
  if p_review is not null and p_review not in('profile','catalogue','presentation','payments','staff') then raise exception 'Invalid setup step';end if;
  update ops_setup_progress set cursor_step=coalesce(p_step,cursor_step),wizard_reviewed=case when p_review is null then wizard_reviewed else array(select distinct unnest(wizard_reviewed||p_review)) end,wizard_finished=wizard_finished or p_finish,wizard_revision=wizard_revision+1,updated_at=now() where shop_id=s;
 end if;
 return (select jsonb_build_object('step',cursor_step,'reviewed',wizard_reviewed,'finished',wizard_finished,'revision',wizard_revision,'checks',jsonb_build_object(
 'profile',exists(select 1 from shops where id=s and length(trim(name))>0),'logo',exists(select 1 from shops where id=s and coalesce(logo_url,'')<>''),'category',exists(select 1 from categories where shop_id=s and active),'product',exists(select 1 from products where shop_id=s and active))) from ops_setup_progress where shop_id=s);
end$$;
revoke all on function editor_draft(text,text),save_editor_draft(text,text,jsonb,jsonb,integer,uuid),discard_editor_draft(text,text,integer),registration_draft(jsonb,integer),business_setup_state(integer,text,boolean,integer) from public,anon;
grant execute on function editor_draft(text,text),save_editor_draft(text,text,jsonb,jsonb,integer,uuid),discard_editor_draft(text,text,integer),registration_draft(jsonb,integer),business_setup_state(integer,text,boolean,integer) to authenticated;
-- Include durable business drafts in existing protected backups; pre-company account drafts are intentionally excluded.
insert into workspace_backup_tables select c.table_name,array_agg(c.column_name order by c.ordinal_position) from information_schema.columns c where c.table_schema='public' and c.table_name in('editor_drafts','ops_setup_progress') and c.is_generated='NEVER' group by c.table_name on conflict(table_name) do update set columns=excluded.columns;
commit;
