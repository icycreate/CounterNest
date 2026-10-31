import {withSupabase} from 'npm:@supabase/server@1.9.2'
import {cors,readBody,reply,uuid} from '../_shared/preorderHttp.ts'
import {dispatchCommittedEmail} from '../_shared/preorderDispatch.ts'
import {productionEmailEnabled} from '../send-preorder-email/readiness.ts'
const handle=withSupabase({auth:'user'},async(req:Request,ctx)=>{
 if(req.method!=='POST')return reply(req,{error:'Method not allowed'},405)
 let body:any;try{body=await readBody(req,1024);if(!body||Array.isArray(body)||Object.keys(body).some(k=>k!=='job_id')||(body.job_id!==undefined&&!uuid(body.job_id)))throw Error()}catch{return reply(req,{error:'Invalid request'},400)}
 // The RLS-scoped client calls a narrow admin RPC; privileged db access starts AFTER authorization.
 const result=await ctx.supabase.rpc('get_preorder_email_recovery_job',{p_job:body.job_id??null})
 if(result.error)return reply(req,{error:'Administrator access required'},403)
 if(!productionEmailEnabled(key=>Deno.env.get(key)))return reply(req,{error:'Email configuration missing'},503)
 if(!result.data)return reply(req,{state:'no_due_job'})
 EdgeRuntime.waitUntil(dispatchCommittedEmail(ctx.supabaseAdmin,key=>Deno.env.get(key),result.data).catch(()=>{}))
 return reply(req,{state:'queued'})
})
export default {fetch:(req:Request)=>req.method==='OPTIONS'?new Response(null,{status:204,headers:cors(req)}):handle(req)}
