const fs=require('fs'),path=require('path'),assert=require('assert'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
async function handler(name,ctx={}){
 let serve;const writes=[];const caller={id:'caller',email:'caller@test.invalid'};
 const admin={auth:{getUser:async()=>ctx.invalid?{error:{message:'invalid'}}:{data:{user:caller}},admin:{updateUserById:async(id,values)=>{writes.push({type:'password',id,values});return {error:ctx.authFail?{message:'failure'}:null}},createUser:async()=>({data:{user:{id:'created'}}}),deleteUser:async()=>({})}},from(table){
  const filters={};let action,values;const q={select(){return q},eq(key,value){filters[key]=value;return q},insert(v){action='insert';values=v;return q},update(v){action='update';values=v;return q},delete(){action='delete';return q},maybeSingle:async()=>{
   if(table!=='staff_profiles')return {data:null};
   if(filters.user_id==='caller')return {data:{user_id:'caller',shop_id:'own',email:caller.email,role:ctx.role??'admin',active:!ctx.inactive,must_change_password:ctx.force||name==='change-initial-password'}};
   if(filters.user_id==='target')return {data:ctx.foreign?null:{user_id:'target',shop_id:'own',email:'target@test.invalid',active:true}};
   return {data:null};
  },then(resolve,reject){if(action)writes.push({table,action,values,filters});return Promise.resolve({data:null,error:ctx.profileFail&&table==='staff_profiles'&&action==='update'?{message:'failure'}:null}).then(resolve,reject)}};return q;
 }};
 const verifier={auth:{signInWithPassword:async()=>({error:ctx.wrongCurrent?{message:'wrong'}:null})}};
 const code=esbuild.transformSync(fs.readFileSync(path.join(root,'supabase/functions',name,'index.ts'),'utf8'),{loader:'ts',format:'cjs',target:'es2022'}).code;
 const Deno={env:{get:k=>({SUPABASE_URL:'https://mock.invalid',SUPABASE_SERVICE_ROLE_KEY:'mock-server',SUPABASE_ANON_KEY:'mock-anon'})[k]},serve:fn=>serve=fn};
 new Function('require','Deno',code)(()=>({createClient:(_url,key)=>key==='mock-server'?admin:verifier}),Deno);
 return {writes,call:async(body,authorized=true,method='POST')=>serve(new Request('https://mock.invalid',{method,headers:{...(authorized?{Authorization:'Bearer mock-user'}:{}),'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})}))};
}
async function main(){let count=0;const strong='ExampleOnly123';
 for(const name of ['create-staff-account','change-initial-password','change-password','reset-staff-password']){
  const body=name==='create-staff-account'?{email:'new@test.invalid',display_name:'New Staff',role:'employee',temporary_password:strong,confirm_password:strong}:name==='reset-staff-password'?{target_user_id:'target',temporary_password:strong,confirm_password:strong}:{current_password:'OldExample123',new_password:strong,confirm_password:strong};
  const test=await handler(name);assert.equal((await test.call(body,false)).status,401);assert.equal((await test.call(body,true,'GET')).status,405);assert.equal((await test.call(body,true,'OPTIONS')).status,200);
  const invalid=await handler(name,{invalid:true});assert.equal((await invalid.call(body)).status,401);
  const inactive=await handler(name,{inactive:true});assert.equal((await inactive.call(body)).status,403);
  assert.equal((await test.call({...body,confirm_password:'mismatch'})).status,400);assert.equal(test.writes.length,0);
  for(const malformed of [null,[],{...body,confirm_password:99}])assert.equal((await test.call(malformed)).status,400);
  if(name!=='change-initial-password'){const forced=await handler(name,{force:true});assert.equal((await forced.call(body)).status,name==='change-password'?409:403);assert.equal(forced.writes.length,0);}
  const res=await test.call(body);assert(res.ok,`${name}: ${res.status}`);
  for(const row of test.writes.filter(w=>w.table))assert(!/password/i.test(JSON.stringify(row.values).replace(/"(?:action|must_change_password|password_initialized_at)"\s*:\s*(?:"[^"]*"|true|false|null)/g,'')),'Password in stored audit/profile');
  if(name==='change-password'||name==='change-initial-password'){const wrong=await handler(name,{wrongCurrent:true});assert.equal((await wrong.call(body)).status,401);assert.equal(wrong.writes.length,0);}
  else{const employee=await handler(name,{role:'employee'});assert.equal((await employee.call(body)).status,403);}
  if(name==='reset-staff-password'){const failed=await handler(name,{profileFail:true});assert.equal((await failed.call(body)).status,500);assert(!failed.writes.some(w=>w.type==='password'));const profileIndex=test.writes.findIndex(w=>w.values?.must_change_password===true),passwordIndex=test.writes.findIndex(w=>w.type==='password');assert(profileIndex>=0&&profileIndex<passwordIndex);const foreign=await handler(name,{foreign:true});assert.equal((await foreign.call(body)).status,404);assert.equal(foreign.writes.length,0);assert(test.writes.some(w=>w.values?.must_change_password===true));}
  if(name==='create-staff-account')assert(test.writes.some(w=>w.values?.must_change_password===true));
  count++;console.log('PASS mocked function authentication, confirmation, authorization and password-free audit:',name);
 }
 fs.writeFileSync(path.join(root,'EDGE_TEST_RESULTS.json'),JSON.stringify({functions:count,status:'passed',environment:'Node execution of transpiled handlers with mocked Supabase Auth and database',limitation:'Does not verify live Supabase Auth, function gateway, CORS delivery, email or real password hashing.'},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
