-- CounterNest POS Phase 30.1: repair shop-scoped product image uploads.
-- Safe to apply to an existing project. Public reading is provided by the
-- public bucket; only active administrators can write inside their shop folder.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=excluded.public,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;

create policy "product images admin insert"
on storage.objects for insert to authenticated
with check (
  bucket_id='product-images'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id=auth.uid()
      and sp.active
      and sp.role='admin'
      and sp.shop_id::text=(storage.foldername(name))[1]
  )
);

create policy "product images admin update"
on storage.objects for update to authenticated
using (
  bucket_id='product-images'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id=auth.uid()
      and sp.active
      and sp.role='admin'
      and sp.shop_id::text=(storage.foldername(name))[1]
  )
)
with check (
  bucket_id='product-images'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id=auth.uid()
      and sp.active
      and sp.role='admin'
      and sp.shop_id::text=(storage.foldername(name))[1]
  )
);

create policy "product images admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id='product-images'
  and exists (
    select 1 from public.staff_profiles sp
    where sp.user_id=auth.uid()
      and sp.active
      and sp.role='admin'
      and sp.shop_id::text=(storage.foldername(name))[1]
  )
);
