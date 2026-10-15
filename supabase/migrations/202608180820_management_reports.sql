-- ChubbyLu Bakery POS v0.9.0 — management sales, payment, and drawer reports
create or replace function public.get_management_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_admin() then raise exception 'Management access required'; end if;
  if p_from is null or p_to is null or p_to<p_from then raise exception 'Invalid report date range'; end if;
  if p_to-p_from>interval '366 days' then raise exception 'Report range cannot exceed 366 days'; end if;
  return jsonb_build_object(
    'summary',(with filtered as (select * from public.sales where shop_id=v_shop and created_at between p_from and p_to), refunds as (select coalesce(sum(r.total),0) total from public.sale_refunds r where r.shop_id=v_shop and r.created_at between p_from and p_to) select jsonb_build_object('gross_sales',coalesce(sum(s.total),0),'discounts',coalesce(sum(s.discount),0),'tax',coalesce(sum(s.tax),0),'refunds',(select total from refunds),'net_sales',coalesce(sum(s.total),0)-(select total from refunds),'transactions',count(*)) from filtered s),
    'payments',(with refund_by_sale as (select sale_id,sum(total) total from public.sale_refunds where shop_id=v_shop and created_at between p_from and p_to group by sale_id), grouped as (select s.payment_method,count(*) transactions,coalesce(sum(s.total),0) gross,coalesce(sum(r.total),0) refunds,coalesce(sum(s.total),0)-coalesce(sum(r.total),0) net from public.sales s left join refund_by_sale r on r.sale_id=s.id where s.shop_id=v_shop and s.created_at between p_from and p_to group by s.payment_method) select coalesce(jsonb_agg(to_jsonb(grouped) order by payment_method),'[]'::jsonb) from grouped),
    'drawers',(select jsonb_build_object('sessions',count(*),'expected',coalesce(sum(expected_amount),0),'counted',coalesce(sum(counted_amount),0),'variance',coalesce(sum(variance),0)) from public.cash_drawer_sessions where shop_id=v_shop and status='closed' and closed_at between p_from and p_to),
    'recent_drawers',(select coalesce(jsonb_agg(to_jsonb(x) order by x.closed_at desc),'[]'::jsonb) from (select s.id,s.opened_at,s.closed_at,s.expected_amount,s.counted_amount,s.variance,coalesce(op.display_name,'Former staff') opened_by_name,coalesce(cp.display_name,'Former staff') closed_by_name from public.cash_drawer_sessions s left join public.staff_profiles op on op.user_id=s.opened_by and op.shop_id=s.shop_id left join public.staff_profiles cp on cp.user_id=s.closed_by and cp.shop_id=s.shop_id where s.shop_id=v_shop and s.status='closed' and s.closed_at between p_from and p_to order by s.closed_at desc limit 100) x)
  );
end $$;

revoke all on function public.get_management_report(timestamptz,timestamptz) from public;
grant execute on function public.get_management_report(timestamptz,timestamptz) to authenticated;
