import {createClient} from '@supabase/supabase-js'
import {timingSafeEqual} from 'node:crypto'
// Meta has no general client idempotency key for template sends. Ambiguous outcomes are not retried.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store')
 if(!['GET','POST'].includes(req.method))return res.status(405).end()
 const expected=Buffer.from('Bearer '+(process.env.CRON_SECRET||'')),given=Buffer.from(String(req.headers.authorization||''))
 if(!process.env.CRON_SECRET||expected.length!==given.length||!timingSafeEqual(expected,given))return res.status(401).end()
 const env=process.env
 if(!env.WHATSAPP_ACCESS_TOKEN||!/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')||!/^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_VERSION||'')||!env.SUPABASE_SERVICE_ROLE_KEY||!env.VITE_SUPABASE_URL)return res.status(503).json({error:'WhatsApp server configuration required'})
 let templates;try{templates=JSON.parse(env.WHATSAPP_ORDER_TEMPLATES||'{}')}catch{return res.status(503).json({error:'Template configuration required'})}
 // Validate all four languages before leasing so configuration never consumes a delivery attempt.
 if(!['en','es','zh-TW','zh-CN'].every(k=>/^[a-z0-9_]+$/.test(templates[k]?.name||'')&&/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(templates[k]?.code||'')))return res.status(503).json({error:'Four approved language templates are required'})
 const db=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
 const leased=await db.rpc('lease_whatsapp_order_alerts');if(leased.error)return res.status(503).json({error:'WhatsApp queue unavailable'})
 let accepted=0,failed=0,unknown=0
 for(const job of leased.data||[]){
  const update=async values=>db.from('whatsapp_order_deliveries').update({...values,updated_at:new Date().toISOString()}).eq('event_id',job.event_id).eq('shop_id',job.shop_id).eq('state','sending')
  const current=await db.from('whatsapp_order_preferences').select('enabled,revision').eq('shop_id',job.shop_id).single()
  if(current.error||!current.data.enabled||current.data.revision!==job.revision){await update({state:'cancelled',lease_until:null});continue}
  const s=job.snapshot;if(!s){await update({state:'failed',last_error:'Original snapshot unavailable'});failed++;continue}
  const clip=(v,n=450)=>{const text=String(v??'—').replace(/[\r\n\t]+/g,' ').replace(/ {2,}/g,' ');return text.length>n?text.slice(0,n-1)+'…':text||'—'}
  const summary=job.include_summary?(s.items||[]).map(i=>`${i.qty} × ${i.name}${i.variant?' / '+i.variant:''}${i.option_label?' / '+i.option_label:''}`).join('; '):'—'
  // The six approved positional BODY variables never contain credentials/private tracking tokens.
  const parameters=[job.business,'#'+s.request_number,job.include_contact?[s.customer_name,s.phone,s.contact_value,s.preferred_method].filter(Boolean).join(' · '):'—',summary,job.include_summary?`${s.currency||''} ${s.total??''}`:'—',job.include_summary?s.notes:'—'].map(text=>({type:'text',text:clip(text)}))
  try{
   const template=templates[job.language]
   const response=await fetch(`https://graph.facebook.com/${env.WHATSAPP_GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:job.recipient.slice(1),type:'template',template:{name:template.name,language:{code:template.code},components:[{type:'body',parameters}]}}),signal:AbortSignal.timeout(15000)})
   if(response.ok){const body=await response.json();const id=body.messages?.[0]?.id;if(!id)throw new Error('Unknown outcome');await update({state:'accepted',provider_id:id,lease_until:null,last_error:null});accepted++}
   else if(response.status===429){await update({state:job.attempts>=5?'failed':'pending',lease_until:new Date(Date.now()+300000).toISOString(),last_error:'Provider rate limit'});failed++}
   else if(response.status>=500){await update({state:'unknown',last_error:'Provider outcome unknown; no automatic resend'});unknown++}
   else{await update({state:'failed',lease_until:null,last_error:'Provider rejected request ('+response.status+')'});failed++}
  }catch{await update({state:'unknown',last_error:'Transport outcome unknown; no automatic resend'});unknown++}
 }
 return res.status(200).json({accepted,failed,unknown})
}
