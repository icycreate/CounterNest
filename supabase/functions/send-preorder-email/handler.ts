import {productionEmailEnabled} from './readiness.ts'
import {createEmailProvider,EmailSendError,type EmailProvider,type EmailMessage} from './provider.ts'
export type EmailJob={id:string;shop_id:string;kind:'new_preorder'|'test';recipient:string;lease_token:string;attempts:number;provider_payload?:Record<string,unknown>;business:string;timezone:string;origin:string;order_id:string;number:number;status:string;snapshot:any}
export const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const clip=(value:unknown,max=200)=>String(value??'').slice(0,max)
export function makeEmail(job:EmailJob,sender:string,local=false){
 const isTest=job.kind==='test',s=job.snapshot??{};
 const date=(value:unknown)=>{if(!value||!Number.isFinite(Date.parse(String(value))))return 'Not specified';try{return new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short',timeZone:job.timezone||'UTC'}).format(new Date(String(value)))}catch{return new Date(String(value)).toISOString()}}
 if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(job.origin)&&!(local&&/^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(job.origin)))throw Error('Invalid origin')
 const url=job.origin+'/scheduled-orders'+(isTest?'':'?record='+encodeURIComponent(job.order_id));
 const items=Array.isArray(s.items)?s.items:[];
 const summary=items.slice(0,5).map((i:any)=>`${Number(i.qty)||0} × ${clip(i.name,100)}${i.variant?' / '+clip(i.variant,80):''}`).join('; ')+(items.length>5?' …':'');
 const status:Record<string,string>={new_request:'Pending Review',contacted:'Contacted',accepted:'Accepted',declined:'Declined',quoted:'Quoted'};
 const rows=isTest?[['Business',clip(job.business)],['Result','Email integration test. Provider submission does not prove inbox delivery.']]:[['Business',clip(job.business)],['Pre-order','PO-'+job.number],['Customer',clip(s.customer_name)],['Items',String(items.reduce((n:number,i:any)=>n+(Number(i.qty)||0),0))],['Summary',summary],['Submitted',date(s.submitted_at)],['Requested fulfillment',date(s.requested_fulfillment_at)],['Status',status[job.status]||clip(job.status)]];
 const accessNote=local?'Local synthetic preview — no real email sent.':'Sign in with an authorized CounterNest account.';
 const heading=isTest?'Email Integration Test':'New Pre-order Received';
 const subject=isTest?'CounterNest — Email Integration Test':'CounterNest — New Pre-order #'+job.number;
 const text='CounterNest — '+heading+'\n\n'+rows.map(([k,v])=>k+': '+v).join('\n')+'\n\nReview Pre-order: '+url+'\n'+accessNote;
 const html='<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><body style="margin:0;background:#fff7f0;font-family:Arial,sans-serif;color:#40200f"><table role="presentation" width="100%" cellpadding="16"><tr><td align="center"><table role="presentation" width="100%" style="max-width:600px;background:#fff;border:1px solid #ead6c8;border-radius:16px" cellpadding="24"><tr><td><strong style="color:#a34418;font-size:22px">CounterNest</strong><h1 style="font-size:25px">'+heading+'</h1><table width="100%" cellpadding="8" style="border-collapse:collapse">'+rows.map(([k,v])=>'<tr><th align="left" style="vertical-align:top;font-weight:normal;color:#76675b">'+escapeHtml(k)+'</th><td style="overflow-wrap:anywhere">'+escapeHtml(v)+'</td></tr>').join('')+'</table><p style="margin-top:28px"><a href="'+escapeHtml(url)+'" style="display:inline-block;padding:14px 20px;background:#a34418;color:#fff;text-decoration:none;border-radius:10px">Review Pre-order</a></p><p style="font-size:13px;color:#76675b">'+accessNote+'</p></td></tr></table></td></tr></table></body></html>';
 return{from:sender,to:[job.recipient],subject,text,html}
}
export function createEmailHandler(db:any,env:(key:string)=>string|undefined,provider:EmailProvider=createEmailProvider(env)){
 return async(req:Request)=>{
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
  if(req.method!=='POST')return reply({error:'Method not allowed'},405)
  let body:any;try{const text=await req.text();if(text.length>1024)throw Error();body=JSON.parse(text)}catch{return reply({error:'Invalid request'},400)}
  const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  if(!body||!['dispatch','test'].includes(body.action)||Object.keys(body).some(k=>!['action','job_id'].includes(k))||(body.job_id!==undefined&&!uuid(body.job_id))||(body.action==='test'&&!uuid(body.job_id)))return reply({error:'Invalid action or job identifier'},400)
  const local=provider.name==='mock',sender=local?'CounterNest Local <no-reply@example.test>':env('EMAIL_FROM'),testRecipient=env('EMAIL_NOTIFICATION_TO')?.trim().toLowerCase()
  if(!sender||(!local&&!testRecipient)||/[\r\n]/.test(sender))return reply({error:'Email configuration missing'},503)
  try{
  const claimed=await db.rpc('claim_preorder_email',{p_job:body.job_id??null});if(claimed.error)return reply({error:'Email queue unavailable'},503)
  const job=claimed.data as EmailJob|null;if(!job)return reply({success:true,state:'no_due_job'})
  const finish=async(state:string,provider:string|null=null,error:string|null=null)=>{const r=await db.rpc('finish_preorder_email',{p_job:job.id,p_token:job.lease_token,p_state:state,p_provider:provider,p_error:error});return !r.error&&r.data===true}
  if((body.action==='test'&&job.kind!=='test')||(!local&&(job.kind==='test'||/@resend\.dev(?:>|$)/i.test(sender))&&job.recipient.toLowerCase()!==testRecipient)){
   await finish('failed',null,'Recipient configuration required');return reply({success:false,state:'configuration_required'},409)
  }
  let payload:Record<string,unknown>;
  try{const prepared=await db.rpc('prepare_preorder_email',{p_job:job.id,p_token:job.lease_token,p_payload:job.provider_payload??makeEmail(job,sender,local),p_delivery_provider:provider.name});if(prepared.error||!prepared.data)throw Error();payload=prepared.data}catch{await finish('retry',null,'Email preparation unavailable');return reply({success:false,state:'retry',provider:provider.name},503)}
  try{
   if(!local&&(!productionEmailEnabled(env)||!Array.isArray(payload.to)||payload.to.length!==1||payload.to[0]!==testRecipient||payload.from!==sender||'cc' in payload||'bcc' in payload))throw new EmailSendError(400)
   const result=await provider.send(payload as EmailMessage,'counternest/preorder-email/'+job.id)
   const recorded=await finish('submitted',result.id)
   return reply({success:recorded,state:recorded?'submitted':'reconciliation_pending',provider:provider.name,...(recorded?{emailId:result.id}:{})},recorded?200:503)
  }catch(error){
   const status=error instanceof EmailSendError?error.status:null
   const state=status===null||status===429||status>=500?'retry':status===409?'unknown':'failed'
   await finish(state,null,status===null?'Provider outcome unknown':'Provider HTTP '+status)
   return reply({success:false,state,provider:provider.name},502)
  }
  }catch{return reply({error:'Email queue unavailable'},503)}
 }
}

export {ResendEmailProvider,MockEmailProvider,createEmailProvider} from './provider.ts'
