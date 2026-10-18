import {Button} from './Button'
import {useEffect,useState} from 'react'
import {tr,useUiLanguage} from './i18n'
export default function AuthStartupPending(){
 const[slow,setSlow]=useState(false);useUiLanguage()
 useEffect(()=>{const timer=window.setTimeout(()=>setSlow(true),12000);return()=>window.clearTimeout(timer)},[])
 return <main className="auth-stage"><section className="auth-card"><p role="status">{tr(slow?'Still connecting. Check your connection and try again.':'Checking your session…')}</p>{slow&&<Button type="submit" variant="primary" className="primary-btn" onClick={()=>window.location.reload()}>{tr('Reload CounterNest')}</Button>}</section></main>
}
