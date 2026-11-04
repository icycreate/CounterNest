import {useEffect,useState} from 'react'
import {Button} from './Button'
import {Card} from './Surface'
import {NotificationSettings} from './OrderNotifications'
import {AndroidPushSettings} from './native/AndroidPushSettings'
import {EmailAlertSettings} from './EmailAlertSettings'
import {isAndroid} from './native/platform'
import {supabase} from './lib/supabase'
import {tr,useUiLanguage} from './i18n'
import type {Role} from './types'

const channels=['Desktop','Mobile','Email','WhatsApp'] as const
type Channel=typeof channels[number]
export function NotificationChannels({role}:{role:Role}){
 useUiLanguage()
 const [revision,setRevision]=useState(0)
 const refresh=()=>setRevision(n=>n+1)
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<Channel>('Desktop')
 const [status,setStatus]=useState<Record<Channel,string>>({Desktop:'Device preferences',Mobile:'Loading…',Email:role==='admin'?'Loading…':'Administrator access required',WhatsApp:'Unavailable'})
 useEffect(()=>{
  let live=true
  async function load(){
   const [mobile,email]=await Promise.all([supabase?.rpc('get_android_push_settings'),role==='admin'?supabase?.rpc('get_preorder_email_settings'):null])
   if(live)setStatus({Desktop:'Device preferences',Mobile:mobile?.error?'Connection error':!mobile?.data?'Setup required':!mobile.data.settings?.enabled?'Disabled':'Delivery verification required',Email:role!=='admin'?'Administrator access required':email?.error?'Connection error':!email?.data?.configured?'Setup required':!email.data.enabled?'Disabled':'Delivery verification required',WhatsApp:'Unavailable'})
  }
  void load().catch(()=>{if(live)setStatus({Desktop:'Device preferences',Mobile:'Connection error',Email:role==='admin'?'Connection error':'Administrator access required',WhatsApp:'Unavailable'})});return()=>{live=false}
 },[role,open,selected,revision])
 return <Card className="panel notification-channels">
  <h2>{tr('Notifications & Alerts')}</h2><p>{tr('Manage how your business receives notifications and alerts.')}</p>
  <ul className="notification-channel-summary">{channels.map(channel=><li key={channel}><strong>{tr(channel)}</strong><span>{tr(status[channel])}</span></li>)}</ul>
  <Button aria-expanded={open} aria-controls="notification-channel-settings" onClick={()=>setOpen(!open)}>{tr(open?'Close notification settings':'Manage notifications')}</Button>
  <div id="notification-channel-settings" hidden={!open}>
   <div className="notification-channel-selector" role="group" aria-label={tr('Notification channels')}>{channels.map(channel=><Button key={channel} aria-pressed={selected===channel} aria-controls={'notification-'+channel} onClick={()=>setSelected(channel)} variant={selected===channel?'primary':'secondary'}>{tr(channel)}</Button>)}</div>
   <section id="notification-Desktop" aria-label={tr('Desktop')} hidden={selected!=='Desktop'}><p>{tr('In-app alerts work while CounterNest is open. Browser push requires permission, registration and server configuration.')}</p><NotificationSettings role={role} foregroundOnly={isAndroid()}/></section>
   <section id="notification-Mobile" aria-label={tr('Mobile')} hidden={selected!=='Mobile'}><AndroidPushSettings role={role} onSaved={refresh}/></section>
   <section id="notification-Email" aria-label={tr('Email')} hidden={selected!=='Email'}><p>{tr('Email is limited to the administrator recipient authorized for this business. Sender and recipient verification are managed by the server administrator.')}</p>{role==='admin'?<EmailAlertSettings role={role} onSaved={refresh}/>:<p>{tr('Administrator access required')}</p>}</section>
   <section id="notification-WhatsApp" aria-label="WhatsApp" hidden={selected!=='WhatsApp'}><h3>{tr('WhatsApp Order Alerts')}</h3><p role="status">{tr('Unavailable')}</p><p>{tr('WhatsApp is not connected. Meta account verification, an approved template and an authorized server integration are required. Other channels do not depend on WhatsApp.')}</p></section>
  </div>
 </Card>
}
