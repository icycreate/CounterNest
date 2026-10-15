-- CounterNest POS Phase 30.1: administrator-issued customer points.

create or replace function public.grant_customer_points(
  p_customer_id uuid,
  p_points integer,
  p_note text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_membership uuid;
  v_expires timestamptz;
  v_balance integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_points is null or p_points < 1 or p_points > 100000 then
    raise exception 'Points must be between 1 and 100,000';
  end if;
  if length(trim(coalesce(p_note,''))) < 3 then
    raise exception 'A reason is required';
  end if;

  select m.id into v_membership
  from public.loyalty_memberships m
  where m.shop_id=v_shop and m.customer_id=p_customer_id and m.active
  for update;
  if v_membership is null then raise exception 'Active loyalty membership not found'; end if;

  select case when lp.points_expire and lp.points_expiry_days is not null
    then now()+make_interval(days=>lp.points_expiry_days) else null end
  into v_expires from public.loyalty_programs lp where lp.shop_id=v_shop;

  insert into public.loyalty_point_lots(shop_id,membership_id,points_original,points_remaining,expires_at,note)
  values(v_shop,v_membership,p_points,p_points,v_expires,'Admin adjustment: '||trim(p_note));
  insert into public.loyalty_point_transactions(shop_id,membership_id,delta,transaction_type,note,created_by)
  values(v_shop,v_membership,p_points,'adjust',trim(p_note),auth.uid());

  select coalesce(sum(points_remaining),0)::integer into v_balance
  from public.loyalty_point_lots
  where membership_id=v_membership and points_remaining>0 and (expires_at is null or expires_at>now());
  return v_balance;
end;
$$;

revoke all on function public.grant_customer_points(uuid,integer,text) from public;
grant execute on function public.grant_customer_points(uuid,integer,text) to authenticated;
