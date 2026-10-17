const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..');
async function main(){
 const {default:handler,catalogueManifest}=await import(pathToFileURL(path.join(root,'api/catalogue-manifest.js')));
 const token='a'.repeat(64),other='b'.repeat(64),payload={shop_name:'Pastelería 原名',logo_url:'https://images.example/logo.svg'};
 const manifest=catalogueManifest(token,payload),second=catalogueManifest(other,payload);
 assert.equal(manifest.name,payload.shop_name);assert.notEqual(manifest.id,second.id);assert.equal(manifest.start_url,'/catalogue?token='+token);assert.equal(manifest.scope,'/catalogue');assert.equal(manifest.display,'standalone');
 assert.equal(manifest.icons[0].src,payload.logo_url);assert(manifest.icons.some(i=>i.sizes==='512x512'&&i.type==='image/png'));
 assert(!catalogueManifest(token,{shop_name:'X',logo_url:'javascript:alert(1)'}).icons.some(i=>i.src.includes('javascript')));
 function response(){return{code:0,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this},send(v){this.body=v;return this},end(){return this}}}
 const env={url:process.env.VITE_SUPABASE_URL,pub:process.env.VITE_SUPABASE_PUBLISHABLE_KEY,anon:process.env.VITE_SUPABASE_ANON_KEY},fetchOld=global.fetch;
 try{
  process.env.VITE_SUPABASE_URL='https://tenant.supabase.co';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture';
  let called=0;global.fetch=async(url,options)=>{called++;assert.equal(String(url),'https://tenant.supabase.co/rest/v1/rpc/get_commercial_catalogue');assert.deepEqual(JSON.parse(options.body),{p_token:token});assert.equal(options.headers.apikey,'sb_publishable_fixture');assert(!options.headers.Authorization);return{ok:true,json:async()=>payload}};
  let res=response();await handler({method:'GET',query:{token}},res);assert.equal(res.code,200);assert.equal(JSON.parse(res.body).name,payload.shop_name);assert.match(res.headers['Content-Type'],/manifest/);assert.equal(res.headers['Cache-Control'],'private, no-store');assert.equal(called,1);
  res=response();await handler({method:'GET',query:{token:'../bad'}},res);assert.equal(res.code,400);assert.equal(called,1);
  res=response();await handler({method:'POST',query:{token}},res);assert.equal(res.code,405);
  global.fetch=async()=>({ok:false});res=response();await handler({method:'GET',query:{token}},res);assert.equal(res.code,404);
  global.fetch=async()=>{throw new Error('offline')};res=response();await handler({method:'GET',query:{token}},res);assert.equal(res.code,503);
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_secret_never_accepted';res=response();await handler({method:'GET',query:{token}},res);assert.equal(res.code,503);
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY='header.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature';res=response();await handler({method:'GET',query:{token}},res);assert.equal(res.code,503);
 }finally{global.fetch=fetchOld;for(const[k,v]of Object.entries({VITE_SUPABASE_URL:env.url,VITE_SUPABASE_PUBLISHABLE_KEY:env.pub,VITE_SUPABASE_ANON_KEY:env.anon})){if(v===undefined)delete process.env[k];else process.env[k]=v}}
 const events={},puts=[];const shell={shell:true};
 const context={URL,Response,fetch:async()=>({ok:true,headers:{get:()=> 'text/html'},clone(){return this}}),caches:{open:async()=>({put:async(...x)=>puts.push(x)}),match:async()=>shell},self:{location:{origin:'https://shop.example'},addEventListener:(name,fn)=>events[name]=fn}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'public/sw.js'),'utf8'),context);
 async function dispatch(url,mode='navigate'){let result;events.fetch({request:{url,method:'GET',mode},respondWith(p){result=p}});return result&&await result}
 await dispatch('https://shop.example/catalogue?token='+token);assert.equal(puts.length,0,'Token-bearing navigation must not be cached');
 assert.equal(await dispatch('https://shop.example/api/catalogue-manifest?token='+token),undefined,'API is network only');
 assert.equal(await dispatch('https://tenant.supabase.co/rest/v1/test','cors'),undefined,'Cross-origin business data is network only');
 context.fetch=async()=>{throw Error('offline')};assert.equal(await dispatch('https://shop.example/catalogue?token='+token),shell);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/rel="icon" type="image\/png" href="\/pwa\/favicon-64.png"/);assert.match(html,/catalogueManifest\.href = '\/api\/catalogue-manifest/);
 const ui=fs.readFileSync(path.join(root,'src/CatalogueInstall.tsx'),'utf8');for(const text of ['beforeinstallprompt','appinstalled','Add to Home Screen','Instalar app','安裝商品目錄','安装商品目录'])assert(ui.includes(text));assert(!ui.includes('link[rel="icon"]'),'Install UI must not replace browser favicon');
 const esbuild=require('esbuild'),Module=require('module'),React=require('react'),Renderer=require('react-test-renderer');
 const result=await esbuild.build({entryPoints:[path.join(root,'src/CatalogueInstall.tsx')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'language-fixture',setup(build){build.onLoad({filter:/[\\/]i18n\.tsx$/},()=>({contents:'export const useUiLanguage=()=>globalThis.pwaTestLanguage;',loader:'ts'}))}}]});
 const mod=new Module(path.join(__dirname,'compiled-pwa.cjs'),module);mod.paths=Module._nodeModulePaths(__dirname);mod._compile(result.outputFiles[0].text,path.join(__dirname,'compiled-pwa.cjs'));
 const oldWindow=global.window,oldDocument=global.document,oldLocation=global.location;global.location={origin:'https://shop.example'};
 global.window={matchMedia:()=>({matches:false})};global.document={};
 try{for(const [language,label]of [['en','Install Catalogue App'],['es','Instalar app del catálogo'],['zh-TW','安裝商品目錄 App'],['zh-CN','安装商品目录 App']]){
  global.pwaTestLanguage=language;let tree;await Renderer.act(async()=>{tree=Renderer.create(React.createElement(mod.exports.CatalogueInstall,{token,shopName:payload.shop_name}))});
  const button=tree.root.findByType('button');assert.equal(button.children.join(''),label);await Renderer.act(async()=>{await button.props.onClick()});assert(tree.root.findByProps({role:'status'}),'Unsupported browser must expose localized guidance');Renderer.act(()=>tree.unmount());
 }
  const listeners={},manifestLink={href:'/manifest.webmanifest',getAttribute(){return this.href}},touch={href:'/pwa/apple-touch-icon.png',getAttribute(){return this.href}},appleTitle={content:'CounterNest POS'};
  global.document={head:{},querySelector(selector){if(selector.includes('apple-touch-icon'))return touch;if(selector.includes('manifest'))return manifestLink;if(selector.includes('apple-mobile-web-app-title'))return appleTitle;throw Error('Unexpected document access: '+selector)}};
  global.window={matchMedia:()=>({matches:false}),addEventListener(name,fn){listeners[name]=fn},removeEventListener(name){delete listeners[name]}};
  const saveFetch=global.fetch;global.fetch=async(url,options)=>{assert.equal(url,'/api/catalogue-manifest?token='+token);assert.equal(options.cache,'no-store');return{ok:true,headers:{get:()=> 'application/manifest+json'}}};
  try{
   global.pwaTestLanguage='en';let tree,promptCount=0,prevented=false;await Renderer.act(async()=>{tree=Renderer.create(React.createElement(mod.exports.CatalogueInstall,{token,shopName:payload.shop_name,logoUrl:payload.logo_url}))});
   assert.equal(manifestLink.href,'/api/catalogue-manifest?token='+token);assert.equal(appleTitle.content,payload.shop_name);assert.equal(touch.href,payload.logo_url);
   await Renderer.act(async()=>{listeners.beforeinstallprompt({preventDefault(){prevented=true},prompt:async()=>{promptCount++},userChoice:Promise.resolve({outcome:'dismissed'})})});
   await Renderer.act(async()=>{tree.root.findByType('button').props.onClick();await Promise.resolve();await Promise.resolve()});assert(prevented);assert.equal(promptCount,1);assert(tree.root.findByProps({role:'status'}));
   Renderer.act(()=>listeners.appinstalled());assert(tree.root.findByType('button').props.disabled);assert.equal(tree.root.findByType('button').children.join(''),'Catalogue app installed');Renderer.act(()=>tree.unmount());
   assert.equal(manifestLink.href,'/manifest.webmanifest');assert.equal(touch.href,'/pwa/apple-touch-icon.png');assert.equal(appleTitle.content,'CounterNest POS');assert.equal(Object.keys(listeners).length,0);
  }finally{global.fetch=saveFetch}
 }finally{global.window=oldWindow;global.document=oldDocument;global.location=oldLocation;delete global.pwaTestLanguage}
 console.log('PASS customer PWA: tenant identity/start URL, safe icons, anonymous endpoint, invalid/revoked/config/offline failures, API/token cache exclusion, offline public shell, four-language install guidance and fixed favicon');
}
main().catch(error=>{console.error(error);process.exitCode=1});
