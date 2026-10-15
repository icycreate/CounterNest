-- CounterNest POS v1.24.1 — Phase 34.1.1 automatic session logoff
-- Adds a shop-wide inactivity policy and administrator audit evidence.

alter table public.shops
  add column if not exists auto_logout_enabled boolean not null default true,
  add column if not exists auto_logout_minutes integer not null default 30
    check (auto_logout_minutes between 5 and 480);

create table if not exists public.session_security_audit (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  performed_by uuid not null references auth.users(id) on delete restrict,
  action text not null default 'session_timeout_policy_changed',
  old_enabled boolean,
  new_enabled boolean not null,
  old_minutes integer,
  new_minutes integer not null,
  created_at timestamptz not null default now()
);

alter table public.session_security_audit enable row level security;

drop policy if exists session_security_audit_admin_select on public.session_security_audit;
create policy session_security_audit_admin_select
on public.session_security_audit for select to authenticated
using (shop_id = public.current_shop_id() and public.is_admin());

create or replace function public.save_session_security_policy(p_enabled boolean, p_minutes integer)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_old_enabled boolean;
  v_old_minutes integer;
begin
  if auth.uid() is null or v_shop is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 480 then
    raise exception 'Inactivity timeout must be between 5 and 480 minutes';
  end if;

  select auto_logout_enabled, auto_logout_minutes
    into v_old_enabled, v_old_minutes
  from public.shops
  where id = v_shop
  for update;

  update public.shops
  set auto_logout_enabled = coalesce(p_enabled, true),
      auto_logout_minutes = p_minutes,
      updated_at = now()
  where id = v_shop;

  if v_old_enabled is distinct from coalesce(p_enabled, true)
     or v_old_minutes is distinct from p_minutes then
    insert into public.session_security_audit(
      shop_id, performed_by, old_enabled, new_enabled, old_minutes, new_minutes
    ) values (
      v_shop, auth.uid(), v_old_enabled, coalesce(p_enabled, true), v_old_minutes, p_minutes
    );
  end if;
end $$;

revoke all on function public.save_session_security_policy(boolean,integer) from public;
grant execute on function public.save_session_security_policy(boolean,integer) to authenticated;

-- Extend the existing unified audit feed with session-security policy changes.
create or replace function public.get_audit_log(p_from timestamptz,p_to timestamptz,p_limit int default 500)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_limit int:=least(greatest(coalesce(p_limit,500),1),500);
begin if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;if p_from is null or p_to is null or p_to<p_from or p_to-p_from>interval '366 days' then raise exception 'Invalid audit date range';end if;
return (select coalesce(jsonb_agg(to_jsonb(x) order by x.event_time desc),'[]'::jsonb) from(
  select a.id,a.created_at event_time,'staff'::text category,a.action,coalesce(sp.display_name,'System') actor_name,coalesce(tp.display_name,a.target_email,'Staff account') target,jsonb_build_object('old_role',a.old_role,'new_role',a.new_role,'old_active',a.old_active,'new_active',a.new_active) details from public.staff_access_audit a left join public.staff_profiles sp on sp.user_id=a.performed_by and sp.shop_id=a.shop_id left join public.staff_profiles tp on tp.user_id=a.target_user_id and tp.shop_id=a.shop_id where a.shop_id=v_shop and a.created_at between p_from and p_to
  union all select t.id,t.created_at,'cash_drawer',t.transaction_type,coalesce(sp.display_name,'System'),'Drawer shift '||left(t.session_id::text,8),jsonb_build_object('amount',t.amount,'reason',t.reason,'receipt_number',s.receipt_number) from public.cash_drawer_transactions t left join public.staff_profiles sp on sp.user_id=t.performed_by and sp.shop_id=t.shop_id left join public.sales s on s.id=t.sale_id where t.shop_id=v_shop and t.created_at between p_from and p_to
  union all select r.id,r.created_at,'sale_adjustment',r.refund_type,coalesce(sp.display_name,'System'),'Receipt #'||s.receipt_number,jsonb_build_object('total',r.total,'reason',r.reason,'restocked',r.restocked,'approved_by',ap.display_name) from public.sale_refunds r join public.sales s on s.id=r.sale_id left join public.staff_profiles sp on sp.user_id=r.processed_by and sp.shop_id=r.shop_id left join public.staff_profiles ap on ap.user_id=r.approved_by and ap.shop_id=r.shop_id where r.shop_id=v_shop and r.created_at between p_from and p_to
  union all select i.id,i.created_at,'inventory','stock_adjustment',coalesce(sp.display_name,'System'),p.name,jsonb_build_object('quantity_change',i.delta,'reason',i.reason) from public.inventory_adjustments i join public.products p on p.id=i.product_id left join public.staff_profiles sp on sp.user_id=i.created_by and sp.shop_id=i.shop_id where i.shop_id=v_shop and i.created_at between p_from and p_to
  union all select rr.id,rr.created_at,'receipt','receipt_reprint',coalesce(sp.display_name,'System'),'Receipt #'||s.receipt_number,jsonb_build_object('sale_id',rr.sale_id) from public.receipt_reprints rr join public.sales s on s.id=rr.sale_id left join public.staff_profiles sp on sp.user_id=rr.reprinted_by and sp.shop_id=rr.shop_id where rr.shop_id=v_shop and rr.created_at between p_from and p_to
  union all select e.id,e.created_at,'expense','expense_recorded',coalesce(sp.display_name,'System'),c.name||': '||e.description,jsonb_build_object('amount',e.amount,'payment_method',e.payment_method,'vendor',e.vendor,'reference',e.reference) from public.expenses e join public.expense_categories c on c.id=e.category_id left join public.staff_profiles sp on sp.user_id=e.created_by and sp.shop_id=e.shop_id where e.shop_id=v_shop and e.created_at between p_from and p_to
  union all select ss.id,ss.created_at,'security','session_timeout_policy_changed',coalesce(sp.display_name,'Administrator'),'Session security',jsonb_build_object('old_enabled',ss.old_enabled,'new_enabled',ss.new_enabled,'old_minutes',ss.old_minutes,'new_minutes',ss.new_minutes) from public.session_security_audit ss left join public.staff_profiles sp on sp.user_id=ss.performed_by and sp.shop_id=ss.shop_id where ss.shop_id=v_shop and ss.created_at between p_from and p_to
  order by event_time desc limit v_limit
)x);end $$;
revoke all on function public.get_audit_log(timestamptz,timestamptz,int) from public;
grant execute on function public.get_audit_log(timestamptz,timestamptz,int) to authenticated;
