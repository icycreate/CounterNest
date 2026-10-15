-- ChubbyLu Bakes POS - initial Supabase schema
-- Run in Supabase SQL Editor on a new project.

create extension if not exists pgcrypto;

create type public.staff_role as enum ('admin', 'employee');
create type public.loyalty_status as enum ('not_enrolled', 'invited', 'member', 'opted_out');
create type public.card_type as enum ('employee', 'customer', 'loyalty');
create type public.card_status as enum ('active', 'inactive', 'lost', 'replaced', 'expired', 'suspended');
create type public.reward_type as enum ('free_product', 'percent_discount', 'fixed_discount', 'bonus_points');

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  email text,
  currency text not null default 'USD',
  tax_rate numeric(7,4) not null default 0.08 check (tax_rate >= 0),
  timezone text not null default 'America/Belize',
  receipt_footer text default 'Thank you for supporting our bakery!',
  theme jsonb not null default '{"primary":"#8b451f","background":"#f8efe6","text":"#482e20"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  display_name text not null,
  role public.staff_role not null default 'employee',
  pin_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  unique(shop_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  stock numeric(12,3) not null default 0,
  low_stock_at numeric(12,3) not null default 0,
  active boolean not null default true,
  image_url text,
  sku text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  loyalty_status public.loyalty_status not null default 'not_enrolled',
  visits int not null default 0,
  total_spent numeric(12,2) not null default 0,
  last_visit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_shop_email_unique on public.customers(shop_id, lower(email)) where email is not null;

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique references public.shops(id) on delete cascade,
  name text not null default 'Bakery Rewards',
  active boolean not null default true,
  points_enabled boolean not null default true,
  points_per_currency numeric(10,4) not null default 1,
  points_expire boolean not null default false,
  points_expiry_days int check (points_expiry_days is null or points_expiry_days > 0),
  stamps_enabled boolean not null default true,
  stamp_mode text not null default 'per_sale' check (stamp_mode in ('per_sale','per_amount')),
  stamp_threshold numeric(12,2) not null default 1,
  stamps_required int not null default 10 check (stamps_required > 0),
  credit_joining_purchase boolean not null default false,
  invite_expiry_days int not null default 14,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loyalty_memberships (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  member_code text not null,
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  unique(shop_id, member_code)
);

create table public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  reward_type public.reward_type not null,
  points_cost int check (points_cost is null or points_cost >= 0),
  stamps_cost int check (stamps_cost is null or stamps_cost >= 0),
  reward_value numeric(12,2) not null default 0,
  product_id uuid references public.products(id) on delete set null,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.loyalty_point_lots (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  membership_id uuid not null references public.loyalty_memberships(id) on delete cascade,
  source_sale_id uuid,
  points_original int not null check (points_original >= 0),
  points_remaining int not null check (points_remaining >= 0),
  earned_at timestamptz not null default now(),
  expires_at timestamptz,
  note text
);

create table public.loyalty_point_transactions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  membership_id uuid not null references public.loyalty_memberships(id) on delete cascade,
  delta int not null,
  transaction_type text not null check (transaction_type in ('earn','redeem','adjust','expire','bonus')),
  sale_id uuid,
  reward_id uuid references public.loyalty_rewards(id) on delete set null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.loyalty_stamp_transactions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  membership_id uuid not null references public.loyalty_memberships(id) on delete cascade,
  delta int not null,
  transaction_type text not null check (transaction_type in ('earn','redeem','adjust')),
  sale_id uuid,
  reward_id uuid references public.loyalty_rewards(id) on delete set null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  card_type public.card_type not null,
  card_code text not null,
  customer_id uuid references public.customers(id) on delete cascade,
  staff_user_id uuid references auth.users(id) on delete cascade,
  membership_id uuid references public.loyalty_memberships(id) on delete cascade,
  status public.card_status not null default 'active',
  issued_at timestamptz not null default now(),
  replaced_by uuid references public.cards(id) on delete set null,
  last_sent_at timestamptz,
  unique(shop_id, card_code),
  check (
    (card_type = 'employee' and staff_user_id is not null) or
    (card_type = 'customer' and customer_id is not null) or
    (card_type = 'loyalty' and membership_id is not null)
  )
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  receipt_number bigint generated by default as identity,
  staff_user_id uuid references auth.users(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null check (payment_method in ('cash','card','qr')),
  status text not null default 'completed' check (status in ('completed','voided','refunded')),
  created_at timestamptz not null default now()
);

alter table public.loyalty_point_lots add constraint loyalty_point_lots_source_sale_fkey foreign key (source_sale_id) references public.sales(id) on delete set null;
alter table public.loyalty_point_transactions add constraint loyalty_point_transactions_sale_fkey foreign key (sale_id) references public.sales(id) on delete set null;
alter table public.loyalty_stamp_transactions add constraint loyalty_stamp_transactions_sale_fkey foreign key (sale_id) references public.sales(id) on delete set null;

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  qty numeric(12,3) not null check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  delta numeric(12,3) not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.loyalty_invitations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  expires_at timestamptz not null,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Helper functions used by RLS.
create or replace function public.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id from public.staff_profiles where user_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.staff_profiles where user_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = 'admin', false);
$$;

-- First login bootstrap: creates a separate shop for an authenticated user who has no staff profile yet.
create or replace function public.bootstrap_shop(p_shop_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select shop_id into v_shop from public.staff_profiles where user_id = auth.uid();
  if v_shop is not null then return v_shop; end if;

  insert into public.shops(name, email, logo_url) values (p_shop_name, auth.jwt() ->> 'email', '/chubbylu-logo.png') returning id into v_shop;
  insert into public.staff_profiles(user_id, shop_id, display_name, role)
  values (auth.uid(), v_shop, coalesce(nullif(p_display_name,''), auth.jwt() ->> 'email'), 'admin');
  insert into public.loyalty_programs(shop_id, name) values (v_shop, p_shop_name || ' Rewards');
  insert into public.categories(shop_id, name, sort_order) values
    (v_shop,'Breads',1),(v_shop,'Pastries',2),(v_shop,'Cakes',3),(v_shop,'Cookies',4),(v_shop,'Desserts',5),(v_shop,'Drinks',6);
  return v_shop;
end;
$$;

grant execute on function public.bootstrap_shop(text,text) to authenticated;

-- Add stock safely and keep an audit trail.
create or replace function public.adjust_stock(p_product_id uuid, p_delta numeric, p_reason text default null)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_new numeric;
begin
  if v_shop is null then raise exception 'No active shop'; end if;
  update public.products
    set stock = stock + p_delta, updated_at = now()
    where id = p_product_id and shop_id = v_shop and stock + p_delta >= 0
    returning stock into v_new;
  if v_new is null then raise exception 'Product not found or adjustment would make stock negative'; end if;
  insert into public.inventory_adjustments(shop_id, product_id, delta, reason, created_by)
  values (v_shop, p_product_id, p_delta, p_reason, auth.uid());
  return v_new;
end;
$$;
grant execute on function public.adjust_stock(uuid,numeric,text) to authenticated;

-- Complete checkout atomically: prices come from DB, stock is decremented, and loyalty earn/redemption happens in one transaction.
create or replace function public.complete_sale(
  p_customer_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_reward_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_sale uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_subtotal numeric(12,2) := 0;
  v_taxable numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_tax_rate numeric := 0;
  v_membership uuid;
  v_program public.loyalty_programs%rowtype;
  v_reward public.loyalty_rewards%rowtype;
  v_points int := 0;
  v_stamps int := 0;
  v_bonus_points int := 0;
  v_points_cost int := 0;
  v_stamps_cost int := 0;
  v_point_balance int := 0;
  v_stamp_balance int := 0;
  v_expires timestamptz;
  v_need int;
  v_take int;
  v_lot record;
  v_free_price numeric(12,2);
begin
  if v_shop is null then raise exception 'No active shop'; end if;
  if p_payment_method not in ('cash','card','qr') then raise exception 'Invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  select tax_rate into v_tax_rate from public.shops where id = v_shop;

  -- Validate and calculate using server-side prices.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::numeric;
    if v_qty <= 0 then raise exception 'Invalid quantity'; end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and shop_id = v_shop and active = true
      for update;
    if not found then raise exception 'Product not found'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_subtotal := v_subtotal + round(v_product.price * v_qty, 2);
  end loop;

  -- Resolve loyalty membership and requested reward before charging.
  if p_customer_id is not null then
    select id into v_membership from public.loyalty_memberships
      where customer_id = p_customer_id and shop_id = v_shop and active = true;
  end if;
  select * into v_program from public.loyalty_programs where shop_id = v_shop and active = true;

  if p_reward_id is not null then
    if v_membership is null then raise exception 'A loyalty member is required to redeem a reward'; end if;
    select * into v_reward from public.loyalty_rewards
      where id = p_reward_id and shop_id = v_shop and active = true
        and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());
    if not found then raise exception 'Reward is unavailable'; end if;

    v_points_cost := coalesce(v_reward.points_cost,0);
    v_stamps_cost := coalesce(v_reward.stamps_cost,0);
    select coalesce(sum(points_remaining),0)::int into v_point_balance
      from public.loyalty_point_lots
      where membership_id=v_membership and (expires_at is null or expires_at > now());
    select coalesce(sum(delta),0)::int into v_stamp_balance
      from public.loyalty_stamp_transactions where membership_id=v_membership;
    if v_point_balance < v_points_cost then raise exception 'Not enough points'; end if;
    if v_stamp_balance < v_stamps_cost then raise exception 'Not enough stamps'; end if;

    if v_reward.reward_type = 'fixed_discount' then
      v_discount := least(v_subtotal, v_reward.reward_value);
    elsif v_reward.reward_type = 'percent_discount' then
      v_discount := round(v_subtotal * least(v_reward.reward_value,100) / 100, 2);
    elsif v_reward.reward_type = 'free_product' then
      if v_reward.product_id is null then raise exception 'Free-product reward has no product assigned'; end if;
      select p.price into v_free_price
      from public.products p
      where p.id=v_reward.product_id and p.shop_id=v_shop
        and exists(select 1 from jsonb_array_elements(p_items) i where (i->>'product_id')::uuid=p.id and (i->>'qty')::numeric > 0);
      if v_free_price is null then raise exception 'Add the reward product to the cart before redeeming'; end if;
      v_discount := least(v_subtotal, v_free_price);
    elsif v_reward.reward_type = 'bonus_points' then
      v_bonus_points := floor(v_reward.reward_value)::int;
    end if;
  end if;

  v_taxable := greatest(v_subtotal - v_discount,0);
  v_tax := round(v_taxable * v_tax_rate, 2);
  v_total := v_taxable + v_tax;

  insert into public.sales(shop_id, staff_user_id, customer_id, subtotal, tax, discount, total, payment_method)
  values (v_shop, auth.uid(), p_customer_id, v_subtotal, v_tax, v_discount, v_total, p_payment_method)
  returning id into v_sale;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::numeric;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and shop_id = v_shop for update;
    insert into public.sale_items(sale_id, shop_id, product_id, product_name, qty, unit_price, line_total)
    values (v_sale, v_shop, v_product.id, v_product.name, v_qty, v_product.price, round(v_product.price * v_qty,2));
    update public.products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
  end loop;

  -- Spend reward currency FIFO. Point lots nearest to expiry are consumed first, then oldest-earned non-expiring lots.
  if p_reward_id is not null then
    if v_points_cost > 0 then
      v_need := v_points_cost;
      for v_lot in
        select id, points_remaining from public.loyalty_point_lots
        where membership_id=v_membership and points_remaining>0 and (expires_at is null or expires_at > now())
        order by expires_at asc nulls last, earned_at asc
        for update
      loop
        exit when v_need <= 0;
        v_take := least(v_need, v_lot.points_remaining);
        update public.loyalty_point_lots set points_remaining=points_remaining-v_take where id=v_lot.id;
        v_need := v_need-v_take;
      end loop;
      insert into public.loyalty_point_transactions(shop_id,membership_id,delta,transaction_type,sale_id,reward_id,created_by,note)
      values(v_shop,v_membership,-v_points_cost,'redeem',v_sale,p_reward_id,auth.uid(),'Reward redemption');
    end if;
    if v_stamps_cost > 0 then
      insert into public.loyalty_stamp_transactions(shop_id,membership_id,delta,transaction_type,sale_id,reward_id,created_by,note)
      values(v_shop,v_membership,-v_stamps_cost,'redeem',v_sale,p_reward_id,auth.uid(),'Reward redemption');
    end if;
  end if;

  if p_customer_id is not null then
    update public.customers set visits = visits + 1, total_spent = total_spent + v_total, last_visit_at = now(), updated_at = now()
      where id = p_customer_id and shop_id = v_shop;

    if v_membership is not null and v_program.id is not null then
      if v_program.points_enabled then
        v_points := floor(v_taxable * v_program.points_per_currency)::int;
        if v_points > 0 then
          if v_program.points_expire and v_program.points_expiry_days is not null then
            v_expires := now() + make_interval(days => v_program.points_expiry_days);
          else
            v_expires := null;
          end if;
          insert into public.loyalty_point_lots(shop_id,membership_id,source_sale_id,points_original,points_remaining,expires_at,note)
          values (v_shop,v_membership,v_sale,v_points,v_points,v_expires,'Purchase points');
          insert into public.loyalty_point_transactions(shop_id,membership_id,delta,transaction_type,sale_id,created_by,note)
          values (v_shop,v_membership,v_points,'earn',v_sale,auth.uid(),'Purchase points');
        end if;
      end if;

      if v_bonus_points > 0 then
        if v_program.points_expire and v_program.points_expiry_days is not null then
          v_expires := now() + make_interval(days => v_program.points_expiry_days);
        else
          v_expires := null;
        end if;
        insert into public.loyalty_point_lots(shop_id,membership_id,source_sale_id,points_original,points_remaining,expires_at,note)
        values(v_shop,v_membership,v_sale,v_bonus_points,v_bonus_points,v_expires,'Reward bonus points');
        insert into public.loyalty_point_transactions(shop_id,membership_id,delta,transaction_type,sale_id,reward_id,created_by,note)
        values(v_shop,v_membership,v_bonus_points,'bonus',v_sale,p_reward_id,auth.uid(),'Reward bonus points');
      end if;

      if v_program.stamps_enabled then
        if v_program.stamp_mode = 'per_sale' then
          if v_taxable >= v_program.stamp_threshold then v_stamps := 1; end if;
        else
          v_stamps := floor(v_taxable / nullif(v_program.stamp_threshold,0))::int;
        end if;
        if v_stamps > 0 then
          insert into public.loyalty_stamp_transactions(shop_id,membership_id,delta,transaction_type,sale_id,created_by,note)
          values (v_shop,v_membership,v_stamps,'earn',v_sale,auth.uid(),'Purchase stamps');
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'sale_id',v_sale,'subtotal',v_subtotal,'discount',v_discount,'tax',v_tax,'total',v_total,
    'points_redeemed',v_points_cost,'stamps_redeemed',v_stamps_cost,'points_earned',v_points+v_bonus_points,'stamps_earned',v_stamps
  );
end;
$$;
grant execute on function public.complete_sale(uuid,text,jsonb,uuid) to authenticated;

-- Create/re-send a loyalty invitation record. The client can open a mailto now; an Edge Function can replace delivery later.
create or replace function public.create_loyalty_invitation(p_customer_id uuid)
returns table(invitation_id uuid, token uuid, email text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_email text;
  v_days int;
  v_id uuid;
  v_token uuid;
  v_exp timestamptz;
begin
  select c.email into v_email from public.customers c where c.id=p_customer_id and c.shop_id=v_shop;
  if v_email is null then raise exception 'Customer email is required'; end if;
  select invite_expiry_days into v_days from public.loyalty_programs where shop_id=v_shop;
  v_exp := now() + make_interval(days => coalesce(v_days,14));
  update public.loyalty_invitations set status='cancelled' where customer_id=p_customer_id and shop_id=v_shop and status='pending';
  insert into public.loyalty_invitations(shop_id,customer_id,email,expires_at,sent_at,created_by)
  values(v_shop,p_customer_id,v_email,v_exp,now(),auth.uid()) returning id, loyalty_invitations.token into v_id,v_token;
  update public.customers set loyalty_status='invited', updated_at=now() where id=p_customer_id;
  return query select v_id,v_token,v_email,v_exp;
end;
$$;
grant execute on function public.create_loyalty_invitation(uuid) to authenticated;

-- Public invitation lookup for the customer-facing signup page. It exposes only the fields required to join.
create or replace function public.get_loyalty_invitation(p_token uuid)
returns table(shop_name text, logo_url text, customer_name text, email text, status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.loyalty_invitations set status='expired'
    where token=p_token and status='pending' and expires_at <= now();
  return query
    select s.name, s.logo_url, c.name, i.email, i.status, i.expires_at
    from public.loyalty_invitations i
    join public.customers c on c.id=i.customer_id
    join public.shops s on s.id=i.shop_id
    where i.token=p_token
    limit 1;
end;
$$;
grant execute on function public.get_loyalty_invitation(uuid) to anon, authenticated;

-- Customer self-enrollment from an emailed invitation. No Supabase Auth account is required for the customer.
create or replace function public.accept_loyalty_invitation(p_token uuid, p_name text default null, p_phone text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.loyalty_invitations%rowtype;
  v_customer public.customers%rowtype;
  v_membership uuid;
  v_code text;
begin
  select * into v_inv from public.loyalty_invitations where token=p_token for update;
  if not found then raise exception 'Invitation not found'; end if;
  if v_inv.status='accepted' then
    select id, member_code into v_membership, v_code from public.loyalty_memberships where customer_id=v_inv.customer_id;
    return jsonb_build_object('membership_id',v_membership,'member_code',v_code,'already_joined',true);
  end if;
  if v_inv.status <> 'pending' then raise exception 'Invitation is no longer active'; end if;
  if v_inv.expires_at <= now() then
    update public.loyalty_invitations set status='expired' where id=v_inv.id;
    raise exception 'Invitation has expired';
  end if;

  select * into v_customer from public.customers where id=v_inv.customer_id for update;
  update public.customers
    set name=coalesce(nullif(trim(p_name),''),name), phone=coalesce(nullif(trim(p_phone),''),phone), loyalty_status='member', updated_at=now()
    where id=v_customer.id;

  select id, member_code into v_membership, v_code from public.loyalty_memberships where customer_id=v_customer.id;
  if v_membership is null then
    v_code := 'LOY-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    insert into public.loyalty_memberships(shop_id,customer_id,member_code)
      values(v_inv.shop_id,v_customer.id,v_code) returning id into v_membership;
    insert into public.cards(shop_id,card_type,card_code,customer_id,membership_id)
      values(v_inv.shop_id,'loyalty',v_code,v_customer.id,v_membership);
  end if;
  update public.loyalty_invitations set status='accepted' where id=v_inv.id;
  return jsonb_build_object('membership_id',v_membership,'member_code',v_code,'already_joined',false);
end;
$$;
grant execute on function public.accept_loyalty_invitation(uuid,text,text) to anon, authenticated;

-- Enroll a customer and issue a loyalty card.
create or replace function public.enroll_customer(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_membership uuid;
  v_code text;
begin
  if not exists(select 1 from public.customers where id=p_customer_id and shop_id=v_shop) then raise exception 'Customer not found'; end if;
  select id into v_membership from public.loyalty_memberships where customer_id=p_customer_id;
  if v_membership is null then
    v_code := 'LOY-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    insert into public.loyalty_memberships(shop_id,customer_id,member_code) values(v_shop,p_customer_id,v_code) returning id into v_membership;
    insert into public.cards(shop_id,card_type,card_code,customer_id,membership_id)
    values(v_shop,'loyalty',v_code,p_customer_id,v_membership);
  end if;
  update public.customers set loyalty_status='member', updated_at=now() where id=p_customer_id;
  return v_membership;
end;
$$;
grant execute on function public.enroll_customer(uuid) to authenticated;

-- Current balances respect expiry. Expired point lots simply stop counting.
create or replace view public.loyalty_balances with (security_invoker = true) as
select
  m.id membership_id,
  m.shop_id,
  m.customer_id,
  m.member_code,
  coalesce((select sum(l.points_remaining) from public.loyalty_point_lots l
    where l.membership_id=m.id and (l.expires_at is null or l.expires_at > now())),0)::int as points,
  coalesce((select sum(s.delta) from public.loyalty_stamp_transactions s where s.membership_id=m.id),0)::int as stamps
from public.loyalty_memberships m
where m.active=true;

-- RLS
alter table public.shops enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_memberships enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_point_lots enable row level security;
alter table public.loyalty_point_transactions enable row level security;
alter table public.loyalty_stamp_transactions enable row level security;
alter table public.cards enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.loyalty_invitations enable row level security;

create policy shops_select on public.shops for select to authenticated using (id = public.current_shop_id());
create policy shops_admin_update on public.shops for update to authenticated using (id=public.current_shop_id() and public.is_admin()) with check (id=public.current_shop_id() and public.is_admin());

create policy staff_select on public.staff_profiles for select to authenticated using (shop_id=public.current_shop_id());
create policy staff_admin_insert on public.staff_profiles for insert to authenticated with check (shop_id=public.current_shop_id() and public.is_admin());
create policy staff_admin_update on public.staff_profiles for update to authenticated using (shop_id=public.current_shop_id() and public.is_admin()) with check (shop_id=public.current_shop_id() and public.is_admin());

-- Most operational tables: all active staff can read; admins can manage catalog/config; operational inserts are allowed where appropriate.
create policy categories_select on public.categories for select to authenticated using (shop_id=public.current_shop_id());
create policy categories_admin_all on public.categories for all to authenticated using (shop_id=public.current_shop_id() and public.is_admin()) with check (shop_id=public.current_shop_id() and public.is_admin());

create policy products_select on public.products for select to authenticated using (shop_id=public.current_shop_id());
create policy products_admin_all on public.products for all to authenticated using (shop_id=public.current_shop_id() and public.is_admin()) with check (shop_id=public.current_shop_id() and public.is_admin());

create policy customers_staff_all on public.customers for all to authenticated using (shop_id=public.current_shop_id()) with check (shop_id=public.current_shop_id());
create policy loyalty_programs_select on public.loyalty_programs for select to authenticated using (shop_id=public.current_shop_id());
create policy loyalty_programs_admin_all on public.loyalty_programs for all to authenticated using (shop_id=public.current_shop_id() and public.is_admin()) with check (shop_id=public.current_shop_id() and public.is_admin());
create policy rewards_select on public.loyalty_rewards for select to authenticated using (shop_id=public.current_shop_id());
create policy rewards_admin_all on public.loyalty_rewards for all to authenticated using (shop_id=public.current_shop_id() and public.is_admin()) with check (shop_id=public.current_shop_id() and public.is_admin());

create policy memberships_select on public.loyalty_memberships for select to authenticated using (shop_id=public.current_shop_id());
create policy memberships_staff_all on public.loyalty_memberships for all to authenticated using (shop_id=public.current_shop_id()) with check (shop_id=public.current_shop_id());
create policy point_lots_select on public.loyalty_point_lots for select to authenticated using (shop_id=public.current_shop_id());
create policy point_tx_select on public.loyalty_point_transactions for select to authenticated using (shop_id=public.current_shop_id());
create policy stamp_tx_select on public.loyalty_stamp_transactions for select to authenticated using (shop_id=public.current_shop_id());
create policy cards_staff_all on public.cards for all to authenticated using (shop_id=public.current_shop_id()) with check (shop_id=public.current_shop_id());
create policy sales_select on public.sales for select to authenticated using (shop_id=public.current_shop_id());
create policy sale_items_select on public.sale_items for select to authenticated using (shop_id=public.current_shop_id());
create policy inventory_select on public.inventory_adjustments for select to authenticated using (shop_id=public.current_shop_id());
create policy invites_staff_all on public.loyalty_invitations for all to authenticated using (shop_id=public.current_shop_id()) with check (shop_id=public.current_shop_id());

-- Realtime-friendly indexes
create index products_shop_idx on public.products(shop_id);
create index sales_shop_created_idx on public.sales(shop_id, created_at desc);
create index customers_shop_idx on public.customers(shop_id);
create index point_lots_membership_idx on public.loyalty_point_lots(membership_id, earned_at);
create index stamp_tx_membership_idx on public.loyalty_stamp_transactions(membership_id, created_at);

-- Storage: create a public product-images bucket manually in Storage, or run the block below if permitted.
-- insert into storage.buckets(id,name,public) values('product-images','product-images',true) on conflict (id) do nothing;

-- Public product images. Retrieval is public; upload/update/delete requires an authenticated Admin from the matching shop folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;

create policy "product images admin insert"
on storage.objects for insert to authenticated
with check (
  bucket_id='product-images'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id=auth.uid() and sp.active and sp.role='admin'
      and sp.shop_id::text=(storage.foldername(name))[1]
  )
);

create policy "product images admin update"
on storage.objects for update to authenticated
using (
  bucket_id='product-images'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id=auth.uid() and sp.active and sp.role='admin'
      and sp.shop_id::text=(storage.foldername(name))[1]
  )
)
with check (
  bucket_id='product-images'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id=auth.uid() and sp.active and sp.role='admin'
      and sp.shop_id::text=(storage.foldername(name))[1]
  )
);

create policy "product images admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id='product-images'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id=auth.uid() and sp.active and sp.role='admin'
      and sp.shop_id::text=(storage.foldername(name))[1]
  )
);


-- Public business logos. Upload/update/delete requires an authenticated Admin from the matching shop folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('shop-logos','shop-logos',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy "shop logos admin insert"
on storage.objects for insert to authenticated
with check (
  bucket_id='shop-logos'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);

create policy "shop logos admin update"
on storage.objects for update to authenticated
using (
  bucket_id='shop-logos'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_shop_id()::text
)
with check (
  bucket_id='shop-logos'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);

create policy "shop logos admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id='shop-logos'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);
