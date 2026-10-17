const fs=require('fs'),path=require('path'),assert=require('assert');
const {PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..');
async function main(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb);
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 create function public.gen_random_bytes(int) returns bytea language sql as $$select decode(repeat('ab',$1),'hex')$$;
 `);
 const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort();
 for(const f of files){let sql=fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8').replace(/create extension if not exists pgcrypto[^;]*;/gi,'');try{await db.exec(sql)}catch(e){console.error('MIGRATION FAILED',f,e.message);throw e}}
 console.log('Applied',files.length,'migrations to local PostgreSQL test engine');
 const uid='11111111-1111-4111-8111-111111111111',shop='22222222-2222-4222-8222-222222222222',prod='33333333-3333-4333-8333-333333333333';
 const other='44444444-4444-4444-8444-444444444444',emp='55555555-5555-4555-8555-555555555555';
 await db.exec(`insert into auth.users(id,email) values('${uid}','admin@test.invalid'),('${emp}','staff@test.invalid');
 insert into public.shops(id,name,tax_rate) values('${shop}','Test shop',0),('${other}','Other shop',0);
 insert into public.staff_profiles(user_id,shop_id,display_name,role) values('${uid}','${shop}','Admin','admin'),('${emp}','${shop}','Staff','employee');
 insert into public.products(id,shop_id,name,price,stock) values('${prod}','${shop}','Cake',35,100);
 insert into public.customer_display_configs(shop_id,access_token,target_labels,enabled) values('${shop}','test-catalogue-token',array['Main POS'],true);
 select set_config('test.user','${uid}',false);`);
 const checks=[];
 async function check(name,fn){await fn();checks.push({name,status:'passed'});console.log('PASS',name)}
 const scalar=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0];
 const rejects=async(sql,params,pattern)=>{let error;try{await db.query(sql,params)}catch(e){error=e}assert(error,'Expected rejection');if(pattern)assert.match(error.message,pattern)};
 await check('No promotion returns regular price',async()=>assert.equal(Number(await scalar('select public.catalogue_effective_price(p) from products p where id=$1',[prod])),35));
 await check('Active fixed promotion and request price agree',async()=>{
 await db.query("select save_catalogue_promotion($1,'fixed',30,now()-interval '1 hour',now()+interval '1 hour',true)",[prod]);
 const catalog=await scalar("select get_customer_display_catalog('test-catalogue-token')");assert.equal(Number(catalog.products[0].price),30);assert.equal(Number(catalog.products[0].regular_price),35);
 const pos=await scalar('select get_pos_catalogue_prices()');assert.equal(Number(pos[0].price),30);
 });
 await check('Percentage and expired/scheduled promotions',async()=>{
 await db.query("select save_catalogue_promotion($1,'percent',20,now()-interval '1 hour',now()+interval '1 hour',false)",[prod]);assert.equal(Number(await scalar('select catalogue_effective_price(p) from products p where id=$1',[prod])),28);
 await db.query("select save_catalogue_promotion($1,'fixed',30,now()-interval '2 hours',now()-interval '1 hour',false)",[prod]);assert.equal(Number(await scalar('select catalogue_effective_price(p) from products p where id=$1',[prod])),35);
 await db.query("select save_catalogue_promotion($1,'fixed',30,now()+interval '1 hour',now()+interval '2 hours',false)",[prod]);assert.equal(Number(await scalar('select catalogue_effective_price(p) from products p where id=$1',[prod])),35);
 });
 await check('Invalid discounts and date windows rejected',async()=>{
 await rejects("select save_catalogue_promotion($1,'percent',101,now(),now()+interval '1 hour',false)",[prod]);
 await rejects("select save_catalogue_promotion($1,'fixed',40,now(),now()+interval '1 hour',false)",[prod]);
 await rejects("select save_catalogue_promotion($1,'fixed',30,now(),now()-interval '1 hour',false)",[prod]);
 });
 await db.query("select save_catalogue_promotion($1,'fixed',30,now()-interval '1 hour',now()+interval '1 hour',true)",[prod]);
 await db.query("select replace_catalogue_product_options($1,array['Small','Large'])",[prod]);
 let request;
 await check('Selection snapshots active promotion and aggregate stock protects shared variants',async()=>{
 request=await scalar("select submit_customer_selection('test-catalogue-token','Main POS',$1,null)",[JSON.stringify([{product_id:prod,quantity:2,option_label:'Large'}])]);assert.equal(Number(request.total),60);
 await db.query('update products set stock=10 where id=$1',[prod]);
 await rejects("select submit_customer_selection('test-catalogue-token','Main POS',$1,null)",[JSON.stringify([{product_id:prod,quantity:6,option_label:'Small'},{product_id:prod,quantity:6,option_label:'Large'}])],/unavailable/);
 await db.query('update products set stock=100 where id=$1',[prod]);
 });
 const cart=[{product_id:prod,qty:2,option_label:'Large',expected_unit_price:30}];
 await check('Claim then checkout records promotion receipt and actual conversion',async()=>{
 await db.query("select claim_customer_selection($1,'Main POS')",[request.request_id]);
 const sale=await scalar("select complete_catalogue_sale(null,'card',$1,null,$2)",[JSON.stringify(cart),request.request_id]);assert.equal(Number(sale.total),60);
 const line=(await db.query('select unit_price,line_total,product_name from sale_items where sale_id=$1',[sale.sale_id])).rows[0];assert.equal(Number(line.unit_price),30);assert.equal(Number(line.line_total),60);assert.match(line.product_name,/Large/);
 const analytics=await scalar("select get_catalogue_analytics(now()-interval '1 day',now()+interval '1 day')");assert.equal(Number(analytics.products[0].converted_requests),1);
 await rejects("select complete_catalogue_sale(null,'card',$1,null,$2)",[JSON.stringify(cart),request.request_id],/already paid/);
 });
 await check('Stale and missing quoted price rejected without stock deduction',async()=>{
 const before=await scalar('select stock from products where id=$1',[prod]);
 await rejects("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{...cart[0],expected_unit_price:35}])],/Prices changed/);
 await rejects("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:prod,qty:1}])],/Prices changed/);
 assert.equal(await scalar('select stock from products where id=$1',[prod]),before);
 await rejects("select complete_sale(null,'card',$1,null)",[JSON.stringify([{...cart[0],qty:null}])],/Invalid quantity/);
 });
 await check('Media primary/label, cross-shop objects and malformed media',async()=>{
 const url=`https://test.invalid/storage/v1/object/public/catalogue-media/${shop}/${prod}/photo.jpg`;
 await db.query("insert into storage.objects(bucket_id,name) values('catalogue-media',$1)",[`${shop}/${prod}/photo.jpg`]);
 await db.query('update products set image_url=$2 where id=$1',[prod,'https://test.invalid/legacy.jpg']);
 await db.query("select save_catalogue_media($1,'[]',$2)",[prod,url]);
 assert.equal(await scalar('select image_url from products where id=$1',[prod]),'https://test.invalid/legacy.jpg');
 await db.query('select save_catalogue_media($1,$2,$3)',[prod,JSON.stringify([{url}]),url]);
 assert.equal(await scalar('select image_url from products where id=$1',[prod]),url);
 await rejects('select save_catalogue_media($1,$2,null)',[prod,JSON.stringify([{url:url.replace(shop,other)}])],/Invalid catalogue media/);
 await rejects("select save_catalogue_media($1,'{}',null)",[prod]);
 });
 await check('Token view validation, session dedup and administrator analytics',async()=>{
 await db.query("select record_catalogue_views('test-catalogue-token',$1,array[$2::uuid])",[uid,prod]);await db.query("select record_catalogue_views('test-catalogue-token',$1,array[$2::uuid])",[uid,prod]);
 assert.equal(Number(await scalar('select count(*) from catalogue_view_events')),1);
 await rejects("select record_catalogue_views('bad-token',$1,array[$2::uuid])",[uid,prod],/Invalid customer/);
 assert(Number(await scalar('select count(*) from catalogue_price_history'))>=5);
 });
 await check('Employees cannot manage promotions/media or read analytics',async()=>{
 await db.query("select set_config('test.user',$1,false)",[emp]);
 await rejects("select save_catalogue_promotion($1,null,null,null,null,false)",[prod],/Administrator/);
 await rejects("select save_catalogue_media($1,'[]',null)",[prod],/Administrator/);
 await rejects("select get_catalogue_analytics(now()-interval '1 day',now())",[],/Administrator/);
 await db.query("select set_config('test.user',$1,false)",[uid]);
 });
 await check('Cross-shop mutations and invalid token payloads rejected',async()=>{
 const foreign='66666666-6666-4666-8666-666666666666';await db.query('insert into products(id,shop_id,name,price,stock) values($1,$2,$3,10,10)',[foreign,other,'Foreign product']);
 await rejects("select save_catalogue_promotion($1,'fixed',5,now(),now()+interval '1 hour',false)",[foreign],/Product not found/);
 await rejects("select save_catalogue_media($1,'[]',null)",[foreign],/Product not found/);
 const payload=await scalar('select get_catalogue_admin()');assert(!payload.products.some(p=>p.id===foreign));
 await db.query("select record_catalogue_views('test-catalogue-token',$1,array[$2::uuid])",[emp,foreign]);assert.equal(Number(await scalar('select count(*) from catalogue_view_events where product_id=$1',[foreign])),0);
 await rejects("update products set promotion_kind=null where id=$1",[prod]);
 });
 await check('Unavailable customer product and inactive option blocked at payment',async()=>{
 await db.query('update products set catalogue_sold_out=true where id=$1',[prod]);
 await rejects("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{...cart[0],catalogue_request:true}])],/unavailable/);
 await db.query('update products set catalogue_sold_out=false where id=$1',[prod]);
 await db.query("update catalogue_product_options set active=false where product_id=$1 and label='Large'",[prod]);
 await rejects("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify(cart)],/Option unavailable/);
 });
 await check('Storage policies allow own admin folder and deny cross-shop/employee upload',async()=>{
 await db.exec('alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant insert on storage.objects to authenticated;');
 await db.exec('set role authenticated');
 await db.query("insert into storage.objects(bucket_id,name) values('catalogue-media',$1)",[`${shop}/${prod}/admin.jpg`]);
 await rejects("insert into storage.objects(bucket_id,name) values('catalogue-media',$1)",[`${other}/${prod}/foreign.jpg`],/row-level security/);
 await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[emp]);await db.exec('set role authenticated');
 await rejects("insert into storage.objects(bucket_id,name) values('catalogue-media',$1)",[`${shop}/${prod}/employee.jpg`],/row-level security/);
 await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[uid]);
 });
 await db.query('select save_catalogue_promotion($1,null,null,null,null,false)',[prod]);
 await db.query('update catalogue_product_options set active=true where product_id=$1',[prod]);
 let small,large,comboId;
 await check('Catalogue metadata and standalone payload expose only customer fields',async()=>{
 await db.query("select save_catalogue_metadata($1,array['birthday'],array['Milk'],array['Vegetarian'],'Keep chilled')",[prod]);
 const payload=await scalar("select get_commercial_catalogue('test-catalogue-token')");assert.deepEqual(payload.products[0].allergens,['Milk']);assert.equal(payload.products[0].notes,'Keep chilled');assert(!('cost_price' in payload.products[0]));assert(!('access_token' in payload));
 });
 await check('Proper variants have unique prices identities and immutable inventory mode',async()=>{
 small=await scalar('select save_product_variant($1,null,$2)',[prod,JSON.stringify({name:'Small',price:20,sku:'C-S',barcode:'101',independent_stock:false,recipe_scale:.5,unit_cost:4})]);
 large=await scalar('select save_product_variant($1,null,$2)',[prod,JSON.stringify({name:'Large',price:50,sku:'C-L',barcode:'102',independent_stock:true,recipe_scale:2,unit_cost:15})]);
 await rejects('select save_product_variant($1,$2,$3)',[prod,small,JSON.stringify({name:'Small',price:20,independent_stock:true})],/immutable/);
 await rejects('select save_product_variant($1,null,$2)',[prod,JSON.stringify({name:'Copy',price:20,barcode:'101'})]);
 await rejects("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:prod,qty:1,expected_unit_price:35}])],/Select a product variant/);
 });
 await check('Shared variant price receipt cost and master stock deduction',async()=>{
 const stock=Number(await scalar('select stock from products where id=$1',[prod]));
 const result=await scalar("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:prod,variant_id:small,qty:2,expected_unit_price:20}])]);
 const item=(await db.query('select * from sale_items where sale_id=$1',[result.sale_id])).rows[0];assert.equal(Number(item.unit_price),20);assert.equal(Number(item.unit_cost_snapshot),4);assert.equal(item.variant_id,small);assert.match(item.product_name,/Small/);assert.equal(Number(await scalar('select stock from products where id=$1',[prod])),stock-2);
 });
 let independentSale;
 await check('Independent variant lot stock deducts once without touching master stock',async()=>{
 await db.query("select adjust_variant_inventory($1,5,'Opening baked units',current_date+2)",[large]);const base=await scalar('select stock from products where id=$1',[prod]);
 independentSale=await scalar("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:prod,variant_id:large,qty:2,expected_unit_price:50}])]);assert.equal(Number(independentSale.total),100);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[large])),3);assert.equal(await scalar('select stock from products where id=$1',[prod]),base);assert.equal(Number(await scalar('select sum(remaining_quantity) from variant_stock_lots where variant_id=$1',[large])),3);
 const before=await scalar('select stock from product_variants where id=$1',[large]);await rejects("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:prod,variant_id:large,qty:4,expected_unit_price:50}])],/Insufficient variant/);assert.equal(await scalar('select stock from product_variants where id=$1',[large]),before);
 });
 await check('Variant FEFO excludes expired lots and preserves stock on failure',async()=>{
 await db.query("select adjust_variant_inventory($1,2,'Expired test stock',current_date-1)",[large]);
 await rejects("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:prod,variant_id:large,qty:4,expected_unit_price:50}])],/non-expired variant/);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[large])),5);
 });
 let bundleSale;
 await check('Fixed bundle allocates exact price and deducts every component once',async()=>{
 comboId=await scalar('select save_catalogue_combo(null,$1)',[JSON.stringify({name:'Cake Pair',price:60,components:[{product_id:prod,variant_id:small,qty:1},{product_id:prod,variant_id:large,qty:1}]})]);
 const base=Number(await scalar('select stock from products where id=$1',[prod]));bundleSale=await scalar("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{combo_id:comboId,qty:1,expected_unit_price:60}])]);assert.equal(Number(bundleSale.total),60);const lines=(await db.query('select * from sale_items where sale_id=$1',[bundleSale.sale_id])).rows;assert.equal(lines.length,2);assert.equal(lines.reduce((n,i)=>n+Number(i.line_total),0),60);assert(lines.every(i=>i.combo_id===comboId));assert.equal(Number(await scalar('select stock from products where id=$1',[prod])),base-1);
 });
 await check('Category-choice combos validate choices and reject a foreign shop product',async()=>{
 const cat=await scalar("insert into categories(shop_id,name) values($1,'Cakes') returning id",[shop]);await db.query('update products set category_id=$2 where id=$1',[prod,cat]);
 const choice=await scalar('select save_catalogue_combo(null,$1)',[JSON.stringify({name:'Choose Cake',price:18,components:[{category_id:cat,qty:1}]})]);
 await rejects("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{combo_id:choice,qty:1,expected_unit_price:18,choices:[{product_id:'66666666-6666-4666-8666-666666666666'}]}])],/required combo category/);
 const paid=await scalar("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{combo_id:choice,qty:1,expected_unit_price:18,choices:[{product_id:prod,variant_id:small}]}])]);assert.equal(Number(paid.total),18);
 });
 let liveRequest;
 await check('Kitchen workflow friendly order numbers and ready-display privacy',async()=>{
 liveRequest=await scalar("select submit_customer_selection('test-catalogue-token','Main POS',$1,'No candles')",[JSON.stringify([{product_id:prod,variant_id:small,qty:1}])]);assert.match(liveRequest.order_number,/\d{4}-\d{3,}/);
 await db.query("select set_preparation_order_status($1,'preparing')",[liveRequest.request_id]);await db.query("select set_preparation_order_status($1,'ready')",[liveRequest.request_id]);
 const board=await scalar("select get_customer_ready_board('test-catalogue-token')");const entry=board.orders.find(o=>o.number===liveRequest.order_number);assert(entry);assert.deepEqual(Object.keys(entry).sort(),['number','ready_at','status']);await rejects("select set_preparation_order_status($1,'completed')",[liveRequest.request_id],/paid/);
 await db.query("select claim_customer_selection($1,'Main POS')",[liveRequest.request_id]);await scalar("select complete_catalogue_sale(null,'card',$1,null,$2)",[JSON.stringify([{product_id:prod,variant_id:small,qty:1,expected_unit_price:20}]),liveRequest.request_id]);await db.query("select set_preparation_order_status($1,'completed')",[liveRequest.request_id]);
 });
 let customer,preorder,cake;
 await check('Pre-order quote deposit and final payment are idempotent and linked',async()=>{
 customer=await scalar("insert into customers(shop_id,name) values($1,'Test Customer') returning id",[shop]);
 const key='77777777-7777-4777-8777-777777777777';const val={kind:'preorder',customer_id:customer,pickup_at:new Date(Date.now()+86400000*3).toISOString(),production_deadline:new Date(Date.now()+86400000*2).toISOString(),items:[{product_id:prod,variant_id:small,qty:2,name:'Small Cake'}]};
 preorder=await scalar('select save_scheduled_order(null,$1,$2)',[key,JSON.stringify(val)]);assert.equal(await scalar('select save_scheduled_order(null,$1,$2)',[key,JSON.stringify(val)]),preorder);
 const depositKey='88888888-8888-4888-8888-888888888888';await db.query("select record_scheduled_deposit($1,$2,10,'card')",[preorder,depositKey]);await db.query("select record_scheduled_deposit($1,$2,10,'card')",[preorder,depositKey]);assert.equal(Number(await scalar('select deposit_total from scheduled_customer_orders where id=$1',[preorder])),10);
 const sale=await scalar("select complete_scheduled_order_sale($1,'card',30,null)",[preorder]);assert.equal(Number(sale.total),40);assert.equal(Number(sale.balance_paid),30);await rejects("select complete_scheduled_order_sale($1,'card',30,null)",[preorder],/already paid/);const receipt=await scalar('select get_sale_receipt($1)',[sale.sale_id]);assert.equal(Number(receipt.deposit_applied),10);
 });
 await check('Custom cake quote private reference and cash deposits balance correctly',async()=>{
 await db.query('select open_cash_drawer(100,null)');
 const key='99999999-9999-4999-8999-999999999999';cake=await scalar('select save_scheduled_order(null,$1,$2)',[key,JSON.stringify({kind:'cake',customer_id:customer,pickup_at:new Date(Date.now()+86400000*3).toISOString(),production_deadline:new Date(Date.now()+86400000*2).toISOString(),items:[{product_id:prod,variant_id:small,qty:1}],quoted_subtotal:80,details:{cake_size:'8 inch',flavor:'Vanilla',message_writing:'Happy birthday',production_instructions:'Use blue frosting'}})]);
 await db.query("select record_scheduled_deposit($1,$2,20,'cash')",[cake,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
 const result=await scalar("select complete_scheduled_order_sale($1,'cash',60,70)",[cake]);assert.equal(Number(result.total),80);assert.equal(Number(await scalar('select change_due from sales where id=$1',[result.sale_id])),10);
 const cash=Number(await scalar("select sum(amount) from cash_drawer_transactions where transaction_type<>'opening_float'"));assert.equal(cash,80);
 });
 await check('Explainable forecast and approved scheduling do not deduct inventory',async()=>{
 const f=await scalar('select get_production_forecast(current_date,28,true,10)');assert(f.method.includes('zero-sales'));assert(f.eligible_days>0);assert(f.products.some(p=>p.id===prod));
 const before=await scalar('select stock from products where id=$1',[prod]);await scalar('select schedule_commercial_production($1,$2,current_date+1,2,null,false)',[prod,small]);assert.equal(await scalar('select stock from products where id=$1',[prod]),before);
 });
 await check('Shortage alerts refresh resolve/dismiss and retain audit events',async()=>{
 await db.query('update products set low_stock_at=1000 where id=$1',[prod]);const alerts=await scalar('select refresh_production_shortages()');const alert=alerts.find(a=>a.entity_id===prod);assert(alert.shortage_quantity>0);await rejects("select update_shortage_alert($1,'resolved','Still short')",[alert.id],/still present/);await db.query("select update_shortage_alert($1,'dismissed','Reviewed stock plan')",[alert.id]);const again=await scalar('select refresh_production_shortages()');assert.equal(again.find(a=>a.id===alert.id).status,'dismissed');
 await db.query('update products set low_stock_at=0 where id=$1',[prod]);const covered=await scalar('select refresh_production_shortages()');assert.equal(covered.find(a=>a.id===alert.id).status,'resolved');
 });
 await check('Independent-variant refunds restore only its own lots and stock',async()=>{
 await db.exec("create function extensions.crypt(text,text) returns text language sql immutable as $$select case when $1='1234' then $2 else '' end$$;");await db.query("update staff_profiles set pin_hash='mock-hash' where user_id=$1",[uid]);
 const base=await scalar('select stock from products where id=$1',[prod]);const before=Number(await scalar('select stock from product_variants where id=$1',[large]));
 await scalar("select process_sale_adjustment($1,'full','[]',true,'Test refund','1234',null)",[independentSale.sale_id]);assert.equal(await scalar('select stock from products where id=$1',[prod]),base);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[large])),before+2);
 assert.equal(Number(await scalar('select sum(remaining_quantity) from variant_stock_lots where variant_id=$1',[large])),before+2);await rejects("select process_sale_adjustment($1,'full','[]',true,'Duplicate','1234',null)",[independentSale.sale_id]);
 });
 await check('Bundle refund value equals allocated sale price and restores all components',async()=>{
 const base=Number(await scalar('select stock from products where id=$1',[prod])),stock=Number(await scalar('select stock from product_variants where id=$1',[large]));
 const r=await scalar("select process_sale_adjustment($1,'full','[]',true,'Bundle refund','1234',null)",[bundleSale.sale_id]);assert.equal(Number(r.refund_total??r.total),60);assert.equal(Number(await scalar('select stock from products where id=$1',[prod])),base+1);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[large])),stock+1);
 });
 await check('Independent variant approved production transfers output once',async()=>{
 const base=Number(await scalar('select stock from products where id=$1',[prod])),stock=Number(await scalar('select stock from product_variants where id=$1',[large]));
 const id=await scalar('select schedule_commercial_production($1,$2,current_date+1,2,null,false)',[prod,large]);await scalar("select complete_production_batch($1,4,0,'Finished two large cakes')",[id]);assert.equal(Number(await scalar('select stock from products where id=$1',[prod])),base);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[large])),stock+2);await rejects("select complete_production_batch($1,4,0,'Duplicate')",[id]);
 });
 await check('Scheduled production plans are linked and duplicate approval is rejected',async()=>{
 const id=await scalar('select save_scheduled_order(null,$1,$2)',['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',JSON.stringify({kind:'preorder',customer_id:customer,pickup_at:new Date(Date.now()+86400000*3).toISOString(),production_deadline:new Date(Date.now()+86400000*2).toISOString(),items:[{product_id:prod,variant_id:small,qty:1}]})]);await scalar('select schedule_scheduled_order_production($1,current_date+1,false)',[id]);await rejects('select schedule_scheduled_order_production($1,current_date+1,false)',[id],/already scheduled/);
 });
 await check('Variant disable preserves receipt history and blocks new selection',async()=>{
 const history=(await db.query('select product_name,variant_snapshot from sale_items where sale_id=$1',[independentSale.sale_id])).rows[0];await db.query('update product_variants set active=false where id=$1',[large]);await rejects("select submit_customer_selection('test-catalogue-token','Main POS',$1,null)",[JSON.stringify([{product_id:prod,variant_id:large,qty:1}])],/Variant unavailable/);assert.deepEqual((await db.query('select product_name,variant_snapshot from sale_items where sale_id=$1',[independentSale.sale_id])).rows[0],history);
 });
 await check('Staff catalogue works when customer display is disabled; cart repricing is authoritative',async()=>{
 await db.query('update customer_display_configs set enabled=false where shop_id=$1',[shop]);const staff=await scalar('select get_commercial_catalogue(null)');assert(staff.products.some(p=>p.id===prod));await rejects("select get_commercial_catalogue('test-catalogue-token')",[],/unavailable/);await db.query('update customer_display_configs set enabled=true where shop_id=$1',[shop]);
 await db.query('update product_variants set price=22 where id=$1',[small]);const prices=await scalar('select reprice_commercial_cart($1)',[JSON.stringify([{product_id:prod,variant_id:small,qty:1}])]);assert.equal(Number(prices[0].price),22);
 const paid=await scalar("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:prod,variant_id:small,qty:1,expected_unit_price:22,__unit_price:1,__line_total:1}])]);assert.equal(Number(paid.total),22);
 });
 await check('Every new table has RLS and API roles cannot write ledgers or invoke private helpers',async()=>{
 const names=['product_variants','variant_inventory_events','commercial_events','variant_stock_lots','variant_stock_allocations','catalogue_combos','customer_order_counters','scheduled_customer_orders','scheduled_order_deposits','production_shortage_alerts'];
 for(const name of names)assert.equal(await scalar('select relrowsecurity from pg_class where relname=$1',[name]),true);
 await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated,anon;set role authenticated;');
 await rejects("insert into product_variants(shop_id,product_id,name,price) values($1,$2,'Unauthorized direct write',5)",[shop,prod],/row-level security/);
 await db.exec('reset role;set role anon;');await rejects('select commercial_staff_catalogue_payload($1)',[shop],/permission denied/);await rejects('select normalize_commercial_items($1,$2,false,false)',[other,'[]'],/permission denied/);assert.equal(Number(await scalar('select count(*) from scheduled_customer_orders')),0);await db.exec('reset role;');
 });
 await check('Recipe-scaled variant production consumes usable ingredients once and propagates expiry/cost',async()=>{
 await db.query('update product_variants set active=true where id=$1',[large]);
 const ingredient=await scalar("insert into ingredients(shop_id,name,base_unit,current_quantity,average_unit_cost) values($1,'Sugar','g',120,1) returning id",[shop]);
 await db.query("insert into ingredient_lots(shop_id,ingredient_id,lot_code,received_quantity,remaining_quantity,unit_cost_snapshot,expires_on,created_by) values($1,$2,'ACTIVE',100,100,1,current_date+30,$3),($1,$2,'EXPIRED',20,20,1,current_date-1,$3)",[shop,ingredient,uid]);
 const recipe=await scalar('insert into product_recipes(shop_id,product_id,batch_yield,created_by,updated_by) values($1,$2,2,$3,$3) returning id',[shop,prod,uid]);await db.query('insert into recipe_items(shop_id,recipe_id,ingredient_id,quantity_required) values($1,$2,$3,10)',[shop,recipe,ingredient]);
 const id=await scalar('select schedule_commercial_production($1,$2,current_date+1,2,null,false)',[prod,large]);const master=await scalar('select stock from products where id=$1',[prod]);await scalar("select complete_production_batch_with_trace($1,4,0,'Variant recipe test','LARGE-BATCH',current_date+5)",[id]);
 assert.equal(Number(await scalar('select current_quantity from ingredients where id=$1',[ingredient])),100);assert.equal(Number(await scalar("select remaining_quantity from ingredient_lots where ingredient_id=$1 and lot_code='EXPIRED'",[ingredient])),20);assert.equal(Number(await scalar('select unit_cost from product_variants where id=$1',[large])),10);assert.equal(await scalar('select stock from products where id=$1',[prod]),master);
 const lot=(await db.query('select batch_code,best_before_on,unit_cost_snapshot from variant_stock_lots where production_batch_id=$1',[id])).rows[0];assert.equal(lot.batch_code,'LARGE-BATCH');assert(lot.best_before_on);assert.equal(Number(lot.unit_cost_snapshot),10);
 await rejects("select complete_production_batch_with_trace($1,4,0,'Duplicate','LARGE-BATCH',current_date+5)",[id]);assert.equal(Number(await scalar('select current_quantity from ingredients where id=$1',[ingredient])),100);
 const alerts=await scalar('select refresh_production_shortages()');assert(Array.isArray(alerts));
 });
 await check('POS quote and checkout agree for a loyalty reward on allocated bundle pricing',async()=>{
 await db.query("insert into loyalty_memberships(shop_id,customer_id,member_code) values($1,$2,'TEST-MEMBER')",[shop,customer]);
 const reward=await scalar("insert into loyalty_rewards(shop_id,name,reward_type,product_id) values($1,'Free cake component','free_product',$2) returning id",[shop,prod]);
 const items=[{combo_id:comboId,qty:1,expected_unit_price:60}];const quote=await scalar('select quote_commercial_sale($1,$2,$3)',[JSON.stringify(items),customer,reward]);const result=await scalar("select complete_catalogue_sale($1,'card',$2,$3,null)",[customer,JSON.stringify(items),reward]);assert.equal(Number(result.total),Number(quote.total));assert.equal(Number(result.discount),Number(quote.discount));assert(Number(quote.discount)<22);
 });
 await check('Customer profile history links scheduled orders and sales; large order numbers do not truncate',async()=>{
 const history=await scalar('select get_customer_commercial_history($1)',[customer]);assert(history.orders.some(o=>o.id===cake));assert(history.sales.length>=2);await db.query('update customer_order_counters set last_number=999 where shop_id=$1',[shop]);const order=await scalar("select submit_customer_selection('test-catalogue-token','Main POS',$1,null)",[JSON.stringify([{product_id:prod,variant_id:small,qty:1}])]);assert(order.order_number.endsWith('-1000'));
 });
 await check('Source-batch recalls and held-lot refunds/disposal cannot reintroduce unavailable variant stock',async()=>{
 const source=await scalar("select id from finished_product_batches where batch_code='LARGE-BATCH'");const before=Number(await scalar('select stock from product_variants where id=$1',[large]));await scalar("select recall_finished_product_batch($1,'Source ingredient recall')",[source]);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[large])),before-2);assert.equal(await scalar("select status from variant_stock_lots where batch_code='LARGE-BATCH'"),'recalled');
 const variant=await scalar('select save_product_variant($1,null,$2)',[prod,JSON.stringify({name:'Recall Test',price:10,independent_stock:true,recipe_scale:1,unit_cost:5})]);await db.query("select adjust_variant_inventory($1,2,'Test received lot',current_date+2)",[variant]);const sale=await scalar("select complete_catalogue_sale(null,'card',$1,null,null)",[JSON.stringify([{product_id:prod,variant_id:variant,qty:1,expected_unit_price:10}])]);const lot=await scalar('select id from variant_stock_lots where variant_id=$1',[variant]);await db.query("select manage_variant_lot($1,'recall',null,'Hold test lot')",[lot]);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[variant])),0);await scalar("select process_sale_adjustment($1,'full','[]',true,'Held-lot return','1234',null)",[sale.sale_id]);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[variant])),0);assert.equal(Number(await scalar('select remaining_quantity from variant_stock_lots where id=$1',[lot])),2);await db.query("select manage_variant_lot($1,'dispose',2,'Disposed held lot')",[lot]);assert.equal(Number(await scalar('select stock from product_variants where id=$1',[variant])),0);assert.equal(Number(await scalar('select remaining_quantity from variant_stock_lots where id=$1',[lot])),0);
 });
 await check('Commercial mutations and private checkout helper enforce staff/admin boundaries',async()=>{
 await db.query("select set_config('test.user',$1,false)",[emp]);await rejects('select save_product_variant($1,null,$2)',[prod,JSON.stringify({name:'Forbidden',price:10})],/Administrator/);await rejects('select save_catalogue_combo(null,$1)',[JSON.stringify({})],/Administrator/);await rejects('select get_production_forecast(current_date,28,true,10)',[],/Administrator/);
 await db.exec('set role authenticated');await rejects("select complete_sale(null,'card','[]',null)",[],/permission denied/);await rejects('select normalize_commercial_items($1,$2,false,false)',[shop,'[]'],/permission denied/);await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[uid]);
 });
 await require('./rc1-database-checks.cjs')({db,check,scalar,rejects,uid,emp,shop,other,prod});
 await require('./original-image-database.cjs')({db,check,scalar,rejects});
 await require('./customer-request-database.cjs')({db,check,scalar,rejects,other,emp});
 await require('./ux-database.cjs')({db,check,scalar,rejects});
 await require('./finalization-database.cjs')({db,check,scalar,rejects});
 await require('./phone-receipt-database.cjs')({db,check,scalar,rejects});
 await require('./ingredient-purchasing-database.cjs')({db,check,scalar,rejects});
 await require('./production-operations-database.cjs')({db,check,scalar,rejects});
 await require('./workspace-recovery-database.cjs')({db,check,scalar,rejects});
 await require('./operations-import-database.cjs')({db,check,scalar,rejects});
 fs.writeFileSync(path.join(root,'DATABASE_TEST_RESULTS.json'),JSON.stringify({version:'2.0.0-rc.5',build:'2026-10-17-operations1',migration_count:files.length,database_engine:'PGlite PostgreSQL with mocked Supabase auth/storage and mocked manager-PIN crypt for refund tests; pgcrypto extension omitted',checks,limitations:['Live Supabase deployment, real bcrypt PIN checks, storage HTTP upload, Edge Functions and browser UAT still require target-environment verification.']},null,2));
 await db.close();
}
main().catch(e=>{console.error(e.message);process.exit(1)});
