-- ChubbyLu Bakery POS v0.10.0 — staff invitations, access control, and audit
alter table public.staff_profiles add column if not exists email text;
update public.staff_profiles sp set email=lower(u.email) from auth.users u where u.id=sp.user_id and sp.email is null;

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  email text not null, display_name text not null, role public.staff_role not null default 'employee',
  token uuid not null default gen_random_uuid() unique, status text not null default 'pending' check(status in('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id) on delete restrict, accepted_by uuid references auth.users(id) on delete restrict,
  expires_at timestamptz not null default(now()+interval '7 days'), created_at timestamptz not null default now(), accepted_at timestamptz
);
create unique index if not exists staff_pending_invite_email_unique on public.staff_invitations(shop_id,lower(email)) where status='pending';

create table if not exists public.staff_access_audit (
  id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id) on delete cascade,
  action text not null,target_user_id uuid references auth.users(id) on delete restrict,target_email text,
  old_role public.staff_role,new_role public.staff_role,old_active boolean,new_active boolean,
  performed_by uuid references auth.users(id) on delete restrict,created_at timestamptz not null default now()
);
alter table public.staff_invitations enable row level security;alter table public.staff_access_audit enable row level security;
create policy staff_invites_admin_select on public.staff_invitations for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
create policy staff_audit_admin_select on public.staff_access_audit for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create or replace function public.create_staff_invitation(p_email text,p_display_name text,p_role public.staff_role default 'employee') returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_row public.staff_invitations%rowtype;
begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;if nullif(trim(p_display_name),'') is null or p_email!~*'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Valid name and email are required';end if;
update public.staff_invitations set status='expired' where shop_id=v_shop and status='pending' and expires_at<=now();
if exists(select 1 from public.staff_profiles where shop_id=v_shop and lower(email)=lower(trim(p_email))) then raise exception 'This email already belongs to staff';end if;
insert into public.staff_invitations(shop_id,email,display_name,role,invited_by) values(v_shop,lower(trim(p_email)),trim(p_display_name),p_role,auth.uid()) returning * into v_row;
insert into public.staff_access_audit(shop_id,action,target_email,new_role,new_active,performed_by) values(v_shop,'invitation_created',v_row.email,p_role,true,auth.uid());
return jsonb_build_object('id',v_row.id,'token',v_row.token,'expires_at',v_row.expires_at);end $$;

create or replace function public.get_staff_invitation(p_token uuid) returns jsonb language sql security definer stable set search_path=public as $$
select jsonb_build_object('shop_name',s.name,'email',i.email,'display_name',i.display_name,'role',i.role,'expires_at',i.expires_at) from public.staff_invitations i join public.shops s on s.id=i.shop_id where i.token=p_token and i.status='pending' and i.expires_at>now();$$;

create or replace function public.accept_staff_invitation(p_token uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_i public.staff_invitations%rowtype;v_email text;
begin if auth.uid() is null then raise exception 'Authentication required';end if;select lower(email) into v_email from auth.users where id=auth.uid();select * into v_i from public.staff_invitations where token=p_token and status='pending' and expires_at>now() for update;if v_i.id is null then raise exception 'Invitation is invalid or expired';end if;if v_email<>lower(v_i.email) then raise exception 'Sign in with the invited email address';end if;if exists(select 1 from public.staff_profiles where user_id=auth.uid()) then raise exception 'This account already belongs to a business';end if;
insert into public.staff_profiles(user_id,shop_id,display_name,email,role,active) values(auth.uid(),v_i.shop_id,v_i.display_name,v_i.email,v_i.role,true);update public.staff_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=v_i.id;insert into public.staff_access_audit(shop_id,action,target_user_id,target_email,new_role,new_active,performed_by) values(v_i.shop_id,'invitation_accepted',auth.uid(),v_i.email,v_i.role,true,auth.uid());return v_i.shop_id;end $$;

create or replace function public.get_staff_management() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;update public.staff_invitations set status='expired' where shop_id=v_shop and status='pending' and expires_at<=now();return jsonb_build_object('staff',(select coalesce(jsonb_agg(to_jsonb(x) order by x.display_name),'[]'::jsonb) from(select user_id,display_name,email,role,active,(pin_hash is not null) pin_configured,created_at from public.staff_profiles where shop_id=v_shop)x),'invitations',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from(select id,email,display_name,role,token,status,expires_at,created_at from public.staff_invitations where shop_id=v_shop order by created_at desc limit 50)x));end $$;

create or replace function public.update_staff_access(p_user_id uuid,p_role public.staff_role,p_active boolean) returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_old public.staff_profiles%rowtype;
begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;if p_user_id=auth.uid() then raise exception 'You cannot change your own access here';end if;select * into v_old from public.staff_profiles where user_id=p_user_id and shop_id=v_shop for update;if v_old.user_id is null then raise exception 'Staff member not found';end if;if v_old.role='admin' and (p_role<>'admin' or not p_active) and (select count(*) from public.staff_profiles where shop_id=v_shop and role='admin' and active)<=1 then raise exception 'At least one active administrator is required';end if;update public.staff_profiles set role=p_role,active=p_active where user_id=p_user_id;insert into public.staff_access_audit(shop_id,action,target_user_id,target_email,old_role,new_role,old_active,new_active,performed_by) values(v_shop,'access_updated',p_user_id,v_old.email,v_old.role,p_role,v_old.active,p_active,auth.uid());end $$;

revoke all on function public.create_staff_invitation(text,text,public.staff_role) from public;revoke all on function public.get_staff_invitation(uuid) from public;revoke all on function public.accept_staff_invitation(uuid) from public;revoke all on function public.get_staff_management() from public;revoke all on function public.update_staff_access(uuid,public.staff_role,boolean) from public;
grant execute on function public.create_staff_invitation(text,text,public.staff_role) to authenticated;grant execute on function public.get_staff_invitation(uuid) to anon,authenticated;grant execute on function public.accept_staff_invitation(uuid) to authenticated;grant execute on function public.get_staff_management() to authenticated;grant execute on function public.update_staff_access(uuid,public.staff_role,boolean) to authenticated;
