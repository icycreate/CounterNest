import {useEffect,useRef} from 'react'

export function useDialogFocus(onClose:()=>void){
  const ref=useRef<HTMLElement>(null)
  const close=useRef(onClose);close.current=onClose
  useEffect(()=>{
    const dialog=ref.current;if(!dialog)return
    const previous=document.activeElement as HTMLElement|null
    const focusable=()=>dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]')
    focusable()[0]?.focus()
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.stopPropagation();close.current()}
      if(e.key==='Tab'){const elements=focusable();if(!elements.length)return;const first=elements[0],last=elements[elements.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
    }
    dialog.addEventListener('keydown',key)
    return()=>{dialog.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus()}
  },[])
  return ref
}
