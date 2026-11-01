import {useEffect,useState} from 'react'
import {tr} from '../i18n'
import {Button} from '../Button'
export function NativeNotice(){const [message,setMessage]=useState('');useEffect(()=>{const show=(e:Event)=>setMessage(String((e as CustomEvent).detail||''));window.addEventListener('counternest:native-message',show);return()=>window.removeEventListener('counternest:native-message',show)},[]);return message?<aside className="toast" role="alert">{message}<Button onClick={()=>setMessage('')}>{tr('Close')}</Button></aside>:null}
