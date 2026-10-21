import webpush from 'web-push'
import {createClient} from '@supabase/supabase-js'
import {timingSafeEqual} from 'node:crypto'
export function allowedPushEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].some(h=>u.hostname===h)||u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.endsWith('.notify.windows.com')}catch{return false}}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return res.status(405).end();
 const expected='Bearer '+(process.env.CRON_SECRET??''),given=req.headers.authorization??'';
 if(!process.env.CRON_SECRET||given.length!==expected.length||!timingSafeEqual(Buffer.from(given),Buffer.from(expected)))return res.status(401).json({error:'Unauthorized'});
 const {SUPABASE_SERVICE_ROLE_KEY,VITE_SUPABASE_URL,WEB_PUSH_PUBLIC_KEY,WEB_PUSH_PRIVATE_KEY,WEB_PUSH_SUBJECT}=process.env;
 if(!SUPABASE_SERVICE_ROLE_KEY||!VITE_SUPABASE_URL||!WEB_PUSH_PUBLIC_KEY||!WEB_PUSH_PRIVATE_KEY||!WEB_PUSH_SUBJECT)return res.status(503).json({error:'Notification server setup required'});
 const db=createClient(VITE_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const {data,error}=await db.rpc('lease_order_push');if(error)return res.status(503).json({error:'Notification queue unavailable'});
 const customer=await db.rpc('lease_customer_order_push');
 let sent=0,failed=0;
 await Promise.all([...(data??[]),...(customer.error?[]:customer.data??[])].map(async item=>{
  const deliveries=item.customer?'customer_order_push_deliveries':'order_push_deliveries',devices=item.customer?'customer_order_push_devices':'order_push_devices';
  try{
   if(!allowedPushEndpoint(item.subscription.endpoint))throw Object.assign(new Error('Unsupported push provider'),{statusCode:400});
   const payload=item.customer?{audience:'customer',id:item.event_id,kind:item.kind,record_id:item.record_id,subscription_id:item.device_id,shop_name:item.shop_name,order_number:item.order_number,language:item.language}:{id:item.event_id,kind:item.kind,record_id:item.record_id,user_id:item.user_id,badge:item.badge,language:item.language};
   await webpush.sendNotification(item.subscription,JSON.stringify(payload),{vapidDetails:{subject:WEB_PUSH_SUBJECT,publicKey:WEB_PUSH_PUBLIC_KEY,privateKey:WEB_PUSH_PRIVATE_KEY},TTL:3600,urgency:'high',topic:item.event_id.replaceAll('-',''),timeout:10000});
   const r=await db.from(deliveries).update({state:'sent',lease_until:null,last_error:null}).eq('event_id',item.event_id).eq('device_id',item.device_id);if(r.error)throw r.error;sent++;
  }catch(e){failed++;const code=e.statusCode??0;if(code===404||code===410)await db.from(devices).delete().eq('id',item.device_id);else await db.from(deliveries).update({state:[400,401,403].includes(code)||item.attempts>=5?'failed':'sending',last_error:'Push delivery failed ('+code+')'}).eq('event_id',item.event_id).eq('device_id',item.device_id)}
 }));return res.status(200).json({sent,failed,customerQueueAvailable:!customer.error});
}
