import {useEffect,useRef,useState} from 'react'
import {supabase} from './lib/supabase'
import {Card} from './Surface'
import {Button} from './Button'
import {Toggle,SelectField,InputField,FormField} from './Fields'
import {tr,trError,getUiLanguage} from './i18n'
import {navigateRoute} from './appNavigation'
import {IncomingOrder} from './IncomingOrder'
import type {Role} from './types'
export type AlertPreferences={enabled:boolean;preorder:boolean;catalogue:boolean;sound:boolean;repeat:boolean;repeatCount:number;tone:'chime'|'bell'|'gentle';desktop:boolean;mobile:boolean;badge:boolean;push:boolean;device_label:string}
export const defaultAlertPreferences:AlertPreferences={enabled:true,preorder:true,catalogue:true,sound:true,repeat:true,repeatCount:3,tone:'chime',desktop:false,mobile:false,badge:true,push:false,device_label:''}
export type OrderAlert={id:string;kind:string;record_id:string;created_at:string;presented?:boolean}
let account='';let audio:AudioContext|undefined
const key=()=>`counternest.order-alerts.${account}`
export function readAlertPreferences():AlertPreferences{try{const p=JSON.parse(localStorage.getItem(key())??'{}');return {...defaultAlertPreferences,...p,repeatCount:Math.max(1,Math.min(5,Number(p.repeatCount??(p.repeat===false?1:3))||3))}}catch{return {...defaultAlertPreferences}}}
export const alertRoute=(e:OrderAlert)=>e.kind==='catalogue'?'/sale?request='+encodeURIComponent(e.record_id):'/scheduled-orders?record='+encodeURIComponent(e.record_id)
export function ringOrderAlert(repeat:boolean|number=3,tone:AlertPreferences['tone']='chime'){
 if(!audio||audio.state!=='running')return false
 const notes=tone==='bell'?[1046.5,1318.5]:tone==='gentle'?[523.25,659.25]:[784,1046.5]
 const count=typeof repeat==='boolean'?(repeat?3:1):Math.max(1,Math.min(5,repeat))
 for(let i=0;i<count;i++)for(const [j,freq] of notes.entries()){const start=audio.currentTime+i*.85+j*.16,osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.12,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.35);osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.4)}
 return true
}
async function enableAudio(){audio??=new AudioContext();await audio.resume()}
async function binding(user:string|null){if(!('serviceWorker'in navigator))return;const reg=await navigator.serviceWorker.getRegistration();(reg?.active??navigator.serviceWorker.controller)?.postMessage({type:'counternest:notification-account',user})}
export async function disconnectOrderPush(){await binding(null);try{const reg=await navigator.serviceWorker?.getRegistration(),sub=await reg?.pushManager.getSubscription();if(sub){await supabase?.rpc('unregister_order_push',{p_endpoint:sub.endpoint});/* Keep the shared browser subscription for guest order notifications. */}}catch{}account='';void (navigator as any).clearAppBadge?.()}
const mobile=()=>matchMedia('(pointer: coarse)').matches
const pushAllowed=(p:AlertPreferences)=>p.enabled&&(mobile()?p.mobile:p.desktop)

export function NotificationRuntime({enabled}:{enabled:boolean}){
 const [events,setEvents]=useState<OrderAlert[]>([]),[count,setCount]=useState(0),[latest,setLatest]=useState<OrderAlert|null>(null),[blocked,setBlocked]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[preferences,setPreferences]=useState(readAlertPreferences)
 const identity=useRef(''),pendingOpen=useRef<OrderAlert|null>(null),claiming=useRef(false)
 useEffect(()=>{
  setLatest(null);setEvents([]);setCount(0);pendingOpen.current=null;identity.current=''
  if(!enabled||!supabase)return
  let live=true,busy=false
  async function poll(){if(busy||!identity.current||document.visibilityState!=='visible')return;busy=true;try{const r=await supabase!.rpc('get_order_alert_inbox');if(!live)return;if(r.error){setEvents([]);setLatest(null);setCount(0);setError(tr('Order alerts are unavailable. Backend setup or access is required.'));return}setError('');setEvents(r.data.events??[]);setLatest(old=>old&&Number(r.data.unread_count)>0&&!(r.data.acknowledged??[]).includes(old.id)?old:null);setCount(Number(r.data.unread_count));const p=readAlertPreferences();setPreferences(p);if(p.enabled&&p.badge&&r.data.unread_count>0)void (navigator as any).setAppBadge?.(r.data.unread_count)?.catch(()=>{});else void (navigator as any).clearAppBadge?.()?.catch(()=>{})}catch{if(live)setError(tr('Order alerts are unavailable. Backend setup or access is required.'))}finally{busy=false}}
  void supabase.auth.getSession().then(async r=>{if(!live)return;account=r.data.session?.user.id??'';identity.current=account;setPreferences(readAlertPreferences());await binding(account||null);if(live)void poll()})
  const scan=()=>setBlocked(Boolean(document.querySelector('[data-payment-active="true"]'))||Array.from(document.querySelectorAll('[role="dialog"],.modal,.payment-confirmation')).some(el=>!el.closest('.incoming-order')))
  const observer=new MutationObserver(scan);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-payment-active']});scan()
  const unlock=()=>{if(readAlertPreferences().sound)void enableAudio().catch(()=>{})};document.addEventListener('pointerdown',unlock,{once:true})
  const message=(e:MessageEvent)=>{if(e.data?.user_id!==identity.current)return;if(e.data.type==='counternest:open-alert'){pendingOpen.current=e.data.event;setRevision(n=>n+1)}if(['counternest:order-alert','counternest:open-alert'].includes(e.data.type))void poll()}
  const refresh=()=>void poll();const timer=window.setInterval(refresh,5000)
  navigator.serviceWorker?.addEventListener('message',message);document.addEventListener('visibilitychange',refresh);window.addEventListener('counternest:alerts-refresh',refresh)
  return()=>{live=false;observer.disconnect();window.clearInterval(timer);document.removeEventListener('pointerdown',unlock);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('counternest:alerts-refresh',refresh);navigator.serviceWorker?.removeEventListener('message',message);identity.current='';void binding(null)}
 },[enabled])
 useEffect(()=>{if(!blocked&&!document.querySelector('.incoming-order [role="dialog"]')&&pendingOpen.current){const e=pendingOpen.current;pendingOpen.current=null;navigateRoute(alertRoute(e))}},[blocked,revision,events])
 useEffect(()=>{
  if(blocked||latest||!enabled||!preferences.enabled||document.visibilityState!=='visible'||claiming.current)return
  const owner=identity.current
  const candidates=events.filter(e=>!e.presented&&(e.kind==='catalogue'?preferences.catalogue:preferences.preorder))
  async function pick(){claiming.current=true;try{for(const e of candidates){
   const result=await supabase!.rpc('claim_order_alert_presentation',{p_event:e.id});const claimed=!result.error&&result.data===true
   if(identity.current!==owner)return;if(claimed){setLatest(e);if(preferences.sound&&document.visibilityState==='visible')setLocked(!ringOrderAlert(preferences.repeatCount,preferences.tone));break}
  }}finally{claiming.current=false}}
  void pick()
 },[events,blocked,latest,enabled,preferences])
 async function acknowledge(e:OrderAlert){const r=await supabase!.rpc('acknowledge_order_alert',{p_event:e.id});if(r.error){setError(trError(r.error.message));return}setLatest(null);setEvents(old=>old.filter(x=>x.id!==e.id));window.dispatchEvent(new Event('counternest:alerts-refresh'))}
 if(!enabled||!identity.current)return null
 return <><div className="order-alert-centre"><Button disabled={!events.length||blocked} onClick={()=>setLatest(events[0]??null)}>{tr('Order notifications')}{preferences.enabled&&preferences.badge&&count>0?` (${count})`:''}</Button>{blocked&&count>0&&<small role="status">{tr('Order alerts queued until the current transaction or dialog is closed.')}</small>}{error&&<small role="status">{error}</small>}</div>
 {!blocked&&preferences.enabled&&latest&&(latest.kind==='catalogue'?preferences.catalogue:preferences.preorder)&&<>{latest.kind==='catalogue'?<aside className="incoming-order"><h2>{tr('New Catalogue Request')}</h2><Button onClick={()=>navigateRoute(alertRoute(latest))}>{tr('Open record')}</Button><Button onClick={()=>void acknowledge(latest)}>{tr('Acknowledge')}</Button><Button onClick={()=>setLatest(null)}>{tr('View later')}</Button></aside>:<IncomingOrder key={latest.id} id={latest.record_id} onDismiss={()=>setLatest(null)} onAcknowledge={()=>void acknowledge(latest)} onOpen={()=>{navigateRoute(alertRoute(latest));setLatest(null)}}/>}{locked&&<div className="order-sound-unlock"><Button onClick={()=>void enableAudio().then(()=>{ringOrderAlert(preferences.repeatCount,preferences.tone);setLocked(false)})}>{tr('Enable alert sound')}</Button></div>}</>}
 </>
}

export function NotificationSettings({role}:{role:Role}){
 const [p,setP]=useState(readAlertPreferences),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[registered,setRegistered]=useState(false),[devices,setDevices]=useState<{id:string;updated_at:string;enabled:boolean;label:string}[]>([])
 async function loadDevices(){const r=await supabase?.rpc('list_order_push_devices');if(r?.error)setMessage(trError(r.error.message));else setDevices(r?.data??[])}
 useEffect(()=>{if(!['admin','manager','cashier'].includes(role))return;void supabase?.auth.getSession().then(r=>{account=r.data.session?.user.id??'';setP(readAlertPreferences());void loadDevices()});void navigator.serviceWorker?.getRegistration().then(r=>r?.pushManager?.getSubscription()).then(s=>setRegistered(!!s)).catch(()=>{})},[role])
 if(!['admin','manager','cashier'].includes(role))return null
 async function save(register=false){setBusy(true);try{
  const reg=await navigator.serviceWorker?.getRegistration();let sub=await reg?.pushManager?.getSubscription()
  if(register){if(!reg||!('PushManager'in window)||!('Notification'in window))throw new Error(tr('Push is unavailable in this browser.'));const publicKey=import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;if(!publicKey)throw new Error(tr('Push setup is required before registration.'));if(await Notification.requestPermission()!=='granted')throw new Error(tr('Notification permission was not granted.'));const padded=publicKey.replace(/-/g,'+').replace(/_/g,'/');const bytes=Uint8Array.from(atob(padded+'='.repeat((4-padded.length%4)%4)),c=>c.charCodeAt(0));sub??=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});await binding(account)}
  const next={...p,push:pushAllowed(p),device_label:p.device_label.trim()|| (mobile()?'Mobile':'Desktop')}
  if(sub){const r=await supabase!.rpc('register_order_push',{p_subscription:sub.toJSON(),p_preferences:{...next,language:getUiLanguage()}});if(r.error)throw r.error;setRegistered(true)}
  localStorage.setItem(key(),JSON.stringify(next));setP(next);setMessage(tr('Saved.'));await loadDevices();window.dispatchEvent(new Event('counternest:alerts-refresh'));window.dispatchEvent(new CustomEvent('counternest:form-saved',{detail:document.getElementById('order-alert-settings')}))
 }catch(e){setMessage(trError((e as Error).message))}finally{setBusy(false)}}
 async function remove(id:string){setBusy(true);try{const r=await supabase!.rpc('remove_order_push_device',{p_id:id});if(r.error)throw r.error;await loadDevices();setMessage(tr('Device unregistered.'))}catch(e){setMessage(trError((e as Error).message))}finally{setBusy(false)}}
 return <Card className="panel" id="order-alert-settings" data-unsaved-scope="order-alerts"><h2>{tr('Notifications')}</h2><h3>{tr('New Order Alerts')}</h3><p>{tr('Preferences apply to this account on this device. Register each device separately.')}</p>
 {([['enabled','Enable new order notifications'],['preorder','New Pre-Order Alerts'],['catalogue','New Catalogue Requests'],['sound','Sound'],['desktop','Desktop Push'],['mobile','Mobile Push'],['badge','Unread badge']] as const).map(([key,label])=><Toggle key={key} label={tr(label)} checked={p[key]} onChange={e=>setP(old=>({...old,[key]:e.target.checked}))}/>)}
 <FormField>{tr('Foreground alert sound')}<SelectField value={p.tone} onChange={e=>setP({...p,tone:e.target.value as AlertPreferences['tone']})}>{(['chime','bell','gentle'] as const).map(t=><option key={t} value={t}>{tr({chime:'Chime',bell:'Bell',gentle:'Gentle'}[t])}</option>)}</SelectField></FormField>
 <FormField>{tr('Repeat sound count')}<SelectField value={p.repeatCount} onChange={e=>setP({...p,repeatCount:Number(e.target.value)})}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</SelectField></FormField>
 <FormField>{tr('Device name')}<InputField maxLength={80} value={p.device_label} onChange={e=>setP({...p,device_label:e.target.value})}/></FormField>
 <div className="report-actions"><Button disabled={busy} variant="primary" onClick={()=>void save()}>{tr('Save Changes')}</Button><Button disabled={busy||!pushAllowed(p)} onClick={()=>void save(true)}>{tr('Enable notifications on this device')}</Button><Button disabled={busy||!registered} onClick={()=>void (async()=>{const reg=await navigator.serviceWorker?.getRegistration(),sub=await reg?.pushManager.getSubscription();if(sub){const r=await supabase?.rpc('unregister_order_push',{p_endpoint:sub.endpoint});if(r?.error){setMessage(trError(r.error.message));return}/* Keep the shared browser subscription for guest order notifications. */}setRegistered(false);await loadDevices()})()}>{tr('Unregister this device')}</Button><Button onClick={()=>void enableAudio().then(async()=>{ringOrderAlert(p.repeatCount,p.tone);setMessage(tr('Test Notification'));if(registered&&'Notification'in window&&Notification.permission==='granted'){const reg=await navigator.serviceWorker.getRegistration();await reg?.showNotification(tr('Test Notification'),{body:'CounterNest',icon:'/pwa/icon-192.png',tag:'counternest-test'})}}).catch(e=>setMessage(trError(e.message)))}>{tr('Test Notification')}</Button></div>
 <p>{tr('Custom sounds play only while the app is active and audio is permitted. Closed-app notifications use browser and OS settings.')}</p>
 <h3>{tr('Registered devices')}</h3>{devices.map(d=><div className="report-actions" key={d.id}><span>{d.label} · {new Date(d.updated_at).toLocaleString()}</span><Button disabled={busy} variant="danger" onClick={()=>void remove(d.id)}>{tr('Remove')}</Button></div>)}{message&&<p role="status">{message}</p>}
 </Card>
}
