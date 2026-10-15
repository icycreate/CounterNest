alter table public.products add column promotion_kind text,
 add column promotion_value numeric(12,2),add column promotion_starts_at timestamptz,
 add column promotion_ends_at timestamptz,add column promotion_featured boolean not null default false;
alter table public.products add constraint valid_catalogue_promotion check(
 (promotion_kind is null and not promotion_featured and promotion_value is null and promotion_starts_at is null and promotion_ends_at is null)
 or (promotion_kind is not null and promotion_kind in('fixed','percent') and promotion_value is not null and promotion_starts_at is not null
 and promotion_ends_at is not null and promotion_ends_at>promotion_starts_at and promotion_value>=0
 and (promotion_kind<>'percent' or promotion_value<=100) and (promotion_kind<>'fixed' or promotion_value<=price)));

create function public.catalogue_effective_price(p public.products)
returns numeric language sql stable set search_path=public as $$
 select case when p.promotion_kind is not null and now()>=p.promotion_starts_at and now()<p.promotion_ends_at
 then round(case when p.promotion_kind='fixed' then p.promotion_value else p.price*(1-p.promotion_value/100) end,2) else p.price end
$$;
revoke all on function public.catalogue_effective_price(public.products) from public;
grant execute on function public.catalogue_effective_price(public.products) to authenticated;

create table public.catalogue_price_history(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id),
 product_id uuid not null references public.products(id),changed_by uuid,changed_at timestamptz not null default now(),
 before_values jsonb not null,after_values jsonb not null
);
alter table public.catalogue_price_history enable row level security;
create policy catalogue_price_history_read on public.catalogue_price_history for select to authenticated
using(shop_id=public.current_shop_id() and public.is_admin());
create function public.audit_catalogue_pricing() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if row(old.price,old.promotion_kind,old.promotion_value,old.promotion_starts_at,old.promotion_ends_at,old.promotion_featured)
 is distinct from row(new.price,new.promotion_kind,new.promotion_value,new.promotion_starts_at,new.promotion_ends_at,new.promotion_featured) then
 insert into public.catalogue_price_history(shop_id,product_id,changed_by,before_values,after_values)
 values(new.shop_id,new.id,auth.uid(),jsonb_build_object('price',old.price,'kind',old.promotion_kind,'value',old.promotion_value,'starts_at',old.promotion_starts_at,'ends_at',old.promotion_ends_at,'featured',old.promotion_featured),
 jsonb_build_object('price',new.price,'kind',new.promotion_kind,'value',new.promotion_value,'starts_at',new.promotion_starts_at,'ends_at',new.promotion_ends_at,'featured',new.promotion_featured));
 end if;return new;
end $$;
create trigger catalogue_price_audit after update on public.products for each row execute function public.audit_catalogue_pricing();
create function public.save_catalogue_promotion(p_product_id uuid,p_kind text,p_value numeric,p_starts_at timestamptz,p_ends_at timestamptz,p_featured boolean default false)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
 update public.products set promotion_kind=p_kind,promotion_value=case when p_kind is null then null else p_value end,
 promotion_starts_at=case when p_kind is null then null else p_starts_at end,promotion_ends_at=case when p_kind is null then null else p_ends_at end,
 promotion_featured=case when p_kind is null then false else coalesce(p_featured,false) end,updated_at=now() where id=p_product_id and shop_id=public.current_shop_id();
 if not found then raise exception 'Product not found'; end if;
end $$;
revoke all on function public.save_catalogue_promotion(uuid,text,numeric,timestamptz,timestamptz,boolean) from public;
grant execute on function public.save_catalogue_promotion(uuid,text,numeric,timestamptz,timestamptz,boolean) to authenticated;

create function public.get_pos_catalogue_prices() returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if auth.uid() is null or public.current_shop_id() is null then raise exception 'Staff sign-in required'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'price',public.catalogue_effective_price(p),'regular_price',p.price,
 'name',p.name,'category',coalesce((select c.name from public.categories c where c.id=p.category_id),'Other'),'cost',p.cost_price,'lowAt',p.low_stock_at,'barcode',p.barcode,'iconEmoji',p.icon_emoji,'stock',p.stock,'active',p.active,'image_url',coalesce(p.catalogue_media->0->>'url',p.image_url),'catalogue_visible',p.catalogue_visible,'catalogue_sold_out',p.catalogue_sold_out)), '[]')
 from public.products p where shop_id=public.current_shop_id());
end $$;
revoke all on function public.get_pos_catalogue_prices() from public;
grant execute on function public.get_pos_catalogue_prices() to authenticated;
