import { useCallback, useEffect, useState } from 'react'
import {navigateRoute} from './appNavigation'
import type { PageKey } from './types'

export const pageKeys: PageKey[] = ['dashboard','sale','products','catalogue','commercial','scheduled-orders','preparation','forecast-shortages','inventory','recipes','production','production-studio','planning','receiving','purchasing','supply','customers','loyalty','cards','sales','reports','profit','cash-drawer','hardware','customer-display','expenses','staff','audit','backup','readiness','acceptance','go-live','report-issue','handover','tasks','checklists','alerts','schedule','analytics','security-recovery','release-candidate','operations','settings']
export function pageFromPath(path: string): PageKey {
  const key = path.replace(/^\/+|\/+$/g, '')
  return pageKeys.includes(key as PageKey) ? key as PageKey : 'dashboard'
}
export function useBrowserPage(): [PageKey, (page: PageKey) => void] {
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname))
  useEffect(() => {
    const onPop = () => setPage(pageFromPath(window.location.pathname))
    window.addEventListener('counternest:route', onPop)
    return () => window.removeEventListener('counternest:route', onPop)
  }, [])
  const navigate = useCallback((next: PageKey) => {
    const path = `/${next}`
    navigateRoute(path)
  }, [])
  return [page, navigate]
}
