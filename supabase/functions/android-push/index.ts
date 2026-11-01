import {withSupabase} from 'npm:@supabase/server@1.9.2'
import {drainAndroid,pushReady} from './worker.ts'
export default {fetch:withSupabase({auth:'secret'},async(req:Request,ctx)=>{if(req.method!=='POST')return new Response(null,{status:405});if(!pushReady(k=>Deno.env.get(k)))return Response.json({error:'Android push disabled'},{status:503});await drainAndroid(ctx.supabaseAdmin,k=>Deno.env.get(k));return Response.json({state:'processed'},{headers:{'Cache-Control':'no-store'}})})}
