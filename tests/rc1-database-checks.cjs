const assert=require('assert');
module.exports=async({db,check,scalar,rejects,uid,emp,shop,other,prod})=>{
 await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[uid]);
 await check('RC1 temporary-password staff cannot bypass setup through RLS or RPCs',async()=>{
  await db.query('update staff_profiles set must_change_password=true where user_id=$1',[uid]);
  assert.equal(await scalar('select current_shop_id()'),null);assert.equal(await scalar('select current_staff_role()'),null);assert.equal(await scalar('select is_admin()'),false);
  await rejects('select get_commercial_catalogue(null)',[],/Staff sign-in/);
  await rejects("select save_catalogue_promotion($1,'percent',10,now(),now()+interval '1 hour',false)",[prod],/Administrator/);
  await db.exec('set role authenticated');assert.equal(Number(await scalar('select count(*) from products')),0);assert.equal(Number(await scalar('select count(*) from staff_profiles')),1);
  assert.equal(await scalar('select must_change_password from staff_profiles where user_id=$1',[uid]),true);
  await db.query('update staff_profiles set must_change_password=false where user_id=$1',[uid]);
  await db.exec('reset role');assert.equal(await scalar('select must_change_password from staff_profiles where user_id=$1',[uid]),true);
  await db.query('update staff_profiles set must_change_password=false where user_id=$1',[uid]);assert.equal(await scalar('select current_shop_id()'),shop);
 });
 const product=await scalar("insert into products(shop_id,name,price,cost_price,stock) values($1,'RC1 Bread',10,3,20) returning id",[shop]);
 const cart=JSON.stringify([{product_id:product,qty:2,expected_unit_price:10}]);const key='9d28e3bd-b478-4bda-a205-800f44c5a180';
 let sale;
 await check('RC1 checkout retry returns one receipt and deducts stock and cash once',async()=>{
  sale=await scalar("select complete_pos_checkout($1,null,'cash',$2,null,null,25)",[key,cart]);
  const again=await scalar("select complete_pos_checkout($1,null,'cash',$2,null,null,25)",[key,cart]);
  assert.equal(again.sale_id,sale.sale_id);assert.equal(again.replayed,true);assert.equal(Number(await scalar('select stock from products where id=$1',[product])),18);
  const receipt=(await db.query('select total,cash_received,change_due from sales where id=$1',[sale.sale_id])).rows[0];assert.equal(Number(receipt.total),20);assert.equal(Number(receipt.cash_received),25);assert.equal(Number(receipt.change_due),5);
  assert.equal(Number(await scalar('select count(*) from pos_checkout_requests where checkout_id=$1',[key])),1);
  assert.equal(Number(await scalar("select count(*) from commercial_events where entity_id=$1 and action='completed'",[key])),1);
 });
 await check('RC1 reused checkout references reject changed amounts and foreign staff',async()=>{
  await rejects("select complete_pos_checkout($1,null,'cash',$2,null,null,30)",[key,cart],/different order/);
  await db.query("select set_config('test.user',$1,false)",[emp]);await rejects("select complete_pos_checkout($1,null,'cash',$2,null,null,25)",[key,cart],/another staff/);
  await db.query("select set_config('test.user',$1,false)",[uid]);assert.equal(Number(await scalar('select stock from products where id=$1',[product])),18);
 });
 await check('RC1 insufficient cash rolls back sale, inventory, tender and retry ledger together',async()=>{
  const before=await scalar('select count(*) from sales');const invalid='dd63cbb5-918a-463d-b33b-d8aa82f44e6f';
  await rejects("select complete_pos_checkout($1,null,'cash',$2,null,null,1)",[invalid,cart],/less than/);
  assert.equal(await scalar('select count(*) from sales'),before);assert.equal(Number(await scalar('select stock from products where id=$1',[product])),18);
  assert.equal(Number(await scalar('select count(*) from pos_checkout_requests where checkout_id=$1',[invalid])),0);
 });
 await check('RC1 checkout ledger is isolated and cannot be written directly by API roles',async()=>{
  assert.equal(await scalar("select relrowsecurity from pg_class where relname='pos_checkout_requests'"),true);
  await db.exec('set role authenticated');await rejects('insert into pos_checkout_requests(shop_id,checkout_id,staff_user_id,request_payload) values($1,gen_random_uuid(),$2,$3)',[shop,uid,'{}'],/row-level security|permission denied/);await db.exec('reset role');
  await db.exec("insert into auth.users(id,email) values('ba8e7659-d876-4da1-a538-a97b8a6b1c55','foreign@test.invalid')");await db.query("insert into staff_profiles(user_id,shop_id,display_name,role) values('ba8e7659-d876-4da1-a538-a97b8a6b1c55',$1,'Foreign','admin')",[other]);
  await db.query("select set_config('test.user','ba8e7659-d876-4da1-a538-a97b8a6b1c55',false)");await db.exec('set role authenticated');assert.equal(Number(await scalar('select count(*) from pos_checkout_requests')),0);await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[uid]);
 });
 await check('RC1 supporting FEFO, allocation, kitchen, pickup and checkout indexes exist',async()=>{
  for(const index of ['rc1_variant_lots_fefo','rc1_variant_allocations_sale_item','rc1_selection_kitchen','rc1_scheduled_pickup','rc1_checkout_sale'])assert.equal(Number(await scalar('select count(*) from pg_indexes where indexname=$1',[index])),1);
 });
 await check('RC1 physical stock counts reject a concurrent sale and preserve the lot ledger',async()=>{
  await rejects("select set_product_stock_checked($1,20,21,'Physical count')",[product],/Stock changed/);assert.equal(Number(await scalar('select stock from products where id=$1',[product])),18);
  assert.equal(Number(await scalar("select set_product_stock_checked($1,18,21,'Reviewed physical count')",[product])),21);
  await rejects("select set_product_stock_checked($1,18,21,'Stale retry')",[product],/Stock changed/);assert.equal(Number(await scalar('select stock from products where id=$1',[product])),21);
  assert.equal(Number(await scalar("select sum(remaining_quantity) from finished_product_batches where product_id=$1 and status='active'",[product])),21);
 });
 await require('./bakery-workflow.cjs')({db,check,scalar,rejects,uid,emp,shop,other});
};
