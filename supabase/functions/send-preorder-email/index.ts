// Extends the deployed v1 secret-only function. Never accept public/user callers here.
import {withSupabase} from 'npm:@supabase/server@1.9.2'
import {createEmailHandler} from './handler.ts'
import {createEmailProvider} from './provider.ts'
import {productionEmailEnabled} from './readiness.ts'
const provider=createEmailProvider(key=>Deno.env.get(key))
export default {
 fetch:withSupabase({auth:'secret'},async(req:Request,ctx)=>{
  if(!productionEmailEnabled(key=>Deno.env.get(key)))return Response.json({error:'Real email processing is not enabled'},{status:503,headers:{'Cache-Control':'no-store'}})
  return createEmailHandler(ctx.supabaseAdmin,key=>Deno.env.get(key),provider)(req)
 })
}
