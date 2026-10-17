const assert=require('assert');
module.exports=async({db,check,scalar,rejects})=>{
 await db.exec('reset role');const id=()=>scalar('select gen_random_uuid()');
 const shop=await id(),other=await id(),admin=await id(),production=await id(),inventory=await id();
 await db.query("insert into shops(id,name,tax_rate) values($1,'Operational Test',0),($2,'Foreign Operational',0)",[shop,other]);
 for(const [user,role,workspace] of [[admin,'admin','cashier'],[production,'employee','production'],[inventory,'employee','inventory']]){await db.query('insert into auth.users(id,email) values($1,$2)',[user,user+'@operations.invalid']);await db.query('insert into staff_profiles(user_id,shop_id,display_name,role,workspace_role) values($1,$2,$3,$4,$5)',[user,shop,'Ops '+workspace,role,workspace])}
 const as=async user=>{await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[user])};await as(admin);
 const product=await scalar("insert into products(shop_id,name,price,stock) values($1,'Operational Cake',10,0) returning id",[shop]);
 const ingredient=await scalar("select upsert_ingredient(null,'Operational Flour',null,'g',100,10,40,2,null,0,true)");
 const supplier=await scalar("insert into suppliers(shop_id,name) values($1,'Operational Supplier') returning id",[shop]);
 const recipe=await scalar('select upsert_product_recipe(null,$1,10,5,2,1,0,60,true,true,$2)',[product,JSON.stringify([{ingredient_id:ingredient,quantity_required:20}])]);
 const customer=await scalar("insert into customers(shop_id,name) values($1,'Operational Customer') returning id",[shop]);
 let standalone,order,linked;
 await check('Production reservations are idempotent commitments; accepted-order demand is replaced once by linked batches',async()=>{
  standalone=await scalar('select schedule_production_batch($1,current_date,10,null)',[product]);
  assert.equal(Number(await scalar('select ingredient_reserved_quantity($1)',[ingredient])),20);
  assert.equal(Number(await scalar('select current_quantity from ingredients where id=$1',[ingredient])),100);
  order=await scalar("insert into scheduled_customer_orders(shop_id,client_key,kind,customer_id,pickup_at,production_deadline,items,normalized_items,quoted_subtotal,created_by) values($1,gen_random_uuid(),'preorder',$2,null,null,$3,$3,20,$4) returning id",[shop,customer,JSON.stringify([{product_id:product,qty:2}]),admin]);
  assert.equal(Number(await scalar('select ingredient_reserved_quantity($1)',[ingredient])),24);
  linked=await scalar('select schedule_commercial_production($1,null,current_date,2,$2,true)',[product,order]);
  assert.equal(Number(await scalar('select ingredient_reserved_quantity($1)',[ingredient])),24);
  await db.query('select sync_production_reservations($1)',[shop]);await db.query('select sync_production_reservations($1)',[shop]);
  assert.equal(Number(await scalar('select ingredient_reserved_quantity($1)',[ingredient])),24);
  await scalar('select cancel_production_batch($1)',[linked]);assert.equal(Number(await scalar('select ingredient_reserved_quantity($1)',[ingredient])),24);
  await db.query("update scheduled_customer_orders set status='cancelled' where id=$1",[order]);assert.equal(Number(await scalar('select ingredient_reserved_quantity($1)',[ingredient])),20);
 });
 await check('Latest approved normalized supplier cost drives full recipe cost and target margin without exposing costs to production',async()=>{
  for(const [price,approved] of [[30,true],[40,true],[100,false]])await db.query("insert into ingredient_supplier_offers(shop_id,ingredient_id,supplier_id,package_quantity,package_price,approved,created_by,created_at) values($1,$2,$3,10,$4,$5,$6,now()+($7||' seconds')::interval)",[shop,ingredient,supplier,price,approved,admin,String(price)]);
  const r=(await scalar('select get_recipe_cost_intelligence()')).find(r=>r.id===recipe);assert.equal(Number(r.ingredient_cost),80);assert.equal(Number(r.total_recipe_cost),97);assert.equal(Number(r.cost_per_unit),9.7);assert.equal(r.below_target,true);
  await as(production);await rejects('select get_recipe_cost_intelligence()',[],/Cost access/);let data=await scalar('select get_production_operations()');assert.deepEqual(data.recipes,[]);assert(!JSON.stringify(data).includes('average_unit_cost'));
  await as(inventory);await rejects('select get_supplier_lot_recall($1)',[await scalar('select id from ingredient_lots where ingredient_id=$1 limit 1',[ingredient])],/Recall management/);await as(admin);
 });
 await check('Projected stock subtracts forecast and reservation once and rounds suggestions to supplier packs',async()=>{
  await scalar("select set_ingredient_forecast($1,100,current_date+7,'Expected event demand')",[ingredient]);
  const i=(await scalar('select get_production_operations()')).ingredients.find(i=>i.id===ingredient);
  assert.equal(Number(i.on_hand),100);assert.equal(Number(i.reserved),20);assert.equal(Number(i.forecast),100);assert.equal(Number(i.projected_available),-20);assert.equal(Number(i.suggested_quantity),60);assert.equal(i.classification,'Buy Now');
  const need=await scalar('select create_projected_purchase_need($1)',[ingredient]);assert.equal(await scalar('select create_projected_purchase_need($1)',[ingredient]),need);assert.equal(Number(await scalar('select count(*) from ingredient_purchase_needs where shop_id=$1 and ingredient_id=$2 and status in(\'pending\',\'approved\')',[shop,ingredient])),1);
 });
 await check('Existing FEFO consumption releases reservations on completion, records waste once and traces supplier lot into sale',async()=>{
  const first=await scalar('select id from ingredient_lots where ingredient_id=$1 limit 1',[ingredient]);await db.query('update ingredient_lots set expires_on=current_date+10 where id=$1',[first]);
  await scalar("select adjust_ingredient_stock($1,10,'Earlier expiry delivery')",[ingredient]);const early=await scalar('select id from ingredient_lots where ingredient_id=$1 and id<>$2 order by received_at desc limit 1',[ingredient,first]);await db.query('update ingredient_lots set expires_on=current_date+1,supplier_id=$2 where id=$1',[early,supplier]);
  await scalar('select complete_production_batch($1,8,2,null)',[standalone]);assert.equal(Number(await scalar('select ingredient_reserved_quantity($1)',[ingredient])),0);assert.equal(Number(await scalar('select current_quantity from ingredients where id=$1',[ingredient])),90);
  assert.equal(Number(await scalar('select remaining_quantity from ingredient_lots where id=$1',[early])),0);
  assert.equal(Number(await scalar('select count(*) from inventory_waste_events where production_batch_id=$1',[standalone])),1);
  await rejects('select complete_production_batch($1,8,2,null)',[standalone],/Scheduled batch/);
  const sale=await scalar("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:product,qty:1,expected_unit_price:10}])]);
  const trace=await scalar('select get_supplier_lot_recall($1)',[early]);assert(trace.batches.some(b=>b.id===standalone));assert(trace.sales.some(s=>s.sale_id===sale.sale_id));
 });
 await check('Operational role projections hide costs, reject cross-tenant recall and return stable exception IDs',async()=>{
  const foreign=await scalar("insert into ingredients(shop_id,name,base_unit) values($1,'Foreign Operational Ingredient','g') returning id",[other]);
  await as(production);const data=await scalar('select get_production_operations()');assert(!data.ingredients.some(i=>i.id===foreign));assert(data.waste_causes.every(w=>w.cost===null));
  await db.exec('set role authenticated');await rejects('select sync_production_reservations($1)',[shop],/permission denied/);await db.exec('reset role');await as(admin);
  const a=await scalar('select ux_workspace()'),b=await scalar('select ux_workspace()');assert.deepEqual(a.notifications.map(n=>n.id),b.notifications.map(n=>n.id));assert.equal(new Set(a.notifications.map(n=>n.id)).size,a.notifications.length);
 });
};
