const fs=require('fs'),path=require('path'),assert=require('assert'),esbuild=require('esbuild'),React=require('react'),Renderer=require('react-test-renderer'),Module=require('module');
const timers=new Map();let id=0,loads=0;
global.document={visibilityState:'visible',addEventListener(){},removeEventListener(){}};
global.window={setTimeout(){return 0},clearTimeout(){},setInterval(fn,ms){const key=++id;timers.set(key,{fn,ms});return key},clearInterval(key){timers.delete(key)}};
global.location={search:'?mode=tv',origin:'https://preview.invalid'};global.window.location=global.location;global.sessionStorage={getItem(){return 'session'},setItem(){}};
global.IntersectionObserver=class {observe(){}disconnect(){}};
const product={id:'first',name:'First Cake',price:20,regular_price:25,category_name:'Cakes',image_url:null,catalogue_media:[],description:'Customer detail',notes:null,tags:[],allergens:[],dietary:[],featured:true,new_badge:false,seasonal_label:null,promotion_featured:true,promotion_ends_at:null,available:true,variants:[],option_labels:[]};
global.testCatalogueClient={rpc:async(name)=>name==='get_commercial_catalogue'?{data:{shop_name:'Preview',currency:'USD',targets:['Main POS'],products:[{...product},{...product,id:'second',name:'Second Cake'}],combos:[],display_options:{idle_seconds:60,slide_seconds:10}}}:{data:null}};
const originalRPC=global.testCatalogueClient.rpc;global.testCatalogueClient.rpc=(...args)=>{const promise=originalRPC(...args);promise.abortSignal=()=>promise;return promise};
async function main(){
 const result=await esbuild.build({entryPoints:[path.join(__dirname,'../src/CommercialCatalogue.tsx')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',plugins:[{name:'mock',setup(b){b.onLoad({filter:/[\\/]lib[\\/]supabase\.ts$/},()=>({contents:'export const supabase=globalThis.testCatalogueClient;',loader:'ts'}))}}]});
 const mod=new Module(path.join(__dirname,'compiled-display.cjs'),module);mod.paths=Module._nodeModulePaths(__dirname);mod._compile(result.outputFiles[0].text,path.join(__dirname,'compiled-display.cjs'));
 let tree;await Renderer.act(async()=>{tree=Renderer.create(React.createElement(mod.exports.CommercialCatalogue,{token:'mock-token',mode:'display'}))});
 const slide=()=>Array.from(timers.entries()).find(([,t])=>t.ms===10000),poll=()=>Array.from(timers.values()).find(t=>t.ms===5000);
 const original=slide()[0];for(let n=0;n<3;n++){await Renderer.act(async()=>{await poll().fn()});assert.equal(slide()[0],original,'Polling must not restart TV slides');loads++;}
 Renderer.act(()=>slide()[1].fn());assert.equal(tree.root.findByProps({role:'dialog'}).props['aria-label'],'First Cake');assert.equal(tree.root.findByProps({className:'discount-badge'}).children.join(''),'20% off');
 Renderer.act(()=>slide()[1].fn());assert.equal(tree.root.findByProps({role:'dialog'}).props['aria-label'],'Second Cake');
 assert(!JSON.stringify(tree.toJSON()).includes('Your selection'),'Display must not show customer cart');
 Renderer.act(()=>tree.unmount());assert.equal(timers.size,0);
 console.log('PASS standalone TV slides survive '+loads+' data refreshes; customer detail discounts, hidden cart and timer cleanup');
}
main().catch(e=>{console.error(e);process.exit(1)});
