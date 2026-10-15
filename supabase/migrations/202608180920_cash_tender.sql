-- Phase 20 — immutable cash tender and change values for cash-sale receipts.
alter table public.sales add column if not exists cash_received numeric(12,2);
alter table public.sales add column if not exists change_due numeric(12,2);

alter table public.sales drop constraint if exists sales_cash_tender_valid;
alter table public.sales add constraint sales_cash_tender_valid check (
  (payment_method = 'cash' and (cash_received is null or (cash_received >= total and change_due = cash_received - total)))
  or (payment_method <> 'cash' and cash_received is null and change_due is null)
);

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
  if p_cash_received is null or round(p_cash_received,2)<v_sale.total then raise exception 'Cash received is less than the sale total'; end if;
  update public.sales set cash_received=round(p_cash_received,2),change_due=round(p_cash_received-v_sale.total,2) where id=v_sale.id;
  return jsonb_build_object('sale_id',v_sale.id,'cash_received',round(p_cash_received,2),'change_due',round(p_cash_received-v_sale.total,2));
end $$;

revoke all on function public.record_cash_tender(uuid,numeric) from public;
grant execute on function public.record_cash_tender(uuid,numeric) to authenticated;

comment on column public.sales.cash_received is 'Cash physically tendered by the customer; immutable through the POS after recording.';
comment on column public.sales.change_due is 'Server-calculated cash_received minus sale total.';
