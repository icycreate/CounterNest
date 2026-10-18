import {FormField,SelectField} from './Fields'
import {useState} from 'react'
import {tr} from './i18n'
export function CatalogueAppearance({cacheKey}:{cacheKey?:string}){
 const key=(cacheKey??'counternest.catalogue')+'.preference';
 const[mode,setMode]=useState(()=>{try{return localStorage.getItem(key)??'light'}catch{return 'light'}});
 return <FormField label={tr('Appearance')}><SelectField value={mode} onChange={e=>{setMode(e.target.value);try{localStorage.setItem(key,e.target.value)}catch{}window.dispatchEvent(new Event('counternest:catalogue-appearance'))}}>{['light','dark','system'].map(v=><option key={v} value={v}>{tr(v[0].toUpperCase()+v.slice(1))}</option>)}</SelectField></FormField>
}
