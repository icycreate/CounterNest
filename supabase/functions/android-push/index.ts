import {withSupabase} from 'npm:@supabase/server@1.9.2'
import {drainAndroid,pushReady} from './worker.ts'
import {authorizedWorker} from './auth.ts'
const handle=withSupabase({auth:'none'},async(_req:Request,ctx)=>{
 if(!pushReady(k=>Deno.env.get(k)))return Response.json({error:'Android push disabled'},{status:503})
 await drainAndroid(ctx.supabaseAdmin,k=>Deno.env.get(k))
 return Response.json({state:'processed'},{headers:{'Cache-Control':'no-store'}})
})
export default {fetch:async(req:Request)=>{
 if(req.method!=='POST')return new Response(null,{status:405})
 if(!await authorizedWorker(req,Deno.env.get('ANDROID_PUSH_WORKER_KEY')))return new Response(null,{status:401})
 return handle(req)
}}
