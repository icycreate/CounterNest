// Public catalogue metadata only. Never use a service-role key here.
export function catalogueManifest(token, catalogue) {
  const route = '/catalogue?' + new URLSearchParams({token}).toString()
  const name = String(catalogue.shop_name || 'CounterNest').trim().slice(0, 160)
  const icons = [
    {src:'/pwa/icon-192.png', sizes:'192x192', type:'image/png', purpose:'any'},
    {src:'/pwa/icon-512.png', sizes:'512x512', type:'image/png', purpose:'any'},
    {src:'/pwa/icon-maskable-512.png', sizes:'512x512', type:'image/png', purpose:'maskable'}
  ]
  try {
    const logo = new URL(catalogue.logo_url)
    if (logo.protocol === 'https:' && !logo.username && !logo.password) icons.unshift({src:logo.href, sizes:'any', purpose:'any'})
  } catch { /* Neutral CounterNest icons remain available. */ }
  const validHex=(v,f)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:f
  const dark=catalogue.theme?.appearance==='dark'
  const background=dark?'#1d2025':validHex(catalogue.theme?.background,'#fbf7f2')
  return {id:route, name, short_name:name.slice(0, 32), description:name + ' • Catalogue', start_url:route, scope:'/catalogue', display:'standalone', background_color:background, theme_color:background, icons}
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  if (req.method !== 'GET') return res.status(405).end()
  const token = req.query?.token
  if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{32,128}$/.test(token)) return res.status(400).json({error:'Invalid catalogue link'})
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  let endpoint
  try {
    endpoint = new URL('/rest/v1/rpc/get_commercial_catalogue', base)
    if (endpoint.protocol !== 'https:' || !key || key.startsWith('sb_secret_')) throw new Error('config')
    // Reject accidentally supplied legacy service-role JWTs as well.
    if (key.split('.').length === 3) {
      const role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role
      if (role !== 'anon') throw new Error('config')
    }
  } catch { return res.status(503).json({error:'Catalogue installation is unavailable'}) }
  try {
    const headers = {'Content-Type':'application/json', apikey:key}
    if (!key.startsWith('sb_publishable_')) headers.Authorization = 'Bearer ' + key
    const response = await fetch(endpoint, {method:'POST', headers, body:JSON.stringify({p_token:token}), signal:AbortSignal.timeout(10000)})
    if (!response.ok) return res.status(404).json({error:'Catalogue unavailable'})
    const catalogue = await response.json()
    if (!catalogue || typeof catalogue.shop_name !== 'string') return res.status(404).json({error:'Catalogue unavailable'})
    res.setHeader('Content-Type','application/manifest+json; charset=utf-8')
    return res.status(200).send(JSON.stringify(catalogueManifest(token, catalogue)))
  } catch { return res.status(503).json({error:'Catalogue installation is unavailable'}) }
}
