-- New customer metadata on the existing master records.
alter table public.products add column catalogue_tags text[] not null default '{}',
 add column catalogue_allergens text[] not null default '{}',add column catalogue_dietary text[] not null default '{}',
 add column catalogue_notes text;
alter table public.customer_display_configs add column detail_idle_seconds integer not null default 60 check(detail_idle_seconds between 10 and 900),
 add column slide_seconds integer not null default 10 check(slide_seconds between 3 and 120);
create function public.save_catalogue_metadata(p_product_id uuid,p_tags text[],p_allergens text[],p_dietary text[],p_notes text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
 if cardinality(p_tags)>30 or cardinality(p_allergens)>30 or cardinality(p_dietary)>30 or length(p_notes)>2000 then raise exception 'Metadata is too long'; end if;
 update public.products set catalogue_tags=coalesce(p_tags,'{}'),catalogue_allergens=coalesce(p_allergens,'{}'),catalogue_dietary=coalesce(p_dietary,'{}'),catalogue_notes=nullif(trim(p_notes),''),updated_at=now() where id=p_product_id and shop_id=public.current_shop_id();
 if not found then raise exception 'Product not found'; end if;
end $$;
create function public.save_catalogue_display_options(p_idle integer,p_slide integer) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
 update public.customer_display_configs set detail_idle_seconds=p_idle,slide_seconds=p_slide where shop_id=public.current_shop_id();
end $$;
revoke all on function public.save_catalogue_metadata(uuid,text[],text[],text[],text) from public;
revoke all on function public.save_catalogue_display_options(integer,integer) from public;
grant execute on function public.save_catalogue_metadata(uuid,text[],text[],text[],text) to authenticated;
grant execute on function public.save_catalogue_display_options(integer,integer) to authenticated;
