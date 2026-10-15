-- Anonymous browser sessions, no names, IP addresses or search text.
alter table public.customer_selection_items add column featured_snapshot boolean not null default false;
create function public.snapshot_selection_featured() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select p.catalogue_featured or (p.promotion_featured and now()>=p.promotion_starts_at and now()<p.promotion_ends_at)
 into new.featured_snapshot from public.products p where p.id=new.product_id and p.shop_id=new.shop_id;
 new.featured_snapshot:=coalesce(new.featured_snapshot,false);return new;
end $$;
create trigger selection_featured_snapshot before insert on public.customer_selection_items for each row execute function public.snapshot_selection_featured();
create table public.catalogue_view_events(
 shop_id uuid not null references public.shops(id),product_id uuid not null references public.products(id),
 session_id uuid not null,viewed_on date not null default current_date,viewed_at timestamptz not null default now(),
 featured boolean not null,available boolean not null,
 primary key(shop_id,product_id,session_id,viewed_on)
);
create index catalogue_view_period on public.catalogue_view_events(shop_id,viewed_at);
alter table public.catalogue_view_events enable row level security;
create policy catalogue_views_admin on public.catalogue_view_events for select to authenticated
using(shop_id=public.current_shop_id() and public.is_admin());

create function public.record_catalogue_views(p_token text,p_session_id uuid,p_product_ids uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare v_shop uuid;
begin
 select shop_id into v_shop from public.customer_display_configs where access_token=p_token and enabled;
 if v_shop is null then raise exception 'Invalid customer catalogue link'; end if;
 if p_session_id is null or cardinality(p_product_ids)>100 then raise exception 'Invalid view batch'; end if;
 insert into public.catalogue_view_events(shop_id,product_id,session_id,featured,available)
 select v_shop,p.id,p_session_id,p.catalogue_featured or (p.promotion_featured and now()>=p.promotion_starts_at and now()<p.promotion_ends_at),p.stock>0 and not p.catalogue_sold_out
 from public.products p where shop_id=v_shop and active and catalogue_visible and id=any(p_product_ids)
 on conflict do nothing;
end $$;
revoke all on function public.record_catalogue_views(text,uuid,uuid[]) from public;
grant execute on function public.record_catalogue_views(text,uuid,uuid[]) to anon,authenticated;

create function public.get_catalogue_analytics(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '366 days' then raise exception 'Choose a date range of 1–366 days'; end if;
 return jsonb_build_object('products',(
 select coalesce(jsonb_agg(to_jsonb(x) order by x.views desc,x.selected_qty desc),'[]') from (
 select p.id,p.name,coalesce(c.name,'Other') category,p.active,p.catalogue_visible,
 coalesce(v.views,0) views,coalesce(v.featured_views,0) featured_views,coalesce(v.soldout_views,0) soldout_views,
 coalesce(r.requests,0) requests,coalesce(r.selected_qty,0) selected_qty,coalesce(r.converted,0) converted_requests,
 coalesce(r.abandoned_qty,0) abandoned_qty,coalesce(r.sold_qty,0) sold_qty,
 coalesce(r.featured_selected_qty,0) featured_selected_qty,coalesce(r.featured_converted,0) featured_converted_requests,
 case when coalesce(r.requests,0)>0 then round(100.0*r.converted/r.requests,1) else 0 end conversion_percent
 from public.products p left join public.categories c on c.id=p.category_id
 left join lateral(select count(*) views,count(*) filter(where featured) featured_views,count(*) filter(where not available) soldout_views
 from public.catalogue_view_events where shop_id=v_shop and product_id=p.id and viewed_at>=p_from and viewed_at<p_to) v on true
 left join lateral(select count(distinct q.id) requests,sum(i.quantity) selected_qty,
 count(distinct q.id) filter(where q.sale_id is not null and s.status not in('voided','refunded')) converted,
 coalesce(sum(i.quantity) filter(where i.featured_snapshot),0) featured_selected_qty,
 count(distinct q.id) filter(where i.featured_snapshot and q.sale_id is not null and s.status not in('voided','refunded')) featured_converted,
 coalesce(sum(i.quantity) filter(where q.sale_id is not null and s.status not in('voided','refunded')),0) sold_qty,
 coalesce(sum(i.quantity) filter(where q.sale_id is null and (q.status in('dismissed','cancelled') or q.created_at<now()-interval '30 minutes')),0) abandoned_qty
 from public.customer_selection_items i join public.customer_selection_requests q on q.id=i.request_id
 left join public.sales s on s.id=q.sale_id
 where i.product_id=p.id and q.shop_id=v_shop and q.created_at>=p_from and q.created_at<p_to) r on true
 where p.shop_id=v_shop
 )x), 'price_history',(
 select coalesce(jsonb_agg(to_jsonb(x) order by x.changed_at desc),'[]') from (
 select h.*,p.name from public.catalogue_price_history h join public.products p on p.id=h.product_id
 where h.shop_id=v_shop and h.changed_at>=p_from and h.changed_at<p_to order by h.changed_at desc limit 100
 )x));
end $$;
revoke all on function public.get_catalogue_analytics(timestamptz,timestamptz) from public;
grant execute on function public.get_catalogue_analytics(timestamptz,timestamptz) to authenticated;
