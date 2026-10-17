import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'
import {BACKUP_LIMIT,encodeJson,zipEntries,validateBackup,sha256,remapBackup,backupIdMap,assertNoSecrets} from '../_shared/workspaceArchive.ts'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}
const json=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
const buckets=new Set(['product-images','shop-logos','catalogue-media','special-order-references','ingredient-packages','recipe-steps','supply-imports'])
const canonical=(v:any):string=>JSON.stringify(v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])))
function decode(value:unknown){if(typeof value!=='string'||value.length>BACKUP_LIMIT*1.34)throw Error('Unsupported backup size');return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
function base64(bytes:Uint8Array){let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text)}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});if(request.method!=='POST')return json(405,{error:'Method not allowed'})
 const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return json(401,{error:'Authentication required'})
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!key||!anon)return json(503,{error:'Server configuration is incomplete'})
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const{data:auth,error:authError}=await admin.auth.getUser(authorization.slice(7));const user=auth?.user;if(authError||!user?.email)return json(401,{error:'Invalid or expired session'})
 let body:any;try{body=await request.json()}catch{return json(400,{error:'Invalid request body'})}if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.action!=='string')return json(400,{error:'Invalid request body'})
 const rpc=async(name:string,args:Record<string,unknown>)=>{const{data,error}=await admin.rpc(name,args);if(error)throw Error(error.message);return data}
 try{
  const state=await rpc('workspace_actor_state',{p_actor:user.id})
  if(body.action==='health')return json(200,{...state,edge:'connected',storage_probe:'not performed',purge_enabled:Deno.env.get('WORKSPACE_PURGE_ENABLED')==='true'})
  if(body.action!=='restore'&&!state?.is_admin)return json(403,{error:'Administrator access required'})
  if(body.action==='delete'||body.action==='cancel'||body.action==='purge'){
   if(!state?.is_owner)return json(403,{error:'Workspace owner required'})
  }
  if(['delete','restore','cancel','purge'].includes(body.action)){
   if(typeof body.password!=='string'||!body.password)return json(400,{error:'Fresh password confirmation is required'})
   const verifier=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
   const{data:verified,error}=await verifier.auth.signInWithPassword({email:user.email,password:body.password});body.password=''
   if(error||verified?.user?.id!==user.id)return json(401,{error:'The current password is incorrect'})
   // Do not persist the verification session, return its tokens, or log the request body.
  }
  if(body.action==='backup'){
   const data=await rpc('workspace_export',{p_actor:user.id});assertNoSecrets(data)
   const objects=await rpc('workspace_storage_files',{p_actor:user.id});const entries=[{path:'data.json',bytes:encodeJson(data)}];const files:any[]=[];let size=entries[0].bytes.length
   for(const object of objects){if(!buckets.has(object.bucket)||object.name.split('/')[0]!==state.shop_id)throw Error('Unsupported or foreign workspace file');const{data:signed,error}=await admin.storage.from(object.bucket).createSignedUrl(object.name,60);if(error||!signed?.signedUrl)throw Error('A supported uploaded file could not be read; backup stopped');const response=await fetch(signed.signedUrl);if(!response.ok)throw Error('A supported uploaded file could not be read; backup stopped');const bytes=new Uint8Array(await response.arrayBuffer());size+=bytes.length;if(size>BACKUP_LIMIT-65536)throw Error('Backup exceeds the supported 48 MB limit');const path=`files/${object.bucket}/${object.name}`;entries.push({path,bytes});files.push({path,bucket:object.bucket,object:object.name,size:bytes.length,sha256:await sha256(bytes)})}
   const manifest={format:'CounterNest workspace',format_version:1,app_version:'2.0.0-rc.5',created_at:new Date().toISOString(),shop_id:state.shop_id,business_name:state.business_name,record_counts:Object.fromEntries(Object.entries(data.tables).map(([name,rows])=>[name,(rows as any[]).length])),files:[{path:'data.json',size:entries[0].bytes.length,sha256:await sha256(entries[0].bytes)},...files]}
   entries.unshift({path:'manifest.json',bytes:encodeJson(manifest)});const archive=zipEntries(entries);const validated=await validateBackup(archive);const backup_id=await rpc('workspace_verify_backup',{p_actor:user.id,p_checksum:validated.checksum});return json(200,{archive:base64(archive),checksum:validated.checksum,backup_id,manifest})
  }
  if(body.action==='delete'){
   const validated=await validateBackup(decode(body.archive));if(validated.manifest.shop_id!==state.shop_id||Date.now()-Date.parse(validated.manifest.created_at)>15*60000||Date.parse(validated.manifest.created_at)>Date.now()+60000)throw Error('A freshly generated backup of this workspace is required')
   const current=await rpc('workspace_export',{p_actor:user.id});if(canonical(current)!==canonical(validated.data))throw Error('Workspace changed after backup; create a new backup before deletion')
   const objects=await rpc('workspace_storage_files',{p_actor:user.id});const expected=validated.manifest.files.filter(f=>f.path!=='data.json');
   if(objects.length!==expected.length||objects.some((o:any)=>!expected.some(f=>f.bucket===o.bucket&&f.object===o.name)))throw Error('Workspace files changed after backup; create a new backup before deletion');
   for(const f of expected){const{data:signed,error}=await admin.storage.from(f.bucket!).createSignedUrl(f.object!,60);if(error||!signed?.signedUrl)throw Error('A supported uploaded file could not be read; deletion stopped');const response=await fetch(signed.signedUrl);if(!response.ok||await sha256(new Uint8Array(await response.arrayBuffer()))!==f.sha256)throw Error('Workspace files changed after backup; create a new backup before deletion');}
   const due=await rpc('workspace_set_deletion',{p_actor:user.id,p_backup:body.backup_id,p_checksum:validated.checksum,p_name:body.business_name,p_confirm:body.confirm===true,p_final:body.final_confirm===true,p_snapshot:validated.data});return json(200,{pending_deletion:true,delete_after:due})
  }
  if(body.action==='cancel'){await rpc('workspace_cancel_deletion',{p_actor:user.id});return json(200,{cancelled:true})}
  if(body.action==='restore'){
   if(state?.shop_id)throw Error('Restore requires a new account without an existing workspace')
   const validated=await validateBackup(decode(body.archive));if(body.confirm!==true)throw Error('Restore preview confirmation is required')
   const newShop=crypto.randomUUID(),ids=backupIdMap(validated.data,newShop),urls=new Map<string,string>(),uploaded:{bucket:string;name:string}[]=[]
   try{
    for(const f of validated.manifest.files.filter(f=>f.path!=='data.json')){if(!f.bucket||!f.object||!buckets.has(f.bucket))throw Error('Unsupported storage bucket');const name=f.object.split('/').map(part=>ids.get(part)??part).join('/');const{error}=await admin.storage.from(f.bucket).upload(name,validated.entries.get(f.path)!,{upsert:false,contentType:/\.png$/i.test(name)?'image/png':/\.webp$/i.test(name)?'image/webp':'image/jpeg'});if(error)throw Error('Restore file upload failed');uploaded.push({bucket:f.bucket,name});const{data:publicUrl}=admin.storage.from(f.bucket).getPublicUrl(name);urls.set(`${f.bucket}/${f.object}`,publicUrl.publicUrl)}
    const walk=(v:any):any=>{if(Array.isArray(v))return v.map(walk);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)]));if(typeof v==='string'){for(const[object,replacement]of urls)if(v.includes(`/storage/v1/object/public/${object}`))return replacement}return v}
    const remapped=remapBackup(walk(validated.data),newShop,user.id,new Map(),ids);const authColumns=await rpc('workspace_auth_columns',{});for(const[table,cols]of Object.entries(authColumns))for(const row of remapped.tables[table]??[])for(const col of cols as string[])if(row[col]!=null)row[col]=user.id
    const shop=await rpc('workspace_restore',{p_actor:user.id,p_data:remapped,p_checksum:validated.checksum});return json(200,{shop_id:shop,restored:true})
   }catch(error){for(const f of uploaded)await admin.storage.from(f.bucket).remove([f.name]);throw error}
  }
  if(body.action==='purge'){
   if(Deno.env.get('WORKSPACE_PURGE_ENABLED')!=='true')return json(403,{error:'Permanent purge is disabled by the deployment operator'})
   if(body.final_confirm!==true||body.confirm!==true)throw Error('Explicit permanent deletion confirmation required')
   const objects=await rpc('workspace_storage_files',{p_actor:user.id});await rpc('workspace_purge_expired',{p_actor:user.id,p_name:body.business_name});let cleanupFailed=false;for(const f of objects){const{error}=await admin.storage.from(f.bucket).remove([f.name]);if(error)cleanupFailed=true}return json(200,{purged:true,storage_cleanup:cleanupFailed?'requires operator follow-up':'complete'})
  }
  return json(400,{error:'Unsupported workspace action'})
 }catch(error){return json(400,{error:error instanceof Error?error.message:'Workspace operation failed'})}
})

