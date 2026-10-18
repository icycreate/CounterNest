const fs=require('fs'),path=require('path'),assert=require('assert'),React=require('react'),Renderer=require('react-test-renderer'),esbuild=require('esbuild'),Module=require('module'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),store=new Map(),qrCalls=[];let rpcCalls=[],failFirst=true;
global.sessionStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
global.window={location:{origin:'https://current.example',search:''},setInterval(){return 1},clearInterval(){}};global.window.addEventListener=()=>{};global.window.removeEventListener=()=>{};global.window.dispatchEvent=()=>{};global.location=window.location;
global.document={addEventListener(){},removeEventListener(){}};
global.navigator={clipboard:{writeText:async()=>{}}};
global.qrMock={toDataURL:async url=>{qrCalls.push(url);return 'data:image/png;base64,qr-test'}};
let base='https://production.example';
global.customerClient={rpc:async(name,args)=>{
 rpcCalls.push({name,args});
 if(name==='ensure_customer_display_config')return {data:{access_token:'token abc',enabled:true,contact_methods:['whatsapp','email'],preorder_enabled:true,public_base_url:base,receipt_catalogue_qr:true}};
 if(name==='get_receipt_catalogue_link')return {data:{enabled:true,token:'token abc',public_base_url:base}};
 if(name==='submit_catalogue_preorder'){if(failFirst){failFirst=false;return {error:{message:'Response unavailable'}}}return {data:{request_number:14}}}
 if(name==='get_catalogue_preorders')return {data:{requests:[{id:'request',request_number:14,customer_name:'Customer',preferred_method:'whatsapp',contact_value:'+5015550101',summary:[],estimated_subtotal:9,status:'new_request',created_at:new Date().toISOString()}],events:[]}};
 return {data:null};
}};
async function bundle(file){const r=await esbuild.build({entryPoints:[path.join(root,'src',file)],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',logOverride:{'empty-import-meta':'silent'},plugins:[{name:'services',setup(b){b.onLoad({filter:/[\\/]lib[\\/]supabase\.ts$/},()=>({contents:'export const supabase=globalThis.customerClient;export const supabaseConfigured=true;',loader:'ts'}));b.onResolve({filter:/^qrcode$/},()=>({path:'qrcode',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export default globalThis.qrMock;',loader:'js'}))}}]});const m=new Module(path.join(__dirname,'request-ui-compiled.cjs'),module);m.paths=Module._nodeModulePaths(__dirname);m._compile(r.outputFiles[0].text,path.join(__dirname,'request-ui-compiled.cjs'));return m.exports}
const text=tree=>JSON.stringify(tree.toJSON());
const click=async(tree,label)=>Renderer.act(async()=>{const b=tree.root.findAllByType('button').find(b=>b.children.join('')===label);assert(b,'Missing button '+label);await b.props.onClick()});
async function main(){
 const links=await bundle('customerLinks.ts');
 assert.equal(links.customerLinks('token abc','https://production.example','https://env.example','https://current.example').display,'https://production.example/catalogue-display?token=token+abc');
 assert.equal(links.customerLinks('x',null,'https://env.example','https://current.example').catalogue,'https://env.example/catalogue?token=x');
 assert.equal(links.customerLinks('x',null,undefined,'https://current.example').preview,'https://current.example/catalogue?token=x&preview=1');
 for(const url of ['javascript:alert(1)','https://user:pass@x.test','https://x.test/path'])assert.equal(links.customerLinks('x',url).display,'');
 assert(links.contactHref('whatsapp','+501 555 0101','Hello & welcome').includes('https://wa.me/5015550101?text=Hello%20%26%20welcome'));assert(links.contactHref('email','person@example.test','Hello').startsWith('mailto:'));assert.equal(links.contactHref('wechat','handle','Hi'),'');assert.equal(links.contactHref('email','javascript:alert(1)','Hi'),'');
 const {CustomerContactSettings,ReceiptCatalogueQr}=await bundle('CustomerContactSettings.tsx');let tree;
 await Renderer.act(async()=>{tree=Renderer.create(React.createElement(CustomerContactSettings,{role:'admin',showToast(){},display:true}))});assert(qrCalls.at(-1).startsWith('https://production.example/catalogue-display?'));
 for(const label of ['Copy Catalogue Link','Open Customer Display','Preview Catalogue','Print QR'])assert(text(tree).includes(label),label);
 base='https://new.example';await click(tree,'Refresh settings');assert(qrCalls.at(-1).startsWith('https://new.example/catalogue-display?'));Renderer.act(()=>tree.unmount());
 await Renderer.act(async()=>{tree=Renderer.create(React.createElement(ReceiptCatalogueQr))});assert(text(tree).includes('Browse customer catalogue'));Renderer.act(()=>tree.unmount());
 const {CataloguePreorderForm,CatalogueRequestInbox}=await bundle('CataloguePreorders.tsx');let cleared=false;
 const props={token:'public-token',items:[{product_id:'p',variant_id:'v',qty:2,expected_unit_price:9,name:'Cake • Small'}],methods:['whatsapp','email'],currency:'USD',defaultCountry:'BZ',onClear(){cleared=true},onRemove(){},onQuantity(){}};
 await Renderer.act(async()=>{tree=Renderer.create(React.createElement(CataloguePreorderForm,props))});assert(!text(tree).includes('datetime-local'));await click(tree,'Customer information');
 Renderer.act(()=>tree.root.findAllByType('input')[0].props.onChange({target:{value:'Sample Customer'}}));Renderer.act(()=>tree.root.findAllByType('input').find(n=>n.props.type==='tel').props.onChange({target:{value:'+5015550101'}}));
 const methodSelect=tree.root.findAllByType('select').find(s=>s.props.value==='whatsapp');assert.deepEqual(methodSelect.findAllByType('option').map(o=>o.props.value),['whatsapp','email']);assert.equal(tree.root.findByProps({'aria-label':'Country and calling code'}).props.value,'BZ');
 Renderer.act(()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));await click(tree,'Submit Pre-Order Request');assert(text(tree).includes('Retry Same Request'));assert(store.has('counternest.preorder.pending.public-token'));await click(tree,'Retry Same Request');assert(cleared);assert(text(tree).includes('Request #'));assert(!store.has('counternest.preorder.pending.public-token'));
 const submissions=rpcCalls.filter(r=>r.name==='submit_catalogue_preorder');assert.equal(submissions.length,2);assert.deepEqual(submissions[0].args,submissions[1].args);assert.equal(submissions[0].args.p_customer.contact,'+5015550101');assert(!Object.hasOwn(submissions[0].args.p_customer,'pickup_at'));Renderer.act(()=>tree.unmount());
 await Renderer.act(async()=>{tree=Renderer.create(React.createElement(CatalogueRequestInbox,{role:'employee',showToast(){},onScheduled(){}}))});assert(tree.root.findAllByType('button').some(b=>b.children.join('')==='Contact via WhatsApp'));assert(!text(tree).includes('Contact via Email'));assert(!text(tree).includes('Administrator Contact Override'));Renderer.act(()=>tree.unmount());
 const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');assert(!app.includes('DailyOpeningCash'));assert(!app.includes('get_today_staff_opening_cash'));assert(app.includes("callRpc('open_register'"));assert(app.includes('Register / station'));
 const visible=[];for(const file of fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.tsx'))){const source=ts.createSourceFile(file,fs.readFileSync(path.join(root,'src',file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function visit(n){if((ts.isJsxText(n)||ts.isStringLiteral(n))&&/^(?:\s*)(?:3[0-9]\.\d+)\s+[A-Za-z]/.test(n.text))visible.push(file+': '+n.text);ts.forEachChild(n,visit)}visit(source)}assert.deepEqual(visible,[]);
 console.log('PASS canonical/regenerating catalogue QR, receipt QR, safe contact links, selected-only employee contact, customer request review/retry recovery, no pickup requirement, no login cash gate and unnumbered supply tabs');
}
main().catch(e=>{console.error(e);process.exit(1)});



