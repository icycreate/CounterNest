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
 const shop='4d37fbf5-4004-47c4-ba0d-fd4d6bef0aa7',admin=await id(),foreign=await id(),otherAdmin=await id(),prod=await id(),category=await id();
 await db.query("insert into auth.users(id,email) values($1,'owner@example.test'),($2,'other@example.test')",[admin,otherAdmin]);
 await db.query("insert into shops(id,name,tax_rate)values($1,'Synthetic eligible shop',0),($2,'Synthetic ineligible shop',0)",[shop,foreign]);
 await db.query("insert into staff_profiles(user_id,shop_id,display_name,role)values($1,$2,'Owner','admin'),($3,$4,'Other owner','admin')",[admin,shop,otherAdmin,foreign]);
 await db.query("select set_config('test.user',$1,false)",[admin]);
 await scalar('select get_catalogue_editors()');const token=await scalar('select access_token from customer_display_configs where shop_id=$1',[shop]);
 await db.query("insert into categories(id,shop_id,name)values($1,$2,'Cakes')",[category,shop]);
 await db.query("insert into products(id,shop_id,category_id,name,price,stock)values($1,$2,$3,'Synthetic cake',10,100)",[prod,shop,category]);
 await db.query("insert into preorder_email_settings(shop_id,recipient,app_origin)values($1,'admin@example.test','https://counternest.vercel.app')",[shop]);
 const key=await id(),customer={name:'Release test',method:'phone',contact:'+5016001234',phone:'+5016001234'},items=[{product_id:prod,qty:1,expected_unit_price:10}];
 const submit=(k=key,c=customer,t=token,i=items)=>scalar('select submit_preorder_edge($1,$2,$3,$4)',[t,k,i,c]);
 await check('old write entry and worker/config tables reject public and ordinary authenticated callers',async()=>{
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await rejects('select submit_catalogue_preorder($1,$2,$3,$4)',[token,key,items,customer]);await rejects('select submit_preorder_edge($1,$2,$3,$4)',[token,key,items,customer]);await rejects('select claim_preorder_email(null)');await rejects('select * from preorder_email_jobs');await db.exec('reset role')}
 });
 await check('default OFF, fixed recipient and invalid token/item validation',async()=>{
  assert.equal((await scalar('select get_preorder_email_settings()')).enabled,false);
  await rejects('select provision_preorder_email($1,$2,$3)',[shop,'arbitrary@example.test','https://counternest.vercel.app']);
  await rejects('select request_preorder_test_email($1)',[await id()]);await rejects('select submit_preorder_edge($1,$2,$3,$4)',['invalid-token-value',key,items,customer]);
  await rejects('select submit_preorder_edge($1,$2,$3,$4)',[token,key,[{product_id:await id(),qty:1,expected_unit_price:10}],customer]);
  await scalar('select save_preorder_email_settings(1,true,true)');
 });
 let result,job,lease;
 await check('actual submission commits one order, in-app event and eligible job; replay is stable',async()=>{
  result=await submit();job=result.job_id;assert(job);const again=await submit();assert.equal(again.confirmation.request_number,result.confirmation.request_number);assert.equal(again.job_id,job);
  assert.equal(Number(await scalar('select count(*) from catalogue_preorder_requests where client_key=$1',[key])),1);
  assert.equal(Number(await scalar('select count(*) from order_alert_events e join catalogue_preorder_requests r on r.id=e.record_id where r.client_key=$1',[key])),1);
  assert.equal(Number(await scalar('select stock from products where id=$1',[prod])),100);
  await rejects('select submit_preorder_edge($1,$2,$3,$4)',[token,key,items,{...customer,name:'Changed payload'}]);
 });
 await check('atomic leases, immutable payload, stale lease denial and retry retention',async()=>{
  lease=await scalar('select claim_preorder_email($1)',[job]);assert(lease);assert.equal(await scalar('select claim_preorder_email($1)',[job]),null);
  const payload={from:'onboarding@resend.dev',to:['admin@example.test'],text:'Stable',subject:'Test'};assert.deepEqual(await scalar('select prepare_preorder_email($1,$2,$3)',[job,lease.lease_token,payload]),payload);
  assert.deepEqual(await scalar('select prepare_preorder_email($1,$2,$3)',[job,lease.lease_token,{...payload,text:'Changed'}]),payload);
  await db.query("update preorder_email_jobs set lease_until=now()-interval '1 minute' where id=$1",[job]);const next=await scalar('select claim_preorder_email($1)',[job]);assert.notEqual(next.lease_token,lease.lease_token);
  assert.equal(await scalar("select finish_preorder_email($1,$2,'submitted','old',null)",[job,lease.lease_token]),false);lease=next;
  await scalar("select finish_preorder_email($1,$2,'retry',null,'Unknown outcome')",[job,lease.lease_token]);
  await db.query("update preorder_email_jobs set first_attempt_at=now()-interval '24 hours',next_attempt_at=now()-interval '1 minute' where id=$1",[job]);assert.equal(await scalar('select claim_preorder_email($1)',[job]),null);assert.equal(await scalar('select state from preorder_email_jobs where id=$1',[job]),'unknown');
 });
 await check('OFF cancels unsent jobs including tests; re-enable does not replay',async()=>{
  const test=await scalar('select request_preorder_test_email($1)',[await id()]);await scalar('select save_preorder_email_settings(2,false,true)');assert.equal(await scalar('select state from preorder_email_jobs where id=$1',[test]),'cancelled');
  const offKey=await id();const off=await submit(offKey,{...customer,contact:'+5016002234',phone:'+5016002234'});assert.equal(off.job_id,null);
  assert.equal(Number(await scalar('select count(*) from catalogue_preorder_requests where client_key=$1',[offKey])),1);await scalar('select save_preorder_email_settings(3,true,true)');assert.equal(await scalar('select state from preorder_email_jobs where id=$1',[test]),'cancelled');
 });
 await check('test limits, authorized recovery and foreign company cannot activate email',async()=>{
  await db.query("update preorder_email_jobs set created_at=now()-interval '1 day' where kind='test'");const tk=await id();const t=await scalar('select request_preorder_test_email($1)',[tk]);assert.equal(await scalar('select request_preorder_test_email($1)',[tk]),t);await rejects('select request_preorder_test_email($1)',[await id()]);assert.equal(await scalar('select get_preorder_email_recovery_job($1)',[t]),t);
  await db.query("select set_config('test.user',$1,false)",[otherAdmin]);assert.equal((await scalar('select get_preorder_email_settings()')).configured,false);await rejects('select get_preorder_email_recovery_job($1)',[t]);await rejects('select save_preorder_email_settings(1,true,true)');await db.query("select set_config('test.user',$1,false)",[admin]);
 });
 const esbuild=require('esbuild'),vm=require('vm');const bundle=esbuild.buildSync({entryPoints:[path.join(root,'supabase/functions/submit-preorder/handler.ts')],bundle:true,write:false,platform:'node',format:'cjs'});const box={module:{exports:{}},exports:{},Request,Response,TextDecoder,Uint8Array};vm.runInNewContext(bundle.outputFiles[0].text,box);const {createSubmissionHandler}=box.module.exports;
 await check('HTTP path preserves confirmation when kick fails; rejects recipient injection',async()=>{
  const dbClient={rpc:async(name,args)=>{try{return{data:await scalar('select submit_preorder_edge($1,$2,$3,$4)',[args.p_token,args.p_key,args.p_items,args.p_customer])}}catch(e){return{error:{code:e.code,message:e.message}}}}};
  const handle=createSubmissionHandler(dbClient,()=>{throw Error('Worker unavailable')});const body={p_token:token,p_key:await id(),p_items:items,p_customer:{...customer,contact:'+5016003234',phone:'+5016003234'}};
  const req=b=>new Request('https://edge.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
  const response=await handle(req(body));assert.equal(response.status,200);assert((await response.json()).request_number);assert.equal((await handle(req({...body,recipient:'attacker@example.test'}))).status,400);
 });
 console.log('PASS '+passes+' release 6.3A integration groups');await db.close();
}
main().catch(e=>{console.error(e.stack);process.exit(1)});
