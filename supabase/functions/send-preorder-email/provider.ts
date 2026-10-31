export type EmailMessage={from:string;to:string[];subject:string;html:string;text:string}
export type SendResult={id:string}
export interface EmailProvider { readonly name:'mock'|'resend'; send(message:EmailMessage,idempotencyKey:string):Promise<SendResult> }
export class EmailSendError extends Error { constructor(public readonly status:number|null){super(status===null?'Provider outcome unknown':'Provider HTTP '+status)} }
// An in-memory mailbox, not an email transport. Concurrent calls share one promise per key.
export class MockEmailProvider implements EmailProvider {
 readonly name='mock' as const
 readonly messages:{id:string;key:string;message:EmailMessage;created_at:string}[]=[]
 readonly calls:{key:string;outcome:string}[]=[]
 delayMs=0
 outcomes:('success'|'retry'|'permanent'|'ambiguous')[]=[]
 private accepted=new Map<string,{body:string;result:SendResult}>()
 private pending=new Map<string,{body:string;result:Promise<SendResult>}>()
 async send(message:EmailMessage,key:string):Promise<SendResult>{
  const body=JSON.stringify(message),prior=this.accepted.get(key),active=this.pending.get(key)
  if(prior){if(prior.body!==body)throw new EmailSendError(409);return prior.result}
  if(active){if(active.body!==body)throw new EmailSendError(409);return active.result}
  const task=(async()=>{
   await new Promise(resolve=>setTimeout(resolve,this.delayMs))
   const outcome=this.outcomes.shift()??'success';this.calls.push({key,outcome})
   if(outcome==='retry')throw new EmailSendError(503)
   if(outcome==='permanent')throw new EmailSendError(400)
   const result={id:'mock-'+String(this.messages.length+1).padStart(6,'0')}
   this.messages.push({id:result.id,key,message:JSON.parse(body),created_at:new Date().toISOString()});this.accepted.set(key,{body,result})
   // Simulate provider acceptance with a lost response; retry must not append another message.
   if(outcome==='ambiguous')throw new EmailSendError(null)
   return result
  })()
  this.pending.set(key,{body,result:task})
  try{return await task}finally{this.pending.delete(key)}
 }
}
export class ResendEmailProvider implements EmailProvider {
 readonly name='resend' as const
 constructor(private env:(key:string)=>string|undefined,private transport:typeof fetch=fetch){}
 async send(message:EmailMessage,key:string):Promise<SendResult>{
  // Presence of a real key alone must NEVER enable network delivery.
  if(this.env('EMAIL_PROVIDER')!=='resend'||this.env('EMAIL_REAL_DELIVERY_ENABLED')!=='true')throw new Error('Real email delivery disabled')
  const secret=this.env('RESEND_API_KEY');if(!secret)throw new Error('Email configuration missing')
  let response:Response
  try{response=await this.transport('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(message),signal:AbortSignal.timeout(15000)})}catch{throw new EmailSendError(null)}
  if(!response.ok)throw new EmailSendError(response.status)
  try{const result=await response.json();if(typeof result.id!=='string'||!result.id)throw Error();return{id:result.id}}catch{throw new EmailSendError(null)}
 }
}
export function createEmailProvider(env:(key:string)=>string|undefined):EmailProvider {
 if(env('EMAIL_PROVIDER')==='resend'&&env('EMAIL_REAL_DELIVERY_ENABLED')==='true')return new ResendEmailProvider(env)
 return new MockEmailProvider()
}
