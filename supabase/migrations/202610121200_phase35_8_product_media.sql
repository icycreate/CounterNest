-- Phase 35.8: one master product; multiple customer photos and optional label.
alter table public.products add column catalogue_media jsonb not null default '[]',
  add column catalogue_label_url text;
alter table public.products add constraint catalogue_media_array check(jsonb_typeof(catalogue_media)='array' and jsonb_array_length(catalogue_media)<=8);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalogue-media','catalogue-media',true,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy catalogue_media_insert on storage.objects for insert to authenticated
with check(bucket_id='catalogue-media' and public.is_admin() and (storage.foldername(name))[1]=public.current_shop_id()::text);
create policy catalogue_media_delete on storage.objects for delete to authenticated
using(bucket_id='catalogue-media' and public.is_admin() and (storage.foldername(name))[1]=public.current_shop_id()::text);
create policy catalogue_media_read on storage.objects for select to authenticated
using(bucket_id='catalogue-media' and (storage.foldername(name))[1]=public.current_shop_id()::text);

create function public.save_catalogue_media(p_product_id uuid,p_media jsonb,p_label_url text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_image jsonb;v_path text;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists(select 1 from public.products where id=p_product_id and shop_id=v_shop) then raise exception 'Product not found'; end if;
  if p_media is null or jsonb_typeof(p_media)<>'array' or jsonb_array_length(p_media)>8 then raise exception 'Choose up to eight photos'; end if;
  for v_image in select value from jsonb_array_elements(p_media || case when p_label_url is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('url',p_label_url)) end) loop
    v_path:=split_part(v_image->>'url','/storage/v1/object/public/catalogue-media/',2);
    if coalesce(v_path,'') not like v_shop::text||'/'||p_product_id::text||'/%'
      or not exists(select 1 from storage.objects where bucket_id='catalogue-media' and name=v_path)
      or (v_image->>'url') !~ '^https?://' then raise exception 'Invalid catalogue media object'; end if;
  end loop;
  update public.products set catalogue_media=p_media,catalogue_label_url=p_label_url,
    image_url=case when jsonb_array_length(p_media)>0 then p_media->0->>'url'
      when jsonb_array_length(catalogue_media)=0 then image_url else null end,updated_at=now()
    where id=p_product_id and shop_id=v_shop;
end $$;
revoke all on function public.save_catalogue_media(uuid,jsonb,text) from public;
grant execute on function public.save_catalogue_media(uuid,jsonb,text) to authenticated;
