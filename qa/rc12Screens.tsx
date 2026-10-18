/** Isolated visual fixture; only the external QA Vite config serves this entry. */
import React from 'react'
import {createRoot} from 'react-dom/client'
import {IngredientEditor} from '../src/IngredientEditor'
import {CustomUnitModal} from '../src/UnitFields'
import {builtInUnits} from '../src/measurementUnits'
import {CatalogueMediaPromotion} from '../src/CatalogueAdvanced'
import {ProductDetail} from '../src/CommercialCatalogue'
import {CatalogueDecorationEditor} from '../src/CatalogueDecorationEditor'
import {useSharedTheme} from '../src/sharedTheme'
import '../src/styles.css'
import '../src/buttons.css'
import '../src/sharedTheme.css'
import '../src/systemStyle.css'
import '../src/ingredientPurchasing.css'
import '../src/release12.css'
const image=(name:string)=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="600" height="450" fill="#f0dfc6"/><ellipse cx="300" cy="340" rx="170" ry="30" fill="#c7ad87"/><path d="M140 180h320v150H140z" fill="#dfb571"/><path d="M140 210h320v25H140zM140 270h320v25H140z" fill="#fff7de"/><ellipse cx="300" cy="180" rx="160" ry="35" fill="#fff7de"/><text x="300" y="410" text-anchor="middle" font-size="24" fill="#4c3325">${name} · sample data</text></svg>`)
const photos=[{url:image('Chocolate Cake')},{url:image('Second view')}];
const product={id:'qa-cake',name:'Chocolate Cake',price:27,regular_price:36,category_name:'Cakes',category_id:null,image_url:photos[0].url,catalogue_media:photos,description:'Handmade celebration cake with a soft sponge and vanilla cream.',notes:'Keep refrigerated.',tags:['Handmade'],allergens:['Milk','Egg','Wheat'],dietary:['Vegetarian'],featured:true,new_badge:false,seasonal_label:null,promotion_featured:false,promotion_ends_at:null,available:true,variants:[],option_labels:[],catalogue_label_url:null,promotion_kind:null,promotion_value:null,promotion_starts_at:null};
function Screen(){const screen=new URLSearchParams(location.search).get('qa_screen')||'ingredient';useSharedTheme({primary:'#ad4b20',background:'#fbf7f2',text:'#33251e'},screen==='dark'?'dark':'light');return <><p className="qa-evidence-label">CounterNest RC12 · isolated component verification · sample data</p>{screen==='custom'?<CustomUnitModal units={builtInUnits} close={()=>{}} added={()=>{}}/>:screen==='gallery'?<CatalogueMediaPromotion product={product} photosOnly onSaved={async()=>{}}/>:screen==='detail'||screen==='dark'?<ProductDetail product={product} currency="BZD" canSelect onClose={()=>{}} onAdd={()=>{}}/>:screen==='appearance'?<CatalogueDecorationEditor/>:<IngredientEditor ingredient={screen==='purchase'?{id:'qa-cream',name:'Heavy Cream',base_unit:'ml',current_quantity:2000,unit_profile:{purchase_unit:'carton',purchase_size:1,purchase_content_unit:'L',purchase_factor:1000,purchase_label:'1 L Carton',recipe_unit:'ml',recipe_factor:1,conversion_reason:''}}:null} suppliers={[{id:'supplier',name:'Example Food Supply'}]} onClose={()=>{}} onSaved={async()=>{}}/>}</>}
document.getElementById('boot-root')?.remove();document.getElementById('root')?.removeAttribute('inert');document.getElementById('root')?.removeAttribute('aria-hidden');
const css=document.createElement('style');css.textContent='body{padding:20px;background:var(--page-bg);color:var(--text)}.qa-evidence-label{font-size:12px;color:var(--muted);margin:0 0 16px}.modal-backdrop,.commercial-detail-backdrop{position:relative!important;inset:auto!important;background:transparent!important;padding:0!important;display:block!important}.modal,.commercial-detail{position:relative!important;max-height:none!important;overflow:visible!important;width:100%!important;max-width:1100px!important;margin:auto!important}.catalogue-advanced{max-width:1100px;margin:auto;background:var(--surface);padding:20px;border-radius:20px}.gallery-photo{min-width:0}.catalogue-photo-list{grid-template-columns:repeat(2,minmax(0,1fr))}.qa-evidence-label+div{max-width:1100px;margin:auto}';document.head.appendChild(css);
createRoot(document.getElementById('root')!).render(<Screen/>);
