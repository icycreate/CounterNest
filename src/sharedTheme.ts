import {readablePalette} from './accessiblePalette'
export {contrast} from './accessiblePalette'
import {useEffect} from 'react'
import type {ThemeConfig} from './types'

export type AppearanceMode='light'|'dark'|'system'
export type SharedTheme=ThemeConfig&{appearance?:AppearanceMode}
export const defaultTheme:SharedTheme={primary:'#ad4b20',background:'#fbf7f2',text:'#33251e',appearance:'system'}
const hex=(v:unknown,fallback:string)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback
export function normalizeTheme(value:Partial<SharedTheme>|null|undefined):SharedTheme{return {primary:hex(value?.primary,defaultTheme.primary),background:hex(value?.background,defaultTheme.background),text:hex(value?.text,defaultTheme.text),appearance:['light','dark','system'].includes(value?.appearance??'')?value!.appearance:'system'}}
export function themeTokens(value:Partial<SharedTheme>|null|undefined,dark:boolean){return readablePalette(normalizeTheme(value),dark)}
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
