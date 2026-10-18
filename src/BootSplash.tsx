import {useEffect,useRef,useSyncExternalStore} from 'react'
import type {CSSProperties} from 'react'
import type {BootLifecycle} from './startupLifecycle'
import {tr,useUiLanguage} from './i18n'

/** Platform identity only: this component never requests a tenant logo. */
export default function BootSplash({lifecycle}:{lifecycle:BootLifecycle}){
 const phase=useSyncExternalStore(lifecycle.subscribe,lifecycle.getSnapshot,lifecycle.getSnapshot);useUiLanguage()
 const initialElapsed=useRef(lifecycle.elapsed()).current
 useEffect(()=>{const check=()=>lifecycle.checkDeadline();document.addEventListener('visibilitychange',check);window.addEventListener('pageshow',check);return()=>{document.removeEventListener('visibilitychange',check);window.removeEventListener('pageshow',check)}},[lifecycle])
 if(phase==='done')return null
 return <section className="cn-boot" data-phase={phase} aria-label="CounterNest" style={{'--boot-elapsed':`${initialElapsed}ms`} as CSSProperties}>
  <div className="cn-boot-content">
   <div className="cn-boot-art" aria-hidden="true">
    <svg className="cn-boot-rings" viewBox="0 0 260 260" fill="none"><circle className="cn-boot-ring cn-boot-ring-a" cx="130" cy="130" r="108" pathLength="100"/><circle className="cn-boot-ring cn-boot-ring-b" cx="130" cy="130" r="94" pathLength="100"/><path className="cn-boot-nest" d="M54 188 Q130 232 206 188 M67 200 Q130 232 193 200"/></svg>
    <img className="cn-boot-logo cn-boot-logo-light" src="/counternest-default-logo.svg" width="128" height="128" alt=""/>
    <img className="cn-boot-logo cn-boot-logo-dark" src="/counternest-boot-logo-dark.svg" width="128" height="128" alt=""/>
    <svg className="cn-boot-detail cn-boot-bread" viewBox="0 0 40 40" fill="none"><path d="M8 30V18c-5-8 5-15 12-10 7-5 17 2 12 10v12Z M14 17v7 M20 15v9 M26 17v7"/></svg>
    <svg className="cn-boot-detail cn-boot-cup" viewBox="0 0 40 40" fill="none"><path d="M8 15h21v10c0 10-21 10-21 0Z M29 17h3c8 0 5 11-3 10 M7 35h25 M16 10c-5-3 4-5 0-9 M23 10c-5-3 4-5 0-9"/></svg>
    <svg className="cn-boot-detail cn-boot-wheat" viewBox="0 0 40 40" fill="none"><path d="m10 35 18-27 M17 25c-10 2-12-4-10-9 7 0 10 3 10 9Zm5-8c-8 0-10-5-7-9 6 1 8 3 7 9Zm1 8c8 1 11-4 10-8-6-1-9 2-10 8Z M28 13c-3-5 0-10 5-11 3 6 1 9-5 11Z"/></svg>
   </div>
   <p className="cn-boot-name">CounterNest</p>
   <p className="cn-boot-tagline">{tr('Sweet business.')}<br/>{tr('Simpler days.')}</p>
   <p className="cn-boot-status" role="status" aria-live="polite">{tr('Loading your workspace…')}</p>
   <div className="cn-boot-track" aria-hidden="true"><span/></div>
  </div>
 </section>
}
