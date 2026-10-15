-- ChubbyLu Bakes POS v5 - account signup + first-time business onboarding
-- Run after the v4 refunds/voids migration.


-- v5 clients must use the completed business-information flow instead of the old
-- automatic default-shop bootstrap.
revoke execute on function public.bootstrap_shop(text,text) from authenticated;

-- New owner accounts no longer receive an automatic ChubbyLu-branded shop.
-- The frontend calls this only after the authenticated owner completes the
-- business-information popup (name, phone, address, optional logo).
create or replace function public.bootstrap_business(
  p_shop_name text,
  p_phone text,
  p_address text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid;
  v_email text := auth.jwt() ->> 'email';
  v_name text := nullif(btrim(p_shop_name), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_address text := nullif(btrim(p_address), '');
  v_display_name text := coalesce(nullif(btrim(p_display_name), ''), nullif(split_part(coalesce(v_email,''), '@', 1), ''), 'Owner');
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if v_name is null then raise exception 'Business name is required'; end if;
  if v_phone is null then raise exception 'Business phone number is required'; end if;
  if v_address is null then raise exception 'Business address is required'; end if;

  -- Safe retry behavior: if the owner already created the shop but a later
  -- step (for example logo upload) failed, reuse/update the same shop.
  select sp.shop_id into v_shop
  from public.staff_profiles sp
  where sp.user_id = auth.uid()
  limit 1;

  if v_shop is not null then
    update public.shops
    set name = v_name,
        phone = v_phone,
        address = v_address,
        email = coalesce(nullif(email,''), v_email),
        updated_at = now()
    where id = v_shop;

    update public.staff_profiles
    set display_name = v_display_name,
        active = true
    where user_id = auth.uid();

    return v_shop;
  end if;

  insert into public.shops(name, phone, address, email, logo_url)
  values (v_name, v_phone, v_address, v_email, null)
  returning id into v_shop;

  insert into public.staff_profiles(user_id, shop_id, display_name, role, active)
  values (auth.uid(), v_shop, v_display_name, 'admin', true);

  insert into public.loyalty_programs(shop_id, name)
  values (v_shop, v_name || ' Rewards');

  insert into public.categories(shop_id, name, sort_order) values
    (v_shop,'Breads',1),
    (v_shop,'Pastries',2),
    (v_shop,'Cakes',3),
    (v_shop,'Cookies',4),
    (v_shop,'Desserts',5),
    (v_shop,'Drinks',6)
  on conflict (shop_id, name) do nothing;

  return v_shop;
end;
$$;

revoke all on function public.bootstrap_business(text,text,text,text) from public;
grant execute on function public.bootstrap_business(text,text,text,text) to authenticated;

comment on function public.bootstrap_business(text,text,text,text) is
'Creates the first shop/admin profile only after an authenticated new owner completes business onboarding. Safe to retry if the shop already exists.';
