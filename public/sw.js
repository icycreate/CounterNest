const CACHE_VERSION = 'counternest-web-v2-0-0-rc7-boot'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/counternest-default-logo.svg',
  '/counternest-boot-logo-dark.svg',
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

  if (!/^\/(?:assets\/|pwa\/|boot-screen\.css$|counternest-(?:default-logo|boot-logo-dark)\.svg$|manifest\.webmanifest$)/.test(url.pathname)) return
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
