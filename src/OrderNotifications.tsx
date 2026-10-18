import {useEffect,useRef,useState} from 'react'
import {supabase} from './lib/supabase'
import {Card} from './Surface'
import {Button} from './Button'
import {Toggle} from './Fields'
import {tr,trError,getUiLanguage} from './i18n'
import {navigateRoute} from './appNavigation'
import type {Role} from './types'
export type AlertPreferences={preorder:boolean;catalogue:boolean;sound:boolean;repeat:boolean;desktop:boolean;mobile:boolean;badge:boolean;push:boolean}
export const defaultAlertPreferences:AlertPreferences={preorder:true,catalogue:true,sound:true,repeat:true,desktop:false,mobile:false,badge:true,push:false};
export type OrderAlert={id:string;kind:string;record_id:string;created_at:string};
let account='';let audio:AudioContext|undefined;
const key=()=>`counternest.order-alerts.${account}`;
export function readAlertPreferences():AlertPreferences{try{return {...defaultAlertPreferences,...JSON.parse(localStorage.getItem(key())??'{}')}}catch{return {...defaultAlertPreferences}}}
export const alertRoute=(e:OrderAlert)=>e.kind==='catalogue'?'/sale?request='+encodeURIComponent(e.record_id):'/scheduled-orders?record='+encodeURIComponent(e.record_id);
export function ringOrderAlert(repeat=true){
 if(!audio||audio.state!=='running')return false;
 for(let i=0;i<(repeat?3:1);i++){const start=audio.currentTime+i*.8;for(const [offset,freq] of [[0,784],[.16,1046.5]]){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,start+offset);gain.gain.linearRampToValueAtTime(.15,start+offset+.015);gain.gain.exponentialRampToValueAtTime(.001,start+offset+.35);osc.connect(gain);gain.connect(audio.destination);osc.start(start+offset);osc.stop(start+offset+.4)}}return true;
}
async function enableAudio(){audio??=new AudioContext();await audio.resume()}
async function binding(user:string|null){if(!('serviceWorker'in navigator))return;const reg=await navigator.serviceWorker.getRegistration();(reg?.active??navigator.serviceWorker.controller)?.postMessage({type:'counternest:notification-account',user})}
export async function disconnectOrderPush(){
 await binding(null);try{const reg=await navigator.serviceWorker?.getRegistration(),sub=await reg?.pushManager.getSubscription();if(sub){await supabase?.rpc('unregister_order_push',{p_endpoint:sub.endpoint});await sub.unsubscribe()}}catch{}account='';void (navigator as any).clearAppBadge?.();
}
function isMobile(){return matchMedia('(pointer: coarse)').matches}
function pushAllowed(p:AlertPreferences){return isMobile()?p.mobile:p.desktop}
export function NotificationRuntime({enabled}:{enabled:boolean}){
 const[latest,setLatest]=useState<OrderAlert|null>(null),[count,setCount]=useState(0),[soundLocked,setSoundLocked]=useState(false);
 const since=useRef<string|null>(null),after=useRef('00000000-0000-0000-0000-000000000000'),user=useRef('');
 useEffect(()=>{
  if(!enabled||!supabase)return;let live=true,busy=false;
  const bind=async()=>{const r=await supabase!.auth.getSession();user.current=r.data.session?.user.id??'';account=user.current;await binding(account||null);if(live)await poll()};void bind();
  const unlock=()=>{if(readAlertPreferences().sound)void enableAudio().catch(()=>{})};document.addEventListener('pointerdown',unlock,{once:true});
  async function deliver(e:OrderAlert){if(!live||!user.current)return;const p=readAlertPreferences();if(!(e.kind==='catalogue'?p.catalogue:p.preorder))return;
   const claim=()=>{const k=key()+'.seen';let seen:string[]=[];try{seen=JSON.parse(localStorage.getItem(k)??'[]');if(seen.includes(e.id))return false;localStorage.setItem(k,JSON.stringify([...seen,e.id].slice(-300)))}catch{}return true};
   const accepted=(navigator as any).locks?await (navigator as any).locks.request('counternest-alert-'+user.current,claim):claim();if(!accepted||!live)return;
   setLatest(e);setCount(n=>n+1);if(p.sound)setSoundLocked(!ringOrderAlert(p.repeat));if(p.badge)void (navigator as any).setAppBadge?.().catch(()=>{});
  }
  async function poll(){if(busy||document.visibilityState!=='visible'||!user.current)return;busy=true;try{const r=await supabase!.rpc('get_order_alerts',{p_since:since.current,p_after:after.current});if(!live||r.error)return;if(since.current===null)since.current=r.data.since;const rows=r.data.events as OrderAlert[];for(const e of rows){await deliver(e);since.current=e.created_at;after.current=e.id}}finally{busy=false}}
  const timer=window.setInterval(()=>void poll(),5000);const message=(event:MessageEvent)=>{if(event.data?.type==='counternest:order-alert'&&event.data.user_id===user.current)void deliver(event.data.event);if(event.data?.type==='counternest:open-alert'&&event.data.user_id===user.current)navigateRoute(alertRoute(event.data.event))};navigator.serviceWorker?.addEventListener('message',message);
  return()=>{live=false;window.clearInterval(timer);document.removeEventListener('pointerdown',unlock);navigator.serviceWorker?.removeEventListener('message',message);void binding(null);user.current=''};
 },[enabled]);
 if(!latest)return null;
 return <aside role="status" className="cn-order-alert"><strong>{tr(latest.kind==='catalogue'?'New Catalogue Request':latest.kind==='custom_cake'?'New Custom Cake Request':'New Pre-Order')} · {count}</strong>{soundLocked&&<Button onClick={()=>void enableAudio().then(()=>{ringOrderAlert(readAlertPreferences().repeat);setSoundLocked(false)})}>{tr('Enable alert sound')}</Button>}<Button variant="primary" onClick={()=>{navigateRoute(alertRoute(latest));setLatest(null);setCount(0);void (navigator as any).clearAppBadge?.()}}>{tr('Open record')}</Button><Button onClick={()=>setLatest(null)}>{tr('Close')}</Button></aside>
}
export function NotificationSettings({role}:{role:Role}){
 const[p,setP]=useState<AlertPreferences>(readAlertPreferences),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[registered,setRegistered]=useState(false);
 useEffect(()=>{void supabase?.auth.getSession().then(r=>{account=r.data.session?.user.id??'';setP(readAlertPreferences())});void navigator.serviceWorker?.getRegistration().then(r=>r?.pushManager?.getSubscription()).then(s=>setRegistered(!!s)).catch(()=>{})},[]);
 if(!['admin','cashier'].includes(role))return null;
 async function savePush(preferences:AlertPreferences,register=false){
  setBusy(true);try{
   const reg=await navigator.serviceWorker?.getRegistration();let sub=await reg?.pushManager?.getSubscription();
   if(register){if(!reg||!('PushManager'in window)||!('Notification'in window))throw new Error(tr('Push is unavailable in this browser.'));const publicKey=import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;if(!publicKey)throw new Error(tr('Push setup is required before registration.'));if(await Notification.requestPermission()!=='granted')throw new Error(tr('Notification permission was not granted.'));const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));sub??=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});await binding(account)}
   const next={...preferences,push:pushAllowed(preferences)};
   if(sub){const r=await supabase!.rpc('register_order_push',{p_subscription:sub.toJSON(),p_preferences:{...next,language:getUiLanguage()}});if(r.error)throw r.error;setRegistered(true)}
   localStorage.setItem(key(),JSON.stringify(next));setP(next);setMessage(tr('Saved.'));window.dispatchEvent(new CustomEvent('counternest:form-saved',{detail:document.getElementById('order-alert-settings')}));
  }catch(e){setMessage(trError((e as Error).message))}finally{setBusy(false)}
 }
 return <Card className="panel" id="order-alert-settings" data-unsaved-scope="order-alerts"><h2>{tr('New Order Alerts')}</h2><p>{tr('Preferences apply to this account on this device. Register each device separately.')}</p>{([['preorder','New Pre-Order Alerts'],['catalogue','New Catalogue Requests'],['sound','Sound'],['repeat','Repeat Sound'],['desktop','Desktop Push'],['mobile','Mobile Push'],['badge','App Badge']] as const).map(([key,label])=><Toggle key={key} label={tr(label)} checked={p[key]} onChange={e=>setP(old=>({...old,[key]:e.target.checked}))}/>)}<div className="report-actions"><Button disabled={busy} variant="primary" onClick={()=>void savePush(p)}>{tr('Save Changes')}</Button><Button disabled={busy||!pushAllowed(p)} onClick={()=>void savePush(p,true)}>{tr(registered?'Update this device':'Register this device')}</Button><Button disabled={busy||!registered} onClick={()=>void disconnectOrderPush().then(()=>{setRegistered(false);setMessage(tr('Device unregistered.'))})}>{tr('Unregister this device')}</Button><Button onClick={()=>void enableAudio().then(async()=>{ringOrderAlert(p.repeat);if(p.badge)void (navigator as any).setAppBadge?.().catch(()=>{});setMessage(tr('Test Notification'));if(registered&&Notification.permission==='granted'){const reg=await navigator.serviceWorker.getRegistration();await reg?.showNotification(tr('Test Notification'),{body:'CounterNest',icon:'/pwa/icon-192.png',tag:'counternest-test'})}}).catch(e=>setMessage(trError(e.message)))}>{tr('Test Notification')}</Button></div><p>{tr('Foreground sound needs a tap first. Closed-app sound and badges depend on the operating system.')}</p>{message&&<p role="status">{message}</p>}</Card>
}
