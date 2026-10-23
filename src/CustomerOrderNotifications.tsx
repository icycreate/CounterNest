import {useUiLanguage} from './i18n'
import {useEffect,useState} from 'react'
import {Button} from './Button'
import {Toggle} from './Fields'
import {tr,trError,getUiLanguage} from './i18n'
import {supabase} from './lib/supabase'

type Preferences={accepted:boolean;preparing:boolean;ready:boolean}
const defaults:Preferences={accepted:true,preparing:false,ready:true}
const validToken=(t:string)=>/^[0-9a-f-]{36}$/i.test(t)
const installed=()=>matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone)
const permission=()=> 'Notification'in window&&'PushManager'in window&&'serviceWorker'in navigator?Notification.permission:'unsupported'
const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
async function saveCustomerBinding(reg:ServiceWorkerRegistration,value:Record<string,unknown>){
 const worker=reg.active??(await navigator.serviceWorker.ready).active
 if(!worker)throw new Error(tr('Customer notification setup is required.'))
 await new Promise<void>((resolve,reject)=>{const channel=new MessageChannel();const timer=window.setTimeout(()=>{channel.port1.close();reject(new Error(tr('Refresh the app to finish notification setup.')))},5000);channel.port1.onmessage=e=>{window.clearTimeout(timer);channel.port1.close();if(e.data?.saved)resolve();else reject(new Error(tr('Customer notification setup is required.')))};worker.postMessage({type:'counternest:customer-binding',...value},[channel.port2])})
}
export function CustomerOrderNotifications({token,catalogueToken}:{token:string;catalogueToken?:string}){
 const selectedLanguage=useUiLanguage()
 const [state,setState]=useState(permission),[registered,setRegistered]=useState(false),[prefs,setPrefs]=useState<Preferences>(defaults),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [binding,setBinding]=useState<{subscription_id:string;request_id:string}|null>(null)
 useEffect(()=>{let live=true;async function read(){setState(permission());if(!validToken(token)||!supabase||!('serviceWorker'in navigator))return;try{const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager?.getSubscription();if(!sub){if(live)setRegistered(false);return}const r=await supabase.rpc('get_customer_order_push',{p_token:token,p_endpoint:sub.endpoint});if(!live)return;if(r.error){setMessage(tr('Customer notification setup is required.'));return}setRegistered(Boolean(r.data));if(r.data){setPrefs(r.data.preferences);setBinding(r.data);(reg?.active??navigator.serviceWorker.controller)?.postMessage({type:'counternest:customer-binding',...r.data,token,catalogueToken})}}catch{if(live)setMessage(tr('Customer notification setup is required.'))}}
 const changed=(e:MessageEvent)=>{if(e.data?.type==='counternest:customer-subscription-changed')void read()};void read();window.addEventListener('focus',read);navigator.serviceWorker?.addEventListener('message',changed);return()=>{live=false;window.removeEventListener('focus',read);navigator.serviceWorker?.removeEventListener('message',changed)}},[token,catalogueToken])
 // Update only an already-authorized order subscription; never prompt or create a device here.
 useEffect(()=>{let live=true;async function syncLanguage(){
  if(!registered||!supabase||!('serviceWorker'in navigator))return
  try{const reg=await navigator.serviceWorker.getRegistration(),sub=await reg?.pushManager?.getSubscription();if(!sub||!live)return
   const current=await supabase.rpc('get_customer_order_push',{p_token:token,p_endpoint:sub.endpoint})
   if(!live||current.error||!current.data||current.data.preferences?.language===selectedLanguage)return
   const result=await supabase.rpc('register_customer_order_push',{p_token:token,p_subscription:sub.toJSON(),p_preferences:{...current.data.preferences,language:selectedLanguage}})
   if(live&&result.error)setMessage(trError(result.error.message))
  }catch{if(live)setMessage(tr('Customer notification setup is required.'))}
 }void syncLanguage();return()=>{live=false}},[token,registered,selectedLanguage])
 async function enable(){
  if(!supabase||busy)return;setBusy(true);setMessage('')
  try{
   if(!window.isSecureContext||!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw new Error(tr('Order notifications are not supported in this browser.'))
   const publicKey=import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;if(!publicKey)throw new Error(tr('Customer notification setup is required.'))
   // Permission is requested only within this explicit button action.
   const result=Notification.permission==='default'?await Notification.requestPermission():Notification.permission;setState(result)
   if(result!=='granted')throw new Error(tr('Notifications Blocked'))
   const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready
   const raw=publicKey.replace(/-/g,'+').replace(/_/g,'/'),bytes=Uint8Array.from(atob(raw+'='.repeat((4-raw.length%4)%4)),c=>c.charCodeAt(0))
   const sub=await reg.pushManager.getSubscription()??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes})
   const status=await supabase.rpc('get_catalogue_request_status',{p_token:token});if(status.error)throw status.error
   // Persist the private deep link before the server can enqueue a current-milestone push.
   await saveCustomerBinding(reg,{request_id:status.data.request_id,token,catalogueToken:catalogueToken??status.data.catalogue_token})
   const r=await supabase.rpc('register_customer_order_push',{p_token:token,p_subscription:sub.toJSON(),p_preferences:{accepted:prefs.accepted,preparing:prefs.preparing,ready:prefs.ready,language:getUiLanguage()}})
   if(r.error)throw r.error
   setBinding(r.data);setRegistered(true)
   const worker=reg.active??(await navigator.serviceWorker.ready).active
   worker?.postMessage({type:'counternest:customer-binding',...r.data,token,catalogueToken})
   setMessage(tr('Order notifications enabled.'))
  }catch(e){setMessage(trError((e as Error).message))}finally{setBusy(false)}
 }
 async function disable(){if(!supabase||busy)return;setBusy(true);try{const reg=await navigator.serviceWorker.getRegistration(),sub=await reg?.pushManager?.getSubscription();if(sub){const r=await supabase.rpc('remove_customer_order_push',{p_token:token,p_endpoint:sub.endpoint});if(r.error)throw r.error}if(binding)(reg?.active??navigator.serviceWorker.controller)?.postMessage({type:'counternest:customer-binding',request_id:binding.request_id,remove:true});setBinding(null);setRegistered(false);setMessage(tr('Notifications Disabled'))}catch(e){setMessage(trError((e as Error).message))}finally{setBusy(false)}}
 return <section className="customer-notification-settings" aria-label={tr('Notification Settings')}><h3>{tr('Notification Settings')}</h3><p>{tr('Receive updates about your orders, including when your order is accepted and ready for pickup.')}</p>
 <p role="status">{tr('Notification Status')}: {tr(state==='denied'?'Notifications Blocked':state==='unsupported'?'Unavailable':registered&&state==='granted'?'Enabled':'Notifications Disabled')}</p>
 {ios()&&!installed()&&<p>{tr('On iPhone or iPad, open this catalogue in Safari, choose Share, then Add to Home Screen. Open the installed app to enable supported notifications.')}</p>}
 {(state==='denied')&&<p>{tr('Allow notifications in your browser or device settings, then return here. CounterNest cannot change a blocked permission.')}</p>}
 <Toggle label={tr('Order Accepted Updates')} checked={prefs.accepted} onChange={e=>setPrefs({...prefs,accepted:e.target.checked})}/><Toggle label={tr('Preparing Updates')} checked={prefs.preparing} onChange={e=>setPrefs({...prefs,preparing:e.target.checked})}/><Toggle label={tr('Ready-for-Pickup Updates')} checked={prefs.ready} onChange={e=>setPrefs({...prefs,ready:e.target.checked})}/>
 <div className="report-actions"><Button variant="primary" disabled={busy||state==='denied'||state==='unsupported'} onClick={()=>void enable()}>{tr(registered?'Save notification preferences':'Enable Notifications')}</Button><Button disabled={busy||!registered} onClick={()=>void disable()}>{tr('Disable Notifications on This Device')}</Button></div>
 <p className="muted">{tr('These controls apply to this order on this device. Browser and OS settings control background sound and delivery.')}</p>{message&&<p role="status">{message}</p>}</section>
}

export function CatalogueNotificationInvitation({catalogueToken}:{catalogueToken:string}){
 useUiLanguage()
 const key='counternest.customer-notification-invitation.'+catalogueToken
 const [visible,setVisible]=useState(()=>{try{return installed()&&!localStorage.getItem(key)&&permission()==='default'}catch{return false}}),[expanded,setExpanded]=useState(false)
 const [tokens,setTokens]=useState<string[]>([])
 useEffect(()=>{const read=()=>{try{const list=JSON.parse(localStorage.getItem('counternest.request-status.'+catalogueToken)??'[]');setTokens(Array.isArray(list)?list.filter(validToken).slice(0,10):[])}catch{setTokens([])}};read();const done=()=>{read();try{if(!localStorage.getItem(key)&&permission()==='default')setVisible(true)}catch{}};window.addEventListener('appinstalled',done);window.addEventListener('counternest:customer-order-saved',read);return()=>{window.removeEventListener('appinstalled',done);window.removeEventListener('counternest:customer-order-saved',read)}},[catalogueToken,key])
 function dismiss(){try{localStorage.setItem(key,'deferred')}catch{}setVisible(false);setExpanded(false)}
 return <div className="catalogue-notification-area">{visible?<section className="customer-notification-invitation"><h3>{tr('Order updates')}</h3><p>{tr('Receive updates about your orders, including when your order is accepted and ready for pickup.')}</p><Button onClick={dismiss}>{tr('Not Now')}</Button><Button variant="primary" onClick={()=>{setExpanded(true);setVisible(false)}}>{tr('Enable Notifications')}</Button></section>:<Button variant="ghost" onClick={()=>setExpanded(v=>!v)}>{tr('Notification Settings')}</Button>}
 {expanded&&<>{tokens.length?tokens.map(token=><div key={token}><a href={'/request-status?token='+encodeURIComponent(token)}>{tr('Track Order')}</a><CustomerOrderNotifications token={token} catalogueToken={catalogueToken}/></div>):<p>{tr('Submit an order first, then enable updates from its private Track Order link. No account is required.')}</p>}<Button onClick={dismiss}>{tr('Not Now')}</Button></>}</div>
}
