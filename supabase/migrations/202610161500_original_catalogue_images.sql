-- Preserve the uploaded original independently from the catalogue crop.
begin;
alter table public.products add column original_image text,add column cropped_catalogue_image text;
-- Historical originals cannot be reconstructed; use the existing image as a compatible fallback.
update public.products set original_image=coalesce(catalogue_media->0->>'original_image',catalogue_media->0->>'url',image_url),cropped_catalogue_image=coalesce(catalogue_media->0->>'url',image_url);
update storage.buckets set file_size_limit=12582912 where id='catalogue-media';

create or replace function public.save_catalogue_media(p_product_id uuid,p_media jsonb,p_label_url text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_image jsonb;v_path text;v_url text;v_clean jsonb:='[]';
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;
 if not exists(select 1 from products where id=p_product_id and shop_id=v_shop) then raise exception 'Product not found';end if;
 if p_media is null or jsonb_typeof(p_media)<>'array' or jsonb_array_length(p_media)>8 then raise exception 'Choose up to eight photos';end if;
 for v_image in select value from jsonb_array_elements(p_media||case when p_label_url is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('url',p_label_url)) end) loop
  for v_url in select distinct x from unnest(array[v_image->>'url',v_image->>'original_image',v_image->>'cropped_catalogue_image']) as urls(x) where x is not null loop
   v_path:=split_part(v_url,'/storage/v1/object/public/catalogue-media/',2);
   if coalesce(v_path,'') not like v_shop::text||'/'||p_product_id::text||'/%' or v_url !~ '^https?://' or not exists(select 1 from storage.objects where bucket_id='catalogue-media' and name=v_path) then raise exception 'Invalid catalogue media object';end if;
  end loop;
  if coalesce(v_image->>'url','')='' then raise exception 'Invalid catalogue media object';end if;
 end loop;
 -- Explicit public fields only; never reflect arbitrary metadata supplied by an uploader.
 select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('url',value->>'url','original_image',coalesce(value->>'original_image',value->>'url'),'cropped_catalogue_image',coalesce(value->>'cropped_catalogue_image',value->>'url'),'caption',left(value->>'caption',200)))),'[]') into v_clean from jsonb_array_elements(p_media);
 update products set catalogue_media=v_clean,catalogue_label_url=p_label_url,
 image_url=case when jsonb_array_length(v_clean)>0 then v_clean->0->>'url' when jsonb_array_length(catalogue_media)=0 then image_url else null end,
 original_image=case when jsonb_array_length(v_clean)>0 then v_clean->0->>'original_image' when jsonb_array_length(catalogue_media)=0 then original_image else null end,
 cropped_catalogue_image=case when jsonb_array_length(v_clean)>0 then v_clean->0->>'cropped_catalogue_image' when jsonb_array_length(catalogue_media)=0 then cropped_catalogue_image else null end,updated_at=now() where id=p_product_id and shop_id=v_shop;
end $$;
revoke all on function public.save_catalogue_media(uuid,jsonb,text) from public,anon;
grant execute on function public.save_catalogue_media(uuid,jsonb,text) to authenticated;

-- Enrich only product IDs already authorised by the original projection.
create function public.catalogue_image_projection(p_payload jsonb) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_set(p_payload,'{products}',coalesce((select jsonb_agg(item||jsonb_build_object('image_url',coalesce(p.cropped_catalogue_image,item->>'image_url'),'original_image',coalesce(p.original_image,item->>'image_url'),'cropped_catalogue_image',coalesce(p.cropped_catalogue_image,item->>'image_url'))) from jsonb_array_elements(p_payload->'products') item left join products p on p.id=(item->>'id')::uuid),'[]'::jsonb))
$$;
revoke all on function public.catalogue_image_projection(jsonb) from public,anon,authenticated;
alter function public.get_catalogue_admin() rename to get_catalogue_admin_before_original_images;
revoke all on function public.get_catalogue_admin_before_original_images() from public,anon,authenticated;
create function public.get_catalogue_admin() returns jsonb language sql stable security definer set search_path=public as $$select catalogue_image_projection(get_catalogue_admin_before_original_images())$$;
revoke all on function public.get_catalogue_admin() from public,anon;
grant execute on function public.get_catalogue_admin() to authenticated;
alter function public.get_commercial_catalogue(text) rename to get_commercial_catalogue_before_original_images;
revoke all on function public.get_commercial_catalogue_before_original_images(text) from public,anon,authenticated;
create function public.get_commercial_catalogue(p_token text default null) returns jsonb language sql stable security definer set search_path=public as $$select catalogue_image_projection(get_commercial_catalogue_before_original_images(p_token))$$;
revoke all on function public.get_commercial_catalogue(text) from public;
grant execute on function public.get_commercial_catalogue(text) to anon,authenticated;
commit;
