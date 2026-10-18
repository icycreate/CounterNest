import {useEffect} from 'react'
import type {ThemeConfig} from './types'

export type AppearanceMode='light'|'dark'|'system'
export type SharedTheme=ThemeConfig&{appearance?:AppearanceMode}
export const defaultTheme:SharedTheme={primary:'#ad4b20',background:'#fbf7f2',text:'#33251e',appearance:'system'}
const hex=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback
export function normalizeTheme(value:Partial<SharedTheme>|null|undefined):SharedTheme{return {primary:hex(value?.primary,defaultTheme.primary),background:hex(value?.background,defaultTheme.background),text:hex(value?.text,defaultTheme.text),appearance:['light','dark','system'].includes(value?.appearance??'')?value!.appearance:'system'}}
function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
export const contrast=(a:string,b:string)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05)
export function themeTokens(value:Partial<SharedTheme>|null|undefined,dark:boolean){
 const t=normalizeTheme(value),deep=dark||luminance(t.background)<.18,bg=dark?'#1d2025':t.background,surface=deep?'#282d34':'#ffffff',text=dark?'#f3f5f7':contrast(t.text,bg)>=4.5&&contrast(t.text,surface)>=4.5?t.text:deep?'#ffffff':'#20242a';
 const foreground=contrast(t.primary,'#ffffff')>=contrast(t.primary,'#17191c')?'#ffffff':'#17191c';
 const focus=contrast(t.primary,surface)>=3?t.primary:dark?'#b8d7ff':'#164b8b';
 return {'--primary':t.primary,'--accent':t.primary,'--primary-foreground':foreground,'--page-bg':bg,'--background':bg,'--surface':surface,'--panel':surface,'--card':surface,'--text':text,'--border':dark?'#697582':'#c8cdd3','--line':dark?'#697582':'#c8cdd3','--muted':dark?'#bac4d0':'#58616e','--focus':focus,'--success':dark?'#92d9b3':'#17623c','--success-foreground':dark?'#122b1d':'#ffffff','--danger':dark?'#ffb4b4':'#a52329','--danger-foreground':dark?'#380c0c':'#ffffff','--warning':dark?'#f4ce82':'#7c530b'};
}
export function publicThemeKey(token:string){return 'counternest.catalogue-theme.'+encodeURIComponent(token)}
export function readCachedTheme(key:string){try{return normalizeTheme(JSON.parse(localStorage.getItem(key)||'null'))}catch{return normalizeTheme(null)}}
export function useSharedTheme(value:Partial<SharedTheme>|null|undefined,appearance:string='system',cacheKey?:string,enabled=true){
 const theme=normalizeTheme(value);const mode:AppearanceMode=['light','dark','system'].includes(appearance)?appearance as AppearanceMode:'system';
 useEffect(()=>{
  if(!enabled)return;
  if(typeof document==='undefined'||!document.documentElement?.style||typeof window.matchMedia!=='function')return;
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const apply=()=>{const dark=mode==='dark'||mode==='system'&&media.matches,html=document.documentElement;html.dataset.appearance=dark?'dark':'light';for(const [k,v]of Object.entries(themeTokens(theme,dark)))html.style.setProperty(k,v);if(document.getElementById('boot-root')?.hidden!==false)document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#1d2025':theme.background);};
  apply();try{if(cacheKey)localStorage.setItem(cacheKey,JSON.stringify({...theme,appearance:mode}));if(!cacheKey?.startsWith('counternest.catalogue-theme.'))localStorage.setItem('counternest.appearance',mode)}catch{}
  media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
 },[theme.primary,theme.background,theme.text,mode,cacheKey,enabled]);
}
