import {FormField,SelectField} from './Fields'
import {useSyncExternalStore} from 'react'
import {translations} from './translations'
import {errorTranslations} from './errorTranslations'

export type UiLanguage='en'|'es'|'zh-TW'|'zh-CN'
export const languageOptions:ReadonlyArray<{value:UiLanguage;label:string}>=[{value:'en',label:'English'},{value:'es',label:'Español'},{value:'zh-TW',label:'繁體中文'},{value:'zh-CN',label:'简体中文'}]
const DEVICE_KEY='counternest.language'
const listeners=new Set<()=>void>()
let scope=''
export function isUiLanguage(value:unknown):value is UiLanguage{return languageOptions.some(option=>option.value===value)}
function read(key:string):string|null{try{return globalThis.localStorage?.getItem(key)??null}catch{return null}}
function preferenceKey(){return scope?'counternest.language.user.'+encodeURIComponent(scope):DEVICE_KEY}
function readLanguage():UiLanguage{const preferred=read(preferenceKey())??read(DEVICE_KEY);return isUiLanguage(preferred)?preferred:'en'}
let language:UiLanguage=readLanguage()
function notify(){
 if(typeof document!=='undefined'&&document.documentElement)document.documentElement.lang=language
 listeners.forEach(listener=>listener())
 if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent!=='undefined')window.dispatchEvent(new CustomEvent('counternest:language',{detail:language}))
}
/** Pass a stable account ID after sign-in; pass null on public/customer routes. */
export function setLanguageScope(accountId:string|null){const next=accountId??'';if(scope===next)return;scope=next;const selected=readLanguage();if(selected!==language){language=selected;notify()}}
export function setUiLanguage(next:UiLanguage){if(!isUiLanguage(next))return;try{globalThis.localStorage?.setItem(preferenceKey(),next)}catch{}if(next!==language){language=next;notify()}}
export function getUiLanguage(){return language}
export function getUiLocale(){return {en:'en-US',es:'es', 'zh-TW':'zh-TW','zh-CN':'zh-CN'}[language]}
export function subscribeLanguage(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)}
export function useUiLanguage(){return useSyncExternalStore(subscribeLanguage,getUiLanguage,()=> 'en' as UiLanguage)}
const normalizeLabel=(label:string)=>label.trim().toLocaleLowerCase('en').replace(/^[\s•.:…#()/-]+|[\s•.:…#()/-]+$/g,'').trim()
const normalizedLabels=new Map(Object.keys(translations).map(label=>[normalizeLabel(label),label]))
/** Only call with source UI labels; business-entered values must remain untouched. */
export function tr(source:string,selected:UiLanguage=language):string{
 if(selected==='en')return source
 const exact=translations[source]?.[selected];if(exact)return exact
 const canonical=normalizedLabels.get(normalizeLabel(source));if(!canonical)return source
 const translated=translations[canonical]?.[selected];if(!translated)return source
 const prefix=source.match(/^[\s•.:…#()/-]+/)?.[0]??'',suffix=source.match(/[\s•.:…#()/-]+$/)?.[0]??''
 return prefix+translated.replace(/^[\s•.:…#()/:，。；、-]+|[\s•.:…#()/:，。；、-]+$/g,'')+suffix
}
/** Exact system-error catalogue only; unknown provider details are retained verbatim. */
export function trError(message:string):string{
 let translated=language==='en'?message:errorTranslations[message]?.[language]??translations[message]?.[language]??message
 if(language!=='en'&&translated===message){for(const key of ['Unsupported restore table: %','Reference is outside this backup: %.%']){const segments=key.split('%'),pattern='^'+segments.map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('(.+?)')+'$',match=message.match(new RegExp(pattern));if(match){let index=1;translated=(errorTranslations[key]?.[language]??key).replace(/%/g,()=>match[index++]);break}}}
 return translated.replace(/\bphases?\s+\d+(?:[.]\d+)*(?:\s*(?:through|to|[–—-])\s*\d+(?:[.]\d+)*)?\s*/gi,'').trim()
}

export function TranslatedText({text}:{text:string}){useUiLanguage();return <>{tr(text)}</>}
export function LanguageSelector({id='system-language',compact=false}:{id?:string;compact?:boolean}){
 const selected=useUiLanguage()
 return <FormField className={'language-selector'+(compact?' compact':'')} htmlFor={id}><span>{tr('Language')}</span><SelectField id={id} aria-label={tr('System Language')} value={selected} onChange={event=>setUiLanguage(event.target.value as UiLanguage)}>{languageOptions.map(option=><option key={option.value} value={option.value} lang={option.value}>{option.label}</option>)}</SelectField></FormField>
}
if(typeof document!=='undefined'&&document.documentElement)document.documentElement.lang=language
if(typeof window!=='undefined'&&typeof window.addEventListener==='function')window.addEventListener('storage',event=>{if(event.key===preferenceKey()||event.key===DEVICE_KEY){const next=readLanguage();if(next!==language){language=next;notify()}}})
