const assert=require('assert'),fs=require('fs'),path=require('path'),esbuild=require('esbuild'),vm=require('vm');
const root=path.resolve(__dirname,'..');const bundle=esbuild.buildSync({entryPoints:[path.join(root,'supabase/functions/_shared/workspaceArchive.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const module_={exports:{}};vm.runInNewContext(bundle,{module:module_,exports:module_.exports,require,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DataView,Map,Set,crypto});const a=module_.exports;
(async()=>{
 const shop='12345678-1234-4234-8234-123456789012',p='22345678-1234-4234-8234-123456789012',other='32345678-1234-4234-8234-123456789012',actor='42345678-1234-4234-8234-123456789012';
 const data={shop:{id:shop,name:'Mi negocio'},tables:{products:[{id:p,shop_id:shop,name:'User entered cake',created_by:other,details:{product_id:p}}]}};
 async function archive(input=data){const bytes=a.encodeJson(input),manifest={format:'CounterNest workspace',format_version:1,app_version:'test',created_at:new Date().toISOString(),shop_id:shop,business_name:'Mi negocio',record_counts:{products:input.tables.products.length},files:[{path:'data.json',size:bytes.length,sha256:await a.sha256(bytes)}]};return a.zipEntries([{path:'manifest.json',bytes:a.encodeJson(manifest)},{path:'data.json',bytes}])}
 const zip=await archive(),result=await a.validateBackup(zip);assert.equal(result.data.tables.products[0].name,'User entered cake');assert.equal(result.checksum.length,64);
 const remapped=a.remapBackup(result.data,other,actor);assert.equal(remapped.shop.id,other);assert.notEqual(remapped.tables.products[0].id,p);assert.equal(remapped.tables.products[0].details.product_id,remapped.tables.products[0].id);assert.equal(remapped.tables.products[0].created_by,actor);assert.equal(remapped.tables.products[0].name,'User entered cake');
 const tampered=zip.slice();tampered[50]^=1;await assert.rejects(()=>a.validateBackup(tampered));
 const entries=a.readZip(zip),json=JSON.parse(new TextDecoder().decode(entries.get('data.json')));json.tables.products[0].name='Tampered';const changed=a.zipEntries([...entries].map(([path,bytes])=>({path,bytes:path==='data.json'?a.encodeJson(json):bytes})));await assert.rejects(()=>a.validateBackup(changed),/checksum/);
 const foreign=structuredClone(data);foreign.tables.products[0].shop_id=other;await assert.rejects(()=>archive(foreign).then(a.validateBackup),/Foreign workspace/);
 const secrets=structuredClone(data);secrets.tables.products[0].details={access_token:'must never ship'};await assert.rejects(()=>archive(secrets).then(a.validateBackup),/credential/);
 assert.throws(()=>a.zipEntries([{path:'../secret',bytes:new Uint8Array()}]),/Unsafe/);assert.throws(()=>a.zipEntries([{path:'data.json',bytes:new Uint8Array()},{path:'data.json',bytes:new Uint8Array()}]),/Duplicate/);
 assert.throws(()=>a.readZip(new Uint8Array(a.BACKUP_LIMIT+1)),/size/);
 const edge=fs.readFileSync(path.join(root,'supabase/functions/workspace-lifecycle/index.ts'),'utf8');assert(edge.includes('auth.getUser(authorization.slice(7))'));assert(edge.includes('signInWithPassword'));assert(edge.includes('verified?.user?.id!==user.id'));assert(edge.includes('WORKSPACE_PURGE_ENABLED'));assert(edge.includes('canonical(current)!==canonical(validated.data)'));assert(!/console\.(log|error|debug)\(/.test(edge));
 console.log('PASS Workspace ZIP roundtrip, checksums/tamper/CRC, cross-tenant rejection, secret exclusion, UUID remapping and Edge guard checks');
})().catch(e=>{console.error(e);process.exit(1)});
