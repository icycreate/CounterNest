import {useEffect,useRef,useState} from 'react'
import {ArrowLeft} from 'lucide-react'
import {appBack,observeNavigationUi,setNavigationConfirmation} from './appNavigation'
import {Button} from './Button'
import {tr,useUiLanguage} from './i18n'
export function BackButton(){useUiLanguage();return <div className="cn-back-bar"><Button variant="secondary" type="button" onClick={appBack}><ArrowLeft size={17}/>{tr('Back')}</Button></div>}
export default function NavigationBoundary(){
 useUiLanguage();const [pending,setPending]=useState<(()=>void)|null>(null),dialog=useRef<HTMLElement>(null),stay=useRef<HTMLButtonElement>(null);
 useEffect(()=>{setNavigationConfirmation(run=>setPending(previous=>previous?null:run));const stop=observeNavigationUi();return()=>{setNavigationConfirmation(undefined);stop()}},[]);
 useEffect(()=>{if(!pending)return;const previous=document.activeElement as HTMLElement;stay.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setPending(null)}if(e.key==='Tab'){const all=dialog.current?.querySelectorAll<HTMLButtonElement>('button');if(!all?.length)return;if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all[all.length-1].focus()}else if(!e.shiftKey&&document.activeElement===all[all.length-1]){e.preventDefault();all[0].focus()}}};document.addEventListener('keydown',key,true);return()=>{document.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus()}},[pending]);
 if(!pending)return null;
 return <div className="cn-unsaved-backdrop"><section ref={dialog} className="cn-unsaved-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cn-unsaved-title"><h2 id="cn-unsaved-title">{tr('You have unsaved changes.')}</h2><div><Button variant="secondary" ref={stay} type="button" className="cn-button cn-button--secondary" onClick={()=>setPending(null)}>{tr('Stay Here')}</Button><Button variant="danger" onClick={()=>{setPending(null);pending()}}>{tr('Discard & Go Back')}</Button></div></section></div>;
}
