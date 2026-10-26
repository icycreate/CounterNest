const assert=require('assert');
module.exports=async({db,check,scalar,rejects})=>{
 const s='b1000000-0000-4000-8000-000000000001',u='b1000000-0000-4000-8000-000000000002',cash='b1000000-0000-4000-8000-000000000003',inv='b1000000-0000-4000-8000-000000000004',foreign='b1000000-0000-4000-8000-000000000005';
 await db.exec(`insert into shops(id,name) values('${s}','RC11 test');insert into auth.users(id) values('${u}'),('${cash}'),('${inv}');insert into staff_profiles(user_id,shop_id,display_name,role,workspace_role) values('${u}','${s}','Owner','admin','cashier'),('${cash}','${s}','Cashier','employee','cashier'),('${inv}','${s}','Inventory','employee','inventory');select set_config('test.user','${u}',false);`);
 await db.query("insert into customer_display_configs(id,shop_id,access_token) values($1,$2,'rc11-public-token')",[foreign,s]);
 const contact={kind:'whatsapp',value:'+5016001234',label:'Orders',enabled:true,note:'Business only',qr:'',sort:0,preferred:true};
 await check('RC11 publishes explicitly enabled business contacts only, without staff details',async()=>{
 await db.query('select save_business_contacts($1::jsonb)',[JSON.stringify([contact,{...contact,enabled:false,value:'+5016005678'}])]);
 const c=await scalar("select get_commercial_catalogue('rc11-public-token')");assert.equal(c.business_contacts.length,1);assert.equal(c.business_contacts[0].value,contact.value);assert(!JSON.stringify(c).includes('+5016005678'));
 assert((await scalar("select columns from workspace_backup_tables where table_name='customer_display_configs'")).includes('business_contacts'));
 await rejects('select save_business_contacts($1::jsonb)',[JSON.stringify([{...contact,qr:'javascript:bad'}])],/HTTPS/);
 await db.query("select set_config('test.user',$1,false)",[cash]);await rejects("select save_business_contacts('[]')",[],/Administrator/);await db.query("select set_config('test.user',$1,false)",[u]);
 });
 const sub=n=>({endpoint:'https://fcm.googleapis.com/fcm/send/rc11-'+n,keys:{p256dh:'a'.repeat(87),auth:'a'.repeat(22)}});let d1,d2;
 await check('RC11 registers independent devices, updates the same device and blocks account takeover',async()=>{
 d1=await scalar('select register_order_push($1,$2)',[JSON.stringify(sub(1)),JSON.stringify({push:true,preorder:true,catalogue:true})]);d2=await scalar('select register_order_push($1,$2)',[JSON.stringify(sub(2)),JSON.stringify({push:true,preorder:true,catalogue:false})]);assert.notEqual(d1,d2);
 assert.equal(await scalar('select register_order_push($1,$2)',[JSON.stringify(sub(1)),JSON.stringify({push:true,preorder:true,catalogue:true})]),d1);
 await db.query("select set_config('test.user',$1,false)",[cash]);await rejects('select register_order_push($1,$2)',[JSON.stringify(sub(1)),'{}'],/previous account/);
 await db.query("select set_config('test.user',$1,false)",[inv]);await rejects('select register_order_push($1,$2)',[JSON.stringify(sub(3)),'{}'],/Customer service|Order handling/);await rejects('select get_order_alerts(null)',[],/Customer service|Order handling/);await db.query("select set_config('test.user',$1,false)",[u]);
 assert.equal(await scalar("select has_function_privilege('authenticated','lease_order_push()','execute')"),false);assert.equal(await scalar("select has_function_privilege('anon','register_order_push(jsonb,jsonb)','execute')"),false);
 });
 let selection,event;
 await check('RC11 transactional request triggers queue each event/device once and respect alert preferences',async()=>{
 selection=await scalar("insert into customer_selection_requests(shop_id,display_config_id,target_station_label) values($1,$2,'Main POS') returning id",[s,foreign]);
 event=await scalar('select id from order_alert_events where record_id=$1',[selection]);assert(event);assert.equal(Number(await scalar('select count(*) from order_push_deliveries where event_id=$1',[event])),1);
 await db.query('update customer_selection_requests set customer_note=$2 where id=$1',[selection,'Update does not notify twice']);assert.equal(Number(await scalar('select count(*) from order_alert_events where record_id=$1',[selection])),1);
 await db.query("insert into catalogue_preorder_requests(shop_id,display_config_id,client_key,payload,customer_name,preferred_method,contact_value,items,summary,estimated_subtotal) values($1,$2,gen_random_uuid(),'{\"type\":\"custom_cake\"}','Public Customer','phone','+5016001234','[]','[]',0)",[s,foreign]);assert.equal(Number(await scalar("select count(*) from order_alert_events where shop_id=$1 and kind='custom_cake'",[s])),1);
 assert.equal(Number(await scalar('select count(*) from order_push_deliveries q join order_alert_events e on e.id=q.event_id where e.shop_id=$1',[s])),3);
 });
 await check('RC11 foreground cursors use server time and support same-timestamp pagination without duplicates',async()=>{
 const initial=await scalar('select get_order_alerts(null)');assert(initial.since);assert.deepEqual(initial.events,[]);
 const rows=(await scalar("select get_order_alerts(now()-interval '1 hour')")).events;assert(rows.length>=2);const first=rows[0];const next=(await scalar('select get_order_alerts($1,$2)',[first.created_at,first.id])).events;assert(!next.some(e=>e.id===first.id));assert(next.some(e=>e.id===rows[1].id));assert(!JSON.stringify(rows).includes('Public Customer'));
 });
 await check('RC11 push leases are exclusive and exclude revoked staff, disabled preferences and frozen workspaces',async()=>{
 const first=await scalar('select lease_order_push()');assert.equal(first.filter(r=>[d1,d2].includes(r.device_id)).length,3);assert.equal((await scalar('select lease_order_push()')).filter(r=>[d1,d2].includes(r.device_id)).length,0);
 await db.query("update order_push_deliveries set lease_until=now()-interval '1 minute' where device_id=$1",[d1]);await db.query('update staff_profiles set active=false where user_id=$1',[u]);assert.equal((await scalar('select lease_order_push()')).filter(r=>r.device_id===d1).length,0);await db.query('update staff_profiles set active=true where user_id=$1',[u]);
 await db.query("insert into workspace_recovery(shop_id,pending_at) values($1,now())",[s]);assert.equal((await scalar('select lease_order_push()')).filter(r=>[d1,d2].includes(r.device_id)).length,0);await db.query('delete from workspace_recovery where shop_id=$1',[s]);
 await db.query("update order_push_devices set preferences='{\"push\":false}' where id=$1",[d1]);assert.equal((await scalar('select lease_order_push()')).filter(r=>r.device_id===d1).length,0);
 });
 await check('RC11 unregister removes only the current account device and cascades queued deliveries',async()=>{
 await db.query("select set_config('test.user',$1,false)",[cash]);await db.query('select unregister_order_push($1)',[sub(1).endpoint]);assert.equal(Number(await scalar('select count(*) from order_push_devices where id=$1',[d1])),1);await db.query("select set_config('test.user',$1,false)",[u]);await db.query('select unregister_order_push($1)',[sub(1).endpoint]);assert.equal(Number(await scalar('select count(*) from order_push_deliveries where device_id=$1',[d1])),0);
 });
 await check('RC11 public custom-cake requests retain replay identity and accept into the original cake workflow',async()=>{
 const product='b1000000-0000-4000-8000-000000000010',client='b1000000-0000-4000-8000-000000000011';await db.query("insert into products(id,shop_id,name,price,stock) values($1,$2,'Cake 原名',5,10)",[product,s]);
 const items=JSON.stringify([{product_id:product,qty:1,expected_unit_price:5}]),customer=JSON.stringify({name:'Cake Customer',method:'phone',contact:'+5016001234',note:'Birthday',request_type:'custom_cake'});
 const r=await scalar("select submit_catalogue_preorder('rc11-public-token',$1,$2,$3)",[client,items,customer]);const id=await scalar('select id from catalogue_preorder_requests where client_key=$1',[client]);assert.equal(await scalar('select request_type from catalogue_preorder_requests where id=$1',[id]),'custom_cake');
 const again=await scalar("select submit_catalogue_preorder('rc11-public-token',$1,$2,$3)",[client,items,customer]);assert.equal(again.request_number,r.request_number);assert.equal(again.status_token,r.status_token);
 const accepted=await scalar('select accept_catalogue_preorder($1,$2)',[id,JSON.stringify({items:JSON.parse(items)})]);assert.equal(await scalar('select kind from scheduled_customer_orders where id=$1',[accepted.order_id]),'cake');
 assert.equal(Number(await scalar('select count(*) from order_alert_events where record_id=$1',[id])),1);
 });
};
