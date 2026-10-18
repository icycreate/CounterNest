import type { PageKey, Role } from './types'

export type NavItem = { key: PageKey; label: string }
export type NavGroup = { id: string; label: string; items: NavItem[] }
const item = (key: PageKey, label: string): NavItem => ({key,label})
export const navigationGroups: NavGroup[] = [
  {id:'overview',label:'Overview',items:[item('dashboard','Dashboard')]},
  {id:'sales',label:'Sales & Customers',items:[item('sale','New Sale'),item('products','Products'),item('catalogue','Catalogue'),item('customers','Customers'),item('scheduled-orders','Pre-Orders / Custom Cakes'),item('loyalty','Loyalty')]},
  {id:'production',label:'Production & Kitchen',items:[item('preparation','Preparation / Kitchen'),item('production-studio','Production Studio'),item('planning','Production Planning'),item('forecast-shortages','Forecast / Shortages')]},
  {id:'inventory',label:'Inventory & Supplies',items:[item('inventory','Inventory'),item('recipes','Recipes & Ingredients'),item('receiving','Stock Receiving'),item('purchasing','Purchase Orders'),item('supply','Supply Operations')]},
  {id:'reports',label:'Reports & Analysis',items:[item('sales','Sales'),item('reports','Reports'),item('profit','Profitability')]},
  {id:'operations',label:'Operations',items:[item('calendar','Calendar'),item('cash-drawer','Daily Cash'),item('expenses','Expenses'),item('staff','Staff'),item('audit','Audit Log'),item('tasks','Team Workspace')]},
  {id:'system',label:'System & Settings',items:[item('hardware','POS Hardware'),item('customer-display','Customer Display Setup'),item('backup','Workspace'),item('readiness','Deployment / Readiness'),item('report-issue','Report Issue'),item('settings','Settings')]}
]
export const adminPages = new Set<PageKey>(['catalogue','commercial','inventory','recipes','production','planning','forecast-shortages','receiving','purchasing','supply','profit','cash-drawer','hardware','customer-display','expenses','staff','audit','backup','readiness','acceptance','go-live','alerts','analytics','security-recovery','release-candidate','operations'])
export const canAccessPage = (role: Role, page: PageKey) => role === 'admin' || (page==='calendar'?['manager','cashier','production','inventory','employee'].includes(role):role==='manager'?['dashboard','purchasing','receiving','supply','settings','report-issue'].includes(page):role==='accounting'?['dashboard','reports','expenses','settings','report-issue'].includes(page):role==='production'?['dashboard','preparation','purchasing','settings','report-issue'].includes(page):role==='inventory'?['dashboard','inventory','receiving','purchasing','supply','settings','report-issue'].includes(page):!adminPages.has(page))
export function primaryPage(page: PageKey): PageKey {
  if (page==='commercial') return 'catalogue'
  if (page==='cards') return 'customers'
  if (page==='production') return 'planning'
  if (['acceptance','go-live','security-recovery','release-candidate','operations'].includes(page)) return 'readiness'
  if (['handover','checklists','alerts','schedule','analytics'].includes(page)) return 'tasks'
  return page
}
export const visibleNavigation = (role: Role) => navigationGroups.map(group=>({...group,items:group.items.filter(i=>canAccessPage(role,i.key))})).filter(group=>group.items.length)
export const activeGroup = (page: PageKey) => navigationGroups.find(group=>group.items.some(i=>i.key===primaryPage(page)))?.id ?? 'overview'
export const navStorageKey = 'counternest.navigation.groups.v1'
export function readOpenGroups(): Record<string, boolean> {
  try { const saved=JSON.parse(localStorage.getItem(navStorageKey)||'{}');return saved&&typeof saved==='object'?Object.fromEntries(Object.entries(saved).filter((entry):entry is [string,boolean]=>typeof entry[1]==='boolean')):{} } catch { return {} }
}
export function readCompactSidebar() { try { return localStorage.getItem('counternest.navigation.compact')==='true' } catch { return false } }
