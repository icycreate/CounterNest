import {useEffect,useState} from 'react'
import {PushNotifications} from '@capacitor/push-notifications'
import {supabase} from '../lib/supabase'
import {Button} from '../Button'
import {Card} from '../Surface'
import {Toggle} from '../Fields'
import {tr,useUiLanguage} from '../i18n'
import {isAndroid} from './platform'
import {enableAndroidPush,installation,revokeAndroidPush} from './runtime'
import type {Role} from '../types'
export function AndroidPushSettings({role,onSaved}:{role:Role;onSaved?:()=>void}){
 useUiLanguage();const [value,setValue]=useState<any>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[permission,setPermission]=useState('prompt')
 async function load(){const r=await supabase?.rpc('get_android_push_settings');if(r?.error)setMessage(tr('Push setup is required.'));else setValue(r?.data);if(isAndroid())setPermission((await PushNotifications.checkPermissions()).receive)}
 useEffect(()=>{void load();const listener=(e:Event)=>{setMessage(tr((e as CustomEvent).detail?.ok?'Device registered. Delivery is not yet verified.':'Device registration failed.'));void load()};window.addEventListener('counternest:android-registration',listener);return()=>window.removeEventListener('counternest:android-registration',listener)},[])
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);try{await fn()}catch{setMessage(tr('Push action failed. Check permissions and backend configuration.'))}finally{setBusy(false)}}
 const s=value?.settings
 return <Card className="panel android-push-settings"><h3>{tr('Android push notifications')}</h3><p>{tr('Private order alerts for authorized Android devices.')}</p>{s&&role==='admin'&&<><Toggle label={tr('Enable Push Notifications')} checked={s.enabled} onChange={e=>setValue({...value,settings:{...s,enabled:e.target.checked}})}/><Toggle label={tr('New Pre-order Alerts')} checked={s.new_preorder} onChange={e=>setValue({...value,settings:{...s,new_preorder:e.target.checked}})}/><Button disabled={busy} onClick={()=>void run(async()=>{const r=await supabase!.rpc('save_android_push_settings',{p_revision:s.revision,p_enabled:s.enabled,p_new_preorder:s.new_preorder});if(r.error)throw r.error;setValue(r.data);onSaved?.();setMessage(tr('Saved'))})}>{tr('Save Changes')}</Button></>}
 {isAndroid()?<><p>{tr('Notification permission')}: {tr(permission==='granted'?'Granted':permission==='denied'?'Denied':'Not requested')}</p><p>{tr('Allow notifications to receive order alerts. You can change this in Android Settings.')}</p><div className="report-actions"><Button disabled={busy} onClick={()=>void run(async()=>{await enableAndroidPush();await load()})}>{tr('Enable notifications on this device')}</Button><Button disabled={busy} onClick={()=>void run(async()=>{await revokeAndroidPush();await load()})}>{tr('Unregister this device')}</Button>{role==='admin'&&<Button disabled={busy} onClick={()=>void run(async()=>{const r=await supabase!.functions.invoke('android-push-test',{body:{installation_id:installation()}});if(r.error)throw r.error;setMessage(tr('Push submitted. Confirm receipt on your device.'))})}>{tr('Test Notification')}</Button>}</div></>:<p>{tr('Install the Android app to register this device.')}</p>}
 <h4>{tr('Registered devices')}</h4>{value?.devices?.map((d:any)=><div className="report-actions" key={d.installation_id}><span>{d.label} · {tr(d.revoked?'Removed':'Registered')}</span><Button disabled={busy||d.revoked} onClick={()=>void run(async()=>{if(isAndroid()&&d.installation_id===installation())await revokeAndroidPush();else{const r=await supabase!.rpc('revoke_android_device',{p_installation:d.installation_id});if(r.error)throw r.error}await load()})}>{tr('Remove')}</Button></div>)}{message&&<p role="status">{message}</p>}</Card>
}
