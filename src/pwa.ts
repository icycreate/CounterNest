export async function registerPosServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      // Check for a new shell on normal launches without interrupting an active sale.
      window.setTimeout(() => registration.update().catch(() => undefined), 3000)
    } catch (error) {
      console.warn('POS service worker registration failed', error)
    }
  }
  if (document.readyState === 'complete') await register()
  else window.addEventListener('load', register, {once:true})
}
