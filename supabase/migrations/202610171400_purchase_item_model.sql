-- RC6: one purchasing registry; existing products remain made in-house.
begin;
alter table public.products add column inventory_source text not null default 'made_in_house' check(inventory_source in('made_in_house','purchased_for_resale'));
alter table public.ingredients add column item_type text not null default 'ingredient' check(item_type in('ingredient','packaging','supply','resale'));
alter table public.ingredients add column resale_product_id uuid unique references public.products(id) on delete restrict;
alter table public.ingredients add constraint purchase_item_link check((item_type='resale')=(resale_product_id is not null));
create index on public.ingredients(shop_id,item_type,active);
alter table public.ingredient_supplier_offers add column supplier_sku text not null default '';
alter table public.ingredient_supplier_offers add column package_size text not null default '';
-- Supplier offer versions stay append-only; each alternate keeps its own SKU.
do $$declare d text;begin
 select pg_get_functiondef('public.save_ingredient_supplier_offer(uuid,jsonb)'::regprocedure) into d;
 d:=replace(d,'availability,preferred,created_by)','availability,preferred,created_by,supplier_sku,package_size)');
 d:=replace(d,'false),auth.uid()) returning id','false),auth.uid(),left(coalesce(p_values->>''supplier_sku'',''''),200),left(coalesce(p_values->>''package_size'',''''),200)) returning id');
 execute d;
end$$;

create function public.purchase_item_eligible(p_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from ingredients i left join products p on p.id=i.resale_product_id and p.shop_id=i.shop_id where i.id=p_id and i.shop_id=current_shop_id() and i.active and(i.resale_product_id is null or(p.inventory_source='purchased_for_resale' and p.active)));
$$;

-- Defend the registry and audit classifications even when callers use a table API.
create function public.purchase_item_classification_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare prior jsonb;reason text:=nullif(current_setting('counternest.classification_reason',true),'');
begin
 if new.item_type is distinct from old.item_type or new.resale_product_id is distinct from old.resale_product_id or new.preferred_supplier_id is distinct from old.preferred_supplier_id then
  if not ops_has_permission('ingredient_manage') or new.shop_id<>current_shop_id() then raise exception 'Purchase item management access required';end if;
  if new.preferred_supplier_id is distinct from old.preferred_supplier_id and not ops_has_permission('supplier_manage') then raise exception 'Supplier management access required';end if;
  if new.item_type is distinct from old.item_type and length(coalesce(reason,''))<5 then raise exception 'Classification change reason required';end if;
  if new.resale_product_id is not null and not exists(select 1 from products where id=new.resale_product_id and shop_id=new.shop_id and inventory_source='purchased_for_resale') then raise exception 'Explicit resale product required';end if;
  if new.preferred_supplier_id is not null and not exists(select 1 from suppliers where id=new.preferred_supplier_id and shop_id=new.shop_id and active) then raise exception 'Active supplier not found';end if;
  insert into ingredient_purchasing_audit(shop_id,ingredient_id,action,old_value,new_value,reason,user_id) values(new.shop_id,new.id,'purchase_item_classification',to_jsonb(old),to_jsonb(new),reason,auth.uid());
 end if;return new;
end$$;
create trigger purchase_item_classification before update on ingredients for each row execute function purchase_item_classification_guard();
create function public.product_inventory_source_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare reason text:=nullif(current_setting('counternest.classification_reason',true),'');
begin
 if (tg_op='INSERT' and new.inventory_source<>'made_in_house') or(tg_op='UPDATE' and new.inventory_source is distinct from old.inventory_source) then
  if not is_admin() or not ops_has_permission('ingredient_manage') or new.shop_id<>current_shop_id() or length(coalesce(reason,''))<5 then raise exception 'Administrator and inventory source change reason required';end if;
  if exists(select 1 from product_recipes where product_id=new.id and active) or exists(select 1 from product_variants where product_id=new.id and independent_stock) or exists(select 1 from production_batches where product_id=new.id and status not in('completed','cancelled')) then raise exception 'Resolve active recipes, independent variants and production before changing inventory source';end if;
  if new.inventory_source='made_in_house' and(new.stock<>0 or exists(select 1 from ingredient_purchase_order_items li join ingredient_purchase_orders po on po.id=li.order_id join ingredients i on i.id=li.ingredient_id where i.resale_product_id=new.id and po.status in('ordered','partially_received'))) then raise exception 'Clear resale stock and open purchase orders before reclassification';end if;
  insert into ingredient_purchasing_audit(shop_id,action,old_value,new_value,reason,user_id) values(new.shop_id,'inventory_source_changed',case when tg_op='UPDATE' then jsonb_build_object('product_id',old.id,'inventory_source',old.inventory_source) else null end,jsonb_build_object('product_id',new.id,'inventory_source',new.inventory_source),reason,auth.uid());
 end if;return new;
end$$;
create trigger product_inventory_source before insert or update on products for each row execute function product_inventory_source_guard();

create function public.set_product_inventory_source(p_id uuid,p_source text,p_reason text) returns uuid language plpgsql security definer set search_path=public as $$
declare p products%rowtype;i ingredients%rowtype;v uuid;
begin
 if not is_admin() or not ops_has_permission('ingredient_manage') then raise exception 'Administrator access required';end if;
 if p_source not in('made_in_house','purchased_for_resale') or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Inventory source and change reason required';end if;
 select * into p from products where id=p_id and shop_id=current_shop_id() for update;if not found then raise exception 'Product not found';end if;
 perform set_config('counternest.classification_reason',trim(p_reason),true);
 update products set inventory_source=p_source where id=p_id;
 select * into i from ingredients where resale_product_id=p_id for update;
 if p_source='purchased_for_resale' then
  if i.id is null then
   insert into ingredients(shop_id,name,base_unit,current_quantity,average_unit_cost,item_type,resale_product_id,reorder_level,target_level) values(p.shop_id,p.name||' (Resale)','each',p.stock,coalesce(p.cost_price,0),'resale',p.id,coalesce(p.low_stock_at,0),coalesce(p.low_stock_at,0)) returning id into v;
   if p.stock>0 then insert into ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,reference_type,reference_id,created_by) values(p.shop_id,v,'opening',p.stock,p.cost_price,p.stock,'Existing sellable balance linked; no stock added','resale_link',p.id,auth.uid());end if;
  else update ingredients set active=true,current_quantity=p.stock where id=i.id;v:=i.id;end if;
 else update ingredients set active=false where resale_product_id=p_id;v:=i.id;end if;
 perform set_config('counternest.classification_reason','',true);return v;
end$$;
create function public.set_purchase_item_type(p_id uuid,p_type text,p_supplier uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not ops_has_permission('ingredient_manage') then raise exception 'Purchase item management access required';end if;
 if p_type not in('ingredient','packaging','supply','resale') or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Item type and change reason required';end if;
 perform set_config('counternest.classification_reason',trim(p_reason),true);
 update ingredients set item_type=p_type,preferred_supplier_id=p_supplier where id=p_id and shop_id=current_shop_id();if not found then raise exception 'Purchase item not found';end if;
 perform set_config('counternest.classification_reason','',true);
end$$;

-- Resale stock has one balance. Receiving updates it once; POS changes mirror
-- into the registry and its lot ledger, without invoking recipe consumption.
create function public.sync_resale_inventory() returns trigger language plpgsql security definer set search_path=public as $$
declare i ingredients%rowtype;delta numeric;
begin
 if tg_table_name='ingredients' then
  if new.resale_product_id is not null and(new.current_quantity is distinct from old.current_quantity or new.average_unit_cost is distinct from old.average_unit_cost) then
   update products set stock=new.current_quantity,cost_price=new.average_unit_cost where id=new.resale_product_id and shop_id=new.shop_id and inventory_source='purchased_for_resale' and(stock is distinct from new.current_quantity or cost_price is distinct from new.average_unit_cost);
  end if;
 else
  if new.inventory_source='purchased_for_resale' and new.stock is distinct from old.stock then
   select * into i from ingredients where resale_product_id=new.id and shop_id=new.shop_id for update;
   if i.id is not null and i.current_quantity is distinct from new.stock then
    delta:=new.stock-i.current_quantity;update ingredients set current_quantity=new.stock where id=i.id;
    insert into ingredient_inventory_movements(shop_id,ingredient_id,movement_type,quantity_delta,unit_cost,balance_after,reason,reference_type,reference_id,created_by) values(new.shop_id,i.id,'correction',delta,i.average_unit_cost,new.stock,'Sellable resale stock change','resale_product',new.id,auth.uid());
   end if;
  end if;
 end if;return new;
end$$;
create trigger resale_registry_sync after update of current_quantity,average_unit_cost on ingredients for each row execute function sync_resale_inventory();
create trigger resale_product_sync after update of stock on products for each row execute function sync_resale_inventory();

create function public.purchase_recipe_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='recipe_items' then
  if exists(select 1 from ingredients where id=new.ingredient_id and(item_type='resale' or shop_id<>new.shop_id)) then raise exception 'Resale items cannot be recipe ingredients';end if;
 else
  if exists(select 1 from products where id=new.product_id and inventory_source='purchased_for_resale') then raise exception 'Resale products cannot be produced';end if;
 end if;return new;
end$$;
create trigger resale_recipe_item before insert or update on recipe_items for each row execute function purchase_recipe_guard();
create trigger resale_recipe_header before insert or update on product_recipes for each row execute function purchase_recipe_guard();
create trigger resale_production before insert or update on production_batches for each row execute function purchase_recipe_guard();
create function public.resale_variant_guard() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.independent_stock and exists(select 1 from products where id=new.product_id and inventory_source='purchased_for_resale') then raise exception 'Resale variants use the shared sellable stock balance';end if;return new;end$$;
create trigger resale_variant before insert or update on product_variants for each row execute function resale_variant_guard();
revoke all on function public.resale_variant_guard() from public,anon,authenticated;

-- Existing ingredient/supply ledger and receipt records remain intact.
-- Table-level gates protect every old and new order/need mutation.
create function public.purchase_line_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not purchase_item_eligible(new.ingredient_id) or new.shop_id<>current_shop_id() then raise exception 'Eligible purchase item required';end if;
 return new;
end$$;
create trigger eligible_purchase_order_item before insert or update on ingredient_purchase_order_items for each row execute function purchase_line_guard();
create trigger eligible_purchase_need before insert or update on ingredient_purchase_needs for each row execute function purchase_line_guard();

-- Retire all unchecked finished-product supplier routes; historical rows remain
-- readable/exportable and cancellable. Recreate eligible open orders explicitly.
create or replace function public.create_purchase_order(p_supplier_id uuid,p_expected_date date,p_invoice_reference text,p_note text,p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$begin raise exception 'Use purchase items and approved purchase needs';end$$;
create or replace function public.receive_purchase_order(p_order_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$begin raise exception 'Use verified purchase-item receiving; legacy order preserved for review';end$$;
create or replace function public.receive_stock(p_supplier_id uuid,p_product_id uuid,p_quantity numeric,p_unit_cost numeric,p_invoice_reference text default null,p_note text default null,p_update_product_cost boolean default true) returns jsonb language plpgsql security definer set search_path=public as $$begin raise exception 'Use verified purchase-item order receiving';end$$;
create or replace function public.receive_ingredient_purchase_order(p_order_id uuid,p_invoice_reference text,p_note text,p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$begin raise exception 'Use verified purchase-item receiving';end$$;
create or replace function public.receive_ingredient_stock(p_ingredient_id uuid,p_supplier_id uuid,p_packages numeric,p_quantity_per_package numeric,p_cost_per_package numeric,p_invoice_reference text default null,p_note text default null) returns jsonb language plpgsql security definer set search_path=public as $$begin raise exception 'Create a purchase order and use verified receiving';end$$;

-- Extend the existing card payloads rather than duplicate identification tables.
alter function public.get_ingredient_purchasing(text,integer) rename to get_purchase_registry_base;
revoke all on function public.get_purchase_registry_base(text,integer) from public,anon,authenticated;
create function public.get_ingredient_purchasing(p_search text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare d jsonb;
begin
 d:=get_purchase_registry_base(p_search,p_offset);
 if not ops_has_permission('costs_view') then d:=jsonb_set(d,'{audit}','[]'::jsonb);end if;
 return jsonb_set(d,'{ingredients}',coalesce((select jsonb_agg(x||jsonb_build_object('item_type',i.item_type,'resale_product_id',i.resale_product_id,'name',coalesce(p.name,i.name))) from jsonb_array_elements(d->'ingredients') x join ingredients i on i.id=(x->>'id')::uuid left join products p on p.id=i.resale_product_id where purchase_item_eligible(i.id)),'[]'));
end$$;
alter function public.get_ingredient_package_cards(uuid[]) rename to get_purchase_cards_base;
revoke all on function public.get_purchase_cards_base(uuid[]) from public,anon,authenticated;
create function public.get_ingredient_package_cards(p_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare d jsonb;
begin
 d:=get_purchase_cards_base(p_ids);
 return coalesce((select jsonb_agg(x||jsonb_build_object('item_type',i.item_type,'resale_product_id',i.resale_product_id,'name',coalesce(p.name,i.name))) from jsonb_array_elements(d) x join ingredients i on i.id=(x->>'id')::uuid left join products p on p.id=i.resale_product_id where purchase_item_eligible(i.id)),'[]');
end$$;

-- Eligibility and active status are rechecked at receipt time and on retries.
alter function public.verified_receive_ingredient_order(uuid,uuid,text,text,jsonb) rename to verified_receive_purchase_base;
revoke all on function public.verified_receive_purchase_base(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
create function public.verified_receive_ingredient_order(p_order_id uuid,p_key uuid,p_invoice text,p_note text,p_items jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare li record;line jsonb;
begin
 if not ops_has_permission('purchase_receive') then raise exception 'Receiving access required';end if;
 for line in select value from jsonb_array_elements(p_items) loop
  if coalesce((line->'checks'->>'supplier')::boolean,false) is not true then
   if not ops_has_permission('purchase_override') or length(trim(coalesce(line->>'override_reason','')))<5 then raise exception 'Supplier mismatch requires authorized override and reason';end if;
   -- The existing verifier records the same failed-check override atomically.
   line:=jsonb_set(line,'{checks,condition}','false');
   select jsonb_agg(case when x->>'order_item_id'=line->>'order_item_id' then line else x end) into p_items from jsonb_array_elements(p_items)x;
  end if;
 end loop;
 for li in select i.ingredient_id from ingredient_purchase_order_items i where i.order_id=p_order_id and i.shop_id=current_shop_id() order by i.ingredient_id loop
  perform 1 from ingredients where id=li.ingredient_id for update;
  if not purchase_item_eligible(li.ingredient_id) then raise exception 'Eligible purchase item required';end if;
 end loop;
 return verified_receive_purchase_base(p_order_id,p_key,p_invoice,p_note,p_items);
end$$;

create or replace function public.save_ingredient_purchasing_settings(p_mode text,p_threshold numeric,p_verification boolean) returns void language plpgsql security definer set search_path=public as $$begin
 if not ops_has_permission('purchase_approve') then raise exception 'Purchase approval access required';end if;
 insert into ingredient_purchasing_settings values(current_shop_id(),p_mode,p_threshold,true) on conflict(shop_id) do update set approval_mode=excluded.approval_mode,approval_threshold=excluded.approval_threshold,verification_required=true;
 insert into ingredient_purchasing_audit(shop_id,action,new_value,user_id) values(current_shop_id(),'purchasing_settings',jsonb_build_object('mode',p_mode,'threshold',p_threshold,'verification',true),auth.uid());end$$;
alter table ingredient_purchasing_settings alter column verification_required set default true;
update ingredient_purchasing_settings set verification_required=true;
do $$declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname in('purchase_item_eligible','set_product_inventory_source','set_purchase_item_type','get_ingredient_purchasing','get_ingredient_package_cards','verified_receive_ingredient_order') loop execute format('revoke all on function %s from public,anon',f.sig);execute format('grant execute on function %s to authenticated',f.sig);end loop;end$$;
revoke all on function public.purchase_item_classification_guard(),public.product_inventory_source_guard(),public.sync_resale_inventory(),public.purchase_recipe_guard(),public.purchase_line_guard() from public,anon,authenticated;

create function public.create_purchase_item(p_name text,p_type text,p_unit text) returns uuid language plpgsql security definer set search_path=public as $$
declare v uuid;
begin
 if not ops_has_permission('ingredient_manage') then raise exception 'Purchase item management access required';end if;
 if p_type not in('ingredient','packaging','supply') or p_unit not in('g','ml','each') or length(trim(coalesce(p_name,''))) not between 1 and 200 then raise exception 'Valid purchase item name, type and unit required';end if;
 insert into ingredients(shop_id,name,base_unit,item_type) values(current_shop_id(),trim(p_name),p_unit,p_type) returning id into v;
 insert into ingredient_purchasing_audit(shop_id,ingredient_id,action,new_value,user_id) values(current_shop_id(),v,'purchase_item_created',jsonb_build_object('name',p_name,'item_type',p_type),auth.uid());return v;
end$$;
revoke all on function public.create_purchase_item(text,text,text) from public,anon;grant execute on function public.create_purchase_item(text,text,text) to authenticated;
-- Align legacy internal implementation with the explicit operation grants.
do $$declare d text;begin
 select pg_get_functiondef('public.create_ingredient_purchase_order_before_approval(uuid,date,text,jsonb)'::regprocedure) into d;
 d:=regexp_replace(d,'not \(public[.]is_admin\(\) or public[.]current_workspace_role\(\)=''inventory''\)','not public.ops_has_permission(''purchase_create'')','g');
 execute d;
 select pg_get_functiondef('public.receive_ingredient_purchase_order_before_verification(uuid,text,text,jsonb)'::regprocedure) into d;
 d:=replace(d,'preferred_supplier_id=v_order.supplier_id,','');
 d:=regexp_replace(d,'not \(public[.]is_admin\(\) or public[.]current_workspace_role\(\)=''inventory''\)','not public.ops_has_permission(''purchase_receive'')','g');
 execute d;
 select pg_get_functiondef('public.maintain_ingredient_lots_from_movement()'::regprocedure) into d;
 d:=replace(d,'case when new.movement_type in(''production'',''conversion_input'',''substitution'') then','case when new.movement_type in(''production'',''conversion_input'',''substitution'') or new.reference_type=''resale_product'' then');
 execute d;
 select pg_get_functiondef('public.verify_ingredient_package(uuid,text,jsonb,text)'::regprocedure) into d;
 d:=replace(d,'action,new_value,reason,user_id)','action,old_value,new_value,reason,user_id)');
 d:=replace(d,'''barcode_or_checklist_override'',jsonb_build_object','''barcode_or_checklist_override'',to_jsonb(i),jsonb_build_object');
 execute d;
end$$;

-- Match the protected service-only workspace restore contract. Restoring a
-- snapshot must not replay sales, receiving or classification side effects.
do $$declare f record;d text;begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in('purchase_item_classification_guard','product_inventory_source_guard','sync_resale_inventory','purchase_recipe_guard','purchase_line_guard') loop
  d:=pg_get_functiondef(f.oid);
  d:=regexp_replace(d,'\mbegin\M','begin if coalesce(current_setting(''workspace.lifecycle_mode'',true),'''') in(''restore'',''purge'') then return new;end if;','i');execute d;
 end loop;
end$$;
commit;
