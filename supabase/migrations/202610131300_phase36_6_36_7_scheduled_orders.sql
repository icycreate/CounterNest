create table public.scheduled_customer_orders(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id),order_number bigint generated always as identity,
 client_key uuid not null,kind text not null check(kind in('preorder','cake')),customer_id uuid not null references customers(id),
 pickup_at timestamptz not null,production_deadline timestamptz not null,items jsonb not null,normalized_items jsonb not null,
 details jsonb not null default '{}',note text,status text not null default 'confirmed' check(status in('confirmed','preparing','ready','completed','cancelled')),
 quoted_subtotal numeric(12,2) not null check(quoted_subtotal>=0),deposit_total numeric(12,2) not null default 0 check(deposit_total>=0),
 sale_id uuid unique references sales(id),created_by uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(shop_id,client_key),check(production_deadline<=pickup_at)
);
create table public.scheduled_order_deposits(id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id),order_id uuid not null references scheduled_customer_orders(id),client_key uuid not null,amount numeric(12,2) not null check(amount>0),payment_method text not null check(payment_method in('cash','card','qr')),refunded_at timestamptz,created_by uuid not null,created_at timestamptz not null default now(),unique(shop_id,client_key));
alter table scheduled_customer_orders enable row level security;alter table scheduled_order_deposits enable row level security;
create policy scheduled_orders_read on scheduled_customer_orders for select to authenticated using(shop_id=current_shop_id());
create policy scheduled_deposits_read on scheduled_order_deposits for select to authenticated using(shop_id=current_shop_id());
alter table production_batches add column scheduled_order_id uuid references scheduled_customer_orders(id),add column variant_id uuid references product_variants(id),add column variant_scale_snapshot numeric not null default 1;
alter table sales add column scheduled_order_id uuid references scheduled_customer_orders(id),add column deposit_applied numeric(12,2) not null default 0,add column balance_paid numeric(12,2);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('special-order-references','special-order-references',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict do nothing;
create policy special_order_upload on storage.objects for insert to authenticated with check(bucket_id='special-order-references' and is_admin() and (storage.foldername(name))[1]=current_shop_id()::text);
create policy special_order_read on storage.objects for select to authenticated using(bucket_id='special-order-references' and (storage.foldername(name))[1]=current_shop_id()::text);

create function public.save_scheduled_order(p_id uuid,p_key uuid,p_values jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=current_shop_id();v_order_id uuid;normalized jsonb;subtotal numeric;prior scheduled_customer_orders%rowtype;ref text;
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 if not exists(select 1 from customers where id=(p_values->>'customer_id')::uuid and shop_id=v_shop) then raise exception 'Customer not found';end if;
 if p_id is not null then select * into prior from scheduled_customer_orders where scheduled_customer_orders.id=p_id and shop_id=v_shop for update;if not found or prior.sale_id is not null or prior.status in('completed','cancelled') then raise exception 'Order is closed';end if;end if;
 if (p_values->>'pickup_at')::timestamptz<now() then raise exception 'Pickup must be in the future';end if;
 perform 1 from products where shop_id=v_shop order by id for update;
 if p_id is not null and p_values->'items' is not distinct from prior.items then normalized:=prior.normalized_items;else normalized:=normalize_commercial_items(v_shop,p_values->'items',false,false);end if;
 if p_id is not null and exists(select 1 from production_batches where scheduled_order_id=p_id and status<>'cancelled') and ((p_values->'items') is distinct from prior.items or (p_values->>'production_deadline')::timestamptz is distinct from prior.production_deadline) then raise exception 'Cancel approved production before changing order items or deadline';end if;
 select sum((x->>'__line_total')::numeric) into subtotal from jsonb_array_elements(normalized)x;
 if p_values->>'kind'='cake' then subtotal:=(p_values->>'quoted_subtotal')::numeric;if jsonb_array_length(normalized)<>1 then raise exception 'A custom cake quote requires one product/variant line';end if;end if;
 if subtotal is null or subtotal::text in('NaN','Infinity') or subtotal<0 or round(subtotal*(1+(select tax_rate from shops where id=v_shop)),2)<coalesce(prior.deposit_total,0) then raise exception 'Invalid quote';end if;
 ref:=p_values->'details'->>'reference_path';if ref is not null and (ref not like v_shop::text||'/%' or not exists(select 1 from storage.objects where bucket_id='special-order-references' and name=ref)) then raise exception 'Invalid reference image';end if;
 insert into scheduled_customer_orders(id,shop_id,client_key,kind,customer_id,pickup_at,production_deadline,items,normalized_items,details,note,quoted_subtotal,created_by)
 values(coalesce(p_id,gen_random_uuid()),v_shop,p_key,p_values->>'kind',(p_values->>'customer_id')::uuid,(p_values->>'pickup_at')::timestamptz,(p_values->>'production_deadline')::timestamptz,p_values->'items',normalized,coalesce(p_values->'details','{}'),p_values->>'note',subtotal,auth.uid())
 on conflict(shop_id,client_key) do nothing returning scheduled_customer_orders.id into v_order_id;
 if p_id is not null then update scheduled_customer_orders set customer_id=(p_values->>'customer_id')::uuid,pickup_at=(p_values->>'pickup_at')::timestamptz,production_deadline=(p_values->>'production_deadline')::timestamptz,items=p_values->'items',normalized_items=normalized,details=coalesce(p_values->'details','{}'),note=p_values->>'note',quoted_subtotal=subtotal,updated_at=now() where scheduled_customer_orders.id=p_id;v_order_id:=p_id;end if;
 if v_order_id is null then select o.id into v_order_id from scheduled_customer_orders o where shop_id=v_shop and client_key=p_key;end if;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(v_shop,'scheduled_order',v_order_id,'saved',jsonb_build_object('quote',subtotal,'pickup',p_values->>'pickup_at'),auth.uid());return v_order_id;
end $$;

create function public.record_scheduled_deposit(p_order uuid,p_key uuid,p_amount numeric,p_method text)
returns void language plpgsql security definer set search_path=public as $$
declare o scheduled_customer_orders%rowtype;v_session uuid;gross numeric;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 select * into o from scheduled_customer_orders where id=p_order and shop_id=current_shop_id() for update;
 if not found or o.status in('cancelled','completed') or o.sale_id is not null then raise exception 'Order is closed';end if;
 if exists(select 1 from scheduled_order_deposits where shop_id=o.shop_id and client_key=p_key) then return;end if;
 select round(o.quoted_subtotal*(1+tax_rate),2) into gross from shops where id=o.shop_id;
 if p_amount is null or p_amount<=0 or p_amount::text in('NaN','Infinity') or p_amount+o.deposit_total>gross then raise exception 'Deposit exceeds remaining balance';end if;
 if p_method='cash' then
 select id into v_session from cash_drawer_sessions where shop_id=o.shop_id and status='open' order by opened_at desc limit 1 for update;
 if v_session is null then raise exception 'Open the cash drawer before receiving a cash deposit';end if;
 insert into cash_drawer_transactions(shop_id,session_id,transaction_type,amount,reason,performed_by) values(o.shop_id,v_session,'cash_in',p_amount,'Order deposit '||o.order_number,auth.uid());end if;
 insert into scheduled_order_deposits(shop_id,order_id,client_key,amount,payment_method,created_by) values(o.shop_id,o.id,p_key,p_amount,p_method,auth.uid());
 update scheduled_customer_orders set deposit_total=deposit_total+p_amount,updated_at=now() where id=o.id;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(o.shop_id,'scheduled_order',o.id,'deposit',jsonb_build_object('amount',p_amount,'method',p_method),auth.uid());
end $$;

create function public.set_scheduled_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare o scheduled_customer_orders%rowtype;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 select * into o from scheduled_customer_orders where id=p_id and shop_id=current_shop_id() for update;
 if not found then raise exception 'Order not found';end if;
 if not ((p_status='preparing' and o.status='confirmed') or(p_status='ready' and o.status='preparing') or(p_status='completed' and o.status='ready' and o.sale_id is not null) or(p_status='cancelled' and o.status in('confirmed','preparing','ready') and o.sale_id is null and o.deposit_total=0 and is_admin())) then raise exception 'Invalid transition; refund deposits before cancelling and collect only paid ready orders';end if;
 update scheduled_customer_orders set status=p_status,updated_at=now() where id=o.id;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(o.shop_id,'scheduled_order',o.id,p_status,jsonb_build_object('before',o.status),auth.uid());
end $$;
create function public.get_scheduled_orders() returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 return jsonb_build_object('orders',(select coalesce(jsonb_agg(to_jsonb(x) order by x.pickup_at),'[]') from(select o.*,c.name customer_name,round(o.quoted_subtotal*(1+s.tax_rate),2) quoted_total,round(o.quoted_subtotal*(1+s.tax_rate),2)-o.deposit_total balance_due from scheduled_customer_orders o join customers c on c.id=o.customer_id join shops s on s.id=o.shop_id where o.shop_id=current_shop_id())x),'customers',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name)),'[]') from customers where shop_id=current_shop_id()));
end $$;
revoke all on function public.save_scheduled_order(uuid,uuid,jsonb),public.record_scheduled_deposit(uuid,uuid,numeric,text),public.set_scheduled_order_status(uuid,text),public.get_scheduled_orders() from public;
grant execute on function public.save_scheduled_order(uuid,uuid,jsonb),public.record_scheduled_deposit(uuid,uuid,numeric,text),public.set_scheduled_order_status(uuid,text),public.get_scheduled_orders() to authenticated;
