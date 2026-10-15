create table public.catalogue_combos(
 id uuid primary key default gen_random_uuid(),shop_id uuid not null references public.shops(id),name text not null,description text,
 price numeric(12,2) not null check(price>=0 and price::text<>'NaN'),image_url text,starts_at timestamptz,ends_at timestamptz,
 seasonal_label text,active boolean not null default true,components jsonb not null check(jsonb_typeof(components)='array' and jsonb_array_length(components) between 1 and 20),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at is null or starts_at is null or ends_at>starts_at)
);
alter table public.catalogue_combos enable row level security;
create policy combo_staff_read on public.catalogue_combos for select to authenticated using(shop_id=public.current_shop_id());
alter table public.sale_items add column combo_id uuid references public.catalogue_combos(id),add column combo_snapshot jsonb;
alter table public.customer_selection_items add column combo_id uuid references public.catalogue_combos(id),add column commercial_snapshot jsonb;
create function public.save_catalogue_combo(p_id uuid,p_values jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_shop uuid:=public.current_shop_id();v_id uuid;c jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required';end if;
 if p_id is not null and not exists(select 1 from catalogue_combos where id=p_id and shop_id=v_shop) then raise exception 'Combo not found';end if;
 for c in select value from jsonb_array_elements(p_values->'components') loop
 if coalesce((c->>'qty')::numeric,0)<=0 or (c->>'qty')::numeric>20 then raise exception 'Invalid component quantity';end if;
 if c->>'category_id' is not null then
 if not exists(select 1 from categories where id=(c->>'category_id')::uuid and shop_id=v_shop and active) then raise exception 'Invalid choice category';end if;
 elsif not exists(select 1 from products where id=(c->>'product_id')::uuid and shop_id=v_shop and active) then raise exception 'Invalid component product';end if;
 if c->>'product_id' is not null and nullif(c->>'variant_id','') is null and exists(select 1 from product_variants where product_id=(c->>'product_id')::uuid and shop_id=v_shop and active) then raise exception 'Choose a fixed component variant';end if;
 if nullif(c->>'variant_id','') is not null and not exists(select 1 from product_variants where id=(c->>'variant_id')::uuid and product_id=(c->>'product_id')::uuid and shop_id=v_shop and active) then raise exception 'Invalid component variant';end if;
 end loop;
 insert into catalogue_combos(id,shop_id,name,description,price,image_url,starts_at,ends_at,seasonal_label,active,components)
 values(coalesce(p_id,gen_random_uuid()),v_shop,trim(p_values->>'name'),p_values->>'description',(p_values->>'price')::numeric,nullif(p_values->>'image_url',''),nullif(p_values->>'starts_at','')::timestamptz,nullif(p_values->>'ends_at','')::timestamptz,p_values->>'seasonal_label',coalesce((p_values->>'active')::boolean,true),p_values->'components')
 on conflict(id) do update set name=excluded.name,description=excluded.description,price=excluded.price,image_url=excluded.image_url,starts_at=excluded.starts_at,ends_at=excluded.ends_at,seasonal_label=excluded.seasonal_label,active=excluded.active,components=excluded.components,updated_at=now() returning id into v_id;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(v_shop,'combo',v_id,'saved',p_values,auth.uid());return v_id;
end $$;
revoke all on function public.save_catalogue_combo(uuid,jsonb) from public;
grant execute on function public.save_catalogue_combo(uuid,jsonb) to authenticated;
