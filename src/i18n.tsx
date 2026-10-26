import {FormField,SelectField} from './Fields'
import {useSyncExternalStore} from 'react'
import {translations} from './translations'
import {errorTranslations} from './errorTranslations'

export type UiLanguage='en'|'es'|'zh-TW'|'zh-CN'
export const languageOptions:ReadonlyArray<{value:UiLanguage;label:string}>=[{value:'en',label:'English'},{value:'es',label:'Español'},{value:'zh-TW',label:'繁體中文'},{value:'zh-CN',label:'简体中文'}]
const DEVICE_KEY='counternest.language'
const CUSTOMER_KEY='counternest.language.customer'
const listeners=new Set<()=>void>()
const sessionChoices=new Map<string,UiLanguage>()
let scope='',manualSinceScope=false
export function isUiLanguage(value:unknown):value is UiLanguage{return languageOptions.some(option=>option.value===value)}
/** BCP 47 parsing: explicit Chinese script takes precedence over region. */
export function matchBrowserLanguage(tag:string):UiLanguage|null{
 try{
  const locale=new Intl.Locale(tag)
  if(locale.language==='en')return 'en'
  if(locale.language==='es')return 'es'
  if(locale.language!=='zh')return null
  if(locale.script==='Hant')return 'zh-TW'
  if(locale.script==='Hans')return 'zh-CN'
  if(['TW','HK','MO'].includes(locale.region??''))return 'zh-TW'
  if(['CN','SG'].includes(locale.region??''))return 'zh-CN'
  return locale.maximize().script==='Hant'?'zh-TW':'zh-CN'
 }catch{return null}
}
export function detectBrowserLanguage():UiLanguage{
 if(typeof navigator==='undefined')return 'en'
 const preferences=[...(navigator.languages??[]),navigator.language].filter((v):v is string=>typeof v==='string'&&Boolean(v))
 for(const tag of preferences){const match=matchBrowserLanguage(tag);if(match)return match}
 return 'en'
}
/** Resolve before first render, including private Track Order and installed PWA entry routes. */
export function isCustomerLanguageRoute(){
 if(typeof window==='undefined')return false
 const path=(window.location?.pathname??'').replace(/\/$/,''),params=new URLSearchParams(window.location?.search)
 return ['/request-status','/catalogue-display','/ready-display'].includes(path)||path==='/catalogue'&&params.has('token')||['customer_display','catalogue_display','ready_display'].some(k=>params.has(k))
}
function read(key:string):UiLanguage|null{const memory=sessionChoices.get(key);if(memory)return memory;try{const value=globalThis.localStorage?.getItem(key);return isUiLanguage(value)?value:null}catch{return null}}
function preferenceKey(){return isCustomerLanguageRoute()?CUSTOMER_KEY:scope?'counternest.language.user.'+encodeURIComponent(scope):DEVICE_KEY}
function readLanguage():UiLanguage{
 const explicit=read(preferenceKey())
 // The legacy device key belongs to POS/pre-login. Never inherit it on customer routes.
 return explicit??(!isCustomerLanguageRoute()&&scope?read(DEVICE_KEY):null)??detectBrowserLanguage()
}
let language:UiLanguage=readLanguage(),activeKey=preferenceKey()
function notify(){
 if(typeof document!=='undefined'&&document.documentElement)document.documentElement.lang=language
 listeners.forEach(listener=>listener())
 if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent!=='undefined')window.dispatchEvent(new CustomEvent('counternest:language',{detail:language}))
}
export function setLanguageScope(accountId:string|null){
 scope=isCustomerLanguageRoute()?'':accountId??''
 const key=preferenceKey();if(key===activeKey)return
 activeKey=key;manualSinceScope=false;const selected=readLanguage();if(selected!==language){language=selected;notify()}
}
/** Hydrate an existing personal backend choice without publishing a manual-save event. */
export function applySavedAccountLanguage(next:unknown){
 if(isCustomerLanguageRoute()||!scope||manualSinceScope||!isUiLanguage(next))return
 try{globalThis.localStorage?.setItem(preferenceKey(),next)}catch{}
 sessionChoices.set(preferenceKey(),next)
 if(language!==next){language=next;notify()}
}
export function setUiLanguage(next:UiLanguage){
 if(!isUiLanguage(next))return
 manualSinceScope=true;sessionChoices.set(preferenceKey(),next)
 try{globalThis.localStorage?.setItem(preferenceKey(),next)}catch{}
 if(next!==language){language=next;notify()}
 // Selecting the currently detected language is still an explicit saved choice.
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('counternest:language-manual',{detail:next}))
}
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
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){
 window.addEventListener('storage',event=>{
  if(event.key===null||event.key===preferenceKey()||!isCustomerLanguageRoute()&&event.key===DEVICE_KEY){
   if(event.key===null)sessionChoices.clear();else sessionChoices.delete(event.key)
   const next=readLanguage();if(next!==language){language=next;notify()}
  }
 })
 window.addEventListener('languagechange',()=>{const next=readLanguage();if(next!==language){language=next;notify()}})
}
