import {withSupabase} from 'npm:@supabase/server@1.9.2'
import {readBody,reply,cors,uuid} from '../_shared/preorderHttp.ts'
import {pushReady,sendAndroid} from '../android-push/worker.ts'
const handle=withSupabase({auth:'user'},async(req:Request,ctx)=>{
 if(req.method!=='POST')return reply(req,{error:'Method not allowed'},405)
 if(!pushReady(k=>Deno.env.get(k)))return reply(req,{error:'Android push disabled'},503)
 let b:any;try{b=await readBody(req,1024);if(!b||Object.keys(b).length!==1||!uuid(b.installation_id))throw Error()}catch{return reply(req,{error:'Invalid request'},400)}
 const r=await ctx.supabase.rpc('prepare_android_test',{p_installation:b.installation_id});if(r.error)return reply(req,{error:'Administrator access, registered device and test cooldown required'},403)
 const d=await ctx.supabaseAdmin.from('order_push_devices').select('subscription').eq('id',r.data.device_id).eq('user_id',r.data.user_id).is('revoked_at',null).single();if(d.error)return reply(req,{error:'Device unavailable'},409)
 try{const result=await sendAndroid({...r.data,token:d.data.subscription.token,test:'true'},k=>Deno.env.get(k));await ctx.supabaseAdmin.from('android_push_attempts').update({state:result.state,provider_id:result.provider,finished_at:new Date().toISOString()}).eq('id',r.data.event_id);return reply(req,{state:result.state},result.state==='sent'?200:502)}catch{await ctx.supabaseAdmin.from('android_push_attempts').update({state:'failed',finished_at:new Date().toISOString()}).eq('id',r.data.event_id);return reply(req,{error:'Push provider unavailable'},503)}
})
export default {fetch:(req:Request)=>req.method==='OPTIONS'?new Response(null,{status:204,headers:cors(req)}):handle(req)}
