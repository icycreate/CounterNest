-- CounterNest POS v1.40.0 / Phase 35.7
-- Catalogue presentation: featured/seasonal/new badges, option labels, category ordering, and customer-display integration.

alter table public.products
  add column if not exists catalogue_seasonal_label text,
  add column if not exists catalogue_new_badge boolean not null default false;

create table if not exists public.catalogue_product_options (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,label)
);
create index if not exists catalogue_product_options_lookup_idx on public.catalogue_product_options(shop_id,product_id,active,sort_order);
alter table public.catalogue_product_options enable row level security;
drop policy if exists catalogue_product_options_admin_select on public.catalogue_product_options;
create policy catalogue_product_options_admin_select on public.catalogue_product_options for select to authenticated
  using(shop_id=public.current_shop_id());
drop policy if exists catalogue_product_options_admin_write on public.catalogue_product_options;
create policy catalogue_product_options_admin_write on public.catalogue_product_options for all to authenticated
  using(shop_id=public.current_shop_id() and public.is_admin())
  with check(shop_id=public.current_shop_id() and public.is_admin());

alter table public.customer_selection_items add column if not exists option_label_snapshot text;

create or replace function public.replace_catalogue_product_options(p_product_id uuid,p_labels text[])
returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_label text;v_order integer:=0;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists(select 1 from public.products where id=p_product_id and shop_id=v_shop) then raise exception 'Product not found'; end if;
  -- Preserve old option labels as inactive so already-submitted customer requests remain traceable and checkout-safe.
  update public.catalogue_product_options set active=false,updated_at=now() where shop_id=v_shop and product_id=p_product_id;
  foreach v_label in array coalesce(p_labels,array[]::text[]) loop
    v_label:=left(trim(v_label),60);
    if v_label<>'' and not exists(select 1 from public.catalogue_product_options where product_id=p_product_id and lower(label)=lower(v_label) and active) then
      v_order:=v_order+1;
      insert into public.catalogue_product_options(shop_id,product_id,label,sort_order,active,updated_at)
      values(v_shop,p_product_id,v_label,v_order,true,now())
      on conflict(product_id,label) do update set active=true,sort_order=excluded.sort_order,updated_at=now();
    end if;
  end loop;
end $$;

create or replace function public.save_catalogue_product_experience(
  p_product_id uuid,p_seasonal_label text,p_new_badge boolean,p_option_labels text[]
) returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  update public.products set catalogue_seasonal_label=nullif(left(trim(coalesce(p_seasonal_label,'')),40),''),catalogue_new_badge=coalesce(p_new_badge,false),updated_at=now()
  where id=p_product_id and shop_id=v_shop;
  if not found then raise exception 'Product not found'; end if;
  perform public.replace_catalogue_product_options(p_product_id,p_option_labels);
end $$;

-- Admin payload now includes Phase 35.7 presentation fields and options.
create or replace function public.get_catalogue_admin()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return jsonb_build_object(
    'settings',(select jsonb_build_object(
      'catalogue_title',coalesce(c.catalogue_title,'Catalogue'),'catalogue_subtitle',c.catalogue_subtitle,'pdf_footer',c.pdf_footer,
      'access_token',c.access_token,'enabled',c.enabled,'target_labels',c.target_labels
    ) from public.customer_display_configs c where c.shop_id=v_shop),
    'products',(select coalesce(jsonb_agg(to_jsonb(x) order by x.category_sort_order,x.catalogue_sort_order,x.name),'[]'::jsonb) from(
      select p.id,p.name,p.barcode,p.price,p.stock,p.active,p.image_url,p.icon_emoji,
        coalesce(c.name,'Other') category_name,coalesce(c.sort_order,0) category_sort_order,
        p.catalogue_description,p.catalogue_visible,p.catalogue_featured,p.catalogue_sold_out,p.catalogue_sort_order,
        p.catalogue_seasonal_label,p.catalogue_new_badge,
        (select coalesce(jsonb_agg(o.label order by o.sort_order,o.label),'[]'::jsonb) from public.catalogue_product_options o where o.product_id=p.id and o.shop_id=v_shop and o.active) option_labels
      from public.products p left join public.categories c on c.id=p.category_id where p.shop_id=v_shop
    )x)
  );
end $$;

-- Token-scoped customer catalogue. Products is still the single master record.
create or replace function public.get_customer_display_catalog(p_token text)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_cfg public.customer_display_configs%rowtype;v_shop public.shops%rowtype;
begin
  select * into v_cfg from public.customer_display_configs where access_token=p_token and enabled;
  if v_cfg.id is null then raise exception 'Customer display is unavailable or the access link is invalid'; end if;
  select * into v_shop from public.shops where id=v_cfg.shop_id;
  return jsonb_build_object(
    'shop_name',v_shop.name,'logo_url',v_shop.logo_url,'currency',coalesce(v_shop.currency,'USD'),
    'catalogue_title',coalesce(v_cfg.catalogue_title,'Catalogue'),'catalogue_subtitle',v_cfg.catalogue_subtitle,
    'targets',to_jsonb(v_cfg.target_labels),
    'products',(select coalesce(jsonb_agg(to_jsonb(x) order by x.category_sort_order,x.catalogue_sort_order,x.name),'[]'::jsonb) from(
      select p.id,p.name,p.price,p.image_url,p.icon_emoji,coalesce(c.name,'Other') category_name,coalesce(c.sort_order,0) category_sort_order,
        p.catalogue_description description,p.catalogue_featured featured,p.catalogue_seasonal_label seasonal_label,p.catalogue_new_badge new_badge,p.catalogue_sort_order,
        (p.stock>0 and not p.catalogue_sold_out) available,
        (select coalesce(jsonb_agg(o.label order by o.sort_order,o.label),'[]'::jsonb) from public.catalogue_product_options o where o.product_id=p.id and o.active) option_labels
      from public.products p left join public.categories c on c.id=p.category_id
      where p.shop_id=v_cfg.shop_id and p.active and p.catalogue_visible
    )x)
  );
end $$;

-- Customer selections can carry one validated catalogue option label (size/flavour/etc.).
create or replace function public.submit_customer_selection(p_token text,p_target_station_label text,p_items jsonb,p_customer_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_cfg public.customer_display_configs%rowtype;v_request uuid;v_number bigint;v_line record;v_stock record;v_product public.products%rowtype;v_count integer:=0;v_total numeric:=0;v_option_count integer;
begin
  select * into v_cfg from public.customer_display_configs where access_token=p_token and enabled;
  if v_cfg.id is null then raise exception 'Customer display is unavailable or the access link is invalid'; end if;
  if nullif(trim(p_target_station_label),'') is null or not (trim(p_target_station_label)=any(v_cfg.target_labels)) then raise exception 'Select a valid POS station'; end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'Select at least one product'; end if;
  if jsonb_array_length(p_items)>30 then raise exception 'A customer request can contain at most 30 product lines'; end if;
  if (select count(*) from public.customer_selection_requests where display_config_id=v_cfg.id and status='pending')>=50 then raise exception 'The customer selection queue is full. Please ask staff for assistance.'; end if;
  -- Options share the same physical product stock. Validate the aggregate requested quantity before creating the queue record.
  for v_stock in
    select product_id,sum(quantity)::integer quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer,option_label text)
    group by product_id
  loop
    if v_stock.product_id is null or v_stock.quantity is null or v_stock.quantity<1 then raise exception 'Invalid product quantity'; end if;
    select * into v_product from public.products where id=v_stock.product_id and shop_id=v_cfg.shop_id and active and catalogue_visible for share;
    if v_product.id is null then raise exception 'A selected product is no longer available'; end if;
    if v_product.stock<v_stock.quantity or v_product.catalogue_sold_out then raise exception '% is no longer available in the requested quantity',v_product.name; end if;
  end loop;
  insert into public.customer_selection_requests(shop_id,display_config_id,target_station_label,customer_note)
  values(v_cfg.shop_id,v_cfg.id,trim(p_target_station_label),nullif(left(trim(coalesce(p_customer_note,'')),180),'')) returning id,request_number into v_request,v_number;
  for v_line in
    select product_id,nullif(trim(option_label),'') option_label,sum(quantity)::integer quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer,option_label text)
    group by product_id,nullif(trim(option_label),'')
  loop
    if v_line.product_id is null or v_line.quantity is null or v_line.quantity<1 or v_line.quantity>20 then raise exception 'Each product quantity must be between 1 and 20'; end if;
    select * into v_product from public.products where id=v_line.product_id and shop_id=v_cfg.shop_id and active and catalogue_visible for share;
    if v_product.id is null then raise exception 'A selected product is no longer available'; end if;
    if v_product.stock<v_line.quantity or v_product.catalogue_sold_out then raise exception '% is no longer available',v_product.name; end if;
    select count(*) into v_option_count from public.catalogue_product_options where product_id=v_product.id and shop_id=v_cfg.shop_id and active;
    if v_option_count>0 and (v_line.option_label is null or not exists(select 1 from public.catalogue_product_options where product_id=v_product.id and shop_id=v_cfg.shop_id and active and lower(label)=lower(v_line.option_label))) then
      raise exception 'Select a valid option for %',v_product.name;
    end if;
    if v_option_count=0 then v_line.option_label:=null; end if;
    insert into public.customer_selection_items(request_id,shop_id,product_id,product_name_snapshot,unit_price_snapshot,quantity,option_label_snapshot)
    values(v_request,v_cfg.shop_id,v_product.id,v_product.name,v_product.price,v_line.quantity,v_line.option_label);
    v_count:=v_count+1;v_total:=v_total+round(v_product.price*v_line.quantity,2);
  end loop;
  if v_count=0 then raise exception 'Select at least one product'; end if;
  update public.customer_selection_requests set total_snapshot=round(v_total,2) where id=v_request;
  return jsonb_build_object('request_id',v_request,'request_number',v_number,'total',round(v_total,2),'target_station_label',trim(p_target_station_label));
end $$;

create or replace function public.get_customer_selection_queue(p_station_label text)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or v_shop is null then raise exception 'Staff sign-in is required'; end if;
  if nullif(trim(p_station_label),'') is null then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at),'[]'::jsonb) from(
    select r.id,r.request_number,r.target_station_label,r.customer_note,r.total_snapshot,r.created_at,
      (select coalesce(jsonb_agg(jsonb_build_object('product_id',i.product_id,'product_name',i.product_name_snapshot,'unit_price',i.unit_price_snapshot,'quantity',i.quantity,'option_label',i.option_label_snapshot) order by i.product_name_snapshot,i.option_label_snapshot),'[]'::jsonb) from public.customer_selection_items i where i.request_id=r.id) items
    from public.customer_selection_requests r where r.shop_id=v_shop and r.status='pending' and lower(r.target_station_label)=lower(trim(p_station_label)) order by r.created_at
  )q);
end $$;

create or replace function public.claim_customer_selection(p_request_id uuid,p_station_label text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_request public.customer_selection_requests%rowtype;
begin
  if auth.uid() is null or v_shop is null then raise exception 'Staff sign-in is required'; end if;
  select * into v_request from public.customer_selection_requests where id=p_request_id and shop_id=v_shop for update;
  if v_request.id is null then raise exception 'Customer request not found'; end if;
  if v_request.status<>'pending' then raise exception 'Customer request has already been handled'; end if;
  if lower(v_request.target_station_label)<>lower(trim(coalesce(p_station_label,''))) then raise exception 'This request belongs to a different POS station'; end if;
  update public.customer_selection_requests set status='loaded',loaded_at=now(),loaded_by=auth.uid() where id=v_request.id;
  return jsonb_build_object('request_id',v_request.id,'request_number',v_request.request_number,'customer_note',v_request.customer_note,'items',
    (select coalesce(jsonb_agg(jsonb_build_object('product_id',i.product_id,'product_name',i.product_name_snapshot,'unit_price',i.unit_price_snapshot,'quantity',i.quantity,'option_label',i.option_label_snapshot)),'[]'::jsonb) from public.customer_selection_items i where i.request_id=v_request.id));
end $$;

create or replace function public.get_customer_fulfillment_queue(p_station_label text)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or v_shop is null then raise exception 'Staff sign-in is required'; end if;
  if nullif(trim(p_station_label),'') is null then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at),'[]'::jsonb) from(
    select r.id,r.request_number,r.target_station_label,r.customer_note,r.total_snapshot,r.status,r.created_at,r.loaded_at,r.preparing_at,r.ready_at,
      (select coalesce(jsonb_agg(jsonb_build_object('product_id',i.product_id,'product_name',i.product_name_snapshot,'unit_price',i.unit_price_snapshot,'quantity',i.quantity,'option_label',i.option_label_snapshot) order by i.product_name_snapshot,i.option_label_snapshot),'[]'::jsonb) from public.customer_selection_items i where i.request_id=r.id) items
    from public.customer_selection_requests r where r.shop_id=v_shop and r.status in('loaded','preparing','ready') and lower(r.target_station_label)=lower(trim(p_station_label)) order by r.created_at
  )q);
end $$;


-- Phase 35.7 checkout preserves validated catalogue option labels on receipt line snapshots.
-- Options use the base product price and stock unit; price-changing variants are intentionally deferred.
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
  for v_stock in
    select (x->>'product_id')::uuid product_id, sum((x->>'qty')::numeric) qty
    from jsonb_array_elements(p_items) x
    group by (x->>'product_id')::uuid
  loop
    if v_stock.qty <= 0 then raise exception 'Invalid quantity'; end if;
    select * into v_product from public.products
      where id=v_stock.product_id and shop_id=v_shop and active=true
      for update;
    if not found then raise exception 'Product not found'; end if;
    if v_product.stock < v_stock.qty then raise exception 'Insufficient stock for %', v_product.name; end if;
  end loop;

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
    v_option_label := nullif(left(trim(coalesce(v_item->>'option_label','')),60),'');
    if v_option_label is not null and not exists(
      select 1 from public.catalogue_product_options o
      where o.shop_id=v_shop and o.product_id=v_product.id and lower(o.label)=lower(v_option_label)
    ) then raise exception 'Invalid catalogue option for %',v_product.name; end if;
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
    v_option_label := nullif(left(trim(coalesce(v_item->>'option_label','')),60),'');
    v_line_no := v_line_no + 1;
    insert into public.sale_items(sale_id, shop_id, product_id, product_name, qty, unit_price, line_total, line_no)
    values (v_sale, v_shop, v_product.id, v_product.name || case when v_option_label is null then '' else ' — ' || v_option_label end, v_qty, v_product.price, round(v_product.price * v_qty,2), v_line_no);
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

revoke all on function public.replace_catalogue_product_options(uuid,text[]) from public;
revoke all on function public.save_catalogue_product_experience(uuid,text,boolean,text[]) from public;
grant execute on function public.replace_catalogue_product_options(uuid,text[]) to authenticated;
grant execute on function public.save_catalogue_product_experience(uuid,text,boolean,text[]) to authenticated;

comment on table public.catalogue_product_options is 'Phase 35.7 catalogue option labels (size/flavour/etc.). Options do not change the master product price or stock unit.';
