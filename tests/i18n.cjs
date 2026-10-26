const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),esbuild=require('esbuild'),React=require('react'),Renderer=require('react-test-renderer');
const root=path.resolve(__dirname,'..'),storage=new Map();
global.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))};
global.window={location:{pathname:'/',origin:'https://test.invalid',search:''},addEventListener(){},dispatchEvent(){}};global.location=window.location;global.document={documentElement:{lang:''},addEventListener(){},removeEventListener(){}};
async function main(){
 const result=await esbuild.build({stdin:{contents:"export * from './src/i18n';export {CatalogueExportModal} from './src/Catalogue'",resolveDir:root,loader:'tsx'},bundle:true,write:false,loader:{'.css':'empty'},platform:'node',format:'cjs',packages:'external',jsx:'automatic',logOverride:{'empty-import-meta':'silent'},plugins:[{name:'mock',setup(build){build.onLoad({filter:/[\\/]lib[\\/]supabase\.ts$/},()=>({contents:'export const supabase=null;export const supabaseConfigured=false;',loader:'ts'}))}}]});
 const compiled=new Module(path.join(__dirname,'i18n-compiled.cjs'),module);compiled.paths=Module._nodeModulePaths(__dirname);compiled._compile(result.outputFiles[0].text,path.join(__dirname,'i18n-compiled.cjs'));
 const api=compiled.exports;let tree;
 await Renderer.act(async()=>{tree=Renderer.create(React.createElement(api.LanguageSelector,{id:'test-language'}))});
 assert.equal(tree.root.findAllByType('option').length,4);
 const languages={en:'Save',es:'Guardar','zh-TW':'儲存','zh-CN':'保存'};
 for(const [language,label]of Object.entries(languages)){
  await Renderer.act(async()=>api.setUiLanguage(language));
  assert.equal(api.tr('Save'),label);assert.equal(document.documentElement.lang,language);
  assert.equal(tree.root.findByType('select').props.value,language);
  assert.equal(api.tr('A business-entered product name'), 'A business-entered product name');
 }
 api.setLanguageScope('account-A');api.setUiLanguage('es');api.setLanguageScope('account-B');api.setUiLanguage('zh-TW');api.setLanguageScope('account-A');assert.equal(api.getUiLanguage(),'es');api.setLanguageScope('account-B');assert.equal(api.getUiLanguage(),'zh-TW');api.setLanguageScope(null);assert.equal(api.getUiLanguage(),'zh-CN');
 assert.equal(api.isUiLanguage('zh'),false);api.setUiLanguage('unsupported');assert.equal(api.getUiLanguage(),'zh-CN');
 Renderer.act(()=>tree.unmount());
 const product={id:'test',name:'Save',price:10,regular_price:10,stock:10,active:true,catalogue_visible:true,catalogue_featured:true,promotion_featured:false,catalogue_new_badge:false,catalogue_sold_out:false,catalogue_sort_order:0,catalogue_seasonal_label:null,category_name:'Business category',image_url:null,catalogue_description:'A business description in English',option_labels:[],variants:[]};
 let html='';window.open=()=>({document:{write:value=>html=value,close(){}}});
 for(const language of Object.keys(languages)){
  api.setUiLanguage(language);
  Renderer.act(()=>{tree=Renderer.create(React.createElement(api.CatalogueExportModal,{products:[product],settings:{catalogue_title:'Business title',pdf_footer:'Business footer in English'},shopName:'Save',logoUrl:null,currency:'USD',customerUrl:'',qrDataUrl:'',onClose(){},showToast(){}}))});
  Renderer.act(()=>tree.root.findAllByType('button').find(button=>String(button.props.className||'').split(' ').includes('primary-btn')).props.onClick());
  assert(html.includes('<h3>Save</h3>'),'Business product name must remain unchanged in '+language);
  assert(html.includes('Business footer in English'));assert(html.includes('Business title'));
  assert(html.includes('<span>'+api.tr('Available')+'</span>'),'Printed availability must use '+language);
  Renderer.act(()=>tree.unmount());
 }
 const catalogue=fs.readFileSync(path.join(root,'src/CommercialCatalogue.tsx'),'utf8'),legacy=fs.readFileSync(path.join(root,'src/CustomerDisplay.tsx'),'utf8');
 assert(catalogue.includes('catalogue-language'));assert(legacy.includes('customer-display-language'));
 assert(catalogue.includes('<h2>{p.name}</h2>'));assert(catalogue.includes('<p>{c.description}</p>'));
 assert(!/tr\((?:p|c|catalog|data)\.(?:name|shop_name|description|catalogue_title|catalogue_subtitle|category_name)/.test(catalogue+legacy),'Business text must never be translated');
 const sources=fs.readdirSync(path.join(root,'src')).filter(file=>file.endsWith('.tsx'));
 for(const file of sources){const source=fs.readFileSync(path.join(root,'src',file),'utf8');assert(!/<option(?![^>]*value=)[^>]*>\{tr\(/.test(source),file+' has a translated option without stable value')}
 console.log('PASS i18n: four languages, live selector, isolated account/device preferences, safe fallback, unchanged business content, stable option payloads, translated PDF labels');
}
main().catch(error=>{console.error(error);process.exitCode=1});
