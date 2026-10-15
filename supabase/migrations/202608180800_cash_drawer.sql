-- ChubbyLu Bakery POS v0.8.1 — management cash drawer sessions and audit trail
-- Run after 20260816_refunds_voids.sql.

create table if not exists public.cash_drawer_sessions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed')),
  opening_amount numeric(12,2) not null check (opening_amount >= 0),
  counted_amount numeric(12,2) check (counted_amount >= 0),
  expected_amount numeric(12,2),
  variance numeric(12,2),
  opening_note text,
  closing_note text,
  opened_by uuid not null references auth.users(id) on delete restrict,
  closed_by uuid references auth.users(id) on delete restrict,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint drawer_closed_fields check (
    (status='open' and counted_amount is null and closed_at is null and closed_by is null)
    or (status='closed' and counted_amount is not null and expected_amount is not null and variance is not null and closed_at is not null and closed_by is not null)
  )
);

create unique index if not exists one_open_drawer_per_shop
  on public.cash_drawer_sessions(shop_id) where status='open';
create index if not exists cash_drawer_sessions_history_idx
  on public.cash_drawer_sessions(shop_id, opened_at desc);

create table if not exists public.cash_drawer_transactions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  session_id uuid not null references public.cash_drawer_sessions(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('opening_float','cash_sale','cash_refund','cash_in','cash_out')),
  amount numeric(12,2) not null check (amount <> 0 or transaction_type='opening_float'),
  reason text not null,
  sale_id uuid references public.sales(id) on delete restrict,
  refund_id uuid references public.sale_refunds(id) on delete restrict,
  performed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint drawer_amount_direction check (
    (transaction_type in ('opening_float','cash_sale','cash_in') and amount >= 0)
    or (transaction_type in ('cash_refund','cash_out') and amount < 0)
  )
);

create unique index if not exists drawer_cash_sale_once on public.cash_drawer_transactions(sale_id) where transaction_type='cash_sale';
create unique index if not exists drawer_cash_refund_once on public.cash_drawer_transactions(refund_id) where transaction_type='cash_refund';
create index if not exists cash_drawer_transactions_session_idx on public.cash_drawer_transactions(session_id, created_at desc);

alter table public.cash_drawer_sessions enable row level security;
alter table public.cash_drawer_transactions enable row level security;
create policy cash_drawer_sessions_admin_select on public.cash_drawer_sessions for select to authenticated
  using (shop_id=public.current_shop_id() and public.is_admin());
create policy cash_drawer_transactions_admin_select on public.cash_drawer_transactions for select to authenticated
  using (shop_id=public.current_shop_id() and public.is_admin());
-- Writes are intentionally RPC-only. There are no client insert/update/delete policies.

create or replace function public.open_cash_drawer(p_opening_amount numeric, p_note text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id(); v_session uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_admin() then raise exception 'Management access required'; end if;
  if p_opening_amount is null or p_opening_amount < 0 then raise exception 'Opening cash cannot be negative'; end if;
  if exists(select 1 from public.cash_drawer_sessions where shop_id=v_shop and status='open') then raise exception 'A cash drawer is already open'; end if;
  insert into public.cash_drawer_sessions(shop_id,opening_amount,opening_note,opened_by)
    values(v_shop,round(p_opening_amount,2),nullif(trim(p_note),''),auth.uid()) returning id into v_session;
  insert into public.cash_drawer_transactions(shop_id,session_id,transaction_type,amount,reason,performed_by)
    values(v_shop,v_session,'opening_float',round(p_opening_amount,2),coalesce(nullif(trim(p_note),''),'Opening float'),auth.uid());
  return v_session;
end $$;

create or replace function public.adjust_cash_drawer(p_transaction_type text, p_amount numeric, p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id(); v_session uuid; v_id uuid; v_signed numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_admin() then raise exception 'Management access required'; end if;
  if p_transaction_type not in ('cash_in','cash_out') then raise exception 'Adjustment must be cash_in or cash_out'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A reason is required'; end if;
  select id into v_session from public.cash_drawer_sessions where shop_id=v_shop and status='open' for update;
  if v_session is null then raise exception 'No cash drawer is open'; end if;
  v_signed:=case when p_transaction_type='cash_out' then -round(p_amount,2) else round(p_amount,2) end;
  insert into public.cash_drawer_transactions(shop_id,session_id,transaction_type,amount,reason,performed_by)
    values(v_shop,v_session,p_transaction_type,v_signed,trim(p_reason),auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.close_cash_drawer(p_counted_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id(); v_session uuid; v_expected numeric(12,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_admin() then raise exception 'Management access required'; end if;
  if p_counted_amount is null or p_counted_amount < 0 then raise exception 'Counted cash cannot be negative'; end if;
  select id into v_session from public.cash_drawer_sessions where shop_id=v_shop and status='open' for update;
  if v_session is null then raise exception 'No cash drawer is open'; end if;
  select coalesce(sum(amount),0) into v_expected from public.cash_drawer_transactions where session_id=v_session;
  update public.cash_drawer_sessions set status='closed',counted_amount=round(p_counted_amount,2),expected_amount=v_expected,
    variance=round(p_counted_amount,2)-v_expected,closing_note=nullif(trim(p_note),''),closed_by=auth.uid(),closed_at=now()
    where id=v_session;
  return jsonb_build_object('session_id',v_session,'expected_amount',v_expected,'counted_amount',round(p_counted_amount,2),'variance',round(p_counted_amount,2)-v_expected);
end $$;

create or replace function public.get_cash_drawer()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id(); v_session uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_admin() then raise exception 'Management access required'; end if;
  select id into v_session from public.cash_drawer_sessions where shop_id=v_shop and status='open';
  return jsonb_build_object(
    'open_session',(select to_jsonb(x) from (select s.id,s.status,s.opening_amount,coalesce(sum(t.amount),0) expected_amount,s.counted_amount,s.variance,s.opened_at,s.closed_at,s.opening_note,s.closing_note,op.display_name opened_by_name,null::text closed_by_name from public.cash_drawer_sessions s left join public.cash_drawer_transactions t on t.session_id=s.id left join public.staff_profiles op on op.user_id=s.opened_by and op.shop_id=s.shop_id where s.id=v_session group by s.id,op.display_name) x),
    'transactions',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select t.*,sp.display_name staff_name,sa.receipt_number from public.cash_drawer_transactions t left join public.staff_profiles sp on sp.user_id=t.performed_by and sp.shop_id=t.shop_id left join public.sales sa on sa.id=t.sale_id where t.session_id=v_session) x),'[]'::jsonb),
    'recent_sessions',coalesce((select jsonb_agg(to_jsonb(x) order by x.opened_at desc) from (select s.*,op.display_name opened_by_name,cp.display_name closed_by_name from public.cash_drawer_sessions s left join public.staff_profiles op on op.user_id=s.opened_by and op.shop_id=s.shop_id left join public.staff_profiles cp on cp.user_id=s.closed_by and cp.shop_id=s.shop_id where s.shop_id=v_shop and s.status='closed' order by s.opened_at desc limit 20) x),'[]'::jsonb)
  );
end $$;

create or replace function public.record_cash_sale_in_drawer() returns trigger language plpgsql security definer set search_path=public as $$
declare v_session uuid;
begin
  if lower(new.payment_method) <> 'cash' then return new; end if;
  select id into v_session from public.cash_drawer_sessions where shop_id=new.shop_id and status='open';
  if v_session is not null then
    insert into public.cash_drawer_transactions(shop_id,session_id,transaction_type,amount,reason,sale_id,performed_by)
      values(new.shop_id,v_session,'cash_sale',new.total,'Cash sale',new.id,new.staff_user_id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists sales_cash_drawer_trigger on public.sales;
create trigger sales_cash_drawer_trigger after insert on public.sales for each row execute function public.record_cash_sale_in_drawer();

create or replace function public.record_cash_refund_in_drawer() returns trigger language plpgsql security definer set search_path=public as $$
declare v_session uuid; v_payment text;
begin
  select payment_method into v_payment from public.sales where id=new.sale_id;
  if lower(coalesce(v_payment,'')) <> 'cash' then return new; end if;
  select id into v_session from public.cash_drawer_sessions where shop_id=new.shop_id and status='open';
  if v_session is not null and new.total>0 then
    insert into public.cash_drawer_transactions(shop_id,session_id,transaction_type,amount,reason,sale_id,refund_id,performed_by)
      values(new.shop_id,v_session,'cash_refund',-new.total,'Cash '||new.refund_type||': '||new.reason,new.sale_id,new.id,new.processed_by) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists refunds_cash_drawer_trigger on public.sale_refunds;
create trigger refunds_cash_drawer_trigger after insert on public.sale_refunds for each row execute function public.record_cash_refund_in_drawer();

revoke all on function public.open_cash_drawer(numeric,text) from public;
revoke all on function public.adjust_cash_drawer(text,numeric,text) from public;
revoke all on function public.close_cash_drawer(numeric,text) from public;
revoke all on function public.get_cash_drawer() from public;
grant execute on function public.open_cash_drawer(numeric,text) to authenticated;
grant execute on function public.adjust_cash_drawer(text,numeric,text) to authenticated;
grant execute on function public.close_cash_drawer(numeric,text) to authenticated;
grant execute on function public.get_cash_drawer() to authenticated;
