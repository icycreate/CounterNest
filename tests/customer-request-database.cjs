const assert=require('assert');
module.exports=async({db,check,scalar,rejects,other,emp})=>{
 const rejectBase=rejects;rejects=async(sql,params,pattern)=>{try{await rejectBase(sql,params,pattern)}catch(e){throw new Error(e.message+' — '+sql)}};
 const uid=await scalar('select gen_random_uuid()'),shop=await scalar('select gen_random_uuid()'),staff=await scalar('select gen_random_uuid()'),product=await scalar('select gen_random_uuid()');
 await db.query("insert into auth.users(id,email) values($1,'request-admin@test.invalid'),($2,'request-staff@test.invalid')",[uid,staff]);
 await db.query("insert into shops(id,name,tax_rate) values($1,'Request Shop',0)",[shop]);
 await db.query("insert into staff_profiles(user_id,shop_id,display_name,role) values($1,$2,'Request Admin','admin'),($3,$2,'Request Staff','employee')",[uid,shop,staff]);
 await db.query("select set_config('test.user',$1,false)",[uid]);
 await db.query("insert into products(id,shop_id,name,price,stock,catalogue_visible) values($1,$2,'Request Cake',12,0,true)",[product,shop]);
 await scalar("select adjust_stock($1,20,'Initial request test stock')",[product]);
 await scalar('select ensure_customer_display_config()');
 const token=await scalar('select access_token from customer_display_configs where shop_id=$1',[shop]);
 let variant,key=await scalar('select gen_random_uuid()'),request,number,order;
 const details={name:'Sample Customer',method:'whatsapp',contact:'+501 555 0101',note:'Please discuss availability; no pickup chosen.'};
 let items;
 const send=async(k=key,lines=items,customer=details)=>scalar('select submit_catalogue_preorder($1,$2,$3,$4)',[token,k,JSON.stringify(lines),JSON.stringify(customer)]);
 await check('Customer request settings enforce administrator, allowed methods and canonical HTTPS origin',async()=>{
  await scalar("select save_customer_contact_settings(array['whatsapp'],true,'https://bakery.example',true)");
  await rejects("select save_customer_contact_settings(array['unknown'],true,null,false)",[],/Invalid contact/);
  await rejects("select save_customer_contact_settings(array[]::text[],true,null,false)",[],/at least one/);
  for(const url of ['javascript:alert(1)','https://x.test/path','https://user:pass@x.test','https://x.test?token=oops'])await rejects("select save_customer_contact_settings(array['email'],true,$1,false)",[url],/HTTPS origin/);
  await db.query("select set_config('test.user',$1,false)",[staff]);await rejects("select save_customer_contact_settings(array['email'],true,null,false)",[],/Administrator/);await db.query("select set_config('test.user',$1,false)",[uid]);
  variant=await scalar('select save_product_variant($1,null,$2)',[product,JSON.stringify({name:'Small',price:12,active:true,independent_stock:false,recipe_scale:1})]);
  await scalar("select save_catalogue_promotion($1,'percent',25,now()-interval '1 hour',now()+interval '1 day',true)",[product]);items=[{product_id:product,variant_id:variant,qty:2,expected_unit_price:9,name:'Forged ignored name',cost:999}];
  const payload=await scalar('select get_commercial_catalogue($1)',[token]);assert.deepEqual(payload.customer_options.methods,['whatsapp']);assert.equal(payload.customer_options.public_base_url,'https://bakery.example');assert(!JSON.stringify(payload).includes('unit_cost'));
  const admin=await scalar('select get_catalogue_admin()');assert.equal(admin.settings.public_base_url,'https://bakery.example');
 });
 await check('Anonymous pre-order submission needs no pickup, uses server promo prices and never reserves stock',async()=>{
  await db.query("select set_config('test.user','',false)");await db.exec('set role anon');
  const result=await send();number=result.request_number;assert(number);assert.deepEqual(Object.keys(result).sort(),['replayed','request_number','status','status_token']);await db.exec('reset role');
  request=await scalar('select id from catalogue_preorder_requests where shop_id=$1 and client_key=$2',[shop,key]);
  const row=await scalar('select to_jsonb(r) from catalogue_preorder_requests r where id=$1',[request]);assert.equal(row.status,'new_request');assert.equal(Number(row.estimated_subtotal),18);assert(!JSON.stringify(row.summary).includes('cost'));assert(!JSON.stringify(row.items).includes('Forged'));
  assert.equal(Number(await scalar('select stock from products where id=$1',[product])),20);assert.equal(Number(await scalar('select count(*) from sales where shop_id=$1',[shop])),0);
  assert.equal(Number(await scalar('select count(*) from catalogue_request_events where request_id=$1',[request])),1);
  assert((await send()).replayed);assert.equal(Number(await scalar('select count(*) from catalogue_request_events where request_id=$1',[request])),1);
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,key,JSON.stringify([{...items[0],qty:3}]),JSON.stringify(details)],/different details/);
 });
 await check('Public request input rejects disabled methods, malformed contact, stale prices and foreign products',async()=>{
  const fresh=()=>scalar('select gen_random_uuid()');
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,await fresh(),JSON.stringify(items),JSON.stringify({...details,method:'email',contact:'a@b.test'})],/unavailable/);
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,await fresh(),JSON.stringify(items),JSON.stringify({...details,name:{bad:'object'}})],/Invalid customer/);
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,await fresh(),JSON.stringify(items),JSON.stringify({...details,contact:'not a number'})],/phone number/);
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,await fresh(),JSON.stringify([{...items[0],expected_unit_price:8}]),JSON.stringify(details)],/Prices changed/);
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,await fresh(),JSON.stringify([{...items[0],qty:21}]),JSON.stringify(details)],/Maximum/);
  const foreign=await scalar("insert into products(shop_id,name,price,stock) values($1,'Foreign request item',3,1) returning id",[other]);await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,await fresh(),JSON.stringify([{product_id:foreign,qty:1,expected_unit_price:3}]),JSON.stringify(details)],/unavailable/);
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',['bad-token',await fresh(),JSON.stringify(items),JSON.stringify(details)],/unavailable/);
 });
 await check('Request RLS prevents public reads/direct writes and foreign-shop staff access',async()=>{
  // Earlier legacy regression deliberately grants table privileges to API roles;
  // verify RLS still denies rows and mutations under those broader grants.
  await db.exec('set role anon');assert.equal(Number(await scalar('select count(*) from catalogue_preorder_requests')),0);await rejects('select get_catalogue_preorders()',[],/permission denied/);await db.exec('reset role');
  await db.query("select set_config('test.user',$1,false)",[emp]);await db.exec('set role authenticated');assert.equal(Number(await scalar('select count(*) from catalogue_preorder_requests where id=$1',[request])),0);assert.equal((await db.query('delete from catalogue_request_events returning id')).rows.length,0);assert.equal((await db.query("update catalogue_preorder_requests set status='confirmed' returning id")).rows.length,0);await db.exec('reset role');
  await rejects('select prepare_catalogue_contact($1,$2)',[request,'whatsapp'],/not found/);
  await db.query("select set_config('test.user',$1,false)",[staff]);
  const inbox=await scalar('select get_catalogue_preorders()');assert.equal(inbox.requests[0].id,request);
  await db.exec('set role authenticated');assert.equal((await db.query("update catalogue_preorder_requests set status='confirmed' where id=$1 returning id",[request])).rows.length,0);await db.exec('reset role');
 });
 await check('Only selected contact action is permitted to staff; alternate method needs admin reason and audits once',async()=>{
  const contact=await scalar("select prepare_catalogue_contact($1,'whatsapp')",[request]);assert.equal(contact.destination,details.contact.replace(/\s/g,""));assert.equal(contact.method,'whatsapp');
  await rejects("select prepare_catalogue_contact($1,'email','Customer requested email','person@example.test')",[request],/Administrator override/);
  await db.query("select set_config('test.user',$1,false)",[uid]);await rejects("select prepare_catalogue_contact($1,'email','bad','person@example.test')",[request],/reason/);
  const result=await scalar("select prepare_catalogue_contact($1,'email','Customer approved alternate contact','person@example.test')",[request]);assert.equal(result.method,'email');
  const audit=await scalar("select details from catalogue_request_events where request_id=$1 and action='contact_override'",[request]);assert.equal(audit.preferred,'whatsapp');assert(audit.reason);assert.equal(await scalar('select preferred_method from catalogue_preorder_requests where id=$1',[request]),'whatsapp');
 });
 await check('Request states reject stale/skipped transitions and schedule exactly one linked order',async()=>{
  for(const [before,after] of [['new_request','under_review'],['under_review','customer_contacted'],['customer_contacted','awaiting_confirmation'],['awaiting_confirmation','confirmed'],['confirmed','awaiting_deposit']])await scalar('select set_catalogue_preorder_status($1,$2,$3,null)',[request,before,after]);
  await rejects("select set_catalogue_preorder_status($1,'confirmed','awaiting_deposit',null)",[request],/changed/);
  await rejects("select set_catalogue_preorder_status($1,'awaiting_deposit','collected',null)",[request],/Invalid/);
  const customer=await scalar("insert into customers(shop_id,name) values($1,'Sample Customer') returning id",[shop]);
  await db.query("select set_config('test.user',$1,false)",[staff]);await rejects("select schedule_catalogue_preorder($1,$2,now()+interval '3 days',now()+interval '2 days')",[request,customer],/Administrator/);await db.query("select set_config('test.user',$1,false)",[uid]);
  await scalar("select resolve_customer_recognition($1,0,gen_random_uuid(),'link',$2,'Confirmed with customer for scheduling')",[request,customer]);
  order=await scalar("select schedule_catalogue_preorder($1,$2,now()+interval '3 days',now()+interval '2 days')",[request,customer]);
  assert.equal(await scalar("select schedule_catalogue_preorder($1,$2,now()+interval '3 days',now()+interval '2 days')",[request,customer]),order);
  assert.equal(Number(await scalar('select count(*) from scheduled_customer_orders where shop_id=$1',[shop])),1);
  assert.equal(await scalar('select status from catalogue_preorder_requests where id=$1',[request]),'scheduled');assert.equal(Number(await scalar('select stock from products where id=$1',[product])),20);
 });
 await check('Linked request follows real production/paid collection, with one stock deduction',async()=>{
  await scalar("select set_scheduled_order_status($1,'preparing')",[order]);assert.equal(await scalar('select status from catalogue_preorder_requests where id=$1',[request]),'in_production');
  await scalar("select set_scheduled_order_status($1,'ready')",[order]);assert.equal(await scalar('select status from catalogue_preorder_requests where id=$1',[request]),'ready');
  await rejects("select set_scheduled_order_status($1,'completed')",[order],/Invalid transition/);
  await scalar("select complete_scheduled_order_sale($1,'card',18,null)",[order]);assert.equal(Number(await scalar('select stock from products where id=$1',[product])),18);
  await scalar("select set_scheduled_order_status($1,'completed')",[order]);assert.equal(await scalar('select status from catalogue_preorder_requests where id=$1',[request]),'collected');
 });
 await check('Register opening is admin-only, station-stamped, audited and immutable for the day',async()=>{
  await db.query("select set_config('test.user',$1,false)",[staff]);await rejects("select open_register(50,'Counter A','Opening count')",[],/Administrator/);await db.exec('set role authenticated');await rejects("select submit_staff_opening_cash(50,'Legacy bypass')",[],/permission denied/);await rejects("select open_cash_drawer_pre_station(50,'Private bypass')",[],/permission denied/);await db.exec('reset role');
  await db.query("select set_config('test.user',$1,false)",[uid]);await rejects("select open_register('NaN','Counter A',null)",[],/Valid opening/);
  const register=await scalar("select open_register(50,'Counter A','Opening count')");assert.equal(await scalar('select station_label from cash_drawer_sessions where id=$1',[register]),'Counter A');assert.equal(await scalar('select opened_by from cash_drawer_sessions where id=$1',[register]),uid);
  const event=await scalar("select details from commercial_events where entity_id=$1 and action='opened'",[register]);assert.equal(event.station,'Counter A');assert.equal(Number(event.opening_amount),50);
  await rejects("select open_register(100,'Counter B',null)",[],/already open/);
  const qr=await scalar('select get_receipt_catalogue_link()');assert(qr.enabled);assert.equal(qr.public_base_url,'https://bakery.example');
  const backup=await scalar('select export_business_backup()');assert(backup.customer_request_records.requests.some(r=>r.id===request));assert(backup.customer_request_records.events.some(e=>e.action==='contact_override'));
  const audit=await scalar("select get_audit_log(now()-interval '1 day',now()+interval '1 day',500)");assert(audit.some(e=>e.action==='contact_override'&&e.category==='catalogue_request'));assert(audit.some(e=>e.action==='register_opened'&&e.details.station==='Counter A'));
 });
 await check('Disabled/rotated customer links stop requests and receipt sharing',async()=>{
  await db.query("update customer_display_configs set enabled=false where shop_id=$1",[shop]);
  assert.equal((await scalar('select get_receipt_catalogue_link()')).enabled,false);
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,await scalar('select gen_random_uuid()'),JSON.stringify(items),JSON.stringify(details)],/unavailable/);
 });
};


