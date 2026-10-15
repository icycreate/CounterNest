-- CounterNest POS v1.39.0 / Phase 35.6
-- Dedicated catalogue management foundation and customer-ready export metadata.

alter table public.products
  add column if not exists catalogue_description text,
  add column if not exists catalogue_visible boolean not null default true,
  add column if not exists catalogue_featured boolean not null default false,
  add column if not exists catalogue_sold_out boolean not null default false,
  add column if not exists catalogue_sort_order integer not null default 0;

alter table public.customer_display_configs
  add column if not exists catalogue_title text not null default 'Catalogue',
  add column if not exists catalogue_subtitle text,
  add column if not exists pdf_footer text;

create index if not exists products_catalogue_order_idx
  on public.products(shop_id,catalogue_visible,catalogue_sort_order,name);

create or replace function public.get_catalogue_admin()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return jsonb_build_object(
    'settings',(select jsonb_build_object(
      'catalogue_title',coalesce(c.catalogue_title,'Catalogue'),
      'catalogue_subtitle',c.catalogue_subtitle,
      'pdf_footer',c.pdf_footer,
      'access_token',c.access_token,
      'enabled',c.enabled,
      'target_labels',c.target_labels
    ) from public.customer_display_configs c where c.shop_id=v_shop),
    'products',(select coalesce(jsonb_agg(to_jsonb(x) order by x.catalogue_sort_order,x.category_name,x.name),'[]'::jsonb) from(
      select p.id,p.name,p.barcode,p.price,p.stock,p.active,p.image_url,p.icon_emoji,
        coalesce(c.name,'Other') category_name,
        coalesce(c.sort_order,0) category_sort_order,
        p.catalogue_description,p.catalogue_visible,p.catalogue_featured,p.catalogue_sold_out,p.catalogue_sort_order
      from public.products p left join public.categories c on c.id=p.category_id
      where p.shop_id=v_shop
    )x)
  );
end $$;

create or replace function public.save_catalogue_settings(p_title text,p_subtitle text,p_pdf_footer text)
returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  insert into public.customer_display_configs(shop_id,created_by)
  values(v_shop,auth.uid()) on conflict(shop_id) do nothing;
  update public.customer_display_configs
  set catalogue_title=coalesce(nullif(left(trim(coalesce(p_title,'')),80),''),'Catalogue'),
      catalogue_subtitle=nullif(left(trim(coalesce(p_subtitle,'')),180),''),
      pdf_footer=nullif(left(trim(coalesce(p_pdf_footer,'')),240),''),
      updated_at=now()
  where shop_id=v_shop;
end $$;

create or replace function public.save_catalogue_product(
  p_product_id uuid,
  p_description text,
  p_visible boolean,
  p_featured boolean,
  p_sold_out boolean,
  p_sort_order integer
) returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists(select 1 from public.products where id=p_product_id and shop_id=v_shop) then raise exception 'Product not found'; end if;
  update public.products set
    catalogue_description=nullif(left(trim(coalesce(p_description,'')),600),''),
    catalogue_visible=coalesce(p_visible,true),
    catalogue_featured=coalesce(p_featured,false),
    catalogue_sold_out=coalesce(p_sold_out,false),
    catalogue_sort_order=greatest(-9999,least(9999,coalesce(p_sort_order,0))),
    updated_at=now()
  where id=p_product_id and shop_id=v_shop;
end $$;

revoke all on function public.get_catalogue_admin() from public;
revoke all on function public.save_catalogue_settings(text,text,text) from public;
revoke all on function public.save_catalogue_product(uuid,text,boolean,boolean,boolean,integer) from public;
grant execute on function public.get_catalogue_admin() to authenticated;
grant execute on function public.save_catalogue_settings(text,text,text) to authenticated;
grant execute on function public.save_catalogue_product(uuid,text,boolean,boolean,boolean,integer) to authenticated;

comment on column public.products.catalogue_visible is 'Phase 35.6 customer-catalogue visibility; Products remains the master product record.';
comment on column public.products.catalogue_sold_out is 'Manual customer-facing sold-out override; stock still remains authoritative for checkout.';
