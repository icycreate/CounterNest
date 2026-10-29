import {useEffect,useId,useMemo,useRef,useState} from 'react'
import {Button} from './Button'
import {tr,useUiLanguage} from './i18n'
import {canAccessPage} from './navigationModel'
import type {PageKey,Role} from './types'
import './guidedTutorial.css'

type Step={id:string;title:string;body:string;page:PageKey;admin?:boolean}
export const tutorialSteps:Step[]=[
 {id:'welcome',title:'Welcome to CounterNest',body:'Take a short tour of your workspace. This guide explains the screens; it does not create sales, change stock or submit orders.',page:'dashboard'},
 {id:'settings',title:'Make the workspace yours',body:'In Settings, review your business profile, language and appearance. Changes here use the normal Save controls.',page:'settings',admin:true},
 {id:'products',title:'Meet your products',body:'Review product names, prices and availability. Keep product photos separate from your Catalogue banners and About Us picture.',page:'products'},
 {id:'sale',title:'Explore New Sale',body:'Products go directly into the cart. Review quantities and totals before payment. For a demonstration, use a separate demo workspace and do not confirm a real payment.',page:'sale'},
 {id:'catalogue',title:'Shape your public Catalogue',body:'In Settings → Catalogue Settings, Home Page, Categories and About Us save independently. Preview each section and choose its content language before publishing.',page:'settings',admin:true},
 {id:'requests',title:'Handle incoming requests',body:'Pre-Orders shows Catalogue Requests and Scheduled Orders. Open a request to review its customer and items. Contact does not accept it; Accept opens confirmation and Decline requires a reason.',page:'scheduled-orders'},
 {id:'notifications',title:'Stay informed',body:'Use Order notifications to open the exact request, mark it read or mark all read. In Settings → Notifications, enable this device explicitly. Push needs backend setup; custom sounds require an active app.',page:'settings',admin:true},
 {id:'inventory',title:'Keep stock accurate',body:'Review inventory and use the existing receiving or production workflow for stock changes. Browsing the Catalogue and reading this tutorial do not deduct stock.',page:'inventory'},
 {id:'preparation',title:'Prepare accepted orders',body:'Use Preparation / Kitchen to review the work assigned to your team. Follow the existing order status controls and confirm changes only when the work is ready.',page:'preparation'},
 {id:'reports',title:'Review your business',body:'Open Reports to review the information available to your role. Demo results and real business results should stay in separate workspaces.',page:'reports'},
 {id:'finish',title:'You are ready to explore',body:'Reopen Tutorials at any time to repeat the walkthrough or choose a topic. Finishing the tour marks only this guide as read; it does not certify that business setup is complete.',page:'dashboard'}
]
type Progress={step:string;status:'new'|'active'|'paused'|'done'}
const fresh:Progress={step:'welcome',status:'new'}
export const tutorialKey=(scope:string)=>'counternest.tutorial.v1.'+encodeURIComponent(scope)
export function readTutorial(scope:string):Progress{try{const p=JSON.parse(localStorage.getItem(tutorialKey(scope))??'null');return p&&tutorialSteps.some(s=>s.id===p.step)&&['new','active','paused','done'].includes(p.status)?p:{...fresh}}catch{return {...fresh}}}
export const allowedTutorialSteps=(role:Role)=>tutorialSteps.filter(s=>(!s.admin||role==='admin')&&canAccessPage(role,s.page))
export function GuidedTutorial({scope,role,page,setPage}:{scope:string;role:Role;page:PageKey;setPage:(page:PageKey)=>void}){
 useUiLanguage()
 const[progress,setProgress]=useState(()=>readTutorial(scope)),[open,setOpen]=useState(false),[blocked,setBlocked]=useState(false)
 const steps=useMemo(()=>allowedTutorialSteps(role),[role]),index=Math.max(0,steps.findIndex(s=>s.id===progress.step)),step=steps[index],titleId=useId(),panelId=useId(),heading=useRef<HTMLHeadingElement>(null),launcher=useRef<HTMLButtonElement>(null)
 useEffect(()=>{const scan=()=>setBlocked(Array.from(document.querySelectorAll('[data-payment-active="true"],[role="dialog"],.modal-backdrop,.payment-confirmation')).some(el=>el.getClientRects().length>0));scan();const observer=new MutationObserver(scan);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-payment-active','hidden','aria-hidden']});return()=>observer.disconnect()},[])
 function save(next:Progress){setProgress(next);try{localStorage.setItem(tutorialKey(scope),JSON.stringify(next))}catch{/* Progress remains available for this session when device storage is unavailable. */}}
 // First-use introduction is inline, on Dashboard only, after other dialogs/payments close.
 useEffect(()=>{if(progress.status==='new'&&page==='dashboard'&&!blocked){setOpen(true);save({...progress,status:'active'})}},[progress.status,page,blocked])
 function show(){setOpen(true);if(progress.status==='done')save({step:'welcome',status:'active'});else save({step:step.id,status:'active'});requestAnimationFrame(()=>heading.current?.focus())}
 function close(done=false){save({step:step.id,status:done?'done':'paused'});setOpen(false);launcher.current?.focus()}
 return <section className="cn-tutorial" aria-label={tr('Tutorials')}>
 <div className="cn-tutorial-launch"><Button ref={launcher} aria-expanded={open&&!blocked} aria-controls={panelId} disabled={blocked} onClick={()=>open?close():show()}>{tr(open?'Hide tutorial':'Tutorials')}</Button>{blocked&&open&&<small role="status">{tr('Tutorial paused while a transaction or dialog is open.')}</small>}</div>
 {open&&!blocked&&<div id={panelId} className="cn-tutorial-panel" role="region" aria-labelledby={titleId}>
 <div className="cn-tutorial-heading"><h2 ref={heading} tabIndex={-1} id={titleId}>{tr('Your CounterNest walkthrough')}</h2><Button onClick={()=>close()}>{tr('View later')}</Button></div>
 <p className="cn-tutorial-progress" role="status">{tr('Tour progress')}: {index+1} / {steps.length}</p><progress aria-label={tr('Tour progress')} max={steps.length} value={index+1}/>
 <div className="cn-tutorial-layout"><nav aria-label={tr('Tutorial topics')}>{steps.map((s,i)=><Button key={s.id} aria-current={s.id===step.id?'step':undefined} variant={s.id===step.id?'primary':'ghost'} onClick={()=>save({step:s.id,status:'active'})}>{i+1}. {tr(s.title)}</Button>)}</nav>
 <div className="cn-tutorial-copy"><h3>{tr(step.title)}</h3><p>{tr(step.body)}</p><p>{tr('Only topics available to your role are shown. Progress is saved for this account and workspace on this device.')}</p>
 {page===step.page?<p className="cn-tutorial-here">{tr('You are on this screen.')}</p>:<Button onClick={()=>{if(canAccessPage(role,step.page))setPage(step.page)}}>{tr('Open this screen')}</Button>}
 <div className="cn-tutorial-actions"><Button disabled={index===0} onClick={()=>save({step:steps[index-1].id,status:'active'})}>{tr('Previous')}</Button>{index<steps.length-1?<Button variant="primary" onClick={()=>save({step:steps[index+1].id,status:'active'})}>{tr('Next')}</Button>:<Button variant="primary" onClick={()=>close(true)}>{tr('Finish tour')}</Button>}<Button onClick={()=>save({step:'welcome',status:'active'})}>{tr('Restart tour')}</Button></div></div></div></div>}
 </section>
}
