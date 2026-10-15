-- CounterNest POS Phase 30.1: make product-image authorization independent
-- of staff_profiles RLS while retaining strict shop-folder isolation.

create or replace function public.can_manage_shop_storage(p_shop_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_profiles sp
    where sp.user_id = auth.uid()
      and sp.active
      and sp.role = 'admin'
      and sp.shop_id::text = p_shop_folder
  );
$$;

revoke all on function public.can_manage_shop_storage(text) from public;
grant execute on function public.can_manage_shop_storage(text) to authenticated;

drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;

create policy "product images admin insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and public.can_manage_shop_storage((storage.foldername(name))[1])
);

create policy "product images admin update"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and public.can_manage_shop_storage((storage.foldername(name))[1])
)
with check (
  bucket_id = 'product-images'
  and public.can_manage_shop_storage((storage.foldername(name))[1])
);

create policy "product images admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and public.can_manage_shop_storage((storage.foldername(name))[1])
);

comment on function public.can_manage_shop_storage(text) is
  'Returns true only when the signed-in user is an active administrator of the shop folder supplied by a Storage policy.';
