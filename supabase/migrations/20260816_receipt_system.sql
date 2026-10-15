-- ChubbyLu Bakes POS v3 — receipt system
-- Run after 20260815_initial.sql and 20260815_logo_settings.sql (if used).

-- Preserve receipt-facing business/staff/customer/loyalty details at the time of each sale.
alter table public.sales add column if not exists shop_name_snapshot text;
alter table public.sales add column if not exists shop_logo_url_snapshot text;
alter table public.sales add column if not exists shop_address_snapshot text;
alter table public.sales add column if not exists shop_phone_snapshot text;
alter table public.sales add column if not exists shop_email_snapshot text;
alter table public.sales add column if not exists currency_snapshot text;
alter table public.sales add column if not exists timezone_snapshot text;
alter table public.sales add column if not exists receipt_footer_snapshot text;
alter table public.sales add column if not exists staff_name_snapshot text;
alter table public.sales add column if not exists customer_name_snapshot text;
alter table public.sales add column if not exists customer_email_snapshot text;
alter table public.sales add column if not exists reward_name_snapshot text;
alter table public.sales add column if not exists points_earned_snapshot int;
alter table public.sales add column if not exists points_redeemed_snapshot int;
alter table public.sales add column if not exists stamps_earned_snapshot int;
alter table public.sales add column if not exists stamps_redeemed_snapshot int;
alter table public.sales add column if not exists points_balance_after_snapshot int;
alter table public.sales add column if not exists stamps_balance_after_snapshot int;
alter table public.sale_items add column if not exists line_no int;

with ranked_items as (
  select id,row_number() over(partition by sale_id order by id)::int as rn
  from public.sale_items where line_no is null
)
update public.sale_items si set line_no=r.rn from ranked_items r where r.id=si.id;

-- Backfill stable receipt labels for sales created before v3.
update public.sales s set
  shop_name_snapshot=coalesce(s.shop_name_snapshot,sh.name),
  shop_logo_url_snapshot=coalesce(s.shop_logo_url_snapshot,sh.logo_url),
  shop_address_snapshot=coalesce(s.shop_address_snapshot,sh.address),
  shop_phone_snapshot=coalesce(s.shop_phone_snapshot,sh.phone),
  shop_email_snapshot=coalesce(s.shop_email_snapshot,sh.email),
  currency_snapshot=coalesce(s.currency_snapshot,sh.currency),
  timezone_snapshot=coalesce(s.timezone_snapshot,sh.timezone),
  receipt_footer_snapshot=coalesce(s.receipt_footer_snapshot,sh.receipt_footer)
from public.shops sh where sh.id=s.shop_id;

update public.sales s set staff_name_snapshot=coalesce(s.staff_name_snapshot,sp.display_name)
from public.staff_profiles sp where sp.user_id=s.staff_user_id and sp.shop_id=s.shop_id;

update public.sales s set
  customer_name_snapshot=coalesce(s.customer_name_snapshot,c.name),
  customer_email_snapshot=coalesce(s.customer_email_snapshot,c.email)
from public.customers c where c.id=s.customer_id and c.shop_id=s.shop_id;

update public.sales s set
  points_earned_snapshot=coalesce(s.points_earned_snapshot,(select coalesce(sum(greatest(t.delta,0)),0)::int from public.loyalty_point_transactions t where t.sale_id=s.id)),
  points_redeemed_snapshot=coalesce(s.points_redeemed_snapshot,(select coalesce(sum(abs(least(t.delta,0))),0)::int from public.loyalty_point_transactions t where t.sale_id=s.id)),
  stamps_earned_snapshot=coalesce(s.stamps_earned_snapshot,(select coalesce(sum(greatest(t.delta,0)),0)::int from public.loyalty_stamp_transactions t where t.sale_id=s.id)),
  stamps_redeemed_snapshot=coalesce(s.stamps_redeemed_snapshot,(select coalesce(sum(abs(least(t.delta,0))),0)::int from public.loyalty_stamp_transactions t where t.sale_id=s.id)),
  reward_name_snapshot=coalesce(s.reward_name_snapshot,(select r.name from public.loyalty_rewards r where r.id=coalesce(
    (select t.reward_id from public.loyalty_point_transactions t where t.sale_id=s.id and t.reward_id is not null limit 1),
    (select t.reward_id from public.loyalty_stamp_transactions t where t.sale_id=s.id and t.reward_id is not null limit 1)
  )))
where s.points_earned_snapshot is null or s.points_redeemed_snapshot is null or s.stamps_earned_snapshot is null or s.stamps_redeemed_snapshot is null or s.reward_name_snapshot is null;

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
  v_receipt_number bigint;
  v_created_at timestamptz;
  v_shoprow public.shops%rowtype;
  v_staff_name text;
  v_customer_name text;
  v_customer_email text;
  v_line_no int := 0;
begin
  if v_shop is null then raise exception 'No active shop'; end if;
  if p_payment_method not in ('cash','card','qr') then raise exception 'Invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  select * into v_shoprow from public.shops where id = v_shop;
  v_tax_rate := v_shoprow.tax_rate;
  select display_name into v_staff_name from public.staff_profiles where user_id=auth.uid() and shop_id=v_shop limit 1;

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
    select name,email into v_customer_name,v_customer_email from public.customers where id=p_customer_id and shop_id=v_shop;
    if not found then raise exception 'Customer not found'; end if;
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

  insert into public.sales(
    shop_id, staff_user_id, customer_id, subtotal, tax, discount, total, payment_method,
    shop_name_snapshot, shop_logo_url_snapshot, shop_address_snapshot, shop_phone_snapshot, shop_email_snapshot,
    currency_snapshot, timezone_snapshot, receipt_footer_snapshot, staff_name_snapshot, customer_name_snapshot, customer_email_snapshot, reward_name_snapshot
  )
  values (
    v_shop, auth.uid(), p_customer_id, v_subtotal, v_tax, v_discount, v_total, p_payment_method,
    v_shoprow.name, v_shoprow.logo_url, v_shoprow.address, v_shoprow.phone, v_shoprow.email,
    v_shoprow.currency, v_shoprow.timezone, v_shoprow.receipt_footer, coalesce(v_staff_name,'Staff'), v_customer_name, v_customer_email,
    case when p_reward_id is null then null else v_reward.name end
  )
  returning id, receipt_number, created_at into v_sale, v_receipt_number, v_created_at;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::numeric;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and shop_id = v_shop for update;
    v_line_no := v_line_no + 1;
    insert into public.sale_items(sale_id, shop_id, product_id, product_name, qty, unit_price, line_total, line_no)
    values (v_sale, v_shop, v_product.id, v_product.name, v_qty, v_product.price, round(v_product.price * v_qty,2), v_line_no);
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

  if v_membership is not null then
    select coalesce(sum(points_remaining),0)::int into v_point_balance
      from public.loyalty_point_lots where membership_id=v_membership and (expires_at is null or expires_at > now());
    select coalesce(sum(delta),0)::int into v_stamp_balance
      from public.loyalty_stamp_transactions where membership_id=v_membership;
    update public.sales set
      points_earned_snapshot=v_points+v_bonus_points, points_redeemed_snapshot=v_points_cost,
      stamps_earned_snapshot=v_stamps, stamps_redeemed_snapshot=v_stamps_cost,
      points_balance_after_snapshot=v_point_balance, stamps_balance_after_snapshot=v_stamp_balance
      where id=v_sale;
  else
    update public.sales set
      points_earned_snapshot=0, points_redeemed_snapshot=0, stamps_earned_snapshot=0, stamps_redeemed_snapshot=0
      where id=v_sale;
  end if;

  return jsonb_build_object(
    'sale_id',v_sale,'receipt_number',v_receipt_number,'created_at',v_created_at,
    'subtotal',v_subtotal,'discount',v_discount,'tax',v_tax,'total',v_total,
    'points_redeemed',v_points_cost,'stamps_redeemed',v_stamps_cost,'points_earned',v_points+v_bonus_points,'stamps_earned',v_stamps,
    'points_balance',case when v_membership is null then null else v_point_balance end,
    'stamps_balance',case when v_membership is null then null else v_stamp_balance end
  );
end;
$$;
grant execute on function public.complete_sale(uuid,text,jsonb,uuid) to authenticated;


-- Read one complete historical receipt. The function is restricted to the signed-in staff member's current shop.
create or replace function public.get_sale_receipt(p_sale_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_sale public.sales%rowtype;
  v_items jsonb;
begin
  if v_shop is null then raise exception 'No active shop'; end if;
  select * into v_sale from public.sales where id=p_sale_id and shop_id=v_shop limit 1;
  if not found then raise exception 'Sale not found'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id',si.product_id,'name',si.product_name,'qty',si.qty,'unit_price',si.unit_price,'line_total',si.line_total
  ) order by si.line_no nulls last, si.id),'[]'::jsonb) into v_items
  from public.sale_items si where si.sale_id=v_sale.id and si.shop_id=v_shop;

  return jsonb_build_object(
    'sale_id',v_sale.id,'receipt_number',v_sale.receipt_number,'created_at',v_sale.created_at,
    'shop_name',coalesce(v_sale.shop_name_snapshot,(select name from public.shops where id=v_shop)),
    'logo_url',coalesce(v_sale.shop_logo_url_snapshot,(select logo_url from public.shops where id=v_shop)),
    'address',coalesce(v_sale.shop_address_snapshot,(select address from public.shops where id=v_shop)),
    'phone',coalesce(v_sale.shop_phone_snapshot,(select phone from public.shops where id=v_shop)),
    'shop_email',coalesce(v_sale.shop_email_snapshot,(select email from public.shops where id=v_shop)),
    'currency',coalesce(v_sale.currency_snapshot,(select currency from public.shops where id=v_shop),'USD'),
    'timezone',coalesce(v_sale.timezone_snapshot,(select timezone from public.shops where id=v_shop),'America/Belize'),
    'footer',coalesce(v_sale.receipt_footer_snapshot,(select receipt_footer from public.shops where id=v_shop)),
    'staff_name',coalesce(v_sale.staff_name_snapshot,'Staff'),
    'customer_name',v_sale.customer_name_snapshot,'customer_email',v_sale.customer_email_snapshot,
    'items',v_items,'subtotal',v_sale.subtotal,'discount',v_sale.discount,'tax',v_sale.tax,'total',v_sale.total,
    'payment_method',v_sale.payment_method,'reward_name',v_sale.reward_name_snapshot,
    'points_earned',coalesce(v_sale.points_earned_snapshot,0),'points_redeemed',coalesce(v_sale.points_redeemed_snapshot,0),
    'stamps_earned',coalesce(v_sale.stamps_earned_snapshot,0),'stamps_redeemed',coalesce(v_sale.stamps_redeemed_snapshot,0),
    'points_balance_after',v_sale.points_balance_after_snapshot,'stamps_balance_after',v_sale.stamps_balance_after_snapshot
  );
end;
$$;
grant execute on function public.get_sale_receipt(uuid) to authenticated;
