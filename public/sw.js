const CACHE_VERSION = 'counternest-web-v2-0-0-rc14-blended-branding'
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
self.addEventListener('push',event=>event.waitUntil((async()=>{
  let p;try{p=event.data.json()}catch{return}
  if(!p||!['catalogue','preorder','custom_cake'].includes(p.kind)||!/^[a-f0-9-]{36}$/.test(p.record_id)||!/^[a-f0-9-]{36}$/.test(p.id)||p.user_id!==await notificationBinding(false))return
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
  const isStaffWindow=c=>{const u=new URL(c.url||self.location.origin+'/dashboard');return !u.searchParams.has('token')&&!['/catalogue-display','/request-status','/join'].includes(u.pathname)}
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
 event.waitUntil((async()=>{if(p.user_id!==await notificationBinding(false))return;const route=p.kind==='catalogue'?'/sale?request='+encodeURIComponent(p.record_id):'/scheduled-orders?record='+encodeURIComponent(p.record_id);const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(c=>{const u=new URL(c.url);return !u.searchParams.has('token')&&!['/catalogue-display','/request-status','/join'].includes(u.pathname)});if(client){await client.focus();client.postMessage({type:'counternest:open-alert',user_id:p.user_id,event:{id:p.id,kind:p.kind,record_id:p.record_id}})}else await self.clients.openWindow(route);if(self.navigator.clearAppBadge)await self.navigator.clearAppBadge().catch(()=>{})})())
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
