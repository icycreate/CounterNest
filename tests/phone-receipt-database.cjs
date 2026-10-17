const assert=require('node:assert/strict');
module.exports=async({db,check,scalar,rejects})=>{
 await db.exec('reset role');
 const shop=await scalar("insert into shops(name,phone,address,email) values('Phone Bakery','+501 6000-1234','Main Street','shop@example.test') returning id"),user=await scalar("insert into auth.users(id,email) values(gen_random_uuid(),'phone-admin@test.invalid') returning id");
 await db.query("insert into staff_profiles(user_id,shop_id,role,display_name) values($1,$2,'admin','Phone Admin')",[user,shop]);await db.query("select set_config('test.user',$1,false)",[user]);
 await check('New shop, supplier and customer phones use international canonical storage and reject malformed input',async()=>{
  assert.equal(await scalar('select phone from shops where id=$1',[shop]),'+50160001234');
  const id=await scalar("insert into customers(shop_id,name,phone) values($1,'Phone Customer','00 886 912-345-678') returning id",[shop]);assert.equal(await scalar('select phone from customers where id=$1',[id]),'+886912345678');
  const supplier=await scalar("select create_supplier('Phone Supplier',null,'+52 (55) 1234-5678',null)");assert(supplier);
  assert.equal(await scalar("select phone from suppliers where shop_id=$1 and name='Phone Supplier'",[shop]),'+525512345678');
  for(const phone of ['60001234','+01234567','+12345','+1234567890123456','+501bad60001234'])await rejects("insert into customers(shop_id,name,phone) values($1,'Invalid',$2)",[shop,phone],/phone number/);
  await db.query("update shops set address='Updated' where id=$1",[shop]);assert.equal(await scalar('select phone from shops where id=$1',[shop]),'+50160001234');
 });
 await check('Anonymous request normalization precedes replay checks and rate limits; contact override remains audited and normalized',async()=>{
  const product=await scalar("insert into products(shop_id,name,price,stock,catalogue_visible) values($1,'Phone Test Cake',10,20,true) returning id",[shop]);await scalar('select ensure_customer_display_config()');await scalar("select save_customer_contact_settings(array['whatsapp','email'],true,null,true)");const token=await scalar('select access_token from customer_display_configs where shop_id=$1',[shop]);const key=await scalar('select gen_random_uuid()'),items=JSON.stringify([{product_id:product,qty:1,expected_unit_price:10}]);
  const send=(k,number)=>scalar('select submit_catalogue_preorder($1,$2,$3,$4)',[token,k,items,JSON.stringify({name:'Phone Customer',method:'whatsapp',contact:number})]);
  await db.exec('set role anon');await send(key,'+501 6000-1234');assert((await send(key,'+50160001234')).replayed);await db.exec('reset role');const id=await scalar('select id from catalogue_preorder_requests where client_key=$1',[key]);assert.equal(await scalar('select contact_value from catalogue_preorder_requests where id=$1',[id]),'+50160001234');
  await db.query("update catalogue_preorder_requests set payload=jsonb_set(payload,'{contact}',to_jsonb('+501 6000-1234'::text)) where id=$1",[id]);
  await db.exec('set role anon');assert((await send(key,'+50160001234')).replayed);assert((await send(key,'+501 6000-1234')).replayed);await db.exec('reset role');
  await db.exec('set role anon');for(const number of ['+501 (6000) 1234','+5016000-1234'])await send(await scalar('select gen_random_uuid()'),number);await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,await scalar('select gen_random_uuid()'),items,JSON.stringify({name:'Phone Customer',method:'whatsapp',contact:'+501 60001234'})],/Request limit/);await db.exec('reset role');
  const contact=await scalar("select prepare_catalogue_contact($1,'phone','Customer approved phone call','+52 (55) 8765-4321')",[id]);assert.equal(contact.destination,'+525587654321');assert.equal(await scalar("select details->>'destination' from catalogue_request_events where request_id=$1 and action='contact_override'",[id]),null); // audit intentionally excludes the destination
  await scalar('select accept_catalogue_preorder($1,$2)',[id,JSON.stringify({items:[{product_id:product,qty:1,expected_unit_price:10}]})]);const receipt=await scalar('select get_catalogue_preorder_receipt($1)',[id]);assert.equal(receipt.phone,'+50160001234');assert.equal(receipt.address,'Updated');assert.equal(receipt.email,'shop@example.test');
  await db.exec('set role anon');await rejects('select get_catalogue_preorder_receipt_rc3($1)',[id],/permission denied/);await rejects('select submit_catalogue_preorder_rc3($1,$2,$3,$4)',[token,key,items,'{}'],/permission denied/);await db.exec('reset role');
 });
};

