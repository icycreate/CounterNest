-- Phase 23 — detailed daily cash report for open and closed records.
create or replace function public.get_daily_cash_report(p_session_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id(); v_session public.cash_drawer_sessions%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into v_session from public.cash_drawer_sessions where id=p_session_id and shop_id=v_shop;
  if v_session.id is null then raise exception 'Daily cash record not found'; end if;
  return jsonb_build_object(
    'session',jsonb_build_object('id',v_session.id,'status',v_session.status,'opened_at',v_session.opened_at,'closed_at',v_session.closed_at,'opening_note',v_session.opening_note,'closing_note',v_session.closing_note,'counted_amount',v_session.counted_amount,'variance',v_session.variance,'opened_by',(select display_name from public.staff_profiles where user_id=v_session.opened_by and shop_id=v_shop),'closed_by',(select display_name from public.staff_profiles where user_id=v_session.closed_by and shop_id=v_shop)),
    'summary',(select jsonb_build_object(
      'opening_cash',coalesce(sum(amount) filter(where transaction_type='opening_float'),0),
      'cash_sales',coalesce(sum(amount) filter(where transaction_type='cash_sale'),0),
      'cash_refunds',abs(coalesce(sum(amount) filter(where transaction_type='cash_refund'),0)),
      'cash_in',coalesce(sum(amount) filter(where transaction_type='cash_in'),0),
      'cash_out',abs(coalesce(sum(amount) filter(where transaction_type='cash_out'),0)),
      'expected_cash',coalesce(sum(amount),0),
      'transaction_count',count(*)
    ) from public.cash_drawer_transactions where session_id=v_session.id),
    'transactions',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from (select t.id,t.created_at,t.transaction_type,t.amount,t.reason,coalesce(sp.display_name,'System') staff_name,s.receipt_number from public.cash_drawer_transactions t left join public.staff_profiles sp on sp.user_id=t.performed_by and sp.shop_id=t.shop_id left join public.sales s on s.id=t.sale_id where t.session_id=v_session.id order by t.created_at) x)
  );
end $$;
revoke all on function public.get_daily_cash_report(uuid) from public;
grant execute on function public.get_daily_cash_report(uuid) to authenticated;
