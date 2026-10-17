export const BOOT_MINIMUM_MS=1500
export const BOOT_MAXIMUM_MS=3500
export const BOOT_EXIT_MS=220
export type BootPhase='waiting'|'leaving'|'done'
type Clock={now:()=>number;setTimer:(fn:()=>void,ms:number)=>unknown;clearTimer:(id:unknown)=>void}
const browserClock:Clock={now:()=>Date.now(),setTimer:(fn,ms)=>setTimeout(fn,ms),clearTimer:id=>clearTimeout(id as number)}
/** A single launch-scoped gate. Readiness never changes auth or workspace state. */
export function createBootLifecycle({startedAt=Date.now(),reducedMotion=false,onDone=()=>{},clock=browserClock}:{startedAt?:number;reducedMotion?:boolean;onDone?:()=>void;clock?:Clock}={}){
 let phase:BootPhase='waiting',ready=false;const listeners=new Set<()=>void>(),timers=new Set<unknown>();
 const elapsed=()=>Math.max(0,clock.now()-startedAt),publish=()=>listeners.forEach(fn=>fn());
 const cancel=()=>{timers.forEach(id=>clock.clearTimer(id));timers.clear()};
 const finish=()=>{if(phase==='done')return;cancel();phase='done';publish();onDone()};
 const later=(fn:()=>void,ms:number)=>{const id=clock.setTimer(()=>{timers.delete(id);fn()},Math.max(0,ms));timers.add(id)};
 const leave=()=>{if(phase!=='waiting')return;phase='leaving';publish();later(finish,reducedMotion?120:BOOT_EXIT_MS)};
 if(elapsed()>=BOOT_MAXIMUM_MS)finish();else later(finish,BOOT_MAXIMUM_MS-elapsed());
 return {getSnapshot:()=>phase,elapsed,subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}},ready(){if(ready||phase!=='waiting')return;ready=true;later(leave,(reducedMotion?0:BOOT_MINIMUM_MS)-elapsed())},checkDeadline(){if(elapsed()>=BOOT_MAXIMUM_MS)finish()},dispose(){cancel();listeners.clear()}};
}
export type BootLifecycle=ReturnType<typeof createBootLifecycle>
declare global{interface Window{__counterNestBootStarted?:number;__counterNestBootWatchdog?:number}}
let active:BootLifecycle|undefined
export function notifyStartupReady(){active?.ready()}
export function startBoot(){
 if(active)return active
 active=createBootLifecycle({startedAt:window.__counterNestBootStarted??Date.now(),reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,onDone(){
  window.clearTimeout(window.__counterNestBootWatchdog)
  const app=document.getElementById('root');app?.removeAttribute('inert');app?.removeAttribute('aria-hidden')
  const splash=document.getElementById('boot-root');if(splash)splash.hidden=true
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',document.documentElement.dataset.appearance==='dark'?'#1d1916':document.documentElement.style.getPropertyValue('--primary').trim()||'#8b451f')
 }})
 return active
}
