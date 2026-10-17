begin;
alter table public.staff_profiles drop constraint staff_profiles_workspace_role_check;
alter table public.staff_profiles add constraint staff_profiles_workspace_role_check check(workspace_role in('cashier','production','inventory','manager','accounting'));
create table public.staff_ops_permissions(user_id uuid primary key references auth.users(id),shop_id uuid not null references shops(id),preset text not null check(preset in('admin','manager','cashier','production','inventory','accounting')),permissions text[] not null,updated_at timestamptz not null default now());
alter table public.staff_ops_permissions enable row level security;
revoke all on public.staff_ops_permissions from public,anon,authenticated;
create function public.ops_permission_keys() returns text[] language sql immutable set search_path=public as $$select array['operations_view','ingredient_manage','supplier_manage','purchase_create','purchase_approve','purchase_receive','purchase_override','production_manage','costs_view','waste_record','recall_manage','import_manage','permission_manage','accounting_view']::text[]$$;
create function public.ops_preset_permissions(p_preset text) returns text[] language sql immutable set search_path=public as $$
 select case p_preset
 when 'admin' then ops_permission_keys()
 when 'manager' then array['operations_view','ingredient_manage','supplier_manage','purchase_create','purchase_approve','purchase_receive','purchase_override','production_manage','costs_view','waste_record','recall_manage']
 when 'inventory' then array['operations_view','purchase_create','purchase_receive','waste_record']
 when 'production' then array['operations_view','production_manage','waste_record','purchase_create']
 when 'accounting' then array['operations_view','costs_view','accounting_view']
 when 'cashier' then array[]::text[] else array[]::text[] end;
$$;
create or replace function public.ops_has_permission(p_permission text) returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((select p_permission=any(coalesce(o.permissions,ops_preset_permissions(case when s.role='admin' then 'admin' else s.workspace_role end))) from staff_profiles s left join staff_ops_permissions o on o.user_id=s.user_id and o.shop_id=s.shop_id where s.user_id=auth.uid() and s.shop_id=current_shop_id() and s.active and not s.must_change_password),false);
$$;
create function public.ops_permission_profile() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if current_shop_id() is null then raise exception 'Staff sign-in required';end if;
 select jsonb_build_object('preset',case when workspace_owner() then 'owner' else coalesce(o.preset,case when s.role='admin' then 'admin' else s.workspace_role end) end,'permissions',coalesce(o.permissions,ops_preset_permissions(case when s.role='admin' then 'admin' else s.workspace_role end)),'owner',workspace_owner()) into result from staff_profiles s left join staff_ops_permissions o on o.user_id=s.user_id and o.shop_id=s.shop_id where s.user_id=auth.uid() and s.shop_id=current_shop_id() and s.active;
 return result;
end $$;
create function public.ops_staff_permissions() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not ops_has_permission('permission_manage') then raise exception 'Permission management access required';end if;
 return jsonb_build_object('keys',ops_permission_keys(),'staff',(select coalesce(jsonb_agg(jsonb_build_object('user_id',s.user_id,'name',s.display_name,'base_role',s.role,'preset',case when w.user_id=s.user_id then 'owner' else coalesce(o.preset,case when s.role='admin' then 'admin' else s.workspace_role end) end,'permissions',coalesce(o.permissions,ops_preset_permissions(case when s.role='admin' then 'admin' else s.workspace_role end)))),'[]') from staff_profiles s left join staff_ops_permissions o on o.user_id=s.user_id and o.shop_id=s.shop_id left join workspace_owners w on w.shop_id=s.shop_id where s.shop_id=current_shop_id() and s.active));
end $$;
create function public.ops_set_staff_permissions(p_user uuid,p_preset text,p_permissions text[],p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare prior jsonb;target staff_profiles%rowtype;rights text[];s uuid:=current_shop_id();
begin
 if not ops_has_permission('permission_manage') then raise exception 'Permission management access required';end if;
 if p_preset not in('admin','manager','cashier','production','inventory','accounting') or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Valid preset and change reason required';end if;
 select * into target from staff_profiles where user_id=p_user and shop_id=s and active for update;
 if not found then raise exception 'Staff member not found';end if;
 if exists(select 1 from workspace_owners where shop_id=s and user_id=p_user) then raise exception 'Owner permissions cannot be changed here';end if;
 if (p_preset='admin' or target.role='admin' or coalesce(p_permissions,'{}') && array['permission_manage','import_manage']) and not workspace_owner() then raise exception 'Workspace owner access required';end if;
 rights:=coalesce(p_permissions,ops_preset_permissions(p_preset));
 if not rights<@ops_permission_keys() or array_position(rights,null) is not null then raise exception 'Unknown permission';end if;
 if not workspace_owner() and exists(select 1 from unnest(rights)k where not ops_has_permission(k)) then raise exception 'Cannot grant a permission you do not hold';end if;
 prior:=jsonb_build_object('role',target.role,'workspace_role',target.workspace_role,'permissions',(select permissions from staff_ops_permissions where user_id=p_user));
 update staff_profiles set role=(case when p_preset='admin' then 'admin' else 'employee' end)::public.staff_role,workspace_role=case when p_preset='admin' then 'cashier' else p_preset end where user_id=p_user;
 insert into staff_ops_permissions(user_id,shop_id,preset,permissions) values(p_user,s,p_preset,rights) on conflict(user_id) do update set preset=excluded.preset,permissions=excluded.permissions,updated_at=now();
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(s,'staff',p_user,'permission_changed',jsonb_build_object('old',prior,'new',jsonb_build_object('preset',p_preset,'permissions',rights),'reason',trim(p_reason)),auth.uid());
end $$;
-- Preserve legacy financial/customer role boundaries for the new operational presets.
create policy ops_supplier_role_scope on suppliers as restrictive for all to authenticated using(current_workspace_role() in('admin','inventory','manager')) with check(current_workspace_role() in('admin','inventory','manager'));
create table public.ops_setup_progress(shop_id uuid primary key references shops(id),completed text[] not null default '{}',updated_at timestamptz not null default now());
alter table public.ops_setup_progress enable row level security;
revoke all on public.ops_setup_progress from public,anon,authenticated;
create function public.ops_setup(p_step text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if not is_admin() then raise exception 'Administrator access required';end if;
 if p_step is not null and p_step not in('profile','currency','products','ingredients','suppliers','staff','register','catalogue') then raise exception 'Invalid setup step';end if;
 insert into ops_setup_progress(shop_id) values(current_shop_id()) on conflict do nothing;
 if p_step is not null then update ops_setup_progress set completed=array(select distinct unnest(completed||array[p_step])),updated_at=now() where shop_id=current_shop_id();end if;
 select jsonb_build_object('completed',p.completed,'currency',b.currency,'tax',b.tax_rate) into result from ops_setup_progress p join shops b on b.id=p.shop_id where p.shop_id=current_shop_id();return result;
end $$;
create function public.ops_save_business_setup(p_currency text,p_tax numeric) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'Administrator access required';end if;
 if p_currency is null or p_tax is null or p_currency !~ '^[A-Z]{3}$' or p_tax<0 or p_tax>1 then raise exception 'Valid currency and tax required';end if;
 update shops set currency=p_currency,tax_rate=p_tax,updated_at=now() where id=current_shop_id();
end $$;
create table public.ops_import_runs(id uuid primary key,shop_id uuid not null references shops(id),kind text not null,row_count integer not null,payload_hash text not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
alter table public.ops_import_runs enable row level security;
revoke all on public.ops_import_runs from public,anon,authenticated;
create function public.ops_validate_import(p_kind text,p_rows jsonb) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb;issues jsonb:='[]';idx integer:=0;n text;x text;val numeric;
begin
 if not ops_has_permission('import_manage') or not is_admin() then raise exception 'Administrator import access required';end if;
 if p_kind not in('products','ingredients','suppliers','customers','opening_inventory') or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Choose one to 500 valid import rows';end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  idx:=idx+1;
  begin
   if jsonb_typeof(r)<>'object' or octet_length(r::text)>10000 then raise exception 'Invalid row';end if;
   n:=trim(r->>'name');if coalesce(length(n),0) not between 1 and 200 then raise exception 'Name is required';end if;
   if (select count(*) from jsonb_array_elements(p_rows) a where lower(trim(a->>'name'))=lower(n))>1 then raise exception 'Duplicate name in import';end if;
   for x in select unnest(array['price','cost','quantity','reorder','target']) loop
    if nullif(r->>x,'') is not null then
     if r->>x !~ '^[0-9]+([.][0-9]{1,6})?$' then raise exception 'Invalid nonnegative numeric value';end if;
     val:=(r->>x)::numeric;if val>100000000 then raise exception 'Numeric value is too large';end if;
    end if;
   end loop;
   if p_kind='products' and nullif(r->>'price','') is null then raise exception 'Selling price is required';end if;
   if p_kind='ingredients' and nullif(r->>'unit','') is null then raise exception 'Base unit is required';end if;
   if p_kind='opening_inventory' and nullif(r->>'quantity','') is null then raise exception 'Quantity is required';end if;
   if p_kind='products' and nullif(trim(r->>'barcode'),'') is not null and (exists(select 1 from products where shop_id=current_shop_id() and barcode=trim(r->>'barcode')) or (select count(*) from jsonb_array_elements(p_rows) a where a->>'barcode'=r->>'barcode')>1) then raise exception 'Barcode already exists';end if;
   if p_kind='products' and exists(select 1 from products where shop_id=current_shop_id() and lower(name)=lower(n)) then raise exception 'Product already exists';end if;
   if p_kind='ingredients' then
    if coalesce(nullif(r->>'unit',''),'g') not in('g','ml','each') then raise exception 'Base unit must be g, ml, or each';end if;
    if coalesce(nullif(r->>'target','')::numeric,0)<coalesce(nullif(r->>'reorder','')::numeric,0) then raise exception 'Target must meet reorder level';end if;
    if exists(select 1 from ingredients where shop_id=current_shop_id() and lower(name)=lower(n)) then raise exception 'Ingredient already exists';end if;
   end if;
   if p_kind='suppliers' and exists(select 1 from suppliers where shop_id=current_shop_id() and lower(name)=lower(n)) then raise exception 'Supplier already exists';end if;
   if p_kind='customers' and exists(select 1 from customers where shop_id=current_shop_id() and lower(name)=lower(n)) then raise exception 'Customer already exists';end if;
   if p_kind in('suppliers','customers') then
    if nullif(trim(r->>'phone'),'') is not null then perform normalize_international_phone(r->>'phone');end if;
    if nullif(trim(r->>'email'),'') is not null and r->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Valid email required';end if;
   end if;
   if p_kind='opening_inventory' and not exists(select 1 from ingredients where shop_id=current_shop_id() and lower(name)=lower(n) and active) then raise exception 'Active ingredient not found';end if;
  exception when others then issues:=issues||jsonb_build_array(jsonb_build_object('row',idx,'message',sqlerrm));end;
 end loop;
 return jsonb_build_object('valid',jsonb_array_length(issues)=0,'count',idx,'errors',issues);
end $$;
create function public.ops_apply_import(p_key uuid,p_kind text,p_rows jsonb,p_reason text) returns jsonb language plpgsql security definer set search_path=public as $$
declare validation jsonb;prior ops_import_runs%rowtype;r jsonb;id uuid;s uuid:=current_shop_id();fingerprint text:=md5(p_rows::text);delta numeric;
begin
 if not ops_has_permission('import_manage') or not is_admin() then raise exception 'Administrator import access required';end if;
 if length(trim(coalesce(p_reason,'')))<5 or p_key is null then raise exception 'Import reason and key required';end if;
 perform pg_advisory_xact_lock(hashtextextended(s::text,0));
 select * into prior from ops_import_runs where ops_import_runs.id=p_key;
 if found then if prior.shop_id<>s or prior.kind<>p_kind or prior.payload_hash<>fingerprint then raise exception 'Import key already used with different details';end if;return jsonb_build_object('count',prior.row_count,'replayed',true);end if;
 validation:=ops_validate_import(p_kind,p_rows);
 if not (validation->>'valid')::boolean then raise exception 'Correct all invalid import rows before importing';end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  if p_kind='products' then
   insert into products(shop_id,name,barcode,price,cost_price,stock,low_stock_at,active) values(s,trim(r->>'name'),nullif(trim(r->>'barcode'),''),coalesce(nullif(r->>'price','')::numeric,0),coalesce(nullif(r->>'cost','')::numeric,0),0,coalesce(nullif(r->>'reorder','')::numeric,0),true) returning products.id into id;
   if coalesce(nullif(r->>'quantity','')::numeric,0)>0 then perform adjust_stock(id,(r->>'quantity')::numeric,'Opening stock import: '||trim(p_reason));end if;
  elsif p_kind='ingredients' then
   id:=upsert_ingredient(null,trim(r->>'name'),nullif(trim(r->>'sku'),''),coalesce(nullif(r->>'unit',''),'g'),coalesce(nullif(r->>'quantity','')::numeric,0),coalesce(nullif(r->>'reorder','')::numeric,0),coalesce(nullif(r->>'target','')::numeric,0),coalesce(nullif(r->>'cost','')::numeric,0),null,0,true);
  elsif p_kind='suppliers' then
   insert into suppliers(shop_id,name,contact_name,phone,email) values(s,trim(r->>'name'),nullif(trim(r->>'contact_name'),''),nullif(trim(r->>'phone'),''),nullif(trim(r->>'email'),''));
  elsif p_kind='customers' then
   insert into customers(shop_id,name,phone,email,notes) values(s,trim(r->>'name'),nullif(trim(r->>'phone'),''),nullif(trim(r->>'email'),''),nullif(trim(r->>'notes'),''));
  else
   select ingredients.id,coalesce(nullif(r->>'quantity','')::numeric,0)-current_quantity into id,delta from ingredients where shop_id=s and lower(name)=lower(trim(r->>'name')) and active for update;
   if delta<>0 then perform adjust_ingredient_stock(id,delta,'Opening inventory import: '||trim(p_reason));end if;
  end if;
 end loop;
 insert into ops_import_runs(id,shop_id,kind,row_count,payload_hash,created_by) values(p_key,s,p_kind,jsonb_array_length(p_rows),fingerprint,auth.uid());
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(s,'workspace',s,'import_completed',jsonb_build_object('kind',p_kind,'count',jsonb_array_length(p_rows),'reason',trim(p_reason)),auth.uid());
 return jsonb_build_object('count',jsonb_array_length(p_rows),'replayed',false);
end $$;
-- Read-only accounting projection; no customer identities or payment mutations.
create function public.ops_accounting_summary(p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not ops_has_permission('accounting_view') then raise exception 'Accounting access required';end if;
 if p_to<p_from or p_to-p_from>366 then raise exception 'Choose a date range up to one year';end if;
 return jsonb_build_object('sales',(select coalesce(sum(total-refunded_total),0) from sales where shop_id=current_shop_id() and created_at::date between p_from and p_to),'expenses',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'date',expense_date,'category',category,'description',description,'amount',amount)),'[]') from (select e.id,e.expense_date,e.description,e.amount,c.name category from expenses e join expense_categories c on c.id=e.category_id where e.shop_id=current_shop_id() and e.expense_date between p_from and p_to order by e.expense_date desc limit 200)x));
end $$;
-- Safe old/new audit fields for sensitive master-data changes, including direct writes.
create function public.ops_audit_master_change() returns trigger language plpgsql security definer set search_path=public as $$
declare before_row jsonb:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;after_row jsonb:=case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;keys text[];before_safe jsonb;after_safe jsonb;row_id uuid;shop uuid;
begin
 keys:=case tg_table_name when 'products' then array['name','price','cost_price','active'] when 'ingredients' then array['name','base_unit','average_unit_cost','preferred_supplier_id','reorder_level','target_level','active'] when 'suppliers' then array['name','contact_name','phone','email','active'] when 'product_recipes' then array['batch_yield','labor_cost','overhead_cost','packaging_cost_per_unit','target_margin_percent','active','version'] when 'recipe_items' then array['recipe_id','ingredient_id','quantity_required'] else array['role','workspace_role','active'] end;
 select coalesce(jsonb_object_agg(key,value),'{}') into before_safe from jsonb_each(before_row) where key=any(keys);
 select coalesce(jsonb_object_agg(key,value),'{}') into after_safe from jsonb_each(after_row) where key=any(keys);
 if before_safe is distinct from after_safe and auth.uid() is not null then
  shop:=coalesce(after_row->>'shop_id',before_row->>'shop_id')::uuid;row_id:=coalesce((after_row->>'id')::uuid,(before_row->>'id')::uuid,(after_row->>'user_id')::uuid,(before_row->>'user_id')::uuid);
  if exists(select 1 from shops where id=shop) then insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(shop,tg_table_name,row_id,'master_changed',jsonb_build_object('old',before_safe,'new',after_safe,'reason',nullif(current_setting('counternest.change_reason',true),'')),auth.uid());end if;
 end if;return coalesce(new,old);
end $$;
create trigger ops_product_audit after insert or update or delete on products for each row execute function ops_audit_master_change();
create trigger ops_ingredient_audit after insert or update or delete on ingredients for each row execute function ops_audit_master_change();
create trigger ops_supplier_audit after insert or update or delete on suppliers for each row execute function ops_audit_master_change();
create trigger ops_recipe_audit after insert or update or delete on product_recipes for each row execute function ops_audit_master_change();
create trigger ops_recipe_item_audit after insert or update or delete on recipe_items for each row execute function ops_audit_master_change();
create trigger ops_staff_audit after update on staff_profiles for each row execute function ops_audit_master_change();
revoke all on function ops_permission_keys(),ops_preset_permissions(text),ops_has_permission(text),ops_permission_profile(),ops_staff_permissions(),ops_set_staff_permissions(uuid,text,text[],text),ops_setup(text),ops_save_business_setup(text,numeric),ops_validate_import(text,jsonb),ops_apply_import(uuid,text,jsonb,text),ops_accounting_summary(date,date),ops_audit_master_change() from public,anon;
grant execute on function ops_has_permission(text),ops_permission_profile(),ops_staff_permissions(),ops_set_staff_permissions(uuid,text,text[],text),ops_setup(text),ops_save_business_setup(text,numeric),ops_validate_import(text,jsonb),ops_apply_import(uuid,text,jsonb,text),ops_accounting_summary(date,date) to authenticated;

-- Legacy role picker uses the same audited preset update, so no stale customized grant survives.
create or replace function ux_set_staff_role(p_user uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_admin() then raise exception 'Administrator access required';end if;
 if p_role not in('cashier','production','inventory') then raise exception 'Invalid workspace role';end if;
 perform ops_set_staff_permissions(p_user,p_role,null,'Workspace role changed');
end$$;
-- Extend only the retained private ingredient-PO implementations used by the verified wrappers.
do $$declare f record;definition text;begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in('create_ingredient_purchase_order_before_approval','receive_ingredient_purchase_order_before_verification') loop
  definition:=pg_get_functiondef(f.oid);
  definition:=regexp_replace(definition,'not [(]public[.]is_admin[(][)] or public[.]current_workspace_role[(][)]=''inventory''[)]','not public.ops_has_permission(''purchase_receive'')','gi');
  if definition ~* 'create_ingredient_purchase_order_before_approval' then definition:=regexp_replace(definition,'not (public[.])?is_admin[(][)]','not public.ops_has_permission(''purchase_create'')','gi');
  else definition:=regexp_replace(definition,'not (public[.])?is_admin[(][)]','not public.ops_has_permission(''purchase_receive'')','gi');end if;
  execute definition;
 end loop;
end$$;
insert into workspace_backup_tables select c.table_name,array_agg(c.column_name order by c.ordinal_position) from information_schema.columns c where c.table_schema='public' and c.table_name in('ops_setup_progress','ops_import_runs') and c.is_generated='NEVER' and c.column_name!~*'(password|pin_hash|secret|api_key|token|session|credential)' group by c.table_name on conflict(table_name) do update set columns=excluded.columns;

create function public.workspace_pending_state() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('pending_at',r.pending_at,'delete_after',r.delete_after,'business_name',b.name,'is_owner',exists(select 1 from workspace_owners o where o.shop_id=s.shop_id and o.user_id=s.user_id)) from staff_profiles s join shops b on b.id=s.shop_id join workspace_recovery r on r.shop_id=s.shop_id where s.user_id=auth.uid() and s.active and not s.must_change_password and r.pending_at is not null;
$$;
revoke all on function workspace_pending_state() from public,anon;grant execute on function workspace_pending_state() to authenticated;
alter function public.workspace_health() rename to workspace_health_before_operations;
revoke all on function workspace_health_before_operations() from public,anon,authenticated;
create function public.workspace_health() returns jsonb language sql stable security definer set search_path=public as $$select workspace_health_before_operations()||jsonb_build_object('migration','202610171300_operations_import_permissions.sql','app_version','2.0.0-rc.5','frontend_build','2026-10-17-operations1')$$;
revoke all on function workspace_health() from public,anon;grant execute on function workspace_health() to authenticated;
-- Enrich bounded global search only with entities this caller may actually view.
alter function public.ux_search(text) rename to ux_search_before_operations;
revoke all on function ux_search_before_operations(text) from public,anon,authenticated;
create function public.ux_search(p_query text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;additional jsonb;query text:=trim(p_query);s uuid:=current_shop_id();r text:=current_workspace_role();
begin
 result:=ux_search_before_operations(p_query);
 if s is null or length(coalesce(query,''))<2 then return result;end if;
 query:='%'||replace(replace(replace(query,'\','\\'),'%','\%'),'_','\_')||'%';
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into additional from(
  (select id::text,name label,'ingredient' kind,case when r in('admin','inventory','manager') then 'purchasing' else 'dashboard' end page from ingredients where shop_id=s and active and ops_has_permission('operations_view') and(name ilike query or sku ilike query) order by name limit 6)
  union all(select id::text,'Ingredient PO #'||order_number,'ingredient_order','purchasing' from ingredient_purchase_orders where shop_id=s and(ops_has_permission('purchase_receive') or ops_has_permission('purchase_approve')) and order_number::text ilike query order by ordered_at desc limit 4)
  union all(select id::text,name,'supplier','purchasing' from suppliers where shop_id=s and(ops_has_permission('supplier_manage') or ops_has_permission('purchase_receive')) and name ilike query order by name limit 4)
  union all(select pr.id::text,p.name,'recipe',case when r='admin' then 'recipes' else 'dashboard' end from product_recipes pr join products p on p.id=pr.product_id where pr.shop_id=s and(ops_has_permission('production_manage') or ops_has_permission('costs_view')) and p.name ilike query order by p.name limit 4)
 )x;
 select coalesce(jsonb_agg(item),'[]') into result from(select distinct on(item->>'kind',item->>'id') case when r in('manager','accounting') and item->>'page' not in('dashboard','purchasing','supply') then jsonb_set(item,'{page}','"dashboard"') else item end item from jsonb_array_elements(result||additional)item limit 40)x;
 return result;
end $$;
revoke all on function ux_search(text) from public,anon;grant execute on function ux_search(text) to authenticated;
alter function public.ux_record(text,uuid) rename to ux_record_before_operations;
revoke all on function ux_record_before_operations(text,uuid) from public,anon,authenticated;
create function public.ux_record(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if p_kind='purchase_order' and exists(select 1 from ingredient_purchase_orders where id=p_id and shop_id=current_shop_id()) then p_kind:='ingredient_order';end if;
 if p_kind='purchase_need' then
  if not(ops_has_permission('purchase_approve') or ops_has_permission('purchase_create')) then raise exception 'Purchasing access required';end if;
  select jsonb_build_object('kind',p_kind,'id',n.id,'label',i.name,'details',jsonb_build_object('status',n.status,'quantity',n.quantity,'ingredient',i.name)) into result from ingredient_purchase_needs n join ingredients i on i.id=n.ingredient_id where n.id=p_id and n.shop_id=current_shop_id();
  if result is null then raise exception 'Record not found';end if;return result;
 end if;
 if p_kind='expiry' and exists(select 1 from ingredient_lots where id=p_id and shop_id=current_shop_id()) then
  if not ops_has_permission('operations_view') then raise exception 'Operations access required';end if;
  select jsonb_build_object('kind',p_kind,'id',l.id,'label',i.name,'details',jsonb_build_object('lot',l.lot_code,'expiry',l.expires_on,'remaining',l.remaining_quantity,'ingredient',i.name)) into result from ingredient_lots l join ingredients i on i.id=l.ingredient_id where l.id=p_id and l.shop_id=current_shop_id();return result;
 end if;
 if p_kind='waste' then
  if not ops_has_permission('costs_view') then raise exception 'Cost access required';end if;
  if p_id<>current_shop_id() then raise exception 'Record not found';end if;
  return jsonb_build_object('kind',p_kind,'id',p_id,'label','Waste Today','details',jsonb_build_object('events',(select count(*) from inventory_waste_events where shop_id=current_shop_id() and recorded_at::date=current_date),'cost',(select coalesce(sum(total_cost),0) from inventory_waste_events where shop_id=current_shop_id() and recorded_at::date=current_date)));
 end if;
 if p_kind in('ingredient','ingredient_order') then
  if not ops_has_permission('operations_view') then raise exception 'Operations access required';end if;
  if p_kind='ingredient' then select jsonb_build_object('kind',p_kind,'id',id,'label',name,'details',jsonb_build_object('name',name,'unit',base_unit,'on_hand',current_quantity,'reserved',ingredient_reserved_quantity(id))) into result from ingredients where id=p_id and shop_id=current_shop_id();
  else if not(ops_has_permission('purchase_receive') or ops_has_permission('purchase_approve')) then raise exception 'Purchasing access required';end if;select jsonb_build_object('kind',p_kind,'id',id,'label','Ingredient PO #'||order_number,'details',jsonb_build_object('status',status,'expected_date',expected_date)) into result from ingredient_purchase_orders where id=p_id and shop_id=current_shop_id();end if;
  if result is null then raise exception 'Record not found';end if;return result;
 end if;
 return ux_record_before_operations(p_kind,p_id);
end $$;
revoke all on function ux_record(text,uuid) from public,anon;grant execute on function ux_record(text,uuid) to authenticated;

-- Restoring a signed-in owner's verified archive replays snapshots, not live business transactions.
-- Skip only known business side effects; all FK, CHECK, UNIQUE and tenant validation remains active.
do $$declare f record;definition text;begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in('record_cash_sale_in_drawer','record_cash_refund_in_drawer','snapshot_sale_item_cost','maintain_ingredient_lots_from_movement','create_finished_batch_from_production','create_finished_batch_from_new_product','maintain_finished_batches_from_adjustment','allocate_finished_batches_to_sale_item','return_finished_batches_from_refund','return_variant_lots','snapshot_selection_featured','assign_customer_order_number','propagate_variant_source_recall','transfer_completed_variant_batch','sync_catalogue_request_order','audit_catalogue_pricing','production_reservation_changed','production_waste_snapshot','ops_audit_master_change','normalize_phone_write') loop
  definition:=pg_get_functiondef(f.oid);
  definition:=regexp_replace(definition,'\mbegin\M','begin if coalesce(current_setting(''workspace.lifecycle_mode'',true),'''') in(''restore'',''purge'') then if TG_OP=''DELETE'' then return old;else return new;end if;end if;','i');execute definition;
 end loop;
 select pg_get_functiondef('workspace_restore(uuid,jsonb,text)'::regprocedure) into definition;
 definition:=regexp_replace(definition,'\mbegin\M','begin perform set_config(''workspace.lifecycle_mode'',''restore'',true);','i');execute definition;
end$$;

-- Pending deletion closes customer catalogue access and cannot race a business write.
alter function get_commercial_catalogue(text) rename to get_commercial_catalogue_before_workspace_freeze;
revoke all on function get_commercial_catalogue_before_workspace_freeze(text) from public,anon,authenticated;
create function get_commercial_catalogue(p_token text default null) returns jsonb language plpgsql stable security definer set search_path=public as $$begin
 if p_token is not null and exists(select 1 from customer_display_configs c join workspace_recovery r on r.shop_id=c.shop_id where c.access_token=p_token and r.pending_at is not null) then raise exception 'Catalogue unavailable';end if;
 return get_commercial_catalogue_before_workspace_freeze(p_token);
end$$;
revoke all on function get_commercial_catalogue(text) from public;grant execute on function get_commercial_catalogue(text) to anon,authenticated;
do $$declare definition text;begin
 select pg_get_functiondef('workspace_pending_write_guard()'::regprocedure) into definition;
 definition:=replace(definition,'if coalesce(current_setting','perform pg_advisory_xact_lock_shared(hashtextextended(''workspace:''||s::text,0));if coalesce(current_setting');execute definition;
end$$;
alter function workspace_set_deletion(uuid,uuid,text,text,boolean,boolean) rename to workspace_set_deletion_before_snapshot;
revoke all on function workspace_set_deletion_before_snapshot(uuid,uuid,text,text,boolean,boolean) from public,anon,authenticated;
create function workspace_set_deletion(p_actor uuid,p_backup uuid,p_checksum text,p_name text,p_confirm boolean,p_final boolean,p_snapshot jsonb default null) returns timestamptz language plpgsql security definer set search_path=public as $$
declare s uuid;
begin
 select o.shop_id into s from workspace_owners o join staff_profiles p on p.user_id=o.user_id and p.shop_id=o.shop_id where o.user_id=p_actor and p.active and p.role='admin' and not p.must_change_password;
 if s is null then raise exception 'Workspace owner access required';end if;
 perform pg_advisory_xact_lock(hashtextextended('workspace:'||s::text,0));
 if p_snapshot is not null and workspace_export(p_actor)<>p_snapshot then raise exception 'Workspace changed after backup; create a new backup before deletion';end if;
 return workspace_set_deletion_before_snapshot(p_actor,p_backup,p_checksum,p_name,p_confirm,p_final);
end$$;
revoke all on function workspace_set_deletion(uuid,uuid,text,text,boolean,boolean,jsonb) from public,anon,authenticated;
grant execute on function workspace_set_deletion(uuid,uuid,text,text,boolean,boolean,jsonb) to service_role;
-- Legacy staff forms cannot bypass the new protected owner / administrator-grant workflow.
create function public.ops_protect_staff_owner() returns trigger language plpgsql security definer set search_path=public as $$
declare shop uuid;target uuid;
begin
 if coalesce(current_setting('workspace.lifecycle_mode',true),'') in('restore','purge') or auth.uid() is null then if TG_OP='DELETE' then return old;else return new;end if;end if;
 shop:=case when TG_OP='DELETE' then old.shop_id else new.shop_id end;target:=case when TG_OP='DELETE' then old.user_id else new.user_id end;
 if exists(select 1 from workspace_owners where shop_id=shop and user_id=target) then
  if TG_OP='DELETE' then raise exception 'Owner permissions cannot be changed here';end if;
  if TG_OP='UPDATE' and ((new.role,new.active,new.shop_id) is distinct from (old.role,old.active,old.shop_id) or auth.uid()<>target and new is distinct from old) then raise exception 'Owner permissions cannot be changed here';end if;
 end if;
 if TG_OP='INSERT' and new.role='admin' and exists(select 1 from workspace_owners where shop_id=shop) and not workspace_owner() then raise exception 'Create an employee invitation, then ask the owner to grant Admin access';end if;
 if TG_OP='UPDATE' and new.role is distinct from old.role and (new.role='admin' or old.role='admin') and exists(select 1 from workspace_owners where shop_id=shop) and not workspace_owner() then raise exception 'Workspace owner access required';end if;
 if TG_OP='DELETE' then return old;else return new;end if;
end$$;
create trigger ops_staff_owner_protection before insert or update or delete on staff_profiles for each row execute function ops_protect_staff_owner();
revoke all on function ops_protect_staff_owner() from public,anon,authenticated;

commit;
