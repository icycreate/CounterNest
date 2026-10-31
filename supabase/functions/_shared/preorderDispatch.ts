import {createEmailHandler} from '../send-preorder-email/handler.ts'
import {productionEmailEnabled} from '../send-preorder-email/readiness.ts'
// Local call in the trusted Edge runtime: no HTTP relay, browser credential or pg_net.
export async function dispatchCommittedEmail(db:any,env:(key:string)=>string|undefined,job:string|null){
 if(!productionEmailEnabled(env))return
 const handler=createEmailHandler(db,env)
 const dispatch=(id:string|null)=>handler(new Request('https://internal.invalid/',{method:'POST',body:JSON.stringify({action:'dispatch',...(id?{job_id:id}:{})})}))
 if(job)await dispatch(job)
 // Bounded opportunistic recovery. Idle-period retries still require admin recovery.
 for(let i=0;i<2;i++){const result=await dispatch(null);const body=await result.json();if(body.state==='no_due_job'||!result.ok)break}
}
