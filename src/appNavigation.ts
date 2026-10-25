type Stamp={session:string;index:number;url:string;layer?:string;anchor?:boolean}
type Layer={id:string;node:HTMLElement;close:()=>void}
export type NavigationPort={getState:()=>any;url:()=>string;push:(s:any,url:string)=>void;replace:(s:any,url:string)=>void;go:(delta:number)=>void;onPop:(fn:(state:any)=>void)=>()=>void}
/** One bounded root cushion plus ordinary same-origin route/layer entries. No external-history inference. */
export function createNavigation(port:NavigationPort,{fallback,guard,onRoute}:{fallback:()=>string;guard:(run:()=>void,layer?:Layer)=>void;onRoute:()=>void}){
 const existing=port.getState()?.counterNest as Stamp|undefined,session=existing?.session??Math.random().toString(36).slice(2);let current:Stamp,restoring:(()=>void)|null=null,bypass=false;const layers:Layer[]=[];
 const state=(s:Stamp)=>({...port.getState(),counterNest:s});
 const push=(url:string,extra:Partial<Stamp>={})=>{current={session,index:current.index+1,url,...extra};port.push(state(current),url)};
 if(existing&&!existing.anchor){current=existing}else{current={session,index:0,url:port.url(),anchor:true};port.replace(state(current),current.url);push(current.url)}
 const accept=(next:Stamp)=>{const previous=current;current=next;const top=layers[layers.length-1];if(top&&previous.layer===top.id&&next.layer!==top.id){layers.pop();top.close()}
  if(next.anchor){const url=fallback();current={session,index:0,url,anchor:true};port.replace(state(current),url);push(url)}onRoute();};
 const off=port.onPop(raw=>{const next=raw?.counterNest as Stamp|undefined;if(!next||next.session!==session)return;const delta=next.index-current.index;
  if(restoring){const run=restoring;restoring=null;run();return}
  if(bypass){bypass=false;accept(next);return}
  if(delta===0){accept(next);return}
  // Restore the URL before asking; staying must preserve both route and form state.
  restoring=()=>guard(()=>{bypass=true;port.go(delta)},layers[layers.length-1]);port.go(-delta);
 });
 return {navigate(url:string){if(url===port.url())return;guard(()=>{if(current.layer){const closing=layers.splice(0);closing.reverse().forEach(l=>l.close());current={session,index:current.index,url};port.replace(state(current),url)}else push(url);onRoute()})},back(){port.go(-1)},addLayer(node:HTMLElement,close:()=>void){const id='layer-'+Math.random().toString(36).slice(2);layers.push({id,node,close});push(port.url(),{layer:id});return()=>{const i=layers.findIndex(l=>l.id===id);if(i<0)return;layers.splice(i,1);if(current.layer===id)port.go(-1)}},dispose:off,getSnapshot:()=>({...current}),layerCount:()=>layers.length,topNode:()=>layers[layers.length-1]?.node};
}
let active:ReturnType<typeof createNavigation>|undefined
let confirmation:((run:()=>void)=>void)|undefined
export function setNavigationConfirmation(fn:((run:()=>void)=>void)|undefined){confirmation=fn}
const baselines=new Map<HTMLElement,string>();
const controlSelector='input:not([type=search]):not([type=hidden]):not([type=submit]):not([type=button]),select,textarea';
export function formFingerprint(scope:HTMLElement){return JSON.stringify(Array.from(scope.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>(controlSelector)).filter(e=>{const nested=e.closest?.('[data-unsaved-scope]');return (!nested||nested===scope||!scope.contains(nested))}).filter(e=>!('readOnly' in e&&e.readOnly)&&!e.disabled&&!e.closest('.cn-search-field')).map(e=>[e.name||e.id||e.getAttribute('aria-label')||'',e instanceof HTMLInputElement&&(e.type==='checkbox'||e.type==='radio')?e.checked:e.value,e instanceof HTMLInputElement&&e.type==='file'?Array.from(e.files??[]).map(f=>[f.name,f.size,f.lastModified]):null]))}
export function resetUnsaved(scope?:HTMLElement){for(const node of baselines.keys())if(!scope||scope===node||scope.contains(node))baselines.set(node,formFingerprint(node))}
const explicitDirty=new Map<HTMLElement,()=>boolean>();
export function registerUnsavedGuard(node:HTMLElement,check:()=>boolean){explicitDirty.set(node,check);return()=>{explicitDirty.delete(node)}}
function dirty(layer?:Layer){for(const [node,check] of explicitDirty)if(node.isConnected&&(!layer||layer.node.contains(node)||node===layer.node)&&check())return true;for(const [node,before]of baselines){if(!node.isConnected){baselines.delete(node);continue}if((!layer||layer.node.contains(node)||node===layer.node)&&before!==formFingerprint(node))return true}return false}
const overlaySelector='.modal-backdrop,.modal-overlay,.ux-backdrop,.mobile-menu-backdrop,.full-image-view,.catalogue-install-help,[data-back-layer]';
function fallback(){return /^\/catalogue(?:-display)?\/?$/.test(location.pathname)?location.pathname+location.search:'/dashboard'}
export function initializeNavigation(){
 if(active)return active;
 const port:NavigationPort={getState:()=>history.state,url:()=>location.pathname+location.search+location.hash,push:(s,u)=>history.pushState(s,'',u),replace:(s,u)=>history.replaceState(s,'',u),go:d=>history.go(d),onPop(fn){const handler=(e:PopStateEvent)=>fn(e.state);window.addEventListener('popstate',handler);return()=>window.removeEventListener('popstate',handler)}};
 active=createNavigation(port,{fallback,guard(run,layer){if(dirty(layer)){confirmation?.(()=>{window.dispatchEvent(new CustomEvent('counternest:discard',{detail:layer?.node}));resetUnsaved(layer?.node);run()})}else run()},onRoute:()=>window.dispatchEvent(new Event('counternest:route'))});
 return active;
}
export function navigateRoute(url:string){initializeNavigation().navigate(url)}
export function appBack(){initializeNavigation().back()}
/** Adapts existing editors to one Back policy; explicit close markers avoid translated-text matching. */
export function observeNavigationUi(){
 let navigation:ReturnType<typeof createNavigation>|undefined;const registered=new Map<HTMLElement,()=>void>(),focusOrigins=new Map<HTMLElement,HTMLElement>();let allowClose=false;
 // Let the auth SDK consume and clear recovery/OAuth fragments before creating history entries.
 const authCallbackPending=()=>/(?:^#|&)(?:access_token|refresh_token|error_description)=/.test(location.hash);
 const scan=()=>{if(!navigation){if(authCallbackPending())return;navigation=initializeNavigation()}for(const [node,remove]of registered)if(!node.isConnected){registered.delete(node);remove();const origin=focusOrigins.get(node);focusOrigins.delete(node);if(origin?.isConnected&&(!navigation.topNode()||navigation.topNode()?.contains(origin)))origin.focus()}
  document.querySelectorAll<HTMLElement>(overlaySelector).forEach(node=>{if(registered.has(node)||node.closest('.cn-unsaved-backdrop'))return;const close=Array.from(node.querySelectorAll<HTMLElement>('[data-back-close]')).find(button=>button.closest(overlaySelector)===node);if(!close)return;const previous=document.activeElement;if(previous instanceof HTMLElement&&!node.contains(previous))focusOrigins.set(node,previous);registered.set(node,navigation!.addLayer(node,()=>{allowClose=true;try{close.click()}finally{allowClose=false}}));if(!node.contains(document.activeElement)){Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).find(element=>element.getClientRects().length&&element.closest(overlaySelector)===node)?.focus()}});
 };
 const remember=(event:Event)=>{const element=event.target as HTMLElement;if(!element?.matches?.(controlSelector)||element.closest('.cn-search-field,.auth-stage,[data-unsaved=ignore]'))return;const scope=element.closest<HTMLElement>('[data-unsaved-scope],form,.modal,.ingredient-dialog,.ux-dialog');if(scope&&!baselines.has(scope))baselines.set(scope,formFingerprint(scope))};
 const click=(e:MouseEvent)=>{const target=e.target as HTMLElement,scope=target.closest<HTMLElement>('[data-unsaved-scope]');if(scope&&!baselines.has(scope))baselines.set(scope,formFingerprint(scope));if(!allowClose&&target.matches(overlaySelector)&&registered.has(target)){e.preventDefault();e.stopImmediatePropagation();appBack();return}const button=target.closest<HTMLElement>('[data-back-close]');if(allowClose||!button||button.closest('.cn-unsaved-backdrop'))return;const layer=button.closest<HTMLElement>(overlaySelector);if(layer&&registered.has(layer)){e.preventDefault();e.stopImmediatePropagation();appBack()}};
 const beforeUnload=(e:BeforeUnloadEvent)=>{if(dirty()){e.preventDefault();e.returnValue=''}};
 const key=(e:KeyboardEvent)=>{if(document.querySelector('.cn-unsaved-backdrop'))return;const top=navigation?.topNode();if(e.key==='Escape'&&top){e.preventDefault();e.stopImmediatePropagation();appBack()}if(e.key==='Tab'&&top){const all=Array.from(top.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length);if(!all.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
 const saved=(e:Event)=>resetUnsaved((e as CustomEvent<HTMLElement|undefined>).detail);
 document.addEventListener('focusin',remember,true);document.addEventListener('beforeinput',remember,true);document.addEventListener('click',click,true);window.addEventListener('beforeunload',beforeUnload);window.addEventListener('counternest:form-saved',saved);
 document.addEventListener('keydown',key,true);
 const observer=new MutationObserver(scan);observer.observe(document.getElementById('root')!,{childList:true,subtree:true});scan();
 const callbackTimer=authCallbackPending()?window.setInterval(()=>{scan();if(navigation)window.clearInterval(callbackTimer)},100):undefined;
 return()=>{observer.disconnect();window.clearInterval(callbackTimer);document.removeEventListener('focusin',remember,true);document.removeEventListener('beforeinput',remember,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('counternest:form-saved',saved);for(const remove of registered.values())remove();registered.clear();baselines.clear()};
}


