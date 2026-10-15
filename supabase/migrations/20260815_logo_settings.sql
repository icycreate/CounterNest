-- ChubbyLu Bakes POS v2 - business logo upload / resize support
-- Run this only if the v1 initial migration was already applied.

-- Preserve the current ChubbyLu branding for existing v1 shops. Future admins can change or remove it in Settings.
update public.shops
set logo_url='/chubbylu-logo.png', updated_at=now()
where logo_url is null and upper(name)='CHUBBYLU BAKES';

-- Make the business logo available on public loyalty-invitation pages.
drop function if exists public.get_loyalty_invitation(uuid);
create function public.get_loyalty_invitation(p_token uuid)
returns table(shop_name text, logo_url text, customer_name text, email text, status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.loyalty_invitations set status='expired'
    where token=p_token and status='pending' and expires_at <= now();
  return query
    select s.name, s.logo_url, c.name, i.email, i.status, i.expires_at
    from public.loyalty_invitations i
    join public.customers c on c.id=i.customer_id
    join public.shops s on s.id=i.shop_id
    where i.token=p_token
    limit 1;
end;
$$;
grant execute on function public.get_loyalty_invitation(uuid) to anon, authenticated;

-- Public logo bucket; write access is limited to Admins and their own shop folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('shop-logos','shop-logos',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- Drop first so this migration can be safely re-run after a partial setup.
drop policy if exists "shop logos admin insert" on storage.objects;
drop policy if exists "shop logos admin update" on storage.objects;
drop policy if exists "shop logos admin delete" on storage.objects;

create policy "shop logos admin insert"
on storage.objects for insert to authenticated
with check (
  bucket_id='shop-logos'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);

create policy "shop logos admin update"
on storage.objects for update to authenticated
using (
  bucket_id='shop-logos'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_shop_id()::text
)
with check (
  bucket_id='shop-logos'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);

create policy "shop logos admin delete"
on storage.objects for delete to authenticated
using (
  bucket_id='shop-logos'
  and public.is_admin()
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);
