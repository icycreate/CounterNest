const fs=require('fs'),assert=require('assert');
const config=JSON.parse(fs.readFileSync('android/app/google-services.json','utf8'));
assert.equal(config.project_info.project_id,'counternest-82288','Wrong Firebase project');
assert(config.client.some(c=>c.client_info.android_client_info?.package_name==='com.counternest.pos'),'Missing registered Android package');
assert(/applicationId "com\.counternest\.pos"/.test(fs.readFileSync('android/app/build.gradle','utf8')),'applicationId mismatch');
console.log('PASS Firebase client project and Android applicationId match (values not printed)');
