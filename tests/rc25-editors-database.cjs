const fs=require('fs'),path=require('path'),assert=require('assert');const {PGlite}=require('@electric-sql/pglite');const root=path.resolve(__dirname,'..');
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
 for(const f of files){if(f==='202610181600_ingredient_measurement_units.sql')await db.exec(`insert into shops(id,name)values('12121212-1212-4212-8212-121212121212','RC11 upgrade fixture');do $$declare c record;begin for c in select conname from pg_constraint where conrelid='ingredients'::regclass and contype='c' and pg_get_constraintdef(oid) like '%base_unit%' loop execute format('alter table ingredients drop constraint %I',c.conname);end loop;end$$;insert into ingredients(id,shop_id,name,base_unit,current_quantity,average_unit_cost)values('12121212-1212-4212-8212-121212121213','12121212-1212-4212-8212-121212121212','Known legacy','g',123.456,.123456),('12121212-1212-4212-8212-121212121214','12121212-1212-4212-8212-121212121212','Unknown legacy','old-scoop',7.25,1.25);`);let sql=fs.readFileSync(path.join(root,'supabase/migrations',f),'utf8').replace(/create extension if not exists pgcrypto[^;]*;/gi,'');try{await db.exec(sql)}catch(e){console.error('MIGRATION FAILED',f,e.message,e.position,e.internalPosition,e.where,e.internalQuery,sql.slice(Math.max(0,Number(e.position)-120),Number(e.position)+120));throw e}}

 console.log('PASS applied '+files.length+' exact migrations');
 const scalar=async(sql,p=[])=>Object.values((await db.query(sql,p.map(v=>v&&typeof v==='object'?JSON.stringify(v):v))).rows[0])[0],id=()=>scalar('select gen_random_uuid()');let passes=0;
 const check=async(name,fn)=>{await fn();passes++;console.log('PASS '+name)};
 const rejects=async(sql,p=[])=>{let error;try{await db.query(sql,p.map(v=>v&&typeof v==='object'?JSON.stringify(v):v))}catch(e){error=e}assert(error,'Expected denial')};
 const admin=await id(),shop=await id(),foreign=await id(),category=await id(),prod=await id();
 await db.query("insert into auth.users(id,email)values($1,'editors@test.invalid')",[admin]);await db.query("insert into shops(id,name,tax_rate)values($1,'Editor Bakery',0),($2,'Other bakery',0)",[shop,foreign]);await db.query("insert into staff_profiles(user_id,shop_id,display_name,role)values($1,$2,'Owner','admin')",[admin,shop]);await db.query("select set_config('test.user',$1,false)",[admin]);
 await db.query("insert into categories(id,shop_id,name)values($1,$2,'Cakes')",[category,shop]);await db.query("insert into products(id,shop_id,category_id,name,price,stock,image_url)values($1,$2,$3,'Unchanged Cake',10,100,'/unchanged-product.jpg')",[prod,shop,category]);
 const editors=await scalar('select get_catalogue_editors()');const token=await scalar('select access_token from customer_display_configs where shop_id=$1',[shop]);
 const media=(id,bucket)=>({id,path:shop+'/'+id+'-crop',original:shop+'/'+id+'-original',captions:{en:'Caption '+id,'zh-TW':'圖片 '+id}});
 const home={default_language:'en',translations:{en:{heading:'Owner heading',welcome:'Welcome',subtitle:'Hand made',promo:'Today',cta:'Browse'},'zh-TW':{heading:'商家標題'}},media:[media('first'),media('second')],hero_visible:true,links_visible:true,products_visible:true,cta_target:'categories',desktop_fit:'cover',mobile_fit:'contain'};
 const cat={default_language:'en',translations:{en:{name:'Cakes display',description:'Cake description'},es:{name:'Pasteles',description:'Descripción'}},media:[media('category')],visible:true};
 for(const [bucket,items]of [['catalogue-home',home.media],['catalogue-categories',cat.media]])for(const m of items)for(const path of [m.path,m.original])await db.query('insert into storage.objects(bucket_id,name)values($1,$2)',[bucket,path]);
 let homeRevision,categoryRows;
 await check('home saves multilingual text, image order and original references',async()=>{const x=await scalar('select save_catalogue_home($1,0)',[home]);homeRevision=x.revision;assert.deepEqual(x.value,home);assert.equal((await scalar('select get_catalogue_editors()')).home.value.translations['zh-TW'].heading,'商家標題')});
 await check('category name/cover/locale saves preserve product ID and product image',async()=>{categoryRows=await scalar('select save_catalogue_categories($1)',[[{id:category,name:'Bakery Cakes',revision:0,value:cat}]]);assert.equal(await scalar('select category_id from products where id=$1',[prod]),category);assert.equal(await scalar('select image_url from products where id=$1',[prod]),'/unchanged-product.jpg');assert.deepEqual((await scalar('select get_catalogue_editors()')).home.value,home)});
 const about={enabled:true,default_language:'en',copy:{heading:'Our story',intro:'Introduction',story:'One\n\nTwo',alt:'Photo',highlight:'Care'},translations:{es:{heading:'Historia',intro:'',story:'',alt:''}},image_path:null};
 await check('About existing record saves independently of home/categories',async()=>{await scalar('select save_catalogue_about($1,0)',[about]);assert.deepEqual((await scalar('select get_catalogue_editors()')).home.value,home);assert.deepEqual(await scalar('select get_catalogue_about($1)',[token]),about)});
 await check('home reorder and removal do not overwrite About/category/product media',async()=>{home.media.reverse();const x=await scalar('select save_catalogue_home($1,$2)',[home,homeRevision]);homeRevision=x.revision;assert.equal(x.value.media[0].id,'second');assert.deepEqual(await scalar('select get_catalogue_about($1)',[token]),about);assert.equal((await scalar('select get_catalogue_editors()')).categories[0].value.media[0].id,'category')});
 await check('stale revisions and foreign media paths rejected without publication',async()=>{await rejects('select save_catalogue_home($1,0)',[home]);await rejects('select save_catalogue_home($1,$2)',[{...home,media:[{...home.media[0],path:foreign+'/x'}]},homeRevision]);assert.deepEqual((await scalar('select get_catalogue_editors()')).home.value,home)});
 await check('category hide excludes public products but leaves internal POS and records intact',async()=>{categoryRows=await scalar('select save_catalogue_categories($1)',[[{...categoryRows[0],value:{...cat,visible:false}}]]);assert(!(await scalar('select get_commercial_catalogue($1)',[token])).products.some(p=>p.id===prod));assert((await scalar('select get_commercial_catalogue(null)')).products.some(p=>p.id===prod));categoryRows=await scalar('select save_catalogue_categories($1)',[[{...categoryRows[0],value:cat}]]);assert((await scalar('select get_commercial_catalogue($1)',[token])).products.some(p=>p.id===prod))});
 await check('category add/reorder uses existing category table',async()=>{const second=await id();const rows=await scalar('select save_catalogue_categories($1)',[[{id:second,name:'Bread',revision:0,value:{...cat,media:[]}},categoryRows[0]]]);assert.equal(rows[0].id,second);assert.equal(await scalar('select shop_id from categories where id=$1',[second]),shop)});
 await check('anonymous editor access denied and only published media readable',async()=>{await db.exec('set role anon');await rejects('select get_catalogue_editors()');assert.equal(await scalar('select catalogue_editor_image_public($1,$2)',['catalogue-home',home.media[0].path]),true);assert.equal(await scalar('select catalogue_editor_image_public($1,$2)',['catalogue-home',foreign+'/x']),false);await db.exec('reset role')});
 await check('customer submit creates one scoped notification; read/all-read are idempotent',async()=>{const key=await id();await db.query("select set_config('test.user','',false)");await db.exec('set role anon');const args=[token,key,[{product_id:prod,qty:1,expected_unit_price:10}],{name:'Guest Name',method:'whatsapp',contact:'+5016001234',phone:'+5016001234'}];await scalar('select submit_catalogue_preorder($1,$2,$3,$4)',args);await scalar('select submit_catalogue_preorder($1,$2,$3,$4)',args);await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[admin]);const inbox=await scalar('select get_order_alert_inbox()');assert.equal(inbox.events.length,1);assert.equal(inbox.events[0].customer_name,'Guest Name');assert.equal(Number(inbox.events[0].item_count),1);assert.equal(inbox.events[0].preferred_method,'whatsapp');await scalar('select acknowledge_order_alert($1)',[inbox.events[0].id]);await scalar('select acknowledge_order_alert($1)',[inbox.events[0].id]);assert.equal((await scalar('select get_order_alert_inbox()')).unread_count,0);await scalar('select acknowledge_all_order_alerts()');assert.equal((await scalar('select get_order_alert_inbox()')).events.length,0)});
 await check('foreign workspace and unauthorized roles cannot read events or edit content',async()=>{const other=await id(),staff=await id();await db.query('insert into auth.users(id) values($1),($2)',[other,staff]);await db.query("insert into staff_profiles(user_id,shop_id,display_name,role,workspace_role) values($1,$2,'Other owner','admin','cashier'),($3,$4,'Inventory','employee','inventory')",[other,foreign,staff,shop]);await db.query("select set_config('test.user',$1,false)",[other]);await db.exec('set role authenticated');assert.equal((await scalar('select get_order_alert_inbox()')).events.length,0);assert.equal(Number(await scalar('select count(*) from order_alert_events where shop_id=$1',[shop])),0);await rejects('select save_catalogue_categories($1)',[[{...categoryRows[0],value:cat}]]);await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[staff]);await db.exec('set role authenticated');await rejects('select get_order_alert_inbox()');await rejects('select get_catalogue_editors()');await rejects('select acknowledge_all_order_alerts()');assert.equal(Number(await scalar('select count(*) from order_alert_events')),0);await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[admin])});
 await check('new business public branding is neutral CounterNest',async()=>{const x=await scalar('select get_commercial_catalogue($1)',[token]);assert(/counternest/i.test(x.logo_url));assert(!/chubby/i.test(x.logo_url))});

 await check('private drafts retry once, reject changed payloads and do not publish',async()=>{
  const operation=await id(),value={value:{...home,translations:{en:{heading:'Private work'}}},revision:homeRevision};
  const args=['home','main',value,{revision:homeRevision},0,operation];
  const first=await scalar('select save_editor_draft($1,$2,$3,$4,$5,$6)',args);
  const retry=await scalar('select save_editor_draft($1,$2,$3,$4,$5,$6)',args);
  assert.equal(first.revision,1);assert.equal(retry.revision,1);
  await rejects('select save_editor_draft($1,$2,$3,$4,$5,$6)',['home','main',{changed:true},{revision:homeRevision},0,operation]);
  assert.deepEqual((await scalar('select get_catalogue_editors()')).home.value,home);
  assert.deepEqual((await scalar("select editor_draft('home')")).value,value);
 });
 await check('draft stale writes and stale discard cannot lose another edit',async()=>{
  await rejects('select save_editor_draft($1,$2,$3,$4,$5,$6)',['home','main',{different:true},{},0,await id()]);
  await rejects("select discard_editor_draft('home','main',0)");
  assert.equal((await scalar("select editor_draft('home')")).revision,1);
  await scalar("select discard_editor_draft('home','main',1)");assert.equal(await scalar("select editor_draft('home')"),null);
 });
 await check('setup resumes with conflict protection without creating another shop',async()=>{
  const count=await scalar('select count(*) from shops'),a=await scalar('select business_setup_state()');
  const b=await scalar("select business_setup_state(3,'profile',false,$1)",[a.revision]);assert.equal(b.step,3);
  assert.equal((await scalar('select business_setup_state()')).step,3);
  await rejects("select business_setup_state(1,null,false,$1)",[a.revision]);assert.equal(await scalar('select count(*) from shops'),count);
 });
 await check('history preserves publications and remains independent of draft changes',async()=>{
  const history=await scalar("select catalogue_history('home')");assert(history.length>=2);assert(history.some(x=>x.value.value?.translations?.en?.heading==='Owner heading'));
  assert.equal((await scalar('select get_catalogue_editors()')).home.value.translations.en.heading,'Owner heading');
 });
 await check('media library refuses removal of live and history references',async()=>{
  const list=await scalar("select media_library('catalogue-home')");assert(list.length>=4);assert(list.every(x=>x.path.startsWith(shop+'/')));
  assert(list.find(x=>x.path===home.media[0].path).used_by.includes('Home Page'));
  await rejects('select organize_media($1,$2,$3,true)',['catalogue-home',home.media[0].path,'Used']);
 });
 await check('retired media cannot be assigned to a product or saved draft',async()=>{
  const path=shop+'/unused.jpg';await db.query("insert into storage.objects(bucket_id,name) values('catalogue-home',$1)",[path]);
  await scalar("select organize_media('catalogue-home',$1,'Unused',true)",[path]);
  assert.equal(await scalar("select media_removal_allowed('catalogue-home',$1)",[path]),true);
  await rejects('update products set catalogue_media=$1 where id=$2',[[{url:path,original_image:path}],prod]);
  await rejects('select save_editor_draft($1,$2,$3,$4,$5,$6)',['home','main',{path},{},0,await id()]);
 });
 await check('new productivity endpoints deny anonymous and non-admin access',async()=>{
  await db.exec('set role anon');for(const sql of ["select editor_draft('home')","select business_setup_state()","select media_library()","select catalogue_history('home')"])await rejects(sql);await db.exec('reset role');
  const user=await id();await db.query('insert into auth.users(id) values($1)',[user]);await db.query("insert into staff_profiles(user_id,shop_id,display_name,role,workspace_role)values($1,$2,'Cashier','employee','cashier')",[user,shop]);await db.query("select set_config('test.user',$1,false)",[user]);await db.exec('set role authenticated');
  for(const sql of ["select editor_draft('home')","select business_setup_state()","select media_library()","select catalogue_history('home')"])await rejects(sql);
  assert.equal(Number(await scalar('select count(*) from editor_drafts')),0);await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[admin]);
 });

 await check('optional requested time survives snapshot and exact retries without reserving stock',async()=>{
  const key=await id(),stock=await scalar('select stock from products where id=$1',[prod]);
  const customer={name:'Time Request',method:'phone',contact:'+5016004321',phone:'+5016004321',requested_fulfillment_at:'2027-01-10T15:30:00.000Z',requested_timezone:'America/Belize'};
  const args=[token,key,[{product_id:prod,qty:1,expected_unit_price:10}],customer];
  await db.query("select set_config('test.user','',false)");await db.exec('set role anon');
  const first=await scalar('select submit_catalogue_preorder($1,$2,$3,$4)',args);const retry=await scalar('select submit_catalogue_preorder($1,$2,$3,$4)',args);assert.equal(first.request_number,retry.request_number);
  await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[...args.slice(0,3),{...customer,requested_fulfillment_at:'2027-01-11T15:30:00.000Z'}]);
  await db.exec('reset role');await db.query("select set_config('test.user',$1,false)",[admin]);
  const snapshot=await scalar('select submission_snapshot from catalogue_preorder_requests where client_key=$1',[key]);assert.equal(snapshot.requested_fulfillment_at,customer.requested_fulfillment_at);assert.equal(snapshot.requested_timezone,'America/Belize');
  assert.equal(Number(await scalar('select count(*) from catalogue_preorder_requests where client_key=$1',[key])),1);assert.equal(await scalar('select stock from products where id=$1',[prod]),stock);
 });

 await check('payment settings block new charges but preserve completed checkout recovery',async()=>{
  await scalar("select open_register(100,'Test counter',null)");const key=await id(),items=[{product_id:prod,qty:1,expected_unit_price:10}];
  const first=await scalar("select complete_pos_checkout($1,null,'card',$2)",[key,items]);const stock=await scalar('select stock from products where id=$1',[prod]);
  const preferences={business_type:'Bakery',default_language:'es',payment_methods:['cash']};const saved=await scalar('select save_business_setup_preferences($1,0)',[preferences]);assert.equal(saved.revision,1);
  await rejects('select save_business_setup_preferences($1,0)',[preferences]);
  await rejects("select complete_pos_checkout($1,null,'card',$2)",[await id(),items]);
  const retry=await scalar("select complete_pos_checkout($1,null,'card',$2)",[key,items]);assert.equal(first.sale_id,retry.sale_id);assert.equal(retry.replayed,true);assert.equal(await scalar('select stock from products where id=$1',[prod]),stock);
  await rejects('select save_business_setup_preferences($1,1)',[{...preferences,payment_methods:[]}]);
 });

 await check('registration draft preserves an owned private logo and rejects a foreign logo',async()=>{
  const path=admin+'/logo.png',other=foreign+'/logo.png';await db.query("insert into storage.objects(bucket_id,name)values('onboarding-assets',$1),('onboarding-assets',$2)",[path,other]);
  const saved=await scalar('select registration_draft($1,0)',[{name:'Draft company',phone:'+5016001234',address:'Belize',logo_path:path}]);assert.equal(saved.value.logo_path,path);
  await rejects('select registration_draft($1,1)',[{name:'Draft company',logo_path:other}]);
  assert.equal((await scalar('select registration_draft()')).value.logo_path,path);
 });
 await check('crop originals remain protected while a derived image is active',async()=>{
  const original=shop+'/original.png',crop=shop+'/cropped.jpg';await db.query("insert into storage.objects(bucket_id,name)values('catalogue-home',$1),('catalogue-home',$2)",[original,crop]);
  await scalar("select organize_media('catalogue-home',$1,'Crop',false,$2)",[crop,original]);
  await rejects("select organize_media('catalogue-home',$1,'Original',true)",[original]);
  await scalar("select organize_media('catalogue-home',$1,'Crop',true)",[crop]);
  await scalar("select organize_media('catalogue-home',$1,'Original',true)",[original]);
 });
 await check('internal note editing rejects an outdated request version',async()=>{
  const request=(await db.query('select id,updated_at from catalogue_preorder_requests where shop_id=$1 limit 1',[shop])).rows[0];
  await scalar('select save_request_notes_checked($1,$2,$3)',[request.id,'First note',request.updated_at]);
  await db.query("update catalogue_preorder_requests set updated_at=updated_at+interval '1 second' where id=$1",[request.id]);
  await rejects('select save_request_notes_checked($1,$2,$3)',[request.id,'Stale overwrite',request.updated_at]);
  assert.equal(await scalar('select staff_notes from catalogue_preorder_requests where id=$1',[request.id]),'First note');
 });
 console.log('PASS '+passes+' editor/security/notification groups');await db.close();
}
main().catch(e=>{console.error(e.stack);process.exit(1)});
