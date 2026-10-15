-- CounterNest POS Phase 30.1 — card styling and staff daily opening-cash declarations
alter table public.shops add column if not exists business_number text;

create table if not exists public.card_styles (
  shop_id uuid not null references public.shops(id) on delete cascade,
  card_type text not null check(card_type in ('customer','loyalty','employee')),
  background_color text not null default '#6f1d2a' check(background_color ~ '^#[0-9A-Fa-f]{6}$'),
  design_style text not null default 'elegant_border' check(design_style in ('solid','gradient','elegant_border')),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key(shop_id,card_type)
);

create table if not exists public.staff_daily_cash_entries (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  staff_user_id uuid not null references auth.users(id) on delete restrict,
  business_date date not null,
  opening_cash numeric(12,2) not null check(opening_cash>=0),
  note text check(note is null or char_length(note)<=200),
  recorded_at timestamptz not null default now(),
  unique(shop_id,staff_user_id,business_date)
);

create table if not exists public.issued_cards (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  card_id text not null unique,
  card_type text not null check(card_type in ('customer','loyalty','employee')),
  customer_id uuid references public.customers(id) on delete cascade,
  staff_user_id uuid references auth.users(id) on delete cascade,
  issued_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  check((card_type in ('customer','loyalty') and customer_id is not null and staff_user_id is null) or
        (card_type='employee' and staff_user_id is not null and customer_id is null))
);
create unique index if not exists issued_customer_card_unique on public.issued_cards(shop_id,card_type,customer_id) where customer_id is not null;
create unique index if not exists issued_employee_card_unique on public.issued_cards(shop_id,card_type,staff_user_id) where staff_user_id is not null;

alter table public.card_styles enable row level security;
alter table public.staff_daily_cash_entries enable row level security;
alter table public.issued_cards enable row level security;

create policy card_styles_staff_read on public.card_styles for select to authenticated
  using(shop_id=public.current_shop_id());
create policy daily_cash_own_read on public.staff_daily_cash_entries for select to authenticated
  using(shop_id=public.current_shop_id() and (staff_user_id=auth.uid() or public.is_admin()));
create policy issued_cards_staff_read on public.issued_cards for select to authenticated using(shop_id=public.current_shop_id());

create or replace function public.get_or_create_card_id(p_card_type text,p_subject_id uuid) returns text
language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_card text;v_prefix text;
begin
  if auth.uid() is null or v_shop is null then raise exception 'Active staff account required'; end if;
  if p_card_type not in ('customer','loyalty','employee') then raise exception 'Invalid card type'; end if;
  if p_card_type='employee' then
    if p_subject_id<>auth.uid() and not public.is_admin() then raise exception 'Employee card access denied'; end if;
    if not exists(select 1 from public.staff_profiles where user_id=p_subject_id and shop_id=v_shop and active) then raise exception 'Staff member not found'; end if;
    select card_id into v_card from public.issued_cards where shop_id=v_shop and card_type=p_card_type and staff_user_id=p_subject_id;
  else
    if not exists(select 1 from public.customers where id=p_subject_id and shop_id=v_shop) then raise exception 'Customer not found'; end if;
    select card_id into v_card from public.issued_cards where shop_id=v_shop and card_type=p_card_type and customer_id=p_subject_id;
  end if;
  if v_card is not null then return v_card; end if;
  v_prefix:=case p_card_type when 'customer' then 'CUS' when 'loyalty' then 'LOY' else 'EMP' end;
  v_card:=v_prefix||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.issued_cards(shop_id,card_id,card_type,customer_id,staff_user_id,issued_by)
  values(v_shop,v_card,p_card_type,case when p_card_type<>'employee' then p_subject_id end,case when p_card_type='employee' then p_subject_id end,auth.uid());
  return v_card;
end $$;

create or replace function public.get_card_styles() returns jsonb language sql security definer stable set search_path=public as $$
  select coalesce(jsonb_object_agg(card_type,jsonb_build_object('background_color',background_color,'design_style',design_style)),'{}'::jsonb)
  from public.card_styles where shop_id=public.current_shop_id();
$$;

create or replace function public.save_card_style(p_card_type text,p_background_color text,p_design_style text) returns void
language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_card_type not in ('customer','loyalty','employee') then raise exception 'Invalid card type'; end if;
  if p_background_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Invalid card color'; end if;
  if p_design_style not in ('solid','gradient','elegant_border') then raise exception 'Invalid card style'; end if;
  insert into public.card_styles(shop_id,card_type,background_color,design_style,updated_by)
  values(v_shop,p_card_type,upper(p_background_color),p_design_style,auth.uid())
  on conflict(shop_id,card_type) do update set background_color=excluded.background_color,design_style=excluded.design_style,updated_by=auth.uid(),updated_at=now();
end $$;

create or replace function public.get_today_staff_opening_cash() returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_date date;v_row public.staff_daily_cash_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select (now() at time zone coalesce(timezone,'UTC'))::date into v_date from public.shops where id=v_shop;
  select * into v_row from public.staff_daily_cash_entries where shop_id=v_shop and staff_user_id=auth.uid() and business_date=v_date;
  if v_row.id is null then return null; end if;
  return jsonb_build_object('id',v_row.id,'business_date',v_row.business_date,'opening_cash',v_row.opening_cash,'note',v_row.note,'recorded_at',v_row.recorded_at);
end $$;

create or replace function public.submit_staff_opening_cash(p_opening_cash numeric,p_note text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_date date;v_id uuid;
begin
  if auth.uid() is null or v_shop is null then raise exception 'Active staff account required'; end if;
  if p_opening_cash is null or p_opening_cash<0 or p_opening_cash>9999999999.99 then raise exception 'Enter a valid cash amount'; end if;
  select (now() at time zone coalesce(timezone,'UTC'))::date into v_date from public.shops where id=v_shop;
  insert into public.staff_daily_cash_entries(shop_id,staff_user_id,business_date,opening_cash,note)
  values(v_shop,auth.uid(),v_date,round(p_opening_cash,2),nullif(trim(p_note),''))
  on conflict(shop_id,staff_user_id,business_date) do nothing returning id into v_id;
  if v_id is null then raise exception 'Opening cash was already recorded for today'; end if;
  return v_id;
end $$;

create or replace function public.get_staff_opening_cash_report(p_date date default null) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_date date;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select coalesce(p_date,(now() at time zone coalesce(timezone,'UTC'))::date) into v_date from public.shops where id=v_shop;
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.recorded_at),'[]'::jsonb) from (
    select e.id,e.business_date,e.opening_cash,e.note,e.recorded_at,sp.display_name staff_name
    from public.staff_daily_cash_entries e join public.staff_profiles sp on sp.user_id=e.staff_user_id
    where e.shop_id=v_shop and e.business_date=v_date
  ) x);
end $$;

revoke all on function public.get_card_styles() from public;
revoke all on function public.get_or_create_card_id(text,uuid) from public;
revoke all on function public.save_card_style(text,text,text) from public;
revoke all on function public.get_today_staff_opening_cash() from public;
revoke all on function public.submit_staff_opening_cash(numeric,text) from public;
revoke all on function public.get_staff_opening_cash_report(date) from public;
grant execute on function public.get_card_styles() to authenticated;
grant execute on function public.get_or_create_card_id(text,uuid) to authenticated;
grant execute on function public.save_card_style(text,text,text) to authenticated;
grant execute on function public.get_today_staff_opening_cash() to authenticated;
grant execute on function public.submit_staff_opening_cash(numeric,text) to authenticated;
grant execute on function public.get_staff_opening_cash_report(date) to authenticated;
