-- UX workspace projections: base authorization and financial mutations remain unchanged.
begin;
alter table public.staff_profiles add column workspace_role text not null default 'cashier' check(workspace_role in('cashier','production','inventory'));
create function public.current_workspace_role() returns text language sql stable security definer set search_path=public as $$
 select case when role='admin' then 'admin' else workspace_role end from staff_profiles where user_id=auth.uid() and active and not must_change_password and shop_id=current_shop_id();
$$;
create table public.ux_user_preferences(user_id uuid primary key references auth.users(id) on delete cascade,shop_id uuid not null references shops(id),preferences jsonb not null default '{}',updated_at timestamptz not null default now());
create table public.ux_shop_settings(shop_id uuid primary key references shops(id),defaults jsonb not null default '{"admin":"overview","cashier":"sales","production":"production","inventory":"inventory"}',templates jsonb not null default '{}');
alter table public.ux_user_preferences enable row level security;
alter table public.ux_shop_settings enable row level security;
create policy ux_preferences_own on public.ux_user_preferences for select to authenticated using(user_id=auth.uid() and shop_id=current_shop_id());
create policy ux_settings_shop on public.ux_shop_settings for select to authenticated using(shop_id=current_shop_id());
revoke all on public.ux_user_preferences,public.ux_shop_settings from public,anon,authenticated;
grant select on public.ux_user_preferences,public.ux_shop_settings to authenticated;

create function public.ux_set_staff_role(p_user uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'Administrator access required';end if;
 if p_role is null or p_role not in('cashier','production','inventory') then raise exception 'Invalid workspace role';end if;
 update staff_profiles set workspace_role=p_role where user_id=p_user and shop_id=current_shop_id() and role='employee';
 if not found then raise exception 'Employee not found';end if;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),'staff',p_user,'workspace_role',jsonb_build_object('role',p_role),auth.uid());
end $$;
create function public.ux_save_preferences(p_preferences jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb; v_shop uuid:=current_shop_id();k text;
begin
 if v_shop is null then raise exception 'Staff sign-in required';end if;
 if jsonb_typeof(p_preferences) is distinct from 'object' or octet_length(p_preferences::text)>20000 then raise exception 'Invalid preferences';end if;
 for k in select jsonb_object_keys(p_preferences) loop if k not in('language','appearance','pins','recent','read_ids','whats_new','favorites') then raise exception 'Invalid preference';end if;end loop;
 if p_preferences ? 'language' and coalesce(p_preferences->>'language','') not in('en','es','zh-TW','zh-CN') then raise exception 'Invalid language';end if;
 if p_preferences ? 'appearance' and coalesce(p_preferences->>'appearance','') not in('light','dark','system') then raise exception 'Invalid appearance';end if;
 for k in select unnest(array['pins','recent','read_ids','favorites']) loop
  if p_preferences ? k and (jsonb_typeof(p_preferences->k) is distinct from 'array' or jsonb_array_length(p_preferences->k)>300) then raise exception 'Invalid preference list';end if;
  if p_preferences ? k and exists(select 1 from jsonb_array_elements(p_preferences->k)x where jsonb_typeof(x) is distinct from 'string' or length(x#>>'{}')>120) then raise exception 'Invalid preference list entry';end if;
 end loop;
 if p_preferences ? 'whats_new' and (jsonb_typeof(p_preferences->'whats_new') is distinct from 'string' or length(p_preferences->>'whats_new')>100) then raise exception 'Invalid release preference';end if;
 insert into ux_user_preferences(user_id,shop_id,preferences) values(auth.uid(),v_shop,p_preferences) on conflict(user_id) do update set shop_id=excluded.shop_id,preferences=case when ux_user_preferences.shop_id=excluded.shop_id then ux_user_preferences.preferences||excluded.preferences else excluded.preferences end,updated_at=now() returning preferences into v;
 return v;
end $$;
create function public.ux_admin_defaults(p_defaults jsonb) returns void language plpgsql security definer set search_path=public as $$
declare k text;v text;
begin
 if not is_admin() then raise exception 'Administrator access required';end if;
 if jsonb_typeof(p_defaults) is distinct from 'object' or octet_length(p_defaults::text)>2000 then raise exception 'Invalid dashboard defaults';end if;
 for k,v in select * from jsonb_each_text(p_defaults) loop
  if k not in('admin','cashier','production','inventory') or v not in('overview','sales','production','inventory') then raise exception 'Invalid dashboard default';end if;
 end loop;
 insert into ux_shop_settings(shop_id,defaults) values(current_shop_id(),p_defaults) on conflict(shop_id) do update set defaults=ux_shop_settings.defaults||excluded.defaults;
end $$;

-- Search returns explicit fields only, with bounded per-entity and total results.
create function public.ux_search(p_query text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s uuid:=current_shop_id();r text:=current_workspace_role();q text:=trim(p_query);out jsonb;
begin
 if s is null then raise exception 'Staff sign-in required';end if;
 if q is null or length(q)<2 then return '[]';end if;
 if length(q)>100 then raise exception 'Search is too long';end if;
 q:='%'||replace(replace(replace(q,'\','\\'),'%','\%'),'_','\_')||'%';
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into out from (
  (select id::text,name as label,'product' as kind,case when r in('production','inventory') then 'dashboard' else 'products' end as page from products where shop_id=s and active and (name ilike q or sku ilike q) order by name limit 6)
  union all (select id::text,name,'customer','customers' from customers where shop_id=s and r in('admin','cashier') and (name ilike q or phone ilike q or email ilike q) order by name limit 5)
  union all (select id::text,'Receipt #'||receipt_number||coalesce(' · '||customer_name_snapshot,''),'sale','sales' from sales where shop_id=s and r in('admin','cashier') and (receipt_number::text ilike q or customer_name_snapshot ilike q) order by created_at desc limit 4)
  union all (select id::text,'Request #'||request_number||' · '||customer_name,'preorder','scheduled-orders' from catalogue_preorder_requests where shop_id=s and r in('admin','cashier') and (customer_name ilike q or request_number::text ilike q) order by created_at desc limit 4)
  union all (select id::text,case when kind='cake' then 'Cake #' else 'Order #' end||order_number,'order',case when r='production' then 'dashboard' else 'scheduled-orders' end from scheduled_customer_orders where shop_id=s and r in('admin','cashier','production') and order_number::text ilike q order by pickup_at desc limit 4)
  union all (select id::text,name,'supplier',case when r='admin' then 'receiving' else 'dashboard' end from suppliers where shop_id=s and r in('admin','inventory') and name ilike q order by name limit 4)
  union all (select pr.id::text,p.name,'recipe',case when r='admin' then 'recipes' else 'preparation' end from product_recipes pr join products p on p.id=pr.product_id where pr.shop_id=s and r in('admin','production') and p.name ilike q order by p.name limit 4)
  union all (select id::text,'Batch #'||batch_number||' · '||product_name,'batch',case when r='admin' then 'production' else 'dashboard' end from production_batches where shop_id=s and r in('admin','production') and (product_name ilike q or batch_number::text ilike q) order by scheduled_date desc limit 4)
  union all (select id::text,'PO #'||order_number,'purchase_order',case when r='admin' then 'purchasing' else 'dashboard' end from purchase_orders where shop_id=s and r in('admin','inventory') and order_number::text ilike q order by ordered_at desc limit 4)
  union all (select user_id::text,display_name,'staff','staff' from staff_profiles where shop_id=s and r='admin' and display_name ilike q order by display_name limit 4)
  limit 30
 )x;
 return out;
end $$;

create function public.ux_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s uuid:=current_shop_id();r text:=current_workspace_role();prefs jsonb;cfg ux_shop_settings%rowtype;board jsonb:='[]';stock jsonb:='[]';alerts jsonb:='[]';deliveries jsonb:='[]';counts jsonb;
begin
 if s is null then raise exception 'Staff sign-in required';end if;
 select preferences into prefs from ux_user_preferences where user_id=auth.uid() and shop_id=s;
 prefs:=coalesce(prefs,'{}');select * into cfg from ux_shop_settings where shop_id=s;
 if r in('admin','production') then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at),'[]') into board from (
   select b.id,b.product_name as name,b.planned_quantity as quantity,b.batch_number,b.scheduled_order_id as order_id,b.scheduled_date::timestamptz as due_at,
   case when b.status='completed' then 'completed' when b.status='cancelled' then 'completed' when exists(select 1 from production_shortage_alerts a where a.shop_id=s and a.status='open' and (a.entity_id=b.product_id or a.jobs @> jsonb_build_array(jsonb_build_object('batch',b.batch_number)))) then 'blocked' else coalesce(b.ux_stage,'to_prepare') end as status,
   coalesce((select sp.display_name from staff_profiles sp where sp.user_id=b.ux_assignee and sp.shop_id=s),'') as assignee,
   exists(select 1 from production_shortage_alerts a where a.shop_id=s and a.status='open' and (a.entity_id=b.product_id or a.jobs @> jsonb_build_array(jsonb_build_object('batch',b.batch_number)))) as shortage,
   b.status as source_status,b.product_id,b.note,b.ux_stage
   from production_batches b where b.shop_id=s and (b.scheduled_date=current_date or b.status='scheduled' and b.scheduled_date<current_date) order by b.scheduled_date,b.batch_number limit 100
  )x;
 end if;
 if r in('admin','production','inventory') then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into stock from (
   (select id,name,available_quantity as available,required_quantity as required,shortage_quantity as shortage,kind,entity_id,case when r='admin' then 'forecast-shortages' else 'dashboard' end as page,case when kind='ingredient' then coalesce((select base_unit from ingredients where id=a.entity_id and shop_id=s),'each') else 'each' end as unit from production_shortage_alerts a where shop_id=s and status='open' order by shortage_quantity desc limit 50)
   union all
   (select p.id,p.name,p.stock,p.low_stock_at,greatest(p.low_stock_at-p.stock,0),'low_stock',p.id,case when r='admin' then 'inventory' else 'dashboard' end,'each' from products p where p.shop_id=s and p.active and p.stock<=p.low_stock_at and not exists(select 1 from production_shortage_alerts a where a.shop_id=s and a.entity_id=p.id and a.status='open') order by p.low_stock_at-p.stock desc,p.name limit 50)
  )x;
 end if;
 if r in('admin','inventory') then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into deliveries from (
   select po.id,po.order_number,po.expected_date,sp.name as supplier,po.status from purchase_orders po join suppliers sp on sp.id=po.supplier_id and sp.shop_id=s where po.shop_id=s and po.status='ordered' order by po.expected_date nulls last,po.ordered_at limit 50
  )x;
 end if;
 select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('read',coalesce(prefs->'read_ids','[]') ? x.id) order by x.created_at desc),'[]') into alerts from (
  (select 'request:'||id as id,'New pre-order request #'||request_number as title,'info'::text as severity,created_at,'scheduled-orders'::text as page,id::text as record_id from catalogue_preorder_requests where shop_id=s and r in('admin','cashier') and status in('new_request','under_review') order by created_at desc limit 30)
  union all (select 'response:'||e.id,'Customer response · request #'||q.request_number,'info',e.created_at,'scheduled-orders',q.id::text from catalogue_request_events e join catalogue_preorder_requests q on q.id=e.request_id and q.shop_id=s where e.shop_id=s and r in('admin','cashier') and e.action='customer_response' order by e.created_at desc limit 20)
  union all (select 'ready:'||id,'Order #'||order_number||' ready','info',updated_at,case when r='production' then 'dashboard' else 'scheduled-orders' end,id::text from scheduled_customer_orders where shop_id=s and r in('admin','cashier','production') and status='ready' order by updated_at desc limit 30)
  union all (select 'shortage:'||id,name||' · stock shortage',severity,updated_at,case when r='admin' then 'forecast-shortages' else 'dashboard' end,id::text from production_shortage_alerts where shop_id=s and r in('admin','production','inventory') and status='open' order by updated_at desc limit 30)
  union all (select 'expiry:'||id,'Ingredient lot '||lot_code||' · expiry','warning',received_at,case when r='admin' then 'inventory' else 'dashboard' end,id::text from ingredient_lots where shop_id=s and r in('admin','inventory','production') and status='active' and remaining_quantity>0 and expires_on<=current_date+3 order by expires_on limit 30)
  union all (select 'alert:'||id,title,severity,updated_at,'alerts',id::text from operational_alerts where shop_id=s and r='admin' and status='active' order by updated_at desc limit 30)
  union all (select 'low_stock:'||p.id,p.name||' · low stock','warning',p.updated_at,case when r='admin' then 'inventory' else 'dashboard' end,p.id::text from products p where p.shop_id=s and r in('admin','production','inventory') and p.active and p.stock<=p.low_stock_at and not exists(select 1 from production_shortage_alerts a where a.shop_id=s and a.entity_id=p.id and a.status='open') order by p.updated_at desc limit 30)
  union all (select 'blocked:'||id,'Batch #'||batch_number||' · blocked','warning',created_at,case when r='admin' then 'production' else 'dashboard' end,id::text from production_batches where shop_id=s and r in('admin','production') and status='scheduled' and ux_stage='blocked' order by created_at desc limit 30)
  union all (select 'issue:'||id,'Issue #'||incident_number||' · '||title,severity,updated_at,'operations',id::text from operational_incidents where shop_id=s and r='admin' and status<>'resolved' order by updated_at desc limit 30)
  order by created_at desc limit 100
 )x;
 counts:=jsonb_build_object('requests',case when r in('admin','cashier') then (select count(*) from catalogue_preorder_requests where shop_id=s and status='new_request') else 0 end,'production',jsonb_array_length(board),'shortages',jsonb_array_length(stock),'deliveries',jsonb_array_length(deliveries),'sales_today',case when r in('admin','cashier') then (select count(*) from sales where shop_id=s and status<>'voided' and (created_at at time zone (select timezone from shops where id=s))::date=current_business_date()) else 0 end,'register_status',case when r in('admin','cashier') then coalesce((select status from cash_drawer_sessions where shop_id=s and business_date=current_business_date() order by opened_at desc limit 1),'not_opened') else null end);
 if r='admin' then
  counts:=counts||jsonb_build_object('sales_total_today',(select coalesce(sum(total-refunded_total),0) from sales where shop_id=s and status<>'voided' and (created_at at time zone (select timezone from shops where id=s))::date=current_business_date()),'gross_profit_today',get_profitability_report(current_business_date(),current_business_date())#>'{summary,gross_profit}','staff_active',(select count(*) from staff_profiles where shop_id=s and active));
 end if;
 return jsonb_build_object('role',r,'preferences',prefs,'defaults',coalesce(cfg.defaults,'{"admin":"overview","cashier":"sales","production":"production","inventory":"inventory"}'),'templates',coalesce(cfg.templates,'{}'),'counts',counts,'production',board,'stock',stock,'deliveries',deliveries,'notifications',alerts);
end $$;

create function public.ux_record(p_kind text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s uuid:=current_shop_id();r text:=current_workspace_role();data jsonb;label text;
begin
 if s is null then raise exception 'Staff sign-in required';end if;
 case p_kind
 when 'product' then
  select name,jsonb_build_object('name',name,'sku',sku,'price',price,'stock',stock,'active',active) into label,data from products where shop_id=s and id=p_id;
 when 'customer' then
  if r in('admin','cashier') then select name,jsonb_build_object('name',name,'phone',phone,'email',email,'loyalty_status',loyalty_status) into label,data from customers where shop_id=s and id=p_id;end if;
 when 'sale' then
  if r in('admin','cashier') then select 'Receipt #'||receipt_number,jsonb_build_object('receipt_number',receipt_number,'customer',customer_name_snapshot,'created_at',created_at,'total',total,'status',status,'payment_method',payment_method) into label,data from sales where shop_id=s and id=p_id;end if;
 when 'preorder' then
  if r in('admin','cashier') then select 'Request #'||request_number,jsonb_build_object('request_number',request_number,'customer',customer_name,'status',status,'summary',summary,'preferred_method',preferred_method,'customer_note',customer_note,'staff_notes',staff_notes,'created_at',created_at,'scheduled_order_id',scheduled_order_id) into label,data from catalogue_preorder_requests where shop_id=s and id=p_id;end if;
 when 'order' then
  if r in('admin','cashier','production') then select case when kind='cake' then 'Cake #' else 'Order #' end||order_number,jsonb_build_object('order_number',order_number,'kind',kind,'status',status,'pickup_at',pickup_at,'production_deadline',production_deadline,'items',(select coalesce(jsonb_agg(jsonb_build_object('name',i->'name','qty',i->'qty')),'[]') from jsonb_array_elements(items)i)) into label,data from scheduled_customer_orders where shop_id=s and id=p_id;end if;
 when 'supplier' then
  if r in('admin','inventory') then select name,jsonb_build_object('name',name,'contact_name',contact_name,'phone',phone,'email',email,'active',active) into label,data from suppliers where shop_id=s and id=p_id;end if;
 when 'recipe' then
  if r in('admin','production') then select p.name,jsonb_build_object('product',p.name,'batch_yield',pr.batch_yield,'version',pr.version,'ingredients',(select coalesce(jsonb_agg(jsonb_build_object('name',i.name,'quantity',ri.quantity_required,'unit',i.base_unit)),'[]') from recipe_items ri join ingredients i on i.id=ri.ingredient_id and i.shop_id=s where ri.recipe_id=pr.id and ri.shop_id=s)) into label,data from product_recipes pr join products p on p.id=pr.product_id and p.shop_id=s where pr.shop_id=s and pr.id=p_id;end if;
 when 'batch' then
  if r in('admin','production') then select 'Batch #'||batch_number,jsonb_build_object('batch_number',batch_number,'product',product_name,'planned_quantity',planned_quantity,'actual_quantity',actual_quantity,'waste_quantity',waste_quantity,'scheduled_date',scheduled_date,'status',status,'stage',ux_stage,'order_id',scheduled_order_id,'note',note) into label,data from production_batches where shop_id=s and id=p_id;end if;
 when 'purchase_order' then
  if r in('admin','inventory') then select 'PO #'||po.order_number,jsonb_build_object('order_number',po.order_number,'supplier',sp.name,'expected_date',po.expected_date,'status',po.status,'items',(select coalesce(jsonb_agg(jsonb_build_object('name',product_name,'quantity',quantity)),'[]') from purchase_order_items where order_id=po.id and shop_id=s)) into label,data from purchase_orders po join suppliers sp on sp.id=po.supplier_id and sp.shop_id=s where po.shop_id=s and po.id=p_id;end if;
 when 'staff' then
  if r='admin' then select display_name,jsonb_build_object('display_name',display_name,'role',case when role='admin' then 'admin' else workspace_role end,'active',active,'email',email) into label,data from staff_profiles where shop_id=s and user_id=p_id;end if;
 else null;
 end case;
 if data is null then raise exception 'Record unavailable';end if;
 return jsonb_build_object('kind',p_kind,'id',p_id,'label',label,'details',data);
end $$;
revoke all on function public.ux_record(text,uuid) from public,anon;
grant execute on function public.ux_record(text,uuid) to authenticated;

-- Board stage changes never mark stock produced or complete a sale. Completion stays
-- in the existing audited recipe/FEFO workflow, which remains administrator gated.
alter table production_batches add column ux_stage text not null default 'to_prepare' check(ux_stage in('to_prepare','in_progress','blocked','ready')),add column ux_assignee uuid references auth.users(id);
create function public.ux_set_production_stage(p_id uuid,p_expected text,p_stage text) returns void language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_workspace_role(),'') not in('admin','production') then raise exception 'Production access required';end if;
 if p_stage is null or p_stage not in('to_prepare','in_progress','blocked','ready') then raise exception 'Invalid board stage';end if;
 update production_batches set ux_stage=p_stage,ux_assignee=auth.uid() where id=p_id and shop_id=current_shop_id() and status='scheduled' and ux_stage=p_expected;
 if not found then raise exception 'Batch changed or unavailable; refresh';end if;
 insert into commercial_events(shop_id,entity_type,entity_id,action,details,performed_by) values(current_shop_id(),'production',p_id,'board_stage',jsonb_build_object('before',p_expected,'after',p_stage),auth.uid());
end $$;

alter table catalogue_preorder_requests add column status_token uuid not null default gen_random_uuid() unique,add column staff_notes text not null default '',add column customer_response_note text;
-- Capability tokens must never appear in the generic staff inbox or backup UI.
create or replace function public.get_catalogue_preorders() returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 return jsonb_build_object('requests',(select coalesce(jsonb_agg(to_jsonb(r)-'payload'-'status_token' order by r.created_at desc),'[]') from (select * from catalogue_preorder_requests where shop_id=current_shop_id() order by created_at desc limit 300)r),'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at desc),'[]') from (select * from catalogue_request_events where shop_id=current_shop_id() order by created_at desc limit 300)e));
end $$;
alter function public.submit_catalogue_preorder(text,uuid,jsonb,jsonb) rename to submit_catalogue_preorder_before_tracking;
revoke all on function public.submit_catalogue_preorder_before_tracking(text,uuid,jsonb,jsonb) from public,anon,authenticated;
create function public.submit_catalogue_preorder(p_token text,p_key uuid,p_items jsonb,p_customer jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;cap uuid;
begin
 result:=submit_catalogue_preorder_before_tracking(p_token,p_key,p_items,p_customer);
 select r.status_token into cap from catalogue_preorder_requests r join customer_display_configs c on c.id=r.display_config_id where c.access_token=p_token and r.client_key=p_key;
 return result||jsonb_build_object('status_token',cap);
end $$;
create function public.get_catalogue_request_status(p_token uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 select jsonb_build_object('request_number',r.request_number,'status',r.status,'updated_at',r.updated_at,'items',r.summary,'estimated_subtotal',r.estimated_subtotal,'pickup_at',case when r.status in('scheduled','in_production','ready','collected') then o.pickup_at end,'deposit_total',case when r.status in('scheduled','in_production','ready','collected') then o.deposit_total end) into result from catalogue_preorder_requests r left join scheduled_customer_orders o on o.id=r.scheduled_order_id and o.shop_id=r.shop_id where r.status_token=p_token;
 if result is null then raise exception 'Request unavailable';end if;return result;
end $$;
create function public.ux_save_request_notes(p_id uuid,p_notes text) returns void language plpgsql security definer set search_path=public as $$
begin
 if coalesce(current_workspace_role(),'') not in('admin','cashier') then raise exception 'Customer service access required';end if;
 if p_notes is null or length(p_notes)>4000 then raise exception 'Notes are too long';end if;
 update catalogue_preorder_requests set staff_notes=p_notes,updated_at=now() where id=p_id and shop_id=current_shop_id();if not found then raise exception 'Request not found';end if;
 insert into catalogue_request_events(shop_id,request_id,action,details,performed_by) values(current_shop_id(),p_id,'staff_notes_updated','{}',auth.uid());
end $$;
create function public.respond_catalogue_preorder(p_token uuid,p_response text,p_note text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare request catalogue_preorder_requests%rowtype;next_status text;
begin
 select * into request from catalogue_preorder_requests where status_token=p_token for update;
 if not found then raise exception 'Request unavailable';end if;
 if p_response is null or p_response not in('confirm','decline','more_information') or coalesce(length(p_note),0)>1000 then raise exception 'Invalid response';end if;
 if request.status<>'awaiting_confirmation' or request.scheduled_order_id is not null then raise exception 'This request is not awaiting confirmation';end if;
 if p_response in('decline','more_information') and length(trim(coalesce(p_note,'')))<5 then raise exception 'Please add a note of at least 5 characters';end if;
 if (select count(*) from catalogue_request_events where request_id=request.id and action='customer_response' and created_at>now()-interval '10 minutes')>=5 then raise exception 'Response limit reached; please contact the shop';end if;
 next_status:=case p_response when 'confirm' then 'confirmed' when 'decline' then 'declined' else 'under_review' end;
 update catalogue_preorder_requests set status=next_status,customer_response_note=left(p_note,1000),updated_at=now() where id=request.id;
 insert into catalogue_request_events(shop_id,request_id,action,details) values(request.shop_id,request.id,'customer_response',jsonb_build_object('response',p_response,'note',left(p_note,1000),'before',request.status,'after',next_status));
 return get_catalogue_request_status(p_token);
end $$;
revoke all on function public.respond_catalogue_preorder(uuid,text,text) from public;
grant execute on function public.respond_catalogue_preorder(uuid,text,text) to anon,authenticated;
create function public.ux_save_contact_template(p_key text,p_message text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not is_admin() then raise exception 'Administrator access required';end if;
 if p_key is null or p_key not in('confirmation','deposit','ready','decline','more_information') or p_message is null or length(p_message)>2000 then raise exception 'Invalid message template';end if;
 insert into ux_shop_settings(shop_id,templates) values(current_shop_id(),jsonb_build_object(p_key,p_message)) on conflict(shop_id) do update set templates=ux_shop_settings.templates||excluded.templates;
end $$;

-- Explicit grants: no helper or new write path is exposed to the public role.
revoke all on function current_workspace_role(),ux_set_staff_role(uuid,text),ux_save_preferences(jsonb),ux_admin_defaults(jsonb),ux_search(text),ux_workspace(),ux_set_production_stage(uuid,text,text),ux_save_request_notes(uuid,text),ux_save_contact_template(text,text),submit_catalogue_preorder(text,uuid,jsonb,jsonb),get_catalogue_request_status(uuid) from public,anon,authenticated;
grant execute on function current_workspace_role(),ux_set_staff_role(uuid,text),ux_save_preferences(jsonb),ux_admin_defaults(jsonb),ux_search(text),ux_workspace(),ux_set_production_stage(uuid,text,text),ux_save_request_notes(uuid,text),ux_save_contact_template(text,text) to authenticated;
grant execute on function submit_catalogue_preorder(text,uuid,jsonb,jsonb),get_catalogue_request_status(uuid) to anon,authenticated;

-- Restrictive policies combine with every legacy permissive policy: kitchen and
-- receiving accounts cannot retrieve customer PII or financial history directly.
do $$ declare t text; begin
 foreach t in array array['customers','sales','sale_items','catalogue_preorder_requests','catalogue_request_events','scheduled_customer_orders','scheduled_order_deposits','customer_selection_requests','customer_selection_items','loyalty_memberships','loyalty_point_lots','loyalty_point_transactions','loyalty_stamp_transactions','loyalty_invitations','cards','issued_cards'] loop
  execute format('create policy ux_customer_service_scope on public.%I as restrictive for all to authenticated using (current_workspace_role() in (''admin'',''cashier'')) with check (current_workspace_role() in (''admin'',''cashier''))',t);
 end loop;
end $$;
-- Preserve the exact existing validated sale/contact bodies and signatures, adding
-- a deny-only workspace guard to this closed list of customer-service entrypoints.
do $$ declare f record;definition text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['complete_catalogue_sale','complete_pos_checkout','complete_scheduled_order_sale','process_sale_adjustment','claim_customer_selection','get_customer_commercial_history','quote_commercial_sale','set_catalogue_preorder_status','prepare_catalogue_contact','get_sale_receipt','log_receipt_reprint','record_cash_tender','get_scheduled_orders','get_scheduled_deposits','record_scheduled_deposit','enroll_customer','create_loyalty_invitation','get_or_create_card_id','get_commercial_selection_queue']) loop
  definition:=pg_get_functiondef(f.oid);
  if definition !~* '\mbegin\M' then raise exception 'Expected customer service function body';end if;
  definition:=regexp_replace(definition,'\mbegin\M','begin if coalesce(public.current_workspace_role(),'''') not in(''admin'',''cashier'') then raise exception ''Customer service access required'';end if;','i');
  execute definition;
 end loop;
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['get_preparation_orders','set_preparation_order_status','set_scheduled_order_status','update_customer_selection_status']) loop
  definition:=pg_get_functiondef(f.oid);
  definition:=regexp_replace(definition,'\mbegin\M','begin if coalesce(public.current_workspace_role(),'''') not in(''admin'',''cashier'',''production'') then raise exception ''Production access required'';end if;','i');
  execute definition;
 end loop;
end $$;
-- Receiving is the only legacy administrative workflow explicitly extended to the
-- inventory profile. Validation, shop checks, ledger triggers and row locks stay.
do $$ declare f record;definition text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['get_stock_receiving','receive_stock','receive_stock_with_photo','get_purchase_orders','receive_purchase_order']) loop
  definition:=pg_get_functiondef(f.oid);
  if definition !~* 'not (public[.])?is_admin[(][)]' then raise exception 'Expected receiving administrator guard';end if;
  definition:=regexp_replace(definition,'not (public[.])?is_admin[(][)]','not (public.is_admin() or public.current_workspace_role()=''inventory'')','gi');
  execute definition;
 end loop;
end $$;
alter function public.export_business_backup() rename to export_business_backup_before_ux;
revoke all on function public.export_business_backup_before_ux() from public,anon,authenticated;
create function public.export_business_backup() returns jsonb language plpgsql security definer set search_path=public as $$
declare base jsonb;safe_requests jsonb;
begin
 base:=export_business_backup_before_ux();
 select coalesce(jsonb_agg(x-'status_token'),'[]') into safe_requests from jsonb_array_elements(base#>'{customer_request_records,requests}')x;
 base:=jsonb_set(base,'{customer_request_records,requests}',safe_requests);
 return base||jsonb_build_object('ux_records',jsonb_build_object('preferences',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from ux_user_preferences p where shop_id=current_shop_id()),'settings',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from ux_shop_settings s where shop_id=current_shop_id()),'staff_roles',(select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'workspace_role',workspace_role)),'[]') from staff_profiles where shop_id=current_shop_id())));
end $$;
revoke all on function public.export_business_backup() from public,anon;
grant execute on function public.export_business_backup() to authenticated;
commit;
