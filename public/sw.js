const CACHE_VERSION = 'counternest-web-v2-0-0-rc30-mobile-ui'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
// Persist only the account binding, never a session/JWT or order details.
function notificationBinding(write, value) {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('counternest-notification-binding',1)
    request.onupgradeneeded=()=>request.result.createObjectStore('binding')
    request.onerror=()=>reject(request.error)
    request.onsuccess=()=>{const db=request.result,tx=db.transaction('binding',write?'readwrite':'readonly'),store=tx.objectStore('binding');const op=write?store.put(value,'account'):store.get('account');let result;op.onsuccess=()=>{result=op.result};tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error)}}
  })
}
self.addEventListener('message',event=>{if(event.data?.type==='counternest:notification-account'&&event.source?.url?.startsWith(self.location.origin+'/'))event.waitUntil(notificationBinding(true,event.data.user||null))})
// Atomic, durable retry suppression per account/event; stores no customer details.
function claimPushEvent(user,id){return new Promise((resolve,reject)=>{
 const request=indexedDB.open('counternest-notification-binding',1)
 request.onupgradeneeded=()=>request.result.createObjectStore('binding')
 request.onerror=()=>reject(request.error)
 request.onsuccess=()=>{const db=request.result,tx=db.transaction('binding','readwrite'),store=tx.objectStore('binding'),key='push:'+user+':'+id;let claimed=false
 const get=store.get(key);get.onsuccess=()=>{if(!get.result){store.put(true,key);claimed=true}}
 tx.oncomplete=()=>{db.close();resolve(claimed)};tx.onerror=()=>{db.close();reject(tx.error)}
 }
})}
// Customer capabilities stay in this browser's IndexedDB, never in push payloads.
function customerBinding(id,write=false,value=null){return new Promise((resolve,reject)=>{
 const request=indexedDB.open('counternest-notification-binding',1)
 request.onupgradeneeded=()=>request.result.createObjectStore('binding')
 request.onerror=()=>reject(request.error)
 request.onsuccess=()=>{const db=request.result,tx=db.transaction('binding',write?'readwrite':'readonly'),store=tx.objectStore('binding'),key='customer:'+id;let result
 const op=write?(value?store.put(value,key):store.delete(key)):store.get(key);op.onsuccess=()=>{result=op.result};tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error)}
 }
})}
self.addEventListener('message',event=>{
 const p=event.data;if(p?.type!=='counternest:customer-binding'||!event.source?.url?.startsWith(self.location.origin+'/'))return
 if(!/^[a-f0-9-]{36}$/i.test(p.request_id)||(!p.remove&&!/^[a-f0-9-]{36}$/i.test(p.token)))return
 event.waitUntil(customerBinding(p.request_id,true,p.remove?null:{token:p.token,catalogueToken:p.catalogueToken||null}).then(()=>event.ports?.[0]?.postMessage({saved:true})).catch(()=>event.ports?.[0]?.postMessage({saved:false})))
})
async function customerPush(p){
 if(!['accepted','preparing','ready'].includes(p.kind)||!/^[a-f0-9-]{36}$/i.test(p.id)||!/^[a-f0-9-]{36}$/i.test(p.record_id))return
 const binding=await customerBinding(p.record_id);if(!binding)return
 if(!await claimPushEvent('customer:'+p.record_id,p.id))return
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
 const matching=windows.filter(c=>{const u=new URL(c.url);return u.pathname==='/request-status'&&u.searchParams.get('token')===binding.token})
 matching.forEach(c=>c.postMessage({type:'counternest:customer-order-update',token:binding.token,event_id:p.id,kind:p.kind}))
 if(matching.some(c=>c.visibilityState==='visible'&&c.focused))return
 const words={en:{ready:'Your Order Is Ready for Pickup!',accepted:'Your order has been accepted',preparing:'Your order is being prepared',body:'Order #{number} · {status}. Tap to view your pickup details.',statuses:{ready:'Ready for Pickup',accepted:'Accepted',preparing:'Preparing'}},es:{ready:'¡Tu pedido está listo para recoger!',accepted:'Tu pedido ha sido aceptado',preparing:'Tu pedido se está preparando',body:'Pedido #{number} · {status}. Toca para ver los detalles de recogida.',statuses:{ready:'Listo para recoger',accepted:'Aceptado',preparing:'En preparación'}},'zh-TW':{ready:'您的訂單已可取貨！',accepted:'您的訂單已接受',preparing:'您的訂單正在製作',body:'訂單 #{number} · {status}。點選查看取貨詳情。',statuses:{ready:'可取貨',accepted:'已接受',preparing:'製作中'}},'zh-CN':{ready:'您的订单已可取货！',accepted:'您的订单已接受',preparing:'您的订单正在制作',body:'订单 #{number} · {status}。点击查看取货详情。',statuses:{ready:'可取货',accepted:'已接受',preparing:'制作中'}}}
 const t=words[p.language]||words.en
 await self.registration.showNotification(t[p.kind],{body:String(p.shop_name||'CounterNest')+' · '+t.body.replace('{number}',String(p.order_number)).replace('{status}',t.statuses[p.kind]),icon:'/pwa/icon-192.png',badge:'/pwa/icon-192.png',tag:'counternest-customer-'+p.id,renotify:false,data:{audience:'customer',record_id:p.record_id,id:p.id}})
}
async function openCustomerOrder(p){
 const binding=await customerBinding(p.record_id);if(!binding)return
 const route='/request-status?token='+encodeURIComponent(binding.token)
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
 const exact=windows.find(c=>{const u=new URL(c.url);return u.pathname==='/request-status'&&u.searchParams.get('token')===binding.token})
 if(exact){await exact.focus();exact.postMessage({type:'counternest:customer-order-update',token:binding.token,event_id:p.id});return}
 const catalogue=binding.catalogueToken&&windows.find(c=>{const u=new URL(c.url);return u.pathname==='/catalogue'&&u.searchParams.get('token')===binding.catalogueToken})
 if(catalogue){const opened=await catalogue.navigate(route);await opened?.focus()}else await self.clients.openWindow(route)
}
self.addEventListener('pushsubscriptionchange',event=>event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});windows.forEach(c=>c.postMessage({type:'counternest:customer-subscription-changed'}))})()))

self.addEventListener('push',event=>event.waitUntil((async()=>{
  let p;try{p=event.data.json()}catch{return}
  if(p?.audience==='customer'){await customerPush(p);return}
  if(!p||!['catalogue','preorder','custom_cake'].includes(p.kind)||!/^[a-f0-9-]{36}$/.test(p.record_id)||!/^[a-f0-9-]{36}$/.test(p.id)||p.user_id!==await notificationBinding(false))return
  if(!await claimPushEvent(p.user_id,p.id))return
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
  const isStaffWindow=c=>{const u=new URL(c.url||self.location.origin+'/dashboard');return !u.searchParams.has('token')&&!['/catalogue','/catalogue-display','/request-status','/join'].includes(u.pathname)}
  const focused=windows.find(c=>c.visibilityState==='visible'&&c.focused&&isStaffWindow(c))
  const payload={type:'counternest:order-alert',user_id:p.user_id,event:{id:p.id,kind:p.kind,record_id:p.record_id,created_at:new Date().toISOString()}}
  if(focused){focused.postMessage(payload);return}
  // Notification tag replaces retries for the same event. OS sound follows device policy.
  const labels={en:{catalogue:'New catalogue request',custom_cake:'New custom cake request',preorder:'New pre-order'},es:{catalogue:'Nueva solicitud del catálogo',custom_cake:'Nueva solicitud de pastel personalizado',preorder:'Nuevo pedido anticipado'},'zh-TW':{catalogue:'新目錄請求',custom_cake:'新客製蛋糕請求',preorder:'新預訂'},'zh-CN':{catalogue:'新目录请求',custom_cake:'新定制蛋糕请求',preorder:'新预订'}}
  await self.registration.showNotification('CounterNest',{body:(labels[p.language]||labels.en)[p.kind],icon:'/pwa/icon-192.png',badge:'/pwa/icon-192.png',tag:'counternest-order-'+p.id,renotify:false,data:p})
  if(p.badge&&self.navigator.setAppBadge)await self.navigator.setAppBadge().catch(()=>{})
})()))
self.addEventListener('notificationclick',event=>{
 event.notification.close();const p=event.notification.data;if(!p?.record_id)return
 if(p.audience==='customer'){event.waitUntil(openCustomerOrder(p));return}
 event.waitUntil((async()=>{if(p.user_id!==await notificationBinding(false))return;const route=p.kind==='catalogue'?'/sale?request='+encodeURIComponent(p.record_id):'/scheduled-orders?record='+encodeURIComponent(p.record_id);const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(c=>{const u=new URL(c.url);return !u.searchParams.has('token')&&!['/catalogue','/catalogue-display','/request-status','/join'].includes(u.pathname)});if(client){await client.focus();client.postMessage({type:'counternest:open-alert',user_id:p.user_id,event:{id:p.id,kind:p.kind,record_id:p.record_id}})}else await self.clients.openWindow(route)})())
})
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/counternest-logo-full-transparent.svg',
  '/counternest-icon-transparent.svg',
  '/counternest-logo-light.svg', '/counternest-icon-light.svg',
  '/counternest-logo-full-light.svg', '/counternest-logo-horizontal-transparent.svg', '/counternest-logo-horizontal-light.svg', '/counternest-favicon.svg',
  '/boot-screen.css',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/icon-maskable-512.png',
  '/pwa/apple-touch-icon.png'
]

async function cacheBuiltAssets(cache) {
  try {
    const response = await fetch('/index.html', { cache: 'no-store' })
    if (!response.ok) return
    await cache.put('/index.html', response.clone())
    const html = await response.text()
    const urls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
      .map(match => match[1])
      .filter(url => url.startsWith('/') && !url.startsWith('//'))
    await Promise.allSettled(urls.map(url => cache.add(url)))
  } catch (_) {
    // The static core list still provides the install shell.
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE)
    await Promise.allSettled(CORE_ASSETS.map(asset => cache.add(asset)))
    await cacheBuiltAssets(cache)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith('counternest-') && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Never cache Supabase/Auth/API traffic or cross-origin customer data.
  if (url.origin !== self.location.origin) return
  // Manifest responses contain a customer capability token. Never persist API data.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request)
        const cache = await caches.open(SHELL_CACHE)
        // Only cache the common public shell, never a token-bearing navigation response.
        if (fresh.ok && !url.search && ['/', '/index.html'].includes(url.pathname) && fresh.headers.get('content-type')?.includes('text/html')) await cache.put('/index.html', fresh.clone())
        return fresh
      } catch (_) {
        return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error()
      }
    })())
    return
  }

  if (!/^\/(?:assets\/|pwa\/|boot-screen\.css$|counternest-(?:logo-(?:full|horizontal)-(?:transparent|light)|icon-(?:transparent|light)|logo-(?:light|dark)|favicon|default-logo|brand-lockup|boot-logo-dark|icon)\.(?:svg|png|webp)$|manifest\.webmanifest$)/.test(url.pathname)) return
  event.respondWith((async () => {
    const cached = await caches.match(request)
    const network = fetch(request).then(async response => {
      if (response.ok && !response.headers.get('content-type')?.includes('text/html')) {
        const cache = await caches.open(RUNTIME_CACHE)
        cache.put(request, response.clone())
      }
      return response
    }).catch(() => undefined)
    return cached || (await network) || Response.error()
  })())
})

