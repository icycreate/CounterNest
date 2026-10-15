alter table sales drop constraint sales_cash_tender_valid;
alter table sales add constraint sales_cash_tender_valid check(
 (payment_method='cash' and(cash_received is null or(cash_received>=total-deposit_applied and change_due=cash_received-(total-deposit_applied))))
 or(payment_method<>'cash' and cash_received is null and change_due is null));
create function public.complete_scheduled_order_sale(p_order uuid,p_method text,p_expected_balance numeric,p_cash_received numeric default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o scheduled_customer_orders%rowtype;cart jsonb;line jsonb;result jsonb;gross numeric;due numeric;v_session uuid;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 select * into o from scheduled_customer_orders where id=p_order and shop_id=current_shop_id() for update;
 if not found or o.sale_id is not null or o.status='cancelled' then raise exception 'Order unavailable or already paid';end if;
 select round(o.quoted_subtotal*(1+tax_rate),2) into gross from shops where id=o.shop_id;due:=gross-o.deposit_total;if due<0 then raise exception 'Deposits exceed the final invoice. Refund excess before final payment.';end if;
 if p_expected_balance is distinct from due then raise exception 'Balance changed. Review the remaining balance.';end if;
 if p_method='cash' and (p_cash_received is null or p_cash_received<due) then raise exception 'Cash received is below the remaining balance';end if;
 cart:=o.normalized_items;
 if o.kind='cake' then
 line:=cart->0;cart:=jsonb_build_array(line||jsonb_build_object('__line_total',o.quoted_subtotal,'__unit_price',round(o.quoted_subtotal/(line->>'qty')::numeric,2),'__name',(line->>'__name')||' • Custom cake order '||o.order_number,'__variant_snapshot',case when jsonb_typeof(line->'__variant_snapshot')='object' then line->'__variant_snapshot' else '{}'::jsonb end||jsonb_build_object('custom_order',o.details)));
 end if;
 perform 1 from products where shop_id=o.shop_id order by id for update;
 result:=complete_sale(o.customer_id,p_method,cart,null);
 update sales set scheduled_order_id=o.id,deposit_applied=o.deposit_total,balance_paid=due where id=(result->>'sale_id')::uuid;
 update scheduled_customer_orders set sale_id=(result->>'sale_id')::uuid,updated_at=now() where id=o.id;
 -- The existing cash-sale trigger records gross. Offset prepaid value once in the same transaction.
 if p_method='cash' and o.deposit_total>0 then
 select id into v_session from cash_drawer_sessions where shop_id=o.shop_id and status='open' order by opened_at desc limit 1 for update;
 if v_session is null then raise exception 'Open the cash drawer before final payment';end if;
 insert into cash_drawer_transactions(shop_id,session_id,transaction_type,amount,reason,sale_id,performed_by) values(o.shop_id,v_session,'cash_out',-o.deposit_total,'Prepaid deposit applied to order '||o.order_number,(result->>'sale_id')::uuid,auth.uid());end if;
 if p_method='cash' then perform record_cash_tender((result->>'sale_id')::uuid,p_cash_received);end if;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(o.shop_id,'scheduled_order',o.id,'paid',jsonb_build_object('sale',result->>'sale_id','deposit',o.deposit_total,'balance',due),auth.uid());
 return result||jsonb_build_object('deposit_applied',o.deposit_total,'balance_paid',due);
end $$;
create function public.refund_scheduled_deposit(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare d scheduled_order_deposits%rowtype;o scheduled_customer_orders%rowtype;v_session uuid;
begin
 if auth.uid() is null or not is_admin() or nullif(trim(p_reason),'') is null then raise exception 'Administrator and refund reason required';end if;
 select * into d from scheduled_order_deposits where id=p_id and shop_id=current_shop_id();if not found then raise exception 'Deposit not found';end if;
 select * into o from scheduled_customer_orders where id=d.order_id for update;
 select * into d from scheduled_order_deposits where id=p_id for update;
 if o.sale_id is not null or d.refunded_at is not null then raise exception 'Deposit already refunded or order paid';end if;
 if d.payment_method='cash' then select id into v_session from cash_drawer_sessions where shop_id=o.shop_id and status='open' limit 1 for update;if v_session is null then raise exception 'Open cash drawer required';end if;
 insert into cash_drawer_transactions(shop_id,session_id,transaction_type,amount,reason,performed_by) values(o.shop_id,v_session,'cash_out',-d.amount,'Refund order deposit: '||p_reason,auth.uid());end if;
 update scheduled_order_deposits set refunded_at=now() where id=d.id;update scheduled_customer_orders set deposit_total=deposit_total-d.amount,updated_at=now() where id=o.id;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(o.shop_id,'scheduled_order',o.id,'deposit_refunded',jsonb_build_object('amount',d.amount,'reason',p_reason),auth.uid());
end $$;
revoke all on function public.complete_scheduled_order_sale(uuid,text,numeric,numeric),public.refund_scheduled_deposit(uuid,text) from public;
grant execute on function public.complete_scheduled_order_sale(uuid,text,numeric,numeric),public.refund_scheduled_deposit(uuid,text) to authenticated;

create or replace function public.record_cash_tender(p_sale_id uuid, p_cash_received numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sale public.sales%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_sale from public.sales where id=p_sale_id and shop_id=public.current_shop_id() for update;
  if v_sale.id is null then raise exception 'Sale not found'; end if;
  if v_sale.staff_user_id<>auth.uid() then raise exception 'Only the salesperson may record the cash tender'; end if;
  if v_sale.payment_method<>'cash' then raise exception 'Cash tender applies only to cash sales'; end if;
  if v_sale.cash_received is not null then raise exception 'Cash tender is already recorded'; end if;
  if p_cash_received is null or round(p_cash_received,2)<(v_sale.total-v_sale.deposit_applied) then raise exception 'Cash received is less than the sale total'; end if;
  update public.sales set cash_received=round(p_cash_received,2),change_due=round(p_cash_received-(v_sale.total-v_sale.deposit_applied),2) where id=v_sale.id;
  return jsonb_build_object('sale_id',v_sale.id,'cash_received',round(p_cash_received,2),'change_due',round(p_cash_received-(v_sale.total-v_sale.deposit_applied),2));
end $$;



alter function public.get_sale_receipt(uuid) rename to get_sale_receipt_before_scheduled_orders;
revoke all on function public.get_sale_receipt_before_scheduled_orders(uuid) from public,authenticated,anon;
create function public.get_sale_receipt(p_sale_id uuid) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare payload jsonb;extra jsonb;
begin
 payload:=get_sale_receipt_before_scheduled_orders(p_sale_id);
 select jsonb_build_object('deposit_applied',deposit_applied,'balance_paid',balance_paid,'scheduled_order_id',scheduled_order_id) into extra from sales where id=p_sale_id and shop_id=current_shop_id();
 return payload||coalesce(extra,'{}');end $$;
revoke all on function public.get_sale_receipt(uuid) from public;grant execute on function public.get_sale_receipt(uuid) to authenticated;

-- Expose deposit records only to staff in the order's shop.
create function public.get_scheduled_deposits(p_order uuid) returns jsonb language plpgsql security definer stable set search_path=public as $$begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 return(select coalesce(jsonb_agg(to_jsonb(d) order by created_at),'[]') from scheduled_order_deposits d where order_id=p_order and shop_id=current_shop_id());end $$;
revoke all on function public.get_scheduled_deposits(uuid) from public;grant execute on function public.get_scheduled_deposits(uuid) to authenticated;

-- Supabase projects may grant default EXECUTE to API roles: explicitly close internal helpers.
revoke all on function public.normalize_commercial_items(uuid,jsonb,boolean,boolean),
 public.complete_sale(uuid,text,jsonb,uuid),public.sku_effective_price(uuid,uuid),
 public.commercial_staff_catalogue_payload(uuid),public.commercial_refund_line(uuid,numeric),
 public.get_sale_receipt_before_scheduled_orders(uuid) from public,anon,authenticated;
