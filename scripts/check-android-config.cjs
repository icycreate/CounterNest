const fs=require('fs'),assert=require('assert');
const config=JSON.parse(fs.readFileSync('android/app/google-services.json','utf8'));
assert.equal(config.project_info.project_id,'counternest-82288','Wrong Firebase project');
assert(config.client.some(c=>c.client_info.android_client_info?.package_name==='com.counternest.pos'),'Missing registered Android package');
assert(/applicationId "com\.counternest\.pos"/.test(fs.readFileSync('android/app/build.gradle','utf8')),'applicationId mismatch');
(async()=>{
 const {loadEnv}=await import('vite');const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
 assert.equal(env.VITE_SUPABASE_URL,'https://onfhqlsovqkwrmjuuauy.supabase.co','Android build requires the existing CounterNest Supabase URL');
 const key=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY||'';
 let safe=key.startsWith('sb_publishable_');
 if(!safe&&key.split('.').length===3){try{safe=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon'}catch{}}
 assert(safe,'Android build requires a browser-safe publishable/anon key; privileged keys are prohibited');
 assert.notEqual(env.VITE_ENABLE_DEMO,'true','Android production build must not enable demo');
 console.log('PASS Firebase, applicationId and required browser-safe Android backend configuration (values not printed)');
})().catch(e=>{console.error(e.message);process.exit(1)});
