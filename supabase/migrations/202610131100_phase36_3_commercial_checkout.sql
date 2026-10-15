
-- Internal normalizer: whitelist fields and enforce server catalogue/variant/combo definitions.
create function public.normalize_commercial_items(p_shop uuid,p_items jsonb,p_customer boolean default false,p_quote boolean default true)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb;component jsonb;chosen jsonb;v_product products%rowtype;v_variant product_variants%rowtype;v_combo catalogue_combos%rowtype;
 result jsonb:='[]';parts jsonb;v_qty numeric;v_price numeric;v_sum numeric;v_cost numeric;v_total numeric;v_alloc numeric;v_used numeric;v_index int;v_count int;v_id uuid;v_variant_id uuid;v_key text;
begin
 if p_shop is null or p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Invalid cart';end if;
 for item in select value from jsonb_array_elements(p_items) loop
 v_qty:=coalesce((item->>'qty')::numeric,(item->>'quantity')::numeric);
 if v_qty is null or v_qty<=0 or v_qty>1000 or v_qty::text in('NaN','Infinity') then raise exception 'Invalid quantity';end if;
 if nullif(item->>'combo_id','') is not null then
 select * into v_combo from catalogue_combos where id=(item->>'combo_id')::uuid and shop_id=p_shop and active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) for share;
 if not found then raise exception 'Combo unavailable';end if;
 if p_quote and (item->>'expected_unit_price')::numeric is distinct from v_combo.price then raise exception 'Prices changed. Review the new combo total.';end if;
 parts:='[]';v_sum:=0;v_index:=0;
 for component in select value from jsonb_array_elements(v_combo.components) loop
 chosen:=item->'choices'->v_index;v_index:=v_index+1;
 if component->>'category_id' is not null then
 v_id:=nullif(chosen->>'product_id','')::uuid;v_variant_id:=nullif(chosen->>'variant_id','')::uuid;
 if not exists(select 1 from products where id=v_id and category_id=(component->>'category_id')::uuid and shop_id=p_shop and active) then raise exception 'Choose a product from the required combo category';end if;
 else v_id:=(component->>'product_id')::uuid;v_variant_id:=nullif(component->>'variant_id','')::uuid;end if;
 -- Recursive call applies variant and availability checks without trusting caller prices.
 chosen:=normalize_commercial_items(p_shop,jsonb_build_array(jsonb_build_object('product_id',v_id,'variant_id',v_variant_id,'qty',(component->>'qty')::numeric)),p_customer,false)->0;
 parts:=parts||jsonb_build_array(chosen);v_sum:=v_sum+(chosen->>'__line_total')::numeric;
 end loop;
 v_count:=jsonb_array_length(parts);v_used:=0;v_index:=0;v_total:=round(v_combo.price*v_qty,2);v_key:=gen_random_uuid()::text;
 for chosen in select value from jsonb_array_elements(parts) loop
 v_index:=v_index+1;v_alloc:=case when v_index=v_count then v_total-v_used when v_sum=0 then round(v_total/v_count,2) else round(v_total*(chosen->>'__line_total')::numeric/v_sum,2) end;v_used:=v_used+v_alloc;
 result:=result||jsonb_build_array(chosen||jsonb_build_object('qty',(chosen->>'qty')::numeric*v_qty,'__line_total',v_alloc,'__unit_price',round(v_alloc/((chosen->>'qty')::numeric*v_qty),2),'combo_id',v_combo.id,'__combo_snapshot',jsonb_build_object('name',v_combo.name,'unit_price',v_combo.price,'quantity',v_qty,'original_value',v_sum,'group',v_key,'definition',v_combo.components),'__name',v_combo.name||' • '||(chosen->>'__name')));
 end loop;
 else
 v_variant_id:=nullif(item->>'variant_id','')::uuid;
 select * into v_product from products where id=(item->>'product_id')::uuid and shop_id=p_shop and active;
 if not found or (p_customer and (not v_product.catalogue_visible or v_product.catalogue_sold_out)) then raise exception 'Product unavailable';end if;
 v_variant:=null;
 if v_variant_id is not null then
 select * into v_variant from product_variants where id=v_variant_id and shop_id=p_shop and product_id=v_product.id and active;
 if not found then raise exception 'Variant unavailable';end if;
 elsif exists(select 1 from product_variants where product_id=v_product.id and shop_id=p_shop and active) then raise exception 'Select a product variant';end if;
 v_price:=sku_effective_price(v_product.id,v_variant_id);
 if p_quote and (item->>'expected_unit_price')::numeric is distinct from v_price then raise exception 'Prices changed. Review the new total.';end if;
 if v_variant_id is null and nullif(item->>'option_label','') is not null and not exists(select 1 from catalogue_product_options where product_id=v_product.id and shop_id=p_shop and active and label=item->>'option_label') then raise exception 'Option unavailable';end if;
 v_cost:=coalesce(v_variant.unit_cost,v_product.cost_price*coalesce(v_variant.recipe_scale,1),0);
 result:=result||jsonb_build_array(jsonb_build_object('product_id',v_product.id,'variant_id',v_variant_id,'qty',v_qty,'option_label',case when v_variant_id is null then nullif(item->>'option_label','') else null end,'__unit_price',v_price,'__line_total',round(v_price*v_qty,2),'__independent',coalesce(v_variant.independent_stock,false),'__cost',v_cost,'__variant_snapshot',case when v_variant_id is null then null else jsonb_build_object('name',v_variant.name,'sku',v_variant.sku,'barcode',v_variant.barcode,'recipe_scale',v_variant.recipe_scale,'unit_cost',v_cost,'independent_stock',v_variant.independent_stock) end,'__name',v_product.name||case when v_variant_id is null then coalesce(' — '||nullif(item->>'option_label',''),'') else ' — '||v_variant.name end));
 end if;
 end loop;return result;
end $$;
revoke all on function public.normalize_commercial_items(uuid,jsonb,boolean,boolean) from public;

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
  v_stock record;
  v_option_label text;
begin
  if v_shop is null then raise exception 'No active shop'; end if;
  if p_payment_method not in ('cash','card','qr') then raise exception 'Invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  select * into v_shoprow from public.shops where id = v_shop;
  v_tax_rate := v_shoprow.tax_rate;
  select display_name into v_staff_name from public.staff_profiles where user_id=auth.uid() and shop_id=v_shop limit 1;

  -- Phase 35.7: aggregate duplicate option lines before checkout so the same product cannot oversell stock.
  -- Lock master products first, then aggregate shared or independent variant quantities.
  perform 1 from products where id in(select (i->>'product_id')::uuid from jsonb_array_elements(p_items)i) and shop_id=v_shop order by id for update;
  for v_stock in select (i->>'product_id')::uuid product_id,case when (i->>'__independent')::boolean then (i->>'variant_id')::uuid else null end variant_id,sum((i->>'qty')::numeric) qty from jsonb_array_elements(p_items)i group by 1,2 order by 1,2 nulls first loop
    if v_stock.variant_id is null then
      if (select stock from products where id=v_stock.product_id and shop_id=v_shop)<v_stock.qty then raise exception 'Insufficient shared product stock';end if;
    else
      perform 1 from product_variants where id=v_stock.variant_id and shop_id=v_shop and stock>=v_stock.qty for update;
      if not found then raise exception 'Insufficient variant stock';end if;
    end if;
  end loop;
  -- Validate and calculate using server-side prices.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::numeric;
    if v_qty is null or v_qty <= 0 or v_qty::text='NaN' then raise exception 'Invalid quantity'; end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and shop_id = v_shop and active = true
      for update;
    if not found then raise exception 'Product not found'; end if;

    v_option_label := nullif(left(trim(coalesce(v_item->>'option_label','')),60),'');
    v_subtotal := v_subtotal + (v_item->>'__line_total')::numeric;
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
      select (select min((i->>'__unit_price')::numeric) from jsonb_array_elements(p_items)i where (i->>'product_id')::uuid=p.id) into v_free_price
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
    v_option_label := nullif(left(trim(coalesce(v_item->>'option_label','')),60),'');
    v_line_no := v_line_no + 1;
    insert into public.sale_items(sale_id, shop_id, product_id, product_name, qty, unit_price, line_total, line_no,variant_id,variant_snapshot,combo_id,combo_snapshot)
    values (v_sale, v_shop, v_product.id, v_item->>'__name',v_qty,(v_item->>'__unit_price')::numeric,(v_item->>'__line_total')::numeric,v_line_no,nullif(v_item->>'variant_id','')::uuid,v_item->'__variant_snapshot',nullif(v_item->>'combo_id','')::uuid,v_item->'__combo_snapshot');
    if coalesce((v_item->>'__independent')::boolean,false) then
      update product_variants set stock=stock-v_qty,updated_at=now() where id=(v_item->>'variant_id')::uuid;
      insert into variant_inventory_events(shop_id,variant_id,delta,reason,performed_by) values(v_shop,(v_item->>'variant_id')::uuid,-v_qty,'Sale '||v_sale,auth.uid());
    else update products set stock=stock-v_qty,updated_at=now() where id=v_product.id;end if;
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




revoke all on function public.complete_sale(uuid,text,jsonb,uuid) from public,authenticated,anon;
create or replace function public.complete_catalogue_sale(p_customer_id uuid,p_payment_method text,p_items jsonb,p_reward_id uuid default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_request customer_selection_requests%rowtype;v_result jsonb;v_normal jsonb;line record;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 if p_request_id is not null then
 select * into v_request from customer_selection_requests where id=p_request_id and shop_id=current_shop_id() for update;
 if not found or v_request.loaded_by is distinct from auth.uid() or v_request.sale_id is not null or v_request.status in('cancelled','dismissed','pending') then raise exception 'Selection unavailable or already paid';end if;
 end if;
 perform 1 from products where shop_id=current_shop_id() order by id for update;
 v_normal:=normalize_commercial_items(current_shop_id(),p_items,p_request_id is not null or exists(select 1 from jsonb_array_elements(p_items)i where coalesce((i->>'catalogue_request')::boolean,false)),true);
 if p_request_id is not null then
 for line in select product_id,variant_id,combo_id,option_label_snapshot,sum(quantity) qty from customer_selection_items where request_id=p_request_id group by product_id,variant_id,combo_id,option_label_snapshot loop
 if coalesce((select sum((i->>'qty')::numeric) from jsonb_array_elements(v_normal)i where (i->>'product_id')::uuid=line.product_id and nullif(i->>'variant_id','')::uuid is not distinct from line.variant_id and nullif(i->>'combo_id','')::uuid is not distinct from line.combo_id and nullif(i->>'option_label','') is not distinct from line.option_label_snapshot),0)<line.qty then raise exception 'Restore selected quantities or cancel the request';end if;
 end loop;end if;
 v_result:=complete_sale(p_customer_id,p_payment_method,v_normal,p_reward_id);
 if p_request_id is not null then update customer_selection_requests set sale_id=(v_result->>'sale_id')::uuid where id=p_request_id;end if;
 return v_result;
end $$;
create or replace function public.snapshot_sale_item_cost() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select coalesce(v.unit_cost,p.cost_price*coalesce(v.recipe_scale,1),0) into new.unit_cost_snapshot from products p left join product_variants v on v.id=new.variant_id and v.product_id=p.id and v.shop_id=p.shop_id where p.id=new.product_id and p.shop_id=new.shop_id;
 return new;
end $$;

create or replace function public.allocate_finished_batches_to_sale_item() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_needed numeric:=new.qty;v_take numeric;v_batch public.finished_product_batches%rowtype;v_lot variant_stock_lots%rowtype;
begin
 if coalesce((new.variant_snapshot->>'independent_stock')::boolean,false) then
 for v_lot in select * from variant_stock_lots where shop_id=new.shop_id and variant_id=new.variant_id and status='active' and remaining_quantity>0 and (best_before_on is null or best_before_on>=current_date) order by best_before_on nulls last,produced_at,id for update loop
 v_take:=least(v_needed,v_lot.remaining_quantity);update variant_stock_lots set remaining_quantity=remaining_quantity-v_take,status=case when remaining_quantity-v_take=0 then 'depleted' else status end where id=v_lot.id;
 insert into variant_stock_allocations(shop_id,lot_id,sale_item_id,quantity) values(new.shop_id,v_lot.id,new.id,v_take);v_needed:=v_needed-v_take;exit when v_needed=0;
 end loop;if v_needed>0 then raise exception 'Insufficient usable non-expired variant stock';end if;return new;end if;
  for v_batch in
    select * from public.finished_product_batches b where b.shop_id=new.shop_id and b.product_id=new.product_id and b.status='active' and b.remaining_quantity>0 and(b.best_before_on is null or b.best_before_on>=current_date)
    order by(b.best_before_on is null),b.best_before_on,b.produced_at,b.id for update
  loop
    exit when v_needed<=0;
    v_take:=least(v_needed,v_batch.remaining_quantity);
    update public.finished_product_batches set remaining_quantity=remaining_quantity-v_take,status=case when remaining_quantity-v_take<=0 then 'depleted' else status end,updated_at=now() where id=v_batch.id;
    insert into public.finished_product_batch_sale_allocations(shop_id,finished_batch_id,sale_id,sale_item_id,quantity_allocated)
    values(new.shop_id,v_batch.id,new.sale_id,new.id,v_take);
    insert into public.finished_product_batch_events(shop_id,finished_batch_id,action,quantity,details,performed_by)
    values(new.shop_id,v_batch.id,'sold',v_take,jsonb_build_object('sale_id',new.sale_id,'sale_item_id',new.id),auth.uid());
    v_needed:=v_needed-v_take;
  end loop;
  if v_needed>0 then raise exception 'Insufficient usable non-expired finished-product batch stock for %',new.product_name; end if;
  return new;
end $$;



create function public.commercial_refund_line(p_item uuid,p_qty numeric) returns numeric language sql stable security definer set search_path=public as $$
 select case when p_qty=si.qty-coalesce((select sum(qty) from sale_refund_items where sale_item_id=si.id),0) then greatest(si.line_total-coalesce((select sum(line_total) from sale_refund_items where sale_item_id=si.id),0),0) else round(si.line_total*p_qty/si.qty,2) end from sale_items si where id=p_item
$$;
revoke all on function public.commercial_refund_line(uuid,numeric) from public;
create function public.return_variant_lots() returns trigger language plpgsql security definer set search_path=public as $$
declare a variant_stock_allocations%rowtype;left_qty numeric:=new.qty;take_qty numeric;
begin
 if not exists(select 1 from sale_refunds where id=new.refund_id and restocked) then return new;end if;
 for a in select * from variant_stock_allocations where sale_item_id=new.sale_item_id and quantity>returned order by id for update loop
 take_qty:=least(left_qty,a.quantity-a.returned);update variant_stock_allocations set returned=returned+take_qty where id=a.id;update variant_stock_lots set remaining_quantity=remaining_quantity+take_qty,status=case when status='depleted' then 'active' else status end where id=a.lot_id;
 left_qty:=left_qty-take_qty;exit when left_qty=0;end loop;return new;
end $$;
create trigger variant_refund_lots after insert on sale_refund_items for each row execute function return_variant_lots();

create or replace function public.return_finished_batches_from_refund() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_restock boolean;v_needed numeric:=new.qty;v_take numeric;v_allocation public.finished_product_batch_sale_allocations%rowtype;v_batch uuid;v_product public.sale_items.product_id%type;
begin
 if exists(select 1 from sale_items where id=new.sale_item_id and coalesce((variant_snapshot->>'independent_stock')::boolean,false)) then return new;end if;
  select restocked into v_restock from public.sale_refunds where id=new.refund_id and shop_id=new.shop_id;
  if not coalesce(v_restock,false) then return new; end if;
  select product_id into v_product from public.sale_items where id=new.sale_item_id;
  if v_product is null then return new; end if;
  perform 1 from public.products where id=v_product and shop_id=new.shop_id for update;
  for v_allocation in select * from public.finished_product_batch_sale_allocations where shop_id=new.shop_id and sale_item_id=new.sale_item_id and quantity_allocated>quantity_returned order by allocated_at desc,id for update loop
    exit when v_needed<=0;
    v_take:=least(v_needed,v_allocation.quantity_allocated-v_allocation.quantity_returned);
    update public.finished_product_batch_sale_allocations set quantity_returned=quantity_returned+v_take where id=v_allocation.id;
    update public.finished_product_batches set remaining_quantity=remaining_quantity+v_take,status=case when status='depleted' then 'active' else status end,updated_at=now() where id=v_allocation.finished_batch_id;
    insert into public.finished_product_batch_events(shop_id,finished_batch_id,action,quantity,details,performed_by)
    select new.shop_id,v_allocation.finished_batch_id,'returned',v_take,jsonb_build_object('refund_id',new.refund_id,'sale_id',new.sale_id,'sale_item_id',new.sale_item_id),r.processed_by from public.sale_refunds r where r.id=new.refund_id;
    v_needed:=v_needed-v_take;
  end loop;
  if v_needed>0 then
    insert into public.finished_product_batches(shop_id,product_id,batch_code,produced_quantity,remaining_quantity,unit_cost_snapshot,status,produced_at,created_by)
    select new.shop_id,v_product,'RETURN-'||upper(left(new.refund_id::text,10)),v_needed,v_needed,coalesce(p.cost_price,0),'active',now(),r.processed_by from public.products p join public.sale_refunds r on r.id=new.refund_id where p.id=v_product
    returning id into v_batch;
    if v_batch is not null then
      insert into public.finished_product_batch_events(shop_id,finished_batch_id,action,quantity,details,performed_by)
      select new.shop_id,v_batch,'created',v_needed,jsonb_build_object('source','restocked historical sale without batch allocation','refund_id',new.refund_id,'traceability','untracked'),r.processed_by from public.sale_refunds r where r.id=new.refund_id;
    end if;
  end if;
  return new;
end $$;


create or replace function public.process_sale_adjustment(
  p_sale_id uuid,
  p_mode text,
  p_items jsonb default '[]'::jsonb,
  p_restock boolean default false,
  p_reason text default null,
  p_manager_pin text default null,
  p_payment_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_sale public.sales%rowtype;
  v_manager uuid;
  v_refund uuid;
  v_refund_number bigint;
  v_norm jsonb := '[]'::jsonb;
  v_input jsonb;
  v_norm_item jsonb;
  v_si public.sale_items%rowtype;
  v_remaining numeric(12,3);
  v_already numeric(12,3);
  v_selected numeric(12,3);
  v_qty numeric(12,3);
  v_refund_subtotal numeric(12,2) := 0;
  v_refund_discount numeric(12,2) := 0;
  v_refund_tax numeric(12,2) := 0;
  v_refund_total numeric(12,2) := 0;
  v_prior_subtotal numeric(12,2) := 0;
  v_prior_discount numeric(12,2) := 0;
  v_prior_tax numeric(12,2) := 0;
  v_prior_points_reversed int := 0;
  v_prior_points_restored int := 0;
  v_prior_stamps_reversed int := 0;
  v_prior_stamps_restored int := 0;
  v_new_refunded_total numeric(12,2) := 0;
  v_ratio numeric := 0;
  v_membership uuid;
  v_points_reverse_target int := 0;
  v_points_restore int := 0;
  v_stamps_reverse_target int := 0;
  v_stamps_restore int := 0;
  v_point_balance int := 0;
  v_stamp_balance int := 0;
  v_points_reverse int := 0;
  v_stamps_reverse int := 0;
  v_need int := 0;
  v_take int := 0;
  v_lot record;
  v_program public.loyalty_programs%rowtype;
  v_restore_expiry timestamptz;
  v_new_status text;
  v_full_after boolean := false;
  v_restock_effective boolean := false;
  v_variant_stock numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_shop is null then raise exception 'No active shop'; end if;
  if p_mode not in ('partial','full','void') then raise exception 'Invalid adjustment mode'; end if;
  if coalesce(trim(p_reason),'') = '' then raise exception 'A reason is required'; end if;
  if coalesce(p_manager_pin,'') = '' then raise exception 'Manager PIN is required'; end if;

  select sp.user_id into v_manager
  from public.staff_profiles sp
  where sp.shop_id=v_shop and sp.role='admin' and sp.active=true and sp.pin_hash is not null
    and crypt(p_manager_pin, sp.pin_hash)=sp.pin_hash
  order by case when sp.user_id=auth.uid() then 0 else 1 end, sp.created_at
  limit 1;
  if v_manager is null then raise exception 'Manager authorization failed'; end if;

  select * into v_sale from public.sales
    where id=p_sale_id and shop_id=v_shop
    for update;
  if not found then raise exception 'Sale not found'; end if;
  perform 1 from products where shop_id=v_shop order by id for update;
  perform 1 from product_variants where shop_id=v_shop order by id for update;
  if v_sale.status='voided' then raise exception 'Sale is already voided'; end if;
  if v_sale.status='refunded' or coalesce(v_sale.refunded_total,0) >= v_sale.total then raise exception 'Sale is already fully refunded'; end if;
  if p_mode='void' and coalesce(v_sale.refunded_total,0) > 0 then raise exception 'A partially refunded sale cannot be voided; refund the remaining balance instead'; end if;

  select
    coalesce(sum(r.subtotal),0), coalesce(sum(r.discount),0), coalesce(sum(r.tax),0),
    coalesce(sum(r.points_reversed),0), coalesce(sum(r.points_restored),0),
    coalesce(sum(r.stamps_reversed),0), coalesce(sum(r.stamps_restored),0)
  into v_prior_subtotal,v_prior_discount,v_prior_tax,
       v_prior_points_reversed,v_prior_points_restored,v_prior_stamps_reversed,v_prior_stamps_restored
  from public.sale_refunds r where r.sale_id=v_sale.id and r.shop_id=v_shop;

  if p_mode='partial' then
    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Select at least one item to refund'; end if;
    for v_input in select * from jsonb_array_elements(p_items)
    loop
      if coalesce(v_input->>'sale_item_id','')='' then raise exception 'Invalid refund item'; end if;
      v_qty := coalesce((v_input->>'qty')::numeric,0);
      if v_qty <= 0 then raise exception 'Refund quantity must be greater than zero'; end if;

      select * into v_si from public.sale_items
        where id=(v_input->>'sale_item_id')::uuid and sale_id=v_sale.id and shop_id=v_shop
        for update;
      if not found then raise exception 'Sale item not found'; end if;

      select coalesce(sum(ri.qty),0) into v_already
      from public.sale_refund_items ri
      join public.sale_refunds r on r.id=ri.refund_id
      where ri.sale_item_id=v_si.id and r.shop_id=v_shop;
      select coalesce(sum((x->>'qty')::numeric),0) into v_selected
      from jsonb_array_elements(v_norm) x where x->>'sale_item_id'=v_si.id::text;
      v_remaining := v_si.qty - v_already - v_selected;
      if v_qty > v_remaining then raise exception 'Refund quantity exceeds remaining quantity for %', v_si.product_name; end if;

      v_norm := v_norm || jsonb_build_array(jsonb_build_object(
        'sale_item_id',v_si.id,'product_id',v_si.product_id,'name',v_si.product_name,
        'qty',v_qty,'unit_price',v_si.unit_price,'line_total',public.commercial_refund_line(v_si.id,v_qty)
      ));
    end loop;
  else
    for v_si in select * from public.sale_items where sale_id=v_sale.id and shop_id=v_shop order by line_no nulls last,id
    loop
      select coalesce(sum(ri.qty),0) into v_already
      from public.sale_refund_items ri
      join public.sale_refunds r on r.id=ri.refund_id
      where ri.sale_item_id=v_si.id and r.shop_id=v_shop;
      v_remaining := v_si.qty - v_already;
      if v_remaining > 0 then
        v_norm := v_norm || jsonb_build_array(jsonb_build_object(
          'sale_item_id',v_si.id,'product_id',v_si.product_id,'name',v_si.product_name,
          'qty',v_remaining,'unit_price',v_si.unit_price,'line_total',public.commercial_refund_line(v_si.id,v_remaining)
        ));
      end if;
    end loop;
  end if;

  if jsonb_array_length(v_norm)=0 then raise exception 'Nothing remains to refund'; end if;
  select coalesce(sum((x->>'line_total')::numeric),0)::numeric(12,2) into v_refund_subtotal
    from jsonb_array_elements(v_norm) x;

  if p_mode in ('full','void') then
    v_refund_subtotal := greatest(v_sale.subtotal-v_prior_subtotal,0);
    v_refund_discount := greatest(v_sale.discount-v_prior_discount,0);
    v_refund_tax := greatest(v_sale.tax-v_prior_tax,0);
    v_refund_total := greatest(v_sale.total-coalesce(v_sale.refunded_total,0),0);
  else
    if v_sale.subtotal > 0 then v_ratio := least(1, v_refund_subtotal/v_sale.subtotal); else v_ratio := 0; end if;
    v_refund_discount := round(v_sale.discount*v_ratio,2);
    v_refund_tax := round(v_sale.tax*v_ratio,2);
    v_refund_total := round(v_sale.total*v_ratio,2);
    v_refund_total := least(v_refund_total, greatest(v_sale.total-coalesce(v_sale.refunded_total,0),0));
  end if;
  if v_refund_total <= 0 then raise exception 'Refund amount is zero'; end if;

  v_new_refunded_total := least(v_sale.total, coalesce(v_sale.refunded_total,0)+v_refund_total);
  v_full_after := v_new_refunded_total >= v_sale.total - 0.01;
  if v_sale.total > 0 then v_ratio := least(1, v_new_refunded_total/v_sale.total); else v_ratio := 1; end if;

  if v_sale.customer_id is not null then
    select id into v_membership from public.loyalty_memberships
      where shop_id=v_shop and customer_id=v_sale.customer_id and active=true limit 1;
  end if;

  if v_membership is not null then
    v_points_reverse_target := greatest(0, floor(coalesce(v_sale.points_earned_snapshot,0)*v_ratio)::int - v_prior_points_reversed);
    v_stamps_reverse_target := greatest(0, floor(coalesce(v_sale.stamps_earned_snapshot,0)*v_ratio)::int - v_prior_stamps_reversed);
    if v_full_after then
      v_points_restore := greatest(0, coalesce(v_sale.points_redeemed_snapshot,0)-v_prior_points_restored);
      v_stamps_restore := greatest(0, coalesce(v_sale.stamps_redeemed_snapshot,0)-v_prior_stamps_restored);
    end if;

    select coalesce(sum(points_remaining),0)::int into v_point_balance
      from public.loyalty_point_lots where membership_id=v_membership and (expires_at is null or expires_at>now());
    v_points_reverse := least(v_points_reverse_target,v_point_balance);

    if v_points_reverse > 0 then
      v_need := v_points_reverse;
      for v_lot in
        select id,points_remaining from public.loyalty_point_lots
        where membership_id=v_membership and points_remaining>0 and (expires_at is null or expires_at>now())
        order by case when source_sale_id=v_sale.id then 0 else 1 end, expires_at asc nulls last, earned_at asc
        for update
      loop
        exit when v_need<=0;
        v_take := least(v_need,v_lot.points_remaining);
        update public.loyalty_point_lots set points_remaining=points_remaining-v_take where id=v_lot.id;
        v_need := v_need-v_take;
      end loop;
      insert into public.loyalty_point_transactions(shop_id,membership_id,delta,transaction_type,sale_id,created_by,note)
      values(v_shop,v_membership,-v_points_reverse,'adjust',v_sale.id,auth.uid(),'Refund/void reversal of earned points');
    end if;

    if v_points_restore > 0 then
      select * into v_program from public.loyalty_programs where shop_id=v_shop limit 1;
      if v_program.points_expire and v_program.points_expiry_days is not null then
        v_restore_expiry := now()+make_interval(days=>v_program.points_expiry_days);
      else v_restore_expiry := null; end if;
      insert into public.loyalty_point_lots(shop_id,membership_id,source_sale_id,points_original,points_remaining,expires_at,note)
      values(v_shop,v_membership,null,v_points_restore,v_points_restore,v_restore_expiry,'Points restored after full refund/void');
      insert into public.loyalty_point_transactions(shop_id,membership_id,delta,transaction_type,sale_id,created_by,note)
      values(v_shop,v_membership,v_points_restore,'adjust',v_sale.id,auth.uid(),'Redeemed points restored after full refund/void');
    end if;

    select coalesce(sum(delta),0)::int into v_stamp_balance
      from public.loyalty_stamp_transactions where membership_id=v_membership;
    v_stamps_reverse := least(v_stamps_reverse_target,greatest(v_stamp_balance,0));
    if v_stamps_reverse > 0 then
      insert into public.loyalty_stamp_transactions(shop_id,membership_id,delta,transaction_type,sale_id,created_by,note)
      values(v_shop,v_membership,-v_stamps_reverse,'adjust',v_sale.id,auth.uid(),'Refund/void reversal of earned stamps');
    end if;
    if v_stamps_restore > 0 then
      insert into public.loyalty_stamp_transactions(shop_id,membership_id,delta,transaction_type,sale_id,created_by,note)
      values(v_shop,v_membership,v_stamps_restore,'adjust',v_sale.id,auth.uid(),'Redeemed stamps restored after full refund/void');
    end if;
  end if;

  v_restock_effective := case when p_mode='void' then true else coalesce(p_restock,false) end;

  insert into public.sale_refunds(
    shop_id,sale_id,refund_type,subtotal,discount,tax,total,reason,restocked,payment_note,
    points_reversed,points_restored,stamps_reversed,stamps_restored,processed_by,approved_by
  ) values (
    v_shop,v_sale.id,p_mode,v_refund_subtotal,v_refund_discount,v_refund_tax,v_refund_total,trim(p_reason),v_restock_effective,p_payment_note,
    v_points_reverse,v_points_restore,v_stamps_reverse,v_stamps_restore,auth.uid(),v_manager
  ) returning id,refund_number into v_refund,v_refund_number;

  for v_norm_item in select * from jsonb_array_elements(v_norm)
  loop
    insert into public.sale_refund_items(refund_id,sale_id,sale_item_id,shop_id,product_id,product_name,qty,unit_price,line_total)
    values(
      v_refund,v_sale.id,(v_norm_item->>'sale_item_id')::uuid,v_shop,
      nullif(v_norm_item->>'product_id','')::uuid,v_norm_item->>'name',(v_norm_item->>'qty')::numeric,
      (v_norm_item->>'unit_price')::numeric,(v_norm_item->>'line_total')::numeric
    );
    if v_restock_effective and exists(select 1 from sale_items where id=(v_norm_item->>'sale_item_id')::uuid and coalesce((variant_snapshot->>'independent_stock')::boolean,false)) then
      select stock into v_variant_stock from product_variants where id=(select variant_id from sale_items where id=(v_norm_item->>'sale_item_id')::uuid) for update;
      update product_variants set stock=coalesce((select sum(remaining_quantity) from variant_stock_lots where variant_id=product_variants.id and status='active'),0) where id=(select variant_id from sale_items where id=(v_norm_item->>'sale_item_id')::uuid);
      insert into variant_inventory_events(shop_id,variant_id,delta,reason,performed_by) select v_shop,variant_id,(select stock-v_variant_stock from product_variants where id=sale_items.variant_id),'Refund '||v_refund,auth.uid() from sale_items where id=(v_norm_item->>'sale_item_id')::uuid;
    elsif v_restock_effective and nullif(v_norm_item->>'product_id','') is not null then
      update public.products set stock=stock+(v_norm_item->>'qty')::numeric,updated_at=now()
      where id=(v_norm_item->>'product_id')::uuid and shop_id=v_shop;
      if found then
        insert into public.inventory_adjustments(shop_id,product_id,delta,reason,created_by)
        values(v_shop,(v_norm_item->>'product_id')::uuid,(v_norm_item->>'qty')::numeric,
          case when p_mode='void' then 'Void receipt #'||v_sale.receipt_number else 'Refund #'||v_refund_number end,
          auth.uid());
      end if;
    end if;
  end loop;

  if p_mode='void' then
    v_new_status := 'voided';
    update public.sales set status='voided',refunded_total=v_sale.total,last_refund_at=now(),voided_at=now(),voided_by=auth.uid()
      where id=v_sale.id;
  else
    v_new_status := case when v_full_after then 'refunded' else 'partially_refunded' end;
    update public.sales set status=v_new_status,refunded_total=v_new_refunded_total,last_refund_at=now()
      where id=v_sale.id;
  end if;

  if v_sale.customer_id is not null then
    update public.customers
      set total_spent=greatest(0,total_spent-v_refund_total),
          visits=case when v_full_after or p_mode='void' then greatest(0,visits-1) else visits end,
          updated_at=now()
      where id=v_sale.customer_id and shop_id=v_shop;
  end if;

  return jsonb_build_object(
    'refund_id',v_refund,'refund_number',v_refund_number,'sale_id',v_sale.id,'mode',p_mode,
    'refund_total',v_refund_total,'refunded_total',case when p_mode='void' then v_sale.total else v_new_refunded_total end,
    'sale_status',v_new_status,'restocked',v_restock_effective,
    'points_reversed',v_points_reverse,'points_restored',v_points_restore,
    'stamps_reversed',v_stamps_reverse,'stamps_restored',v_stamps_restore,
    'manager_user_id',v_manager
  );
end;
$$;
grant execute on function public.process_sale_adjustment(uuid,text,jsonb,boolean,text,text,text) to authenticated;

