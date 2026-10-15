create table public.product_variants(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id),product_id uuid not null references public.products(id),
 name text not null check(length(trim(name)) between 1 and 80),price numeric(12,2) not null check(price>=0 and price::text<>'NaN'),
 sku text,barcode text,image_url text,independent_stock boolean not null default false,stock numeric(12,3) not null default 0 check(stock>=0),
 recipe_scale numeric(12,3) not null default 1 check(recipe_scale>0 and recipe_scale::text not in('NaN','Infinity')),unit_cost numeric(12,4) check(unit_cost>=0 and unit_cost::text not in('NaN','Infinity')),active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(shop_id,product_id,name)
);
create unique index variant_sku_shop on public.product_variants(shop_id,sku) where sku is not null;
create unique index variant_barcode_shop on public.product_variants(shop_id,barcode) where barcode is not null;
alter table public.product_variants enable row level security;
create policy variant_staff_read on public.product_variants for select to authenticated using(shop_id=public.current_shop_id());
alter table public.sale_items add column variant_id uuid references public.product_variants(id),add column variant_snapshot jsonb;
alter table public.finished_product_batches add column variant_id uuid references public.product_variants(id);
alter table public.customer_selection_items add column variant_id uuid references public.product_variants(id);
create table public.variant_inventory_events(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id),variant_id uuid not null references public.product_variants(id),
 delta numeric not null,reason text not null,performed_by uuid,created_at timestamptz not null default now()
);
alter table public.variant_inventory_events enable row level security;
create policy variant_events_read on public.variant_inventory_events for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());
create table public.commercial_events(id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id),entity_type text not null,entity_id uuid not null,action text not null,details jsonb not null default '{}',performed_by uuid,created_at timestamptz not null default now());
alter table public.commercial_events enable row level security;
create policy commercial_events_read on public.commercial_events for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create function public.save_product_variant(p_product_id uuid,p_id uuid,p_values jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_previous public.product_variants%rowtype;v_shop uuid:=public.current_shop_id();
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
 perform 1 from public.products where id=p_product_id and shop_id=v_shop for update;if not found then raise exception 'Product not found'; end if;
 if nullif(trim(p_values->>'barcode'),'') is not null and exists(select 1 from public.products where shop_id=v_shop and barcode=trim(p_values->>'barcode')) then raise exception 'Barcode already belongs to a product'; end if;
 if p_id is not null then
 select * into v_previous from public.product_variants where id=p_id and shop_id=v_shop and product_id=p_product_id for update;
 if not found then raise exception 'Variant not found'; end if;
 if v_previous.independent_stock is distinct from coalesce((p_values->>'independent_stock')::boolean,false) then raise exception 'Inventory mode is immutable. Disable this variant and create a new one.'; end if;
 end if;
 insert into public.product_variants(id,shop_id,product_id,name,price,sku,barcode,image_url,independent_stock,recipe_scale,unit_cost,active)
 values(coalesce(p_id,gen_random_uuid()),v_shop,p_product_id,trim(p_values->>'name'),(p_values->>'price')::numeric,nullif(trim(p_values->>'sku'),''),nullif(trim(p_values->>'barcode'),''),nullif(p_values->>'image_url',''),coalesce((p_values->>'independent_stock')::boolean,false),coalesce((p_values->>'recipe_scale')::numeric,1),nullif(p_values->>'unit_cost','')::numeric,coalesce((p_values->>'active')::boolean,true))
 on conflict(id) do update set name=excluded.name,price=excluded.price,sku=excluded.sku,barcode=excluded.barcode,image_url=excluded.image_url,recipe_scale=excluded.recipe_scale,unit_cost=excluded.unit_cost,active=excluded.active,updated_at=now() returning id into v_id;
 insert into public.commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(v_shop,'variant',v_id,'saved',jsonb_build_object('before',to_jsonb(v_previous),'after',p_values),auth.uid());
 return v_id;
end $$;

create table public.variant_stock_lots(id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id),product_id uuid not null references products(id),variant_id uuid not null references product_variants(id),batch_code text not null,produced_quantity numeric not null,remaining_quantity numeric not null check(remaining_quantity>=0),unit_cost_snapshot numeric not null default 0,best_before_on date,status text not null default 'active' check(status in('active','depleted','recalled')),created_by uuid,produced_at timestamptz not null default now(),production_batch_id uuid references production_batches(id));
create table public.variant_stock_allocations(id uuid primary key default gen_random_uuid(),shop_id uuid not null references shops(id),lot_id uuid not null references variant_stock_lots(id),sale_item_id uuid not null references sale_items(id),quantity numeric not null,returned numeric not null default 0);
alter table public.variant_stock_lots enable row level security;alter table public.variant_stock_allocations enable row level security;
create policy variant_lots_read on public.variant_stock_lots for select to authenticated using(shop_id=public.current_shop_id());
create policy variant_allocations_read on public.variant_stock_allocations for select to authenticated using(shop_id=public.current_shop_id() and public.is_admin());

create function public.adjust_variant_inventory(p_id uuid,p_delta numeric,p_reason text,p_best_before date default null)
returns void language plpgsql security definer set search_path=public as $$
declare v public.product_variants%rowtype;b public.variant_stock_lots%rowtype;v_left numeric;v_take numeric;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
 perform 1 from products where shop_id=current_shop_id() order by id for update;
 select * into v from public.product_variants where id=p_id and shop_id=public.current_shop_id() for update;
 if not found or not v.independent_stock then raise exception 'Independent-stock variant required'; end if;
 if p_delta is null or p_delta=0 or p_delta::text in('NaN','Infinity','-Infinity') or nullif(trim(p_reason),'') is null or v.stock+p_delta<0 then raise exception 'Invalid stock adjustment'; end if;
 if p_delta>0 then
 insert into public.variant_stock_lots(shop_id,product_id,variant_id,batch_code,produced_quantity,remaining_quantity,unit_cost_snapshot,best_before_on,status,created_by)
 values(v.shop_id,v.product_id,v.id,'VAR-'||gen_random_uuid()::text,p_delta,p_delta,coalesce(v.unit_cost,(select cost_price*v.recipe_scale from products where id=v.product_id),0),p_best_before,'active',auth.uid());
 else
 v_left:=-p_delta;
 for b in select * from public.variant_stock_lots where variant_id=v.id and status='active' and remaining_quantity>0 order by best_before_on nulls last,produced_at,id for update loop
 v_take:=least(v_left,b.remaining_quantity);update public.variant_stock_lots set remaining_quantity=remaining_quantity-v_take,status=case when remaining_quantity-v_take=0 then 'depleted' else status end where id=b.id;v_left:=v_left-v_take;exit when v_left=0;
 end loop;
 if v_left>0 then raise exception 'Variant batch ledger does not cover adjustment'; end if;
 end if;
 update public.product_variants set stock=stock+p_delta,updated_at=now() where id=v.id;
 insert into public.variant_inventory_events(shop_id,variant_id,delta,reason,performed_by) values(v.shop_id,v.id,p_delta,p_reason,auth.uid());
end $$;
create function public.sku_effective_price(p_product_id uuid,p_variant_id uuid default null)
returns numeric language plpgsql stable security definer set search_path=public as $$
declare p public.products%rowtype;v public.product_variants%rowtype;v_base numeric;
begin
 select * into p from products where id=p_product_id;
 if p_variant_id is not null then select * into v from product_variants where id=p_variant_id and product_id=p.id and shop_id=p.shop_id;v_base:=v.price;else v_base:=p.price;end if;
 if now()>=p.promotion_starts_at and now()<p.promotion_ends_at then return round(case when p.promotion_kind='percent' then v_base*(1-p.promotion_value/100) when p.promotion_kind='fixed' then least(v_base,p.promotion_value) else v_base end,2);end if;
 return v_base;
end $$;
revoke all on function public.save_product_variant(uuid,uuid,jsonb),public.adjust_variant_inventory(uuid,numeric,text,date),public.sku_effective_price(uuid,uuid) from public;
grant execute on function public.save_product_variant(uuid,uuid,jsonb),public.adjust_variant_inventory(uuid,numeric,text,date) to authenticated;

create function public.check_master_variant_barcode() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.barcode is not null and exists(select 1 from product_variants where shop_id=new.shop_id and barcode=new.barcode) then raise exception 'Barcode already belongs to a variant';end if;return new;end $$;
create trigger master_variant_barcode_check before insert or update of barcode on products for each row execute function check_master_variant_barcode();

create function public.get_variant_stock_lots(p_variant uuid) returns jsonb language plpgsql security definer stable set search_path=public as $$begin
 if auth.uid() is null or not is_admin() then raise exception 'Administrator access required';end if;
 return(select coalesce(jsonb_agg(to_jsonb(l) order by best_before_on nulls last,produced_at),'[]') from variant_stock_lots l where variant_id=p_variant and shop_id=current_shop_id());end $$;
create function public.manage_variant_lot(p_lot uuid,p_action text,p_quantity numeric,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare l variant_stock_lots%rowtype;delta numeric:=0;
begin
 if auth.uid() is null or not is_admin() or nullif(trim(p_reason),'') is null then raise exception 'Administrator and reason required';end if;
 select * into l from variant_stock_lots where id=p_lot and shop_id=current_shop_id();if not found then raise exception 'Lot not found';end if;
 perform 1 from products where shop_id=current_shop_id() order by id for update;perform 1 from product_variants where id=l.variant_id for update;
 select * into l from variant_stock_lots where id=p_lot for update;
 if p_action='recall' then
 if l.status<>'active' then raise exception 'Only active lots can be recalled';end if;delta:=-l.remaining_quantity;update variant_stock_lots set status='recalled' where id=l.id;
 elsif p_action='dispose' then
 if p_quantity is null or p_quantity<=0 or p_quantity>l.remaining_quantity or p_quantity::text in('NaN','Infinity') then raise exception 'Invalid disposal quantity';end if;
 if l.status='active' then delta:=-p_quantity;end if;update variant_stock_lots set remaining_quantity=remaining_quantity-p_quantity,status=case when remaining_quantity-p_quantity=0 then 'depleted' else status end where id=l.id;
 else raise exception 'Invalid lot action';end if;
 update product_variants set stock=stock+delta where id=l.variant_id;
 insert into variant_inventory_events(shop_id,variant_id,delta,reason,performed_by) values(l.shop_id,l.variant_id,delta,p_action||': '||p_reason,auth.uid());
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(l.shop_id,'variant_lot',l.id,p_action,jsonb_build_object('quantity',case when p_action='recall' then l.remaining_quantity else p_quantity end,'reason',p_reason),auth.uid());end $$;
create function public.propagate_variant_source_recall() returns trigger language plpgsql security definer set search_path=public as $$
declare r record;
begin
 if new.status='recalled' and old.status<>'recalled' and new.production_batch_id is not null then
 for r in select variant_id,sum(remaining_quantity) qty from variant_stock_lots where production_batch_id=new.production_batch_id and shop_id=new.shop_id and status='active' group by variant_id order by variant_id loop
 perform 1 from product_variants where id=r.variant_id for update;
 update variant_stock_lots set status='recalled' where production_batch_id=new.production_batch_id and variant_id=r.variant_id and status='active';
 update product_variants set stock=stock-r.qty where id=r.variant_id;
 insert into variant_inventory_events(shop_id,variant_id,delta,reason,performed_by) values(new.shop_id,r.variant_id,-r.qty,'Source finished batch recalled '||new.batch_code,auth.uid());
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(new.shop_id,'variant',r.variant_id,'source_recalled',jsonb_build_object('finished_batch',new.id,'quantity',r.qty),auth.uid());end loop;end if;return new;end $$;
create trigger variant_source_recall after update on finished_product_batches for each row execute function propagate_variant_source_recall();
revoke all on function public.get_variant_stock_lots(uuid),public.manage_variant_lot(uuid,text,numeric,text) from public;
grant execute on function public.get_variant_stock_lots(uuid),public.manage_variant_lot(uuid,text,numeric,text) to authenticated;
