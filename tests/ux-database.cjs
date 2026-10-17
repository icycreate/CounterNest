const assert=require('assert');
module.exports=async({db,check,scalar,rejects})=>{
 await db.exec('reset role');
 // Exercise RLS under ordinary API grants as well as the stricter migration ACL.
 await db.exec('grant select,update on public.customers,public.staff_profiles to authenticated');
 const id=()=>scalar('select gen_random_uuid()');
 const admin=await id(),cashier=await id(),production=await id(),inventory=await id(),outsider=await id(),shop=await id(),other=await id();
 for(const [user,name] of [[admin,'UX Admin'],[cashier,'UX Cashier'],[production,'UX Kitchen'],[inventory,'UX Receiving'],[outsider,'UX Foreign']])await db.query('insert into auth.users(id,email) values($1,$2)',[user,user+'@ux.test']);
 await db.query("insert into shops(id,name,tax_rate) values($1,'UX Bakery',0),($2,'Foreign UX Bakery',0)",[shop,other]);
 for(const [user,name,role,workspace] of [[admin,'UX Admin','admin','cashier'],[cashier,'UX Cashier','employee','cashier'],[production,'UX Kitchen','employee','production'],[inventory,'UX Receiving','employee','inventory'],[outsider,'UX Foreign','employee','cashier']])await db.query('insert into staff_profiles(user_id,shop_id,display_name,role,workspace_role) values($1,$2,$3,$4,$5)',[user,user===outsider?other:shop,name,role,workspace]);
 const as=async(user)=>{await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[user]);};
 await as(admin);
 const product=await scalar("insert into products(shop_id,name,price,stock,catalogue_visible) values($1,'UX Search Cake',10,5,true) returning id",[shop]);
 const customer=await scalar("insert into customers(shop_id,name) values($1,'UX Search Customer') returning id",[shop]);
 const foreign=await scalar("insert into products(shop_id,name,price,stock) values($1,'UX Foreign Search Cake',999,1) returning id",[other]);
 const supplier=await scalar("insert into suppliers(shop_id,name) values($1,'UX Search Supplier') returning id",[shop]);
 const batch=await scalar("insert into production_batches(shop_id,product_id,product_name,scheduled_date,planned_quantity,created_by) values($1,$2,'UX Search Cake',current_date,5,$3) returning id",[shop,product,admin]);
 const purchase=await scalar("insert into purchase_orders(shop_id,supplier_id,expected_date,created_by) values($1,$2,current_date,$3) returning id",[shop,supplier,admin]);
 await check('Four workspace roles preserve base administrator authorization and password setup lock',async()=>{
  for(const [user,role] of [[admin,'admin'],[cashier,'cashier'],[production,'production'],[inventory,'inventory']]){await as(user);assert.equal(await scalar('select current_workspace_role()'),role);assert.equal(await scalar('select is_admin()'),user===admin);}
  await as(production);await rejects("select ux_set_staff_role($1,'inventory')",[cashier],/Administrator/);await db.exec('set role authenticated');assert.equal((await db.query("update staff_profiles set workspace_role='inventory' where user_id=$1 returning user_id",[production])).rows.length,0);await db.exec('reset role');assert.equal(await scalar('select current_workspace_role()'),'production');
  await as(admin);await rejects("select ux_set_staff_role($1,'production')",[outsider],/not found/);await rejects("select ux_set_staff_role($1,'admin')",[cashier],/Invalid/);
  await db.query('update staff_profiles set must_change_password=true where user_id=$1',[production]);await as(production);assert.equal(await scalar('select current_workspace_role()'),null);await rejects('select ux_workspace()',[],/sign-in/);await db.query('update staff_profiles set must_change_password=false where user_id=$1',[production]);
 });
 await check('Universal search is bounded and excludes foreign records, costs and forbidden entity types',async()=>{
  for(const [user,kinds] of [[admin,['product','customer','supplier','staff','batch']],[cashier,['product','customer']],[production,['product','batch']],[inventory,['product','supplier']]]){
   await as(user);await db.exec('set role authenticated');const results=await scalar("select ux_search('UX')");assert(results.length<=30);assert(!results.some(x=>x.id===foreign));assert(results.every(x=>kinds.includes(x.kind)));assert(!JSON.stringify(results).includes('unit_cost'));assert(!JSON.stringify(results).includes('contact_value'));
   assert.deepEqual(await scalar("select ux_search('x')"),[]);await rejects('select ux_search($1)',['x'.repeat(101)],/too long/);
  }
  await as(production);const detail=await scalar("select ux_record('batch',$1)",[batch]);assert.equal(detail.details.product,'UX Search Cake');assert(!JSON.stringify(detail).includes('unit_cost'));
  await rejects("select ux_record('customer',$1)",[customer],/unavailable/);await rejects("select ux_record('product',$1)",[foreign],/unavailable/);
  await as(inventory);assert.equal((await scalar("select ux_record('purchase_order',$1)",[purchase])).details.supplier,'UX Search Supplier');await rejects("select ux_record('batch',$1)",[batch],/unavailable/);
 });
 await check('Per-user preferences validate languages and remain private across staff and shops',async()=>{
  await as(cashier);await scalar('select ux_save_preferences($1)',[JSON.stringify({language:'zh-TW',appearance:'dark',pins:['sale'],read_ids:['request:1']})]);
  assert.equal((await scalar('select ux_workspace()')).preferences.language,'zh-TW');await rejects('select ux_save_preferences($1)',[JSON.stringify({language:'fr'})],/language/);await rejects('select ux_save_preferences($1)',[JSON.stringify({role:'admin'})],/Invalid preference/);
  await as(production);await db.exec('set role authenticated');assert.equal(Number(await scalar('select count(*) from ux_user_preferences')),0);assert.equal((await scalar('select ux_workspace()')).preferences.language,undefined);
  await rejects("insert into ux_user_preferences(user_id,shop_id) values($1,$2)",[production,shop],/permission denied|row-level/);
  await as(outsider);assert.equal((await scalar('select ux_workspace()')).production.length,0);
 });
 await check('Role dashboards and board stage writes are scoped, optimistic and never change stock',async()=>{
  await as(production);const workspace=await scalar('select ux_workspace()');assert(workspace.production.some(x=>x.id===batch));assert.equal(workspace.deliveries.length,0);assert.equal(workspace.counts.sales_today,0);
  const stock=await scalar('select stock from products where id=$1',[product]);await scalar("select ux_set_production_stage($1,'to_prepare','in_progress')",[batch]);await rejects("select ux_set_production_stage($1,'to_prepare','ready')",[batch],/changed/);assert.equal(await scalar('select stock from products where id=$1',[product]),stock);
  await as(inventory);const inv=await scalar('select ux_workspace()');assert(inv.deliveries.some(x=>x.id===purchase));assert.equal(inv.production.length,0);await rejects("select ux_set_production_stage($1,'in_progress','ready')",[batch],/Production/);
  await as(outsider);await rejects("select ux_set_production_stage($1,'in_progress','ready')",[batch],/Production/);
 });
 await check('Kitchen and inventory direct API calls cannot read or mutate customer service records',async()=>{
  for(const user of [production,inventory]){
   await as(user);await db.exec('set role authenticated');assert.equal(Number(await scalar('select count(*) from customers where shop_id=$1',[shop])),0);assert.equal((await db.query("update customers set name='Unauthorized' where id=$1 returning id",[customer])).rows.length,0);
   await rejects('select get_catalogue_preorders()',[],/Customer service/);await rejects('select quote_commercial_sale($1,null,null)',['[]'],/Customer service/);await rejects('select get_customer_commercial_history($1)',[customer],/Customer service/);
  }
 });
 let tracking,request;
 await check('Customer tracking capability exposes safe status only and preserves idempotent intake',async()=>{
  await as(admin);await scalar('select ensure_customer_display_config()');const token=await scalar('select access_token from customer_display_configs where shop_id=$1',[shop]);
  const key=await id(),lines=JSON.stringify([{product_id:product,qty:1,expected_unit_price:10}]),person=JSON.stringify({name:'Tracking Customer',method:'whatsapp',contact:'+501 555 0141',note:'Private customer note'});
  await as('');await db.exec('set role anon');const sent=await scalar('select submit_catalogue_preorder($1,$2,$3,$4)',[token,key,lines,person]);tracking=sent.status_token;assert.match(tracking,/^[0-9a-f-]{36}$/);assert.equal((await scalar('select submit_catalogue_preorder($1,$2,$3,$4)',[token,key,lines,person])).status_token,tracking);
  const status=await scalar('select get_catalogue_request_status($1)',[tracking]);assert.equal(status.request_number,sent.request_number);assert.equal(status.status,'new_request');assert.equal(status.pickup_at,null);assert(!JSON.stringify(status).includes('Private'));assert(!JSON.stringify(status).includes('contact'));assert(!JSON.stringify(status).includes('staff_notes'));
  await rejects('select get_catalogue_request_status($1)',[await id()],/unavailable/);await db.exec('reset role');request=await scalar('select id from catalogue_preorder_requests where status_token=$1',[tracking]);
 });
 await check('Staff notes and contact templates are separate, scoped and never automatically sent',async()=>{
  await as(cashier);await scalar('select ux_save_request_notes($1,$2)',[request,'Internal-only note']);assert.equal(await scalar('select customer_note from catalogue_preorder_requests where id=$1',[request]),'Private customer note');assert(!JSON.stringify(await scalar('select get_catalogue_request_status($1)',[tracking])).includes('Internal-only'));
  const inbox=await scalar('select get_catalogue_preorders()');assert(!JSON.stringify(inbox).includes(tracking));await rejects("select ux_save_contact_template('ready','Hello')",[],/Administrator/);
  await as(admin);await scalar("select ux_save_contact_template('ready','Request {number} is ready for pickup.')");assert.equal((await scalar('select ux_workspace()')).templates.ready,'Request {number} is ready for pickup.');await scalar("select ux_admin_defaults('{\"production\":\"sales\"}')");await as(production);assert.equal((await scalar('select ux_workspace()')).counts.sales_today,0);
  await as(outsider);await rejects('select ux_save_request_notes($1,$2)',[request,'Other shop'],/not found/);
  await as('');await db.exec('set role anon');await rejects('select ux_workspace()',[],/permission denied/);await rejects("select ux_search('Cake')",[],/permission denied/);await db.exec('reset role');
 });
 await check('Customer confirmation uses the exact pipeline without creating payment, pickup or stock changes',async()=>{
  await as('');await db.exec('set role anon');await rejects("select respond_catalogue_preorder($1,'confirm',null)",[tracking],/not awaiting/);await db.exec('reset role');
  await as(cashier);for(const [before,after] of [['new_request','under_review'],['under_review','customer_contacted'],['customer_contacted','awaiting_confirmation']])await scalar('select set_catalogue_preorder_status($1,$2,$3)',[request,before,after]);
  const before=await scalar('select stock from products where id=$1',[product]);await as('');await db.exec('set role anon');const result=await scalar("select respond_catalogue_preorder($1,'confirm',null)",[tracking]);assert.equal(result.status,'confirmed');assert.equal(result.pickup_at,null);await rejects("select respond_catalogue_preorder($1,'confirm',null)",[tracking],/not awaiting/);await db.exec('reset role');
  assert.equal(await scalar('select stock from products where id=$1',[product]),before);assert.equal(Number(await scalar('select count(*) from scheduled_customer_orders where shop_id=$1',[shop])),0);assert.equal(Number(await scalar('select count(*) from sales where shop_id=$1',[shop])),0);
 });
 await check('Inventory receiving retains quantity, shop, stock-ledger and duplicate-order safeguards',async()=>{
  await as(inventory);await db.exec('set role authenticated');assert((await scalar('select get_stock_receiving()')).suppliers.some(x=>x.id===supplier));assert((await scalar('select get_purchase_orders()')).orders.some(x=>x.id===purchase));
  const receipt=await scalar("select receive_stock($1,$2,2,3,'UX receipt','Inventory role receipt',false)",[supplier,product]);assert(receipt.receipt_id);
  await rejects("select receive_stock($1,$2,1,3,null,null,false)",[supplier,foreign],/not found/);await rejects("select receive_stock($1,$2,-1,3,null,null,false)",[supplier,product],/Valid quantity/);
  await db.exec('reset role');await db.query('insert into purchase_order_items(shop_id,order_id,product_id,product_name,quantity,unit_cost) values($1,$2,$3,$4,3,3)',[shop,purchase,product,'UX Search Cake']);
  const before=Number(await scalar('select stock from products where id=$1',[product]));await db.exec('set role authenticated');await scalar('select receive_purchase_order($1)',[purchase]);await rejects('select receive_purchase_order($1)',[purchase],/not found/);await db.exec('reset role');assert.equal(Number(await scalar('select stock from products where id=$1',[product])),before+3);
  for(const user of [cashier,production]){await as(user);await rejects('select get_stock_receiving()',[],/Administrator/);await rejects('select receive_purchase_order($1)',[purchase],/Administrator/);}
  await as(outsider);await rejects('select receive_purchase_order($1)',[purchase],/Administrator/);await as(admin);await rejects("select ux_set_staff_role($1,'inventory')",[outsider],/not found/);
  await db.query("update staff_profiles set workspace_role='inventory' where user_id=$1",[outsider]);await as(outsider);await rejects('select receive_purchase_order($1)',[purchase],/not found/);await rejects("select receive_stock($1,$2,1,3,null,null,false)",[supplier,product],/not found/);
  await as(inventory);await rejects("select create_supplier('Forbidden supplier')",[],/Administrator/);await rejects('select cancel_purchase_order($1)',[purchase],/Administrator/);
 });
 await check('UX backup includes preferences, role assignments and staff notes without tracking capabilities',async()=>{
  await as(admin);const backup=await scalar('select export_business_backup()');assert(backup.ux_records.preferences.some(x=>x.user_id===cashier));assert(backup.ux_records.staff_roles.some(x=>x.user_id===inventory&&x.workspace_role==='inventory'));assert(backup.customer_request_records.requests.some(x=>x.id===request&&x.staff_notes==='Internal-only note'));assert(!JSON.stringify(backup.customer_request_records).includes(tracking));
 });
 await check('Low-stock cards need no alert refresh, and blocked/issue notifications keep stable role-scoped IDs',async()=>{
  await as(admin);await db.query('update products set low_stock_at=99 where id=$1',[product]);await db.query("update production_batches set ux_stage='blocked' where id=$1",[batch]);
  const issue=await scalar("insert into operational_incidents(shop_id,severity,category,title,description,reported_by) values($1,'high','inventory','UX stock receiving issue','A test issue requiring investigation',$2) returning id",[shop,admin]);
  const workspace=await scalar('select ux_workspace()');assert(workspace.stock.some(x=>x.entity_id===product&&x.kind==='low_stock'&&x.unit==='each'));assert(workspace.notifications.some(x=>x.id==='blocked:'+batch));assert(workspace.notifications.some(x=>x.id==='issue:'+issue));
  await as(inventory);const inv=await scalar('select ux_workspace()');const low=inv.notifications.find(x=>x.id==='low_stock:'+product);assert(low);assert(!inv.notifications.some(x=>x.id==='issue:'+issue||x.id==='blocked:'+batch));await scalar('select ux_save_preferences($1)',[JSON.stringify({read_ids:[low.id]})]);assert((await scalar('select ux_workspace()')).notifications.find(x=>x.id===low.id).read);
  await as(admin);await db.query("insert into production_shortage_alerts(shop_id,kind,entity_id,name,required_quantity,available_quantity,shortage_quantity,severity) values($1,'product',$2,'UX Search Cake',99,10,89,'warning')",[shop,product]);assert.equal((await scalar('select ux_workspace()')).stock.filter(x=>x.entity_id===product).length,1);
 });
 await check('Administrator financial dashboard totals use the business day and all sales; other roles receive no financial amounts',async()=>{
  await as(admin);await db.query("insert into sales(shop_id,payment_method,subtotal,total,created_at) select $1,'card',1,1,(current_business_date()::timestamp at time zone 'America/Belize')+interval '12 hours' from generate_series(1,61)",[shop]);
  await db.query("insert into sales(shop_id,payment_method,subtotal,total,refunded_total,created_at,status) values($1,'card',40,40,10,(current_business_date()::timestamp at time zone 'America/Belize')+interval '12 hours','completed'),($1,'card',100,100,0,(current_business_date()::timestamp at time zone 'America/Belize')-interval '12 hours','completed'),($1,'card',100,100,100,(current_business_date()::timestamp at time zone 'America/Belize')+interval '12 hours','voided')",[shop]);
  const counts=(await scalar('select ux_workspace()')).counts;assert.equal(Number(counts.sales_total_today),91);assert.equal(Number(counts.staff_active),4);assert.equal(Number(counts.gross_profit_today),Number((await scalar('select get_profitability_report(current_business_date(),current_business_date())')).summary.gross_profit));
  for(const user of [cashier,production,inventory]){await as(user);const restricted=(await scalar('select ux_workspace()')).counts;assert(!Object.hasOwn(restricted,'sales_total_today'));assert(!Object.hasOwn(restricted,'gross_profit_today'));assert(!Object.hasOwn(restricted,'staff_active'));}
 });
};
