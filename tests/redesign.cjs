const fs=require('fs'),path=require('path'),assert=require('assert/strict'),Module=require('module'),esbuild=require('esbuild'),React=require('react'),Renderer=require('react-test-renderer');
const root=path.resolve(__dirname,'..'),store=new Map();
global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
global.location={hash:'',search:'?token=test',pathname:'/catalogue-display',origin:'https://example.invalid'};
global.window={location,addEventListener(){},removeEventListener(){},scrollTo(){},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
global.document={addEventListener(){},removeEventListener(){},getElementById(){return null}};global.navigator={language:'en'};
async function main(){
 const b=await esbuild.build({stdin:{contents:"export * from './src/CustomerStorefront';export * from './src/translations';",resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',define:{'import.meta.env':'{}'},plugins:[{name:'isolated',setup(b){b.onLoad({filter:/[\\/]lib[\\/]supabase\.ts$/},()=>({contents:'export const supabase=null;export const supabaseConfigured=false;',loader:'ts'}))}}]});
 const m=new Module(__filename,module);m.paths=module.paths;m._compile(b.outputFiles[0].text,__filename);
 const p={id:'p',name:'Original 商品',price:12.5,regular_price:15,category_name:'Cakes',image_url:null,catalogue_media:[],description:'Public description',notes:'PRIVATE NOTE',tags:[],allergens:[],dietary:[],featured:true,new_badge:false,seasonal_label:null,available:true,variants:[],option_labels:[]};
 const data={shop_name:'Original Business',currency:'USD',targets:[],products:[p],combos:[],display_options:{idle_seconds:60,slide_seconds:10}};
 const original=JSON.stringify(data);let tree;await Renderer.act(async()=>{tree=Renderer.create(React.createElement(m.exports.CustomerStorefront,{data,token:'tenant-a',canRequest:false,preview:true,error:''}))});
 assert(JSON.stringify(tree.toJSON()).includes('Original 商品'));assert(!JSON.stringify(tree.toJSON()).includes('PRIVATE NOTE'));
 const favorite=()=>tree.root.findAllByType('button').find(b=>b.props['aria-label']==='Favorite: Original 商品');
 Renderer.act(()=>favorite().props.onClick());assert.deepEqual(JSON.parse(store.get('counternest.favorites.tenant-a')),['p']);assert.equal(favorite().props['aria-pressed'],true);assert(!store.has('counternest.favorites.tenant-b'));
 Renderer.act(()=>favorite().props.onClick());assert.deepEqual(JSON.parse(store.get('counternest.favorites.tenant-a')),[]);
 const search=tree.root.findAllByType('input').find(n=>n.props['aria-label']==='Search product name');Renderer.act(()=>search.props.onChange({target:{value:'absent product'}}));assert(JSON.stringify(tree.toJSON()).includes('No products match these filters.'));assert.equal(JSON.stringify(data),original);
 for(const label of ['Home','Categories','My Orders','Account','Favorites','Contact Us','About CounterNest','Search results'])for(const lang of ['es','zh-TW','zh-CN'])assert(m.exports.translations[label]?.[lang],label+' '+lang);
 Renderer.act(()=>tree.unmount());console.log('PASS storefront search, tenant-scoped favorites, original names, private-note exclusion, immutable product payload, and navigation translations');
}
main().catch(e=>{console.error(e);process.exitCode=1});
