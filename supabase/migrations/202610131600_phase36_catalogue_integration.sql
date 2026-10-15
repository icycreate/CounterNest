create or replace function public.get_catalogue_admin()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
  return jsonb_build_object(
    'settings',(select jsonb_build_object(
      'catalogue_title',coalesce(c.catalogue_title,'Catalogue'),'catalogue_subtitle',c.catalogue_subtitle,'pdf_footer',c.pdf_footer,
      'access_token',c.access_token,'enabled',c.enabled,'target_labels',c.target_labels
    ) from public.customer_display_configs c where c.shop_id=v_shop),
    'products',(select coalesce(jsonb_agg(to_jsonb(x) order by x.category_sort_order,x.catalogue_sort_order,x.name),'[]'::jsonb) from(
      select p.id,p.name,p.barcode,public.catalogue_effective_price(p) price,p.price regular_price,p.stock,p.active,coalesce(p.catalogue_media->0->>'url',p.image_url) image_url,p.icon_emoji,
        coalesce(c.name,'Other') category_name,coalesce(c.sort_order,0) category_sort_order,
        p.catalogue_description,p.catalogue_visible,p.catalogue_featured,p.catalogue_sold_out,p.catalogue_sort_order,
        p.catalogue_seasonal_label,p.catalogue_new_badge,p.catalogue_tags,p.catalogue_allergens,p.catalogue_dietary,p.catalogue_notes,p.catalogue_media,p.catalogue_label_url,p.promotion_kind,p.promotion_value,p.promotion_starts_at,p.promotion_ends_at,p.promotion_featured,
        (select coalesce(jsonb_agg(o.label order by o.sort_order,o.label),'[]'::jsonb) from public.catalogue_product_options o where o.product_id=p.id and o.shop_id=v_shop and o.active) option_labels
      from public.products p left join public.categories c on c.id=p.category_id where p.shop_id=v_shop
    )x)
  );
end $$;



create or replace function public.get_customer_display_catalog(p_token text)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_cfg public.customer_display_configs%rowtype;v_shop public.shops%rowtype;
begin
  select * into v_cfg from public.customer_display_configs where access_token=p_token and enabled;
  if v_cfg.id is null then raise exception 'Customer display is unavailable or the access link is invalid'; end if;
  select * into v_shop from public.shops where id=v_cfg.shop_id;
  return jsonb_build_object(
    'shop_name',v_shop.name,'logo_url',v_shop.logo_url,'currency',coalesce(v_shop.currency,'USD'),
    'catalogue_title',coalesce(v_cfg.catalogue_title,'Catalogue'),'catalogue_subtitle',v_cfg.catalogue_subtitle,
    'targets',to_jsonb(v_cfg.target_labels),
    'products',(select coalesce(jsonb_agg(to_jsonb(x) order by x.category_sort_order,x.catalogue_sort_order,x.name),'[]'::jsonb) from(
      select p.id,p.name,public.catalogue_effective_price(p) price,p.price regular_price,p.catalogue_media,p.catalogue_label_url,p.promotion_ends_at,p.promotion_featured,coalesce(p.catalogue_media->0->>'url',p.image_url) image_url,p.icon_emoji,coalesce(c.name,'Other') category_name,coalesce(c.sort_order,0) category_sort_order,
        p.catalogue_tags tags,p.catalogue_allergens allergens,p.catalogue_dietary dietary,p.catalogue_notes notes,p.catalogue_description description,p.catalogue_featured featured,p.catalogue_seasonal_label seasonal_label,p.catalogue_new_badge new_badge,p.catalogue_sort_order,
        (p.stock>0 and not p.catalogue_sold_out) available,
        (select coalesce(jsonb_agg(o.label order by o.sort_order,o.label),'[]'::jsonb) from public.catalogue_product_options o where o.product_id=p.id and o.active) option_labels
      from public.products p left join public.categories c on c.id=p.category_id
      where p.shop_id=v_cfg.shop_id and p.active and p.catalogue_visible
    )x)
  );
end $$;



create function public.commercial_staff_catalogue_payload(p_shop uuid)
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_cfg public.customer_display_configs%rowtype;v_shop public.shops%rowtype;
begin
  select * into v_cfg from public.customer_display_configs where shop_id=p_shop;
  select * into v_shop from public.shops where id=p_shop;
  return jsonb_build_object(
    'shop_name',v_shop.name,'logo_url',v_shop.logo_url,'currency',coalesce(v_shop.currency,'USD'),
    'catalogue_title',coalesce(v_cfg.catalogue_title,'Catalogue'),'catalogue_subtitle',v_cfg.catalogue_subtitle,
    'targets',to_jsonb(coalesce(v_cfg.target_labels,array['Main POS'])),
    'products',(select coalesce(jsonb_agg(to_jsonb(x) order by x.category_sort_order,x.catalogue_sort_order,x.name),'[]'::jsonb) from(
      select p.id,p.name,public.catalogue_effective_price(p) price,p.price regular_price,p.catalogue_media,p.catalogue_label_url,p.promotion_ends_at,p.promotion_featured,coalesce(p.catalogue_media->0->>'url',p.image_url) image_url,p.icon_emoji,coalesce(c.name,'Other') category_name,coalesce(c.sort_order,0) category_sort_order,
        p.catalogue_tags tags,p.catalogue_allergens allergens,p.catalogue_dietary dietary,p.catalogue_notes notes,p.catalogue_description description,p.catalogue_featured featured,p.catalogue_seasonal_label seasonal_label,p.catalogue_new_badge new_badge,p.catalogue_sort_order,
        (p.stock>0 and not p.catalogue_sold_out) available,
        (select coalesce(jsonb_agg(o.label order by o.sort_order,o.label),'[]'::jsonb) from public.catalogue_product_options o where o.product_id=p.id and o.active) option_labels
      from public.products p left join public.categories c on c.id=p.category_id
      where p.shop_id=p_shop and p.active
    )x)
  );
end $$;




revoke all on function public.commercial_staff_catalogue_payload(uuid) from public;
create function public.get_commercial_catalogue(p_token text default null) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid;v_token text;payload jsonb;row jsonb;enriched jsonb:='[]';
begin
 if p_token is null then
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 v_shop:=current_shop_id();select access_token into v_token from customer_display_configs where shop_id=v_shop;
 else v_token:=p_token;select shop_id into v_shop from customer_display_configs where access_token=p_token and enabled;end if;
 if v_shop is null then raise exception 'Catalogue unavailable';end if;
 payload:=case when p_token is null then commercial_staff_catalogue_payload(v_shop) else get_customer_display_catalog(v_token) end;
 for row in select value from jsonb_array_elements(payload->'products') loop
 enriched:=enriched||jsonb_build_array(row||jsonb_build_object('category_id',(select category_id from products where id=(row->>'id')::uuid),'variants',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'price',sku_effective_price(v.product_id,v.id),'regular_price',v.price,'sku',v.sku,'barcode',v.barcode,'image_url',v.image_url,'independent_stock',v.independent_stock,'available',not (select catalogue_sold_out from products where id=v.product_id) and case when v.independent_stock then v.stock>0 and exists(select 1 from variant_stock_lots where variant_id=v.id and status='active' and remaining_quantity>0 and(best_before_on is null or best_before_on>=current_date)) else(row->>'available')::boolean end) order by v.name),'[]') from product_variants v where v.product_id=(row->>'id')::uuid and v.shop_id=v_shop and v.active)));
 end loop;
 return payload||jsonb_build_object('products',enriched,'combos',(select coalesce(jsonb_agg(to_jsonb(c) - 'shop_id' - 'created_at' - 'updated_at'),'[]') from catalogue_combos c where shop_id=v_shop and active and(starts_at is null or starts_at<=now()) and(ends_at is null or ends_at>now())),'display_options',(select jsonb_build_object('idle_seconds',detail_idle_seconds,'slide_seconds',slide_seconds) from customer_display_configs where shop_id=v_shop));
end $$;
create function public.get_commercial_admin() returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 return jsonb_build_object('products',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'price',price)),'[]') from products where shop_id=current_shop_id()),'variants',(select coalesce(jsonb_agg(to_jsonb(v)),'[]') from product_variants v where shop_id=current_shop_id()),'combos',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from catalogue_combos c where shop_id=current_shop_id()),'categories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name)),'[]') from categories where shop_id=current_shop_id()),'events',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from(select * from commercial_events where shop_id=current_shop_id() order by created_at desc limit 100)e));
end $$;

create or replace function public.submit_customer_selection(p_token text,p_target_station_label text,p_items jsonb,p_customer_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare cfg customer_display_configs%rowtype;normalized jsonb;line jsonb;stockrow record;request uuid;number bigint;friendly text;total numeric;
begin
 select * into cfg from customer_display_configs where access_token=p_token and enabled for update;
 if not found then raise exception 'Catalogue link unavailable';end if;
 if not p_target_station_label=any(cfg.target_labels) then raise exception 'Invalid target station';end if;
 if (select count(*) from customer_selection_requests where display_config_id=cfg.id and status='pending')>=50 then raise exception 'Queue full';end if;
 normalized:=normalize_commercial_items(cfg.shop_id,p_items,true,false);
 for stockrow in select (x->>'product_id')::uuid product_id,case when (x->>'__independent')::boolean then (x->>'variant_id')::uuid else null end variant_id,sum((x->>'qty')::numeric) qty from jsonb_array_elements(normalized)x group by 1,2 loop
 if stockrow.variant_id is null then if (select stock from products where id=stockrow.product_id)<stockrow.qty then raise exception 'Product stock unavailable';end if;
 elsif (select stock from product_variants where id=stockrow.variant_id)<stockrow.qty then raise exception 'Variant stock unavailable';end if;end loop;
 select sum((x->>'__line_total')::numeric) into total from jsonb_array_elements(normalized)x;
 insert into customer_selection_requests(shop_id,display_config_id,target_station_label,customer_note,total_snapshot) values(cfg.shop_id,cfg.id,p_target_station_label,left(p_customer_note,180),total) returning id,request_number,public_order_number into request,number,friendly;
 for line in select value from jsonb_array_elements(normalized) loop
 insert into customer_selection_items(request_id,shop_id,product_id,product_name_snapshot,unit_price_snapshot,quantity,option_label_snapshot,variant_id,combo_id,commercial_snapshot)
 values(request,cfg.shop_id,(line->>'product_id')::uuid,line->>'__name',(line->>'__unit_price')::numeric,(line->>'qty')::numeric,line->>'option_label',nullif(line->>'variant_id','')::uuid,nullif(line->>'combo_id','')::uuid,line);
 end loop;
 return jsonb_build_object('request_id',request,'request_number',number,'order_number',friendly,'total',total,'target_station_label',p_target_station_label);
end $$;
create or replace function public.claim_customer_selection(p_request_id uuid,p_station_label text) returns jsonb language plpgsql security definer set search_path=public as $$
declare r customer_selection_requests%rowtype;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 select * into r from customer_selection_requests where id=p_request_id and shop_id=current_shop_id() for update;
 if not found or r.loaded_by is not null or r.status not in('pending','preparing','ready') or lower(r.target_station_label)<>lower(trim(p_station_label)) then raise exception 'Selection unavailable at this station';end if;
 update customer_selection_requests set status=case when status='pending' then 'loaded' else status end,loaded_at=now(),loaded_by=auth.uid() where id=r.id;
 return jsonb_build_object('request_id',r.id,'order_number',r.public_order_number,'request_number',r.request_number,'items',(select coalesce(jsonb_agg(coalesce(commercial_snapshot,jsonb_build_object('product_id',product_id,'option_label',option_label_snapshot,'qty',quantity,'__unit_price',unit_price_snapshot,'__name',product_name_snapshot))),'[]') from customer_selection_items where request_id=r.id));
end $$;
-- Overrides old permissive transitions through the audited kitchen workflow.
create or replace function public.update_customer_selection_status(p_request_id uuid,p_station_label text,p_status text) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from customer_selection_requests where id=p_request_id and shop_id=current_shop_id() and lower(target_station_label)=lower(trim(p_station_label))) then raise exception 'Station mismatch';end if;
 perform set_preparation_order_status(p_request_id,p_status);return jsonb_build_object('id',p_request_id,'status',p_status);
end $$;
create function public.get_commercial_selection_queue(p_station text) returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',public_order_number,'status',status,'created_at',created_at,'note',customer_note) order by created_at),'[]') from customer_selection_requests where shop_id=current_shop_id() and lower(target_station_label)=lower(trim(p_station)) and loaded_by is null and status in('pending','preparing','ready'));
end $$;
revoke all on function public.get_commercial_catalogue(text),public.get_commercial_admin(),public.get_commercial_selection_queue(text) from public;
grant execute on function public.get_commercial_catalogue(text) to anon,authenticated;
grant execute on function public.get_commercial_admin(),public.get_commercial_selection_queue(text) to authenticated;

create function public.reprice_commercial_cart(p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb;n jsonb;result jsonb:='[]';qty numeric;price numeric;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 for item in select value from jsonb_array_elements(p_items) loop
 n:=normalize_commercial_items(current_shop_id(),jsonb_build_array(item),false,false);qty:=(item->>'qty')::numeric;select sum((x->>'__line_total')::numeric)/qty into price from jsonb_array_elements(n)x;
 result:=result||jsonb_build_array(jsonb_build_object('price',round(price,2)));end loop;return result;
end $$;
revoke all on function public.reprice_commercial_cart(jsonb) from public;grant execute on function public.reprice_commercial_cart(jsonb) to authenticated;
create or replace function public.get_customer_ready_board(p_token text) returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_shop uuid;
begin
 select shop_id into v_shop from customer_display_configs where access_token=p_token and enabled;if v_shop is null then raise exception 'Display unavailable';end if;
 return jsonb_build_object('shop_name',(select name from shops where id=v_shop),'orders',(select coalesce(jsonb_agg(to_jsonb(x) order by x.ready_at),'[]') from(
 select public_order_number number,status,ready_at from customer_selection_requests where shop_id=v_shop and status in('preparing','ready')
 union all select 'P-'||order_number::text,status,case when status='ready' then updated_at else null end ready_at from scheduled_customer_orders where shop_id=v_shop and status in('preparing','ready')
 )x));end $$;

create function public.get_customer_commercial_history(p_customer uuid) returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if auth.uid() is null or current_shop_id() is null or not exists(select 1 from customers where id=p_customer and shop_id=current_shop_id()) then raise exception 'Customer not found in this shop';end if;
 return jsonb_build_object('orders',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',order_number,'kind',kind,'pickup',pickup_at,'status',status,'quote',quoted_subtotal,'deposit',deposit_total,'paid',sale_id is not null) order by pickup_at desc),'[]') from scheduled_customer_orders where customer_id=p_customer and shop_id=current_shop_id()),'sales',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from(select id,receipt_number,created_at,total,status from sales where customer_id=p_customer and shop_id=current_shop_id() order by created_at desc limit 100)x));
end $$;
revoke all on function public.get_customer_commercial_history(uuid) from public;
grant execute on function public.get_customer_commercial_history(uuid) to authenticated;

create function public.quote_commercial_sale(p_items jsonb,p_customer uuid default null,p_reward uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare normalized jsonb;items jsonb;subtotal numeric;discount numeric:=0;tax numeric;rate numeric;reward loyalty_rewards%rowtype;free_price numeric;member uuid;
begin
 if auth.uid() is null or current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 normalized:=normalize_commercial_items(current_shop_id(),p_items,exists(select 1 from jsonb_array_elements(p_items)i where coalesce((i->>'catalogue_request')::boolean,false)),false);
 select sum((i->>'__line_total')::numeric) into subtotal from jsonb_array_elements(normalized)i;
 if p_customer is not null and not exists(select 1 from customers where id=p_customer and shop_id=current_shop_id()) then raise exception 'Customer not found';end if;
 if p_reward is not null then
 select id into member from loyalty_memberships where customer_id=p_customer and shop_id=current_shop_id() and active;
 if member is null then raise exception 'A loyalty member is required';end if;
 select * into reward from loyalty_rewards where id=p_reward and shop_id=current_shop_id() and active and(starts_at is null or starts_at<=now()) and(ends_at is null or ends_at>now());if not found then raise exception 'Reward unavailable';end if;
 if reward.reward_type='fixed_discount' then discount:=least(subtotal,reward.reward_value);
 elsif reward.reward_type='percent_discount' then discount:=round(subtotal*least(reward.reward_value,100)/100,2);
 elsif reward.reward_type='free_product' then
 select min((i->>'__unit_price')::numeric) into free_price from jsonb_array_elements(normalized)i where(i->>'product_id')::uuid=reward.product_id;
 if free_price is null then raise exception 'Add the reward product first';end if;discount:=least(subtotal,free_price);end if;end if;
 select tax_rate into rate from shops where id=current_shop_id();tax:=round(greatest(subtotal-discount,0)*rate,2);
 items:=reprice_commercial_cart(p_items);
 return jsonb_build_object('items',items,'subtotal',subtotal,'discount',discount,'tax',tax,'total',greatest(subtotal-discount,0)+tax);
end $$;
revoke all on function public.quote_commercial_sale(jsonb,uuid,uuid) from public;grant execute on function public.quote_commercial_sale(jsonb,uuid,uuid) to authenticated;
