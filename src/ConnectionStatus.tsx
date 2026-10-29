import {useEffect,useState} from 'react'
import {supabaseConfigured} from './lib/supabase'
import {Button} from './Button'
import {tr,useUiLanguage} from './i18n'
type State='checking'|'connected'|'unreachable'
let latest:State='checking'
export function reportWorkspaceConnection(state:State){latest=state;window.dispatchEvent(new Event('counternest:connection'))}
export function ConnectionStatus(){
 useUiLanguage();const[state,setState]=useState(latest),[online,setOnline]=useState(navigator.onLine)
 useEffect(()=>{const update=()=>{setState(latest);setOnline(navigator.onLine)},reconnect=()=>{reportWorkspaceConnection('checking');window.dispatchEvent(new Event('counternest:workspace-refresh'));update()};window.addEventListener('counternest:connection',update);window.addEventListener('offline',update);window.addEventListener('online',reconnect);return()=>{window.removeEventListener('counternest:connection',update);window.removeEventListener('offline',update);window.removeEventListener('online',reconnect)}},[])
 const label=!supabaseConfigured?'Demo mode':!online?'Offline — reconnect to save':state==='connected'?'Connected to workspace':state==='checking'?'Checking workspace connection…':'Workspace unavailable — displayed data may be outdated'
 return <div className="cn-connection-status"><span role="status">{tr(label)}</span>{supabaseConfigured&&online&&state==='unreachable'&&<Button type="button" onClick={()=>{reportWorkspaceConnection('checking');window.dispatchEvent(new Event('counternest:workspace-refresh'))}}>{tr('Retry connection')}</Button>}</div>
}
