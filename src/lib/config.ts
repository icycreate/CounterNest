export type PublicConfig = { url?: string; publishableKey?: string; anonKey?: string }
export function validatePublicConfig({url, publishableKey, anonKey}: PublicConfig) {
  const key = publishableKey || anonKey
  if (!url || !key || url.includes('YOUR_PROJECT') || key.includes('YOUR_')) return {error: 'Supabase connection settings are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the hosting environment, then rebuild.'}
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    if (parsed.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)) throw new Error()
  } catch { return {error: 'VITE_SUPABASE_URL must be a valid HTTPS project URL (or localhost for local Supabase).'} }
  if (key.startsWith('sb_secret_')) return {error: 'A server-only secret key was supplied. Replace it with a browser-safe publishable key and rotate the exposed secret.'}
  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.role !== 'anon') throw new Error()
    } catch { return {error: 'Use a publishable key or a legacy anon key. Service-role and user JWTs are not frontend configuration.'} }
  }
  return {url, key}
}
