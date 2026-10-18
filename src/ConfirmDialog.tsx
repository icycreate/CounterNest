import {StickyActions} from './StickyActions'
import {useState} from 'react'
import type {ReactNode} from 'react'
import {Button} from './Button'
import {tr} from './i18n'
import {useDialogFocus} from './useDialogFocus'
export function ConfirmDialog({title,children,confirmLabel,onConfirm,onClose,danger=true,disabled=false}:{title:string;children:ReactNode;confirmLabel:string;onConfirm:()=>Promise<void>|void;onClose:()=>void;danger?:boolean;disabled?:boolean}){const[busy,setBusy]=useState(false),[error,setError]=useState('');const ref=useDialogFocus(()=>{if(!busy)onClose()});async function confirm(){if(disabled||busy)return;setBusy(true);try{await onConfirm();onClose()}catch(e){setError(e instanceof Error?e.message:String(e));setBusy(false)}}return <div className="modal-backdrop"><section ref={ref} className="modal cn-confirm-dialog" role="dialog" aria-modal="true" aria-label={title} aria-busy={busy}><h2>{title}</h2><div>{children}</div>{error&&<p role="alert">{error}</p>}<StickyActions className="modal-actions"><Button data-back-close="true" disabled={busy} onClick={onClose}>{tr('Cancel')}</Button><Button variant={danger?'danger':'primary'} disabled={busy||disabled} onClick={()=>void confirm()}>{busy?tr('Saving…'):confirmLabel}</Button></StickyActions></section></div>}
