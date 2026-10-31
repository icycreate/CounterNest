import {withSupabase} from 'npm:@supabase/server@1.9.2'
import {cors} from '../_shared/preorderHttp.ts'
import {dispatchCommittedEmail} from '../_shared/preorderDispatch.ts'
import {createSubmissionHandler} from './handler.ts'
// Public catalogue capability and existing durable abuse limits are checked by the RPC.
const handle=withSupabase({auth:'none'},async(req:Request,ctx)=>createSubmissionHandler(ctx.supabaseAdmin,job=>{
 EdgeRuntime.waitUntil(dispatchCommittedEmail(ctx.supabaseAdmin,key=>Deno.env.get(key),job).catch(()=>{}))
})(req))
export default {fetch:(req:Request)=>req.method==='OPTIONS'?new Response(null,{status:204,headers:cors(req)}):handle(req)}
