-- CounterNest POS Phase 30 — direct staff provisioning and first-login password change
alter table public.staff_profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_initialized_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create or replace function public.get_staff_management() returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  update public.staff_invitations set status='expired' where shop_id=v_shop and status='pending' and expires_at<=now();
  return jsonb_build_object(
    'staff',(select coalesce(jsonb_agg(to_jsonb(x) order by x.display_name),'[]'::jsonb)
      from (select user_id,display_name,email,role,active,(pin_hash is not null) pin_configured,
                   must_change_password,password_initialized_at,created_at
            from public.staff_profiles where shop_id=v_shop) x),
    'invitations',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
      from (select id,email,display_name,role,token,status,expires_at,created_at
            from public.staff_invitations where shop_id=v_shop order by created_at desc limit 50) x)
  );
end $$;
