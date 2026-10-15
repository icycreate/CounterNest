import {CustomerContactSettings,ReceiptCatalogueQr} from './CustomerContactSettings'
import {loadCheckout,saveCheckout,definitiveCheckoutFailure} from './checkoutRecovery'
import type {CheckoutAttempt} from './checkoutRecovery'
import {Sidebar,MobileNavigation,SectionTabs} from './Navigation'
import {canAccessPage,readCompactSidebar} from './navigationModel'
import {userFacingText} from './userFacingText'
import {useBrowserPage} from './routes'
import {randomId} from './id'
import {CommercialCatalogue,CommercialSelectionInbox,commercialCartLine,CommercialItem,CommercialProduct} from './CommercialCatalogue'
import {CommercialManagement,ScheduledOrders,ForecastShortages,CustomerOrderHistory} from './CommercialOperations'
import {PreparationScreen,ReadyDisplay} from './OrderDisplays'
import { FormEvent, lazy, useEffect, useMemo, useRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { BrowserMultiFormatReader } from '@zxing/browser'
import {
  Activity, BarChart3, BellRing, Boxes, CakeSlice, ChevronRight, CircleUserRound, CreditCard, FileBarChart, Store,
  Ban, Eye, EyeOff, Gift, ImagePlus, LayoutDashboard, LogOut, Mail, Minus, Package, Palette, Plus, Printer,
  BookOpen, CalendarDays, Camera, ChefHat, ClipboardCheck, MonitorSmartphone, ClipboardList, Copy, Download, Menu, MessageSquareWarning, Network, QrCode, RotateCcw, Search, Settings, ShieldAlert, ShieldCheck, ShoppingCart, Sparkles, Trash2, Truck, Upload, Users, WalletCards, Wifi, WifiOff, X, Landmark, Rocket
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'
const RecipeInventory = lazy(() => import('./RecipeInventory'))
const ProductionPlanning = lazy(() => import('./ProductionPlanning'))
const ProductionStudio = lazy(() => import('./ProductionStudio'))
const OperationalAcceptance = lazy(() => import('./OperationalAcceptance'))
const InternalGoLive = lazy(() => import('./InternalGoLive'))
const OperationsCenter = lazy(() => import('./OperationsCenter'))
const IssueReport = lazy(() => import('./IssueReport'))
const ShiftHandover = lazy(() => import('./ShiftHandover'))
const OperationalTasks = lazy(() => import('./OperationalTasks'))
const DailyChecklists = lazy(() => import('./DailyChecklists'))
const AlertsEscalations = lazy(() => import('./AlertsEscalations'))
const StaffSchedule = lazy(() => import('./StaffSchedule'))
const OperationsAnalytics = lazy(() => import('./OperationsAnalytics'))
const SecurityRecovery = lazy(() => import('./SecurityRecovery'))
const InternalReleaseCandidate = lazy(() => import('./InternalReleaseCandidate'))
const HardwareCommissioning = lazy(() => import('./HardwareCommissioning'))
const SupplyOperations = lazy(() => import('./SupplyOperations'))
const Catalogue = lazy(() => import('./Catalogue'))
import {CustomerDisplayScreen,CustomerDisplaySetup,CustomerSelectionInbox,CustomerSelectionNotifier} from './CustomerDisplay'
import {openSupplyPhoto,uploadSupplyPhoto,validateSupplyPhoto} from './supplyAttachments'
import type { CartLine, CashDrawerSession, CashDrawerTransaction, Customer, PageKey, Product, ReceiptData, Reward, Role, SaleStatus, SaleSummary, ThemeConfig } from './types'

const money = (n: number, currency = 'USD') => {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).format(n) } catch { return `$${n.toFixed(2)}` }
}
const receiptNo = (n?: number) => `#${String(n ?? 0).padStart(6, '0')}`
const uid = () => randomId()
const netSaleTotal = (s: Pick<SaleSummary,'total'|'refundedTotal'|'status'>) => s.status === 'voided' ? 0 : Math.max(0, s.total - (s.refundedTotal ?? 0))
const statusLabel = (status: SaleStatus) => ({completed:'Completed',partially_refunded:'Partially Refunded',refunded:'Refunded',voided:'Voided'}[status])
const LAST_ACTIVITY_KEY = 'counternest.lastActivity'


type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type ShopReceiptConfig = {
  shopName: string
  logoUrl: string | null
  address: string
  phone: string
  email: string
  currency: string
  timezone: string
  footer: string
  staffName: string
}

const demoProducts: Product[] = [
  { id: 'p1', name: 'Classic Croissant', category: 'Pastries', price: 2.5, stock: 42, lowAt: 15, active: true },
  { id: 'p2', name: 'Chocolate Muffin', category: 'Pastries', price: 2.8, stock: 18, lowAt: 10, active: true },
  { id: 'p3', name: 'Cinnamon Roll', category: 'Pastries', price: 3.2, stock: 22, lowAt: 10, active: true },
  { id: 'p4', name: 'Cheese Bread', category: 'Breads', price: 2.7, stock: 31, lowAt: 12, active: true },
  { id: 'p5', name: 'Chocolate Cake Slice', category: 'Cakes', price: 4.5, stock: 7, lowAt: 8, active: true },
  { id: 'p6', name: 'Milk Bread Loaf', category: 'Breads', price: 3.2, stock: 12, lowAt: 6, active: true },
  { id: 'p7', name: 'Chocolate Chip Cookie', category: 'Cookies', price: 1.8, stock: 65, lowAt: 20, active: true },
  { id: 'p8', name: 'Lemon Tart', category: 'Desserts', price: 3.3, stock: 9, lowAt: 12, active: true },
  { id: 'p9', name: 'Macarons (6pcs)', category: 'Desserts', price: 4.2, stock: 14, lowAt: 8, active: true },
  { id: 'p10', name: 'Iced Coffee', category: 'Drinks', price: 2.9, stock: 50, lowAt: 10, active: true },
]

const demoCustomers: Customer[] = [
  { id: 'c1', name: 'Maria Dela Cruz', email: 'maria@email.com', phone: '+501 600-1001', notes: 'Prefers croissants', loyaltyStatus: 'member', points: 125, stamps: 6, visits: 12, totalSpent: 186 },
  { id: 'c2', name: 'John Smith', email: 'john@email.com', phone: '+501 600-1002', notes: '', loyaltyStatus: 'not_enrolled', points: 0, stamps: 0, visits: 4, totalSpent: 62 },
  { id: 'c3', name: 'Sara Patel', email: 'sara@email.com', phone: '+501 600-1003', notes: 'Gluten-free when possible', loyaltyStatus: 'invited', points: 0, stamps: 0, visits: 5, totalSpent: 72 },
]

const demoRewards: Reward[] = [
  { id: 'r1', name: 'Free Croissant', type: 'free_product', costPoints: 100, value: 2.5, productId: 'p1', active: true },
  { id: 'r2', name: '$5 Off', type: 'fixed_discount', costPoints: 200, value: 5, active: true },
  { id: 'r3', name: '10% Off', type: 'percent_discount', costPoints: 300, value: 10, active: true },
  { id: 'r4', name: 'Stamp Card Reward', type: 'free_product', requiredStamps: 10, value: 2.5, productId: 'p1', active: true },
]

const productEmoji = (category: string) => ({ Breads: '🍞', Pastries: '🥐', Cakes: '🍰', Cookies: '🍪', Desserts: '🧁', Drinks: '🥤' }[category] ?? '🥖')
const FOOD_EMOJIS=['🥐','🥖','🍞','🥯','🥨','🧀','🥚','🍳','🥞','🧇','🍰','🎂','🧁','🥧','🍮','🍩','🍪','🍫','🍬','🍭','🍡','🍨','🍦','🍧','🍓','🍒','🍎','🍌','🥭','🍋','🥥','☕','🫖','🥛','🧋','🥤','🧃','🍵','🧊','🥪','🍕','🌯','🥗','🍲','🍜','🍚','🍱','🍙','🍘']

type UiLanguage = 'en'|'es'
let activeLanguage:UiLanguage=localStorage.getItem('counternest.language')==='es'?'es':'en'
const es:Record<string,string>={Dashboard:'Panel','New Sale':'Nueva venta',Products:'Productos',Catalogue:'Catálogo',Inventory:'Inventario','Recipes & Ingredients':'Recetas e ingredientes',Production:'Producción','Production Planning':'Planificación de producción','Production Studio':'Estudio de producción','Stock Receiving':'Recepción de inventario','Purchase Orders':'Órdenes de compra','Supply Operations':'Operaciones de suministro',Customers:'Clientes',Loyalty:'Fidelidad',Cards:'Tarjetas',Sales:'Ventas',Reports:'Reportes',Profitability:'Rentabilidad','Daily Cash':'Caja diaria',Expenses:'Gastos',Staff:'Personal','Audit Log':'Registro de auditoría',Backup:'Respaldo','Launch Readiness':'Preparación para lanzamiento','Operational Acceptance':'Aceptación operativa','Internal Go-Live':'Lanzamiento interno','Report Issue':'Reportar problema','Shift Handover':'Entrega de turno','Operational Tasks':'Tareas operativas','Daily Checklists':'Listas diarias','Alerts & Escalations':'Alertas y escalaciones','Staff Schedule':'Horario del personal','Operations Analytics':'Análisis de operaciones','Security & Recovery':'Seguridad y recuperación','Release Candidate':'Candidato de lanzamiento','Operations Center':'Centro de operaciones',Settings:'Configuración',Administrator:'Administrador',Employee:'Empleado',Logout:'Cerrar sesión',More:'Más','System Language':'Idioma del sistema',English:'Inglés',Spanish:'Español','Android Installation':'Instalación en Android','Install on this Android device':'Instalar en este dispositivo Android','Session Security':'Seguridad de sesión','Automatic logoff':'Cierre de sesión automático','Inactivity timeout':'Tiempo de inactividad','Stay Signed In':'Mantener sesión','Log Out Now':'Cerrar sesión ahora'}
const tr=(s:string)=>activeLanguage==='es'?(es[s]??s):s

export default function App() {
  const customerDisplayToken = new URLSearchParams(window.location.search).get('customer_display')
  const inviteToken = new URLSearchParams(window.location.search).get('loyalty_invite')
  const staffInviteToken = new URLSearchParams(window.location.search).get('staff_invite')
  const [authenticated, setAuthenticated] = useState(false)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const [onboardingRequired, setOnboardingRequired] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [page, setPage] = useBrowserPage()
  const [compactSidebar,setCompactSidebar]=useState(readCompactSidebar)
  function toggleCompactSidebar(){setCompactSidebar(old=>{const next=!old;try{localStorage.setItem('counternest.navigation.compact',String(next))}catch{}return next})}
  const [role, setRole] = useState<Role>('admin')
  const [staffName, setStaffName] = useState('Demo Administrator')
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [shopId, setShopId] = useState<string | null>(null)
  const [shopName, setShopName] = useState('DEMO BUSINESS')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [taxRate, setTaxRate] = useState(0.08)
  const [shopAddress, setShopAddress] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [shopEmail, setShopEmail] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('America/Belize')
  const [receiptFooter, setReceiptFooter] = useState('Thank you for your business!')
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(() => localStorage.getItem('counternest.autoLogoutEnabled') !== 'false')
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(() => { const n = Number(localStorage.getItem('counternest.autoLogoutMinutes') ?? 30); return Number.isFinite(n) && n >= 5 ? n : 30 })
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null)
  const [authMessage, setAuthMessage] = useState('')
  const idleLogoutInProgress = useRef(false)
  const [uiLanguage,setUiLanguage]=useState<UiLanguage>(()=>activeLanguage)
  activeLanguage=uiLanguage
  const [products, setProducts] = useState<Product[]>(demoProducts)
  const [customers, setCustomers] = useState<Customer[]>(demoCustomers)
  const [rewards, setRewards] = useState<Reward[]>(demoRewards)
  const [stampsRequired, setStampsRequired] = useState(10)
  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('counternest.theme') ?? localStorage.getItem('chubbylu-theme')
    return saved ? JSON.parse(saved) : { primary: '#8b451f', background: '#f8efe6', text: '#482e20' }
  })
  const [toast, setToast] = useState('')
  const [sales, setSales] = useState<SaleSummary[]>([
    { id: 's1', receiptNumber: 1001, time: '10:42 AM', items: '2x Croissant, Latte', total: 12, payment: 'Cash', status:'completed', refundedTotal:0 },
    { id: 's2', receiptNumber: 1000, time: '10:28 AM', items: 'Sourdough + Cookies', total: 11.5, payment: 'Card', status:'completed', refundedTotal:0 },
    { id: 's3', receiptNumber: 999, time: '10:05 AM', items: 'Chocolate Cake', total: 28, payment: 'QR', status:'completed', refundedTotal:0 },
  ])

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', theme.primary)
    document.documentElement.style.setProperty('--page-bg', theme.background)
    document.documentElement.style.setProperty('--text', theme.text)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.primary)
    localStorage.setItem('counternest.theme', JSON.stringify(theme))
  }, [theme])

  useEffect(()=>{activeLanguage=uiLanguage;localStorage.setItem('counternest.language',uiLanguage);document.documentElement.lang=uiLanguage},[uiLanguage])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => { setInstallPrompt(null); setStandalone(true); showToast('POS app installed on this device.') }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    document.title = shopName ? `${shopName} • CounterNest POS` : 'CounterNest POS'
  }, [shopName])

  async function installApp() {
    if (standalone) return showToast('POS is already installed on this device.')
    if (!installPrompt) return showToast('Use your browser menu and choose Install app or Add to Home Screen.')
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setAuthenticated(true)
        setAccountEmail(data.user.email ?? '')
        await hydrateFromSupabase()
      }
      setAuthReady(true)
    }).catch(() => setAuthReady(true))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthenticated(Boolean(session?.user))
      setAccountEmail(session?.user?.email ?? '')
      if (!session?.user) {
        setOnboardingRequired(false)
        setShopId(null)
        setAuthReady(true)
        return
      }
      // Handles email-confirmation redirects where the session arrives after the first getUser() check.
      if (event === 'SIGNED_IN') {
        setAuthReady(false)
        window.setTimeout(async () => { await hydrateFromSupabase(); setAuthReady(true) }, 0)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function hydrateFromSupabase() {
    if (!supabase) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: profile } = await supabase.from('staff_profiles').select('shop_id,display_name,role,active,must_change_password').eq('user_id', userData.user.id).maybeSingle()
    if (!profile) {
      // A newly registered owner must complete business setup before the POS is created.
      setOnboardingRequired(true)
      setShopId(null)
      return
    }
    if (!profile.active) {
      await supabase.auth.signOut()
      setAuthenticated(false)
      setOnboardingRequired(false)
      setShopId(null)
      return
    }
    setOnboardingRequired(false)
    setShopId(profile.shop_id)
    setStaffName(profile.display_name)
    setRole(profile.role)
    setMustChangePassword(Boolean(profile.must_change_password))
    if(profile.must_change_password){setProducts([]);setCustomers([]);setSales([]);setRewards([]);return}

    const [{ data: shop }, { data: productRows }, { data: customerRows }, { data: rewardRows }, { data: saleRows }, { data: loyaltyProgram }, {data:translationRows}, {data:customerCardRows}] = await Promise.all([
      supabase.from('shops').select('name,logo_url,address,phone,business_number,email,currency,timezone,receipt_footer,tax_rate,theme,auto_logout_enabled,auto_logout_minutes').eq('id', profile.shop_id).single(),
      supabase.from('products').select('id,name,barcode,icon_emoji,price,cost_price,stock,low_stock_at,active,image_url,categories(id,name)').eq('shop_id', profile.shop_id).order('name'),
      supabase.from('customers').select('id,name,email,phone,notes,loyalty_status,visits,total_spent').eq('shop_id', profile.shop_id).order('name'),
      supabase.from('loyalty_rewards').select('id,name,reward_type,points_cost,stamps_cost,reward_value,product_id,active').eq('shop_id', profile.shop_id).order('name'),
      supabase.from('sales').select('id,receipt_number,total,payment_method,created_at,customer_name_snapshot,status,refunded_total,sale_items(product_name,qty)').eq('shop_id', profile.shop_id).order('created_at', { ascending: false }).limit(50),
      supabase.from('loyalty_programs').select('stamps_required').eq('shop_id',profile.shop_id).maybeSingle(),
      supabase.from('entity_translations').select('entity_type,entity_id,translated_text').eq('shop_id',profile.shop_id).eq('language_code',activeLanguage).eq('field_name','name'),
      supabase.from('issued_cards').select('customer_id,card_id').eq('shop_id',profile.shop_id).in('card_type',['customer','loyalty']),
    ])
    const translations=new Map((translationRows??[]).map((x:any)=>[`${x.entity_type}:${x.entity_id}`,x.translated_text]))

    if (shop) {
      setShopName(shop.name)
      setLogoUrl(shop.logo_url ?? null)
      setTaxRate(Number(shop.tax_rate ?? 0.08))
      setShopAddress(shop.address ?? '')
      setShopPhone(shop.phone ?? '')
      setBusinessNumber(shop.business_number ?? '')
      setShopEmail(shop.email ?? '')
      setCurrency(shop.currency ?? 'USD')
      setTimezone(shop.timezone ?? 'America/Belize')
      setReceiptFooter(shop.receipt_footer ?? 'Thank you for your business!')
      const sessionEnabled = shop.auto_logout_enabled !== false
      const sessionMinutes = Number(shop.auto_logout_minutes ?? 30)
      setAutoLogoutEnabled(sessionEnabled)
      setAutoLogoutMinutes(Number.isFinite(sessionMinutes) && sessionMinutes >= 5 ? sessionMinutes : 30)
      localStorage.setItem('counternest.autoLogoutEnabled', String(sessionEnabled))
      localStorage.setItem('counternest.autoLogoutMinutes', String(Number.isFinite(sessionMinutes) && sessionMinutes >= 5 ? sessionMinutes : 30))
      if (shop.theme) setTheme(shop.theme as ThemeConfig)
    }
    if (productRows) setProducts(productRows.map((p: any) => ({ id: p.id, name: translations.get(`product:${p.id}`)??p.name, barcode: p.barcode ?? undefined, iconEmoji:p.icon_emoji??undefined, category: translations.get(`category:${p.categories?.id}`)??p.categories?.name??'Other', price: Number(p.price), cost: Number(p.cost_price??0), stock: Number(p.stock), lowAt: Number(p.low_stock_at), active: p.active, image: p.image_url ?? undefined })))
    if (customerRows) {
      const mapped: Customer[] = customerRows.map((c: any) => ({ id: c.id, name: c.name, email: c.email ?? '', phone: c.phone ?? '', notes: c.notes ?? '', loyaltyStatus: c.loyalty_status, points: 0, stamps: 0, visits: c.visits, totalSpent: Number(c.total_spent) }))
      const { data: balances } = await supabase.from('loyalty_balances').select('customer_id,points,stamps').eq('shop_id', profile.shop_id)
      const balanceMap = new Map((balances ?? []).map((b: any) => [b.customer_id, b]))
      const cardMap=new Map<string,string[]>();for(const card of customerCardRows??[]){if(!card.customer_id)continue;cardMap.set(card.customer_id,[...(cardMap.get(card.customer_id)??[]),card.card_id])}
      setCustomers(mapped.map(c => ({ ...c, points: Number(balanceMap.get(c.id)?.points ?? 0), stamps: Number(balanceMap.get(c.id)?.stamps ?? 0),cardIds:cardMap.get(c.id)??[] })))
    }
    if (rewardRows) setRewards(rewardRows.map((r: any) => ({ id: r.id, name: translations.get(`reward:${r.id}`)??r.name, type: r.reward_type, costPoints: r.points_cost ?? undefined, requiredStamps: r.stamps_cost ?? undefined, value: Number(r.reward_value), productId: r.product_id ?? undefined, active: r.active })))
    if(loyaltyProgram)setStampsRequired(Number(loyaltyProgram.stamps_required??10))
    if (saleRows) setSales(saleRows.map((s: any) => ({ id: s.id, receiptNumber: Number(s.receipt_number), createdAt: s.created_at, time: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), items: (s.sale_items ?? []).map((i: any) => `${Number(i.qty)}x ${i.product_name}`).join(', '), total: Number(s.total), payment: s.payment_method.toUpperCase(), customerName: s.customer_name_snapshot ?? null, status:(s.status ?? 'completed') as SaleStatus, refundedTotal:Number(s.refunded_total ?? 0) })))
  }

  useEffect(()=>{if(authenticated&&shopId&&supabaseConfigured)void hydrateFromSupabase()},[uiLanguage])

  function markSessionActivity() {
    const now = Date.now()
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
    setIdleWarningSeconds(null)
  }

  useEffect(() => {
    if (!authenticated || !autoLogoutEnabled) {
      setIdleWarningSeconds(null)
      return
    }
    const timeoutMs = Math.max(5, autoLogoutMinutes) * 60_000
    const warningMs = Math.min(60_000, Math.max(15_000, Math.floor(timeoutMs / 4)))
    if (!Number(localStorage.getItem(LAST_ACTIVITY_KEY))) localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))

    const recordActivity = () => markSessionActivity()
    const checkIdle = () => {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? Date.now())
      const remaining = timeoutMs - (Date.now() - last)
      if (remaining <= 0) {
        if (!idleLogoutInProgress.current) {
          idleLogoutInProgress.current = true
          void logout('inactivity').finally(() => { idleLogoutInProgress.current = false })
        }
        return
      }
      if (remaining <= warningMs) setIdleWarningSeconds(Math.max(1, Math.ceil(remaining / 1000)))
      else setIdleWarningSeconds(null)
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') checkIdle() }
    const onStorage = (event: StorageEvent) => { if (event.key === LAST_ACTIVITY_KEY) checkIdle() }
    const events: (keyof WindowEventMap)[] = ['pointerdown','keydown','wheel','touchstart']
    events.forEach(event => window.addEventListener(event, recordActivity, { passive: true }))
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    const timer = window.setInterval(checkIdle, 1000)
    checkIdle()
    return () => {
      events.forEach(event => window.removeEventListener(event, recordActivity))
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(timer)
    }
  }, [authenticated, autoLogoutEnabled, autoLogoutMinutes])

  function showToast(message: string) {
    setToast(userFacingText(message))
    window.setTimeout(() => setToast(''), 2600)
  }

  async function logout(reason: 'manual' | 'inactivity' = 'manual') {
    if (supabase) await supabase.auth.signOut()
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    setIdleWarningSeconds(null)
    setAuthenticated(false)
    setAuthReady(true)
    setOnboardingRequired(false)
    setMustChangePassword(false)
    setShopId(null)
    setCart([])
    setAuthMessage(reason === 'inactivity' ? `You were signed out automatically after ${autoLogoutMinutes} minutes of inactivity.` : '')
  }

  async function enterAuthenticatedSession(newBusiness = false) {
    setPage('dashboard')
    markSessionActivity()
    setAuthMessage('')
    setAuthenticated(true)
    if (!supabaseConfigured || !supabase) {
      setOnboardingRequired(newBusiness)
      setAuthReady(true)
      return
    }
    setAuthReady(false)
    await hydrateFromSupabase()
    setAuthReady(true)
  }

  async function finishBusinessOnboarding(demoInfo?:{name:string;phone:string;address:string;logoUrl:string|null}) {
    if (supabaseConfigured && supabase) {
      setAuthReady(false)
      await hydrateFromSupabase()
      setAuthReady(true)
      return
    }
    if (demoInfo) {
      setShopName(demoInfo.name); setShopPhone(demoInfo.phone); setShopAddress(demoInfo.address); setShopEmail(accountEmail)
      setLogoUrl(demoInfo.logoUrl); setStaffName('Owner'); setRole('admin')
      setProducts([]); setCustomers([]); setRewards([]); setSales([])
    }
    setOnboardingRequired(false)
  }

  const displayParams=new URLSearchParams(window.location.search)
  const standaloneToken=displayParams.get('catalogue_display')??(window.location.pathname.replace(/\/$/,'')==='/catalogue-display'?displayParams.get('token'):null)
  const readyToken=displayParams.get('ready_display')??(window.location.pathname.replace(/\/$/,'')==='/ready-display'?displayParams.get('token'):null)
  if(window.location.pathname.replace(/\/$/,'')==='/catalogue-display'||standaloneToken)return <CommercialCatalogue token={standaloneToken??undefined} mode="display"/>
  if(window.location.pathname.replace(/\/$/,'')==='/ready-display'||readyToken)return readyToken?<ReadyDisplay token={readyToken}/>:<main className="commercial-catalogue"><p role="alert">Open the protected ready-display link from Display Settings.</p></main>
  if (customerDisplayToken || (window.location.pathname.replace(/\/$/,'')==='/catalogue'&&displayParams.has('token'))) return <CommercialCatalogue token={customerDisplayToken??displayParams.get('token')??undefined} mode="customer"/>
  if((displayParams.get('preparation')==='1'||['/preparation','/kitchen'].includes(window.location.pathname.replace(/\/$/,'')))&&authenticated&&!mustChangePassword)return <PreparationScreen standalone/>
  if (!online && supabaseConfigured && !authenticated) return <OfflineStage />
  if (inviteToken) return <LoyaltyJoin token={inviteToken} />
  if (staffInviteToken) return <StaffInvitationJoin token={staffInviteToken} />
  if (!authReady) return <div className="auth-stage"><div className="auth-loading">Opening your workspace…</div></div>
  if (!authenticated) return <AuthStage onAuthenticated={enterAuthenticatedSession} message={authMessage} />
  if (onboardingRequired) return <BusinessOnboarding accountEmail={accountEmail} onComplete={finishBusinessOnboarding} onLogout={logout} />
  if (mustChangePassword) return <InitialPasswordChange accountEmail={accountEmail} onComplete={()=>setMustChangePassword(false)} onLogout={logout} />

  const receiptConfig: ShopReceiptConfig = {
    shopName, logoUrl, address: shopAddress, phone: shopPhone, email: shopEmail, currency, timezone, footer: receiptFooter, staffName
  }

  return (
    <div className={`app-shell ${compactSidebar?'compact-sidebar':''}`}>
      <Sidebar compact={compactSidebar} onToggleCompact={toggleCompactSidebar} page={page} setPage={setPage} staffName={staffName} role={role} shopName={shopName} logoUrl={logoUrl} logout={logout} />
      <MobileNavigation page={page} setPage={setPage} staffName={staffName} role={role} shopName={shopName} logoUrl={logoUrl} logout={logout} />
      <main className="main">
        {!online && <div className="network-banner"><WifiOff size={17}/><div><strong>Offline</strong><span>Cached screens remain available, but sales, refunds, sign-in and cloud updates require an internet connection.</span></div></div>}
        <CustomerSelectionNotifier setPage={setPage} showToast={showToast} />
        {canAccessPage(role,page)?<>
        {['catalogue','commercial','customer-display'].includes(page)&&<SectionTabs label="Catalogue sections" page={page} setPage={setPage} items={[["catalogue","Catalogue"],["commercial","Variants & Bundles"],["customer-display","Display Settings"]]}/>}
        {['customers','loyalty','cards'].includes(page)&&<SectionTabs label="Customer sections" page={page} setPage={setPage} items={[["customers","Customers"],["loyalty","Loyalty"],["cards","Cards"]]}/>}
        {['planning','production','forecast-shortages'].includes(page)&&<SectionTabs label="Production planning sections" page={page} setPage={setPage} items={[["planning","Production Plans"],["production","Production Batches"],["forecast-shortages","Forecast & Shortages"]]}/>}
        {['readiness','acceptance','go-live','security-recovery','release-candidate','operations'].includes(page)&&<SectionTabs label="Deployment and readiness sections" page={page} setPage={setPage} items={[["readiness","Deployment Overview"],["acceptance","Validation"],["go-live","Launch Sign-off"],["security-recovery","Security & Recovery"],["release-candidate","Release Checks"],["operations","System Health"]]}/>}
        {['tasks','checklists','handover','schedule','alerts','analytics'].includes(page)&&<SectionTabs label="Team workspace sections" page={page} setPage={setPage} items={([['tasks','Tasks'],['checklists','Checklists'],['handover','Shift Handover'],['schedule','Schedule & Attendance'],['alerts','Alerts'],['analytics','Analytics']] as [PageKey,string][]).filter(([key])=>canAccessPage(role,key))}/>}
        {page === 'dashboard' && <Dashboard role={role} sales={sales} products={products} setPage={setPage} currency={currency} />}
        {page === 'sale' && <NewSale checkoutScope={`${shopId??'demo'}:${accountEmail}`} products={products} customers={customers} rewards={rewards} cart={cart} setCart={setCart} taxRate={taxRate} stampsRequired={stampsRequired} selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId} setCustomers={setCustomers} setProducts={setProducts} setSales={setSales} showToast={showToast} refresh={hydrateFromSupabase} receiptConfig={receiptConfig} />}
        {page === 'products' && <Products products={products} setProducts={setProducts} role={role} shopId={shopId} showToast={showToast} currency={currency} />}
        {page==='commercial'&&<CommercialManagement role={role} showToast={showToast}/>}
        {page==='scheduled-orders'&&<ScheduledOrders role={role} showToast={showToast} onPaid={async()=>{await hydrateFromSupabase();setPage('sales');showToast('Order paid. Open its receipt in Sales.')}}/>}
        {page==='preparation'&&<PreparationScreen/>}
        {page==='forecast-shortages'&&<ForecastShortages role={role} showToast={showToast}/>}
        {page === 'catalogue' && <Catalogue role={role} shopName={shopName} logoUrl={logoUrl} currency={currency} showToast={showToast} />}
        {page === 'inventory' && <Inventory products={products} setProducts={setProducts} showToast={showToast} />}
        {page === 'recipes' && <RecipeInventory products={products} setProducts={setProducts} role={role} currencyCode={currency} showToast={showToast} />}
        {page === 'production-studio' && <ProductionStudio role={role} shopId={shopId??''} currency={currency} products={products} showToast={showToast} />}
        {page === 'production' && <ProductionBatches products={products} setProducts={setProducts} role={role} showToast={showToast} />}
        {page === 'planning' && <ProductionPlanning products={products} role={role} showToast={showToast} />}
        {page === 'receiving' && <StockReceiving products={products} setProducts={setProducts} role={role} currency={currency} shopId={shopId} showToast={showToast} />}
        {page === 'purchasing' && <PurchaseOrders products={products} setProducts={setProducts} role={role} currency={currency} showToast={showToast} />}
        {page === 'supply' && <SupplyOperations products={products} role={role} currency={currency} shopId={shopId} showToast={showToast} />}
        {page === 'customers' && <Customers customers={customers} setCustomers={setCustomers} setPage={setPage} setSelectedCustomerId={setSelectedCustomerId} showToast={showToast} currency={currency} shopId={shopId} stampsRequired={stampsRequired} />}
        {page === 'loyalty' && <LoyaltyV2 rewards={rewards} setRewards={setRewards} customers={customers} setCustomers={setCustomers} shopId={shopId} role={role} showToast={showToast} currency={currency} stampsRequired={stampsRequired} setStampsRequired={setStampsRequired} />}
        {page === 'cards' && <Cards customers={customers} staffName={staffName} shopName={shopName} logoUrl={logoUrl} shopAddress={shopAddress} businessNumber={businessNumber} role={role} showToast={showToast} stampsRequired={stampsRequired} />}
        {page === 'sales' && <Sales sales={sales} setSales={setSales} receiptConfig={receiptConfig} showToast={showToast} refresh={hydrateFromSupabase} />}
        {page === 'reports' && <Reports sales={sales} products={products} currency={currency} role={role} />}
        {page === 'profit' && <ProfitabilityPage role={role} currency={currency} showToast={showToast} />}
        {page === 'cash-drawer' && <CashDrawerPage shopId={shopId} role={role} currency={currency} online={online} showToast={showToast} />}
        {page === 'hardware' && <HardwareCommissioning role={role} staffName={staffName} shopName={shopName} online={online} showToast={showToast} setPage={setPage} />}
        {page === 'customer-display' && <><CustomerDisplaySetup role={role} showToast={showToast}/><CustomerContactSettings role={role} showToast={showToast} display/><CommercialManagement key="display-settings" section="displays" role={role} showToast={showToast}/></>}
        {page === 'expenses' && <ExpensesPage role={role} currency={currency} showToast={showToast} />}
        {page === 'staff' && <StaffManagement role={role} showToast={showToast} />}
        {page === 'audit' && <AuditLog role={role} showToast={showToast} />}
        {page === 'backup' && <BackupPage role={role} shopName={shopName} showToast={showToast} />}
        {page === 'readiness' && <LaunchReadiness role={role} showToast={showToast} standalone={standalone} online={online} />}
        {page === 'acceptance' && <OperationalAcceptance role={role} showToast={showToast} />}
        {page === 'go-live' && <InternalGoLive role={role} online={online} standalone={standalone} showToast={showToast} />}
        {page === 'report-issue' && <IssueReport role={role} online={online} showToast={showToast} />}
        {page === 'handover' && <ShiftHandover role={role} online={online} showToast={showToast} />}
        {page === 'tasks' && <OperationalTasks role={role} online={online} showToast={showToast} />}
        {page === 'checklists' && <DailyChecklists role={role} online={online} showToast={showToast} />}
        {page === 'alerts' && <AlertsEscalations role={role} online={online} showToast={showToast} />}
        {page === 'schedule' && <StaffSchedule role={role} online={online} showToast={showToast} />}
        {page === 'analytics' && <OperationsAnalytics role={role} currency={currency} showToast={showToast} />}
        {page === 'security-recovery' && <SecurityRecovery role={role} online={online} showToast={showToast} />}
        {page === 'release-candidate' && <InternalReleaseCandidate role={role} online={online} showToast={showToast} />}
        {page === 'operations' && <OperationsCenter role={role} online={online} showToast={showToast} />}
        {page === 'settings' && <SettingsPage theme={theme} setTheme={setTheme} shopName={shopName} setShopName={setShopName} logoUrl={logoUrl} setLogoUrl={setLogoUrl} taxRate={taxRate} setTaxRate={setTaxRate} shopAddress={shopAddress} setShopAddress={setShopAddress} shopPhone={shopPhone} setShopPhone={setShopPhone} businessNumber={businessNumber} setBusinessNumber={setBusinessNumber} shopEmail={shopEmail} setShopEmail={setShopEmail} currency={currency} setCurrency={setCurrency} timezone={timezone} setTimezone={setTimezone} receiptFooter={receiptFooter} setReceiptFooter={setReceiptFooter} shopId={shopId} role={role} showToast={showToast} installApp={installApp} installAvailable={Boolean(installPrompt)} standalone={standalone} online={online} uiLanguage={uiLanguage} setUiLanguage={setUiLanguage} autoLogoutEnabled={autoLogoutEnabled} setAutoLogoutEnabled={setAutoLogoutEnabled} autoLogoutMinutes={autoLogoutMinutes} setAutoLogoutMinutes={setAutoLogoutMinutes} />}
        </>:<section className="panel"><h1>Administrator access required</h1><p>This page is restricted to management. Choose an available section from the menu.</p><button type="button" onClick={()=>setPage('dashboard')}>Return to dashboard</button></section>}
      </main>
      {idleWarningSeconds!==null&&<div className="session-timeout-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-timeout-title"><div className="session-timeout-card"><ShieldAlert size={34}/><h2 id="session-timeout-title">Session expiring</h2><p>No activity has been detected. For shared-device security, CounterNest will sign you out in <strong>{idleWarningSeconds} second{idleWarningSeconds===1?'':'s'}</strong>.</p><small>Any unsaved cart or form work will be cleared when the session ends.</small><div><button type="button" onClick={()=>void logout()}>Log Out Now</button><button className="primary-btn" type="button" onClick={markSessionActivity}>Stay Signed In</button></div></div></div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}


function LoyaltyJoin({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<{ shop_name: string; logo_url: string | null; customer_name: string; email: string; status: string; expires_at: string } | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [memberCode, setMemberCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (supabaseConfigured && supabase) {
        const { data, error: err } = await supabase.rpc('get_loyalty_invitation', { p_token: token })
        if (err || !data?.length) { setError(err?.message ?? 'Invitation not found.'); setLoading(false); return }
        const row = data[0]
        setInfo(row); setName(row.customer_name ?? ''); setLoading(false)
      } else {
        setInfo({ shop_name: 'DEMO BUSINESS', logo_url: null, customer_name: 'Guest Customer', email: 'customer@example.com', status: 'pending', expires_at: new Date(Date.now()+7*86400000).toISOString() })
        setName('Guest Customer'); setLoading(false)
      }
    }
    load()
  }, [token])

  async function join(e: FormEvent) {
    e.preventDefault(); setError('')
    if (!info || info.status !== 'pending') return
    if (supabaseConfigured && supabase) {
      const { data, error: err } = await supabase.rpc('accept_loyalty_invitation', { p_token: token, p_name: name, p_phone: phone || null })
      if (err) { setError(err.message); return }
      setMemberCode(data.member_code)
    } else setMemberCode('LOY-DEMO1234')
  }

  if (loading) return <div className="login-screen"><div className="login-card"><p>Loading invitation…</p></div></div>
  if (error && !info) return <div className="login-screen"><div className="login-card"><Brand shopName="CounterNest POS"/><h1>Invitation unavailable</h1><div className="error-box">{error}</div></div></div>
  if (memberCode) return <div className="login-screen"><div className="login-card join-success"><Brand shopName={info?.shop_name ?? 'DEMO BUSINESS'} logoUrl={info?.logo_url ?? null}/><Sparkles size={42}/><h1>Welcome to Rewards!</h1><p>Your loyalty membership is active.</p><strong className="member-code">{memberCode}</strong><p>Keep this member code for future reference. The business can also send or print your digital loyalty card.</p></div></div>
  const inactive = info?.status !== 'pending'
  return <div className="login-screen"><form className="login-card" onSubmit={join}><Brand shopName={info?.shop_name ?? 'DEMO BUSINESS'} logoUrl={info?.logo_url ?? null}/><h1>Join Rewards</h1><p>Earn and redeem customer rewards.</p>{inactive && <div className="error-box">This invitation is {info?.status}.</div>}<label>Name<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Email<input value={info?.email ?? ''} disabled/></label><label>Phone (optional)<input value={phone} onChange={e=>setPhone(e.target.value)} /></label><label className="switch-line"><input type="checkbox" required/> I agree to join the loyalty program.</label>{error&&<div className="error-box">{error}</div>}<button className="primary-btn" disabled={inactive}>Join Rewards</button></form></div>
}

function PasswordInput(props:InputHTMLAttributes<HTMLInputElement>){
  const[visible,setVisible]=useState(false)
  const{className,...rest}=props
  return <div className={`password-field ${className??''}`}><input {...rest} type={visible?'text':'password'}/><button type="button" className="password-visibility" onClick={()=>setVisible(v=>!v)} aria-label={visible?'Hide password':'Show password'} title={visible?'Hide password':'Show password'}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
}

function Brand({ shopName, compact = false, logoUrl = null }: { shopName: string; compact?: boolean; logoUrl?: string | null }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}>
    <div className={`logo-circle ${!logoUrl ? 'logo-empty' : ''}`}>{logoUrl ? <img src={logoUrl} alt={`${shopName} logo`} /> : <CakeSlice size={compact ? 34 : 52} aria-label="No logo" />}</div>
    <div className="brand-name">{shopName}</div>
  </div>
}

function StaffInvitationJoin({token}:{token:string}){
  const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[mode,setMode]=useState<'signin'|'signup'>('signup');const[info,setInfo]=useState<any>(null);const[message,setMessage]=useState('');const[busy,setBusy]=useState(true)
  async function accept(){if(!supabase)return;const{data:user}=await supabase.auth.getUser();if(!user.user)return false;const{error}=await supabase.rpc('accept_staff_invitation',{p_token:token});if(error){setMessage(error.message);return false}setMessage('Invitation accepted. Opening the POS…');window.setTimeout(()=>{window.location.href=window.location.origin+window.location.pathname},900);return true}
  useEffect(()=>{async function load(){if(!supabaseConfigured||!supabase){setInfo({shop_name:'DEMO BUSINESS',display_name:'Invited Employee',email:'employee@example.com',role:'employee'});setEmail('employee@example.com');setBusy(false);return}const{data,error}=await supabase.rpc('get_staff_invitation',{p_token:token});if(error||!data){setMessage(error?.message??'Invitation not found.');setBusy(false);return}setInfo(data);setEmail(data.email);if(await accept())return;setBusy(false)}void load()},[token])
  async function submit(e:FormEvent){e.preventDefault();if(!supabaseConfigured||!supabase){setMessage('Demo invitation accepted.');return}setBusy(true);setMessage('');if(mode==='signup'){if(password!==confirmPassword){setMessage('Passwords do not match.');setBusy(false);return}const{data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.href,data:{display_name:info?.display_name}}});if(error)setMessage(error.message);else if(data.session)await accept();else setMessage('Check your email to confirm the account, then return through this invitation link.')}else{const{error}=await supabase.auth.signInWithPassword({email,password});if(error)setMessage(error.message);else await accept()}setBusy(false)}
  if(busy&&!info)return <div className="auth-stage"><div className="auth-loading">Checking staff invitation…</div></div>
  return <div className="auth-stage"><form className="auth-card" onSubmit={submit}><div className="auth-heading"><h1>Join {info?.shop_name??'the POS team'}</h1><p>You were invited as {info?.role??'employee'}. Sign in or create the account for the invited email.</p></div>{message&&<div className={message.includes('accepted')||message.startsWith('Check')?'auth-notice':'error-box'}>{message}</div>}<label>Display name<input value={info?.display_name??''} disabled/></label><label>Email<input type="email" value={email} disabled/></label><label>Password<PasswordInput minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>{mode==='signup'&&<label>Confirm password<PasswordInput minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>}<button className="auth-submit" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create Staff Account':'Sign In & Accept'}</button><div className="auth-switch"><span>{mode==='signup'?'Already have an account?':'Need an account?'}</span><button type="button" onClick={()=>{setMode(mode==='signup'?'signin':'signup');setPassword('');setConfirmPassword('')}}>{mode==='signup'?'Sign in':'Create account'}</button></div></form></div>
}

function AuthStage({ onAuthenticated, message = '' }: { onAuthenticated: (newBusiness?: boolean) => Promise<void> | void; message?: string }) {
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function switchMode(next:'signin'|'signup') {
    setMode(next); setError(''); setNotice(''); setPassword(''); setConfirmPassword('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      if (!email.trim() || !password) throw new Error('Enter your email and password.')
      if (mode === 'signup') {
        if (!ownerName.trim()) throw new Error('Enter the account owner name.')
        if (password.length < 8) throw new Error('Use at least 8 characters for the password.')
        if (password !== confirmPassword) throw new Error('Passwords do not match.')
        if (supabaseConfigured && supabase) {
          const redirectTo=(import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) || window.location.origin
          const { data, error: authError } = await supabase.auth.signUp({
            email: email.trim(), password,
            options: { emailRedirectTo: redirectTo, data: { display_name: ownerName.trim() } }
          })
          if (authError) throw authError
          if (!data.session) {
            setNotice('Account created. Check your email to confirm the account, then sign in. Business setup will open automatically after your first confirmed sign-in.')
            setMode('signin'); setPassword(''); setConfirmPassword(''); return
          }
          await onAuthenticated(true)
          return
        }
        await onAuthenticated(true)
        return
      }

      if (supabaseConfigured && supabase) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
      }
      await onAuthenticated(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue.')
    } finally { setBusy(false) }
  }

  return <div className="auth-stage">
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-heading">
        <h1>{mode==='signin'?'Sign in':'Create your account'}</h1>
        <p>{mode==='signin'?'Enter your account details to open the POS.':'Create the owner account first. Your business information is collected on the next screen.'}</p>
      </div>
      {message&&mode==='signin'&&<div className="auth-notice">{message}</div>}
      {mode==='signup'&&<label>Owner name<input value={ownerName} onChange={e=>setOwnerName(e.target.value)} autoComplete="name" placeholder="Your name" required/></label>}
      <label>Email address<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@business.com" required/></label>
      <label>Password<PasswordInput value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'} placeholder={mode==='signup'?'At least 8 characters':'Enter your password'} required/></label>
      {mode==='signup'&&<label>Confirm password<PasswordInput value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Repeat your password" required/></label>}
      {error&&<div className="error-box">{error}</div>}
      {notice&&<div className="auth-notice">{notice}</div>}
      <button className="auth-submit" disabled={busy}>{busy?(mode==='signin'?'Signing in…':'Creating account…'):(mode==='signin'?'Sign In':'Create Account')}</button>
      <div className="auth-switch">
        <span>{mode==='signin'?"Don't have a business account?":'Already have an account?'}</span>
        <button type="button" onClick={()=>switchMode(mode==='signin'?'signup':'signin')}>{mode==='signin'?'Sign up':'Sign in'}</button>
      </div>
      {!supabaseConfigured&&<div className="demo-note">Demo mode is active because Supabase environment values are not configured.</div>}
    </form>
  </div>
}

function InitialPasswordChange({accountEmail,onComplete,onLogout}:{accountEmail:string;onComplete:()=>void;onLogout:()=>Promise<void>|void}){
  const[currentPassword,setCurrentPassword]=useState('');const[newPassword,setNewPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('')
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{
    if(!supabase)throw new Error('Supabase is not configured.')
    if(newPassword.length<12||!/[a-z]/.test(newPassword)||!/[A-Z]/.test(newPassword)||!/[0-9]/.test(newPassword))throw new Error('Use at least 12 characters with upper-case, lower-case, and a number.')
    if(newPassword!==confirmPassword)throw new Error('New passwords do not match.')
    const{error:changeError}=await supabase.functions.invoke('change-initial-password',{body:{current_password:currentPassword,new_password:newPassword,confirm_password:confirmPassword}})
    if(changeError){let message=changeError.message;try{const payload=await (changeError as any).context?.json();if(payload?.error)message=payload.error}catch{/* retain transport error */}throw new Error(message)}
    onComplete()
  }catch(err){setError(err instanceof Error?err.message:'Password could not be changed.')}finally{setBusy(false)}}
  return <div className="auth-stage"><form className="auth-card" onSubmit={submit}><div className="auth-heading"><h1>Create your private password</h1><p>An administrator created this account with a temporary password. Replace it before using CounterNest POS.</p></div><label>Email address<input value={accountEmail} disabled/></label><label>Current temporary password<PasswordInput autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>New password<PasswordInput autoComplete="new-password" minLength={12} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label>Confirm new password<PasswordInput autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label><small className="muted">At least 12 characters, including upper-case, lower-case, and a number.</small>{error&&<div className="error-box">{error}</div>}<button className="auth-submit" disabled={busy}>{busy?'Saving…':'Change Password & Continue'}</button><button className="text-button" type="button" onClick={()=>void onLogout()}>Sign out</button></form></div>
}


function BusinessOnboarding({accountEmail,onComplete,onLogout}:{accountEmail:string;onComplete:(demoInfo?:{name:string;phone:string;address:string;logoUrl:string|null})=>Promise<void>;onLogout:()=>Promise<void>|void}){
  const[businessName,setBusinessName]=useState('')
  const[phone,setPhone]=useState('')
  const[address,setAddress]=useState('')
  const[logoEditorSrc,setLogoEditorSrc]=useState<string|null>(null)
  const[logoBlob,setLogoBlob]=useState<Blob|null>(null)
  const[logoPreview,setLogoPreview]=useState<string|null>(null)
  const[busy,setBusy]=useState(false)
  const[error,setError]=useState('')

  useEffect(()=>()=>{if(logoPreview?.startsWith('blob:'))URL.revokeObjectURL(logoPreview)},[logoPreview])

  function chooseLogo(file?:File){
    if(!file)return
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))return setError('Choose a PNG, JPG, or WebP logo.')
    if(file.size>8*1024*1024)return setError('The logo must be 8 MB or smaller.')
    setError('')
    const reader=new FileReader();reader.onload=()=>setLogoEditorSrc(String(reader.result));reader.readAsDataURL(file)
  }
  async function keepPreparedLogo(blob:Blob){
    if(logoPreview?.startsWith('blob:'))URL.revokeObjectURL(logoPreview)
    setLogoBlob(blob);setLogoPreview(URL.createObjectURL(blob));setLogoEditorSrc(null)
  }
  function removePreparedLogo(){
    if(logoPreview?.startsWith('blob:'))URL.revokeObjectURL(logoPreview)
    setLogoBlob(null);setLogoPreview(null)
  }
  async function submit(e:FormEvent){
    e.preventDefault();setError('')
    if(!businessName.trim()||!phone.trim()||!address.trim())return setError('Business name, phone number, and address are required.')
    setBusy(true)
    try{
      if(supabaseConfigured&&supabase){
        const{data:userData}=await supabase.auth.getUser()
        if(!userData.user)throw new Error('Your sign-in session expired. Please sign in again.')
        const displayName=String(userData.user.user_metadata?.display_name??userData.user.email?.split('@')[0]??'Owner')
        const{data:newShopId,error:bootstrapError}=await supabase.rpc('bootstrap_business',{p_shop_name:businessName.trim(),p_phone:phone.trim(),p_address:address.trim(),p_display_name:displayName})
        if(bootstrapError)throw bootstrapError
        if(!newShopId)throw new Error('Business setup could not create the shop record.')
        if(logoBlob){
          const path=`${newShopId}/logo-${Date.now()}.png`
          const uploaded=await supabase.storage.from('shop-logos').upload(path,logoBlob,{contentType:'image/png',cacheControl:'3600',upsert:false})
          if(uploaded.error)throw new Error(`Business was created, but the logo could not be uploaded: ${uploaded.error.message}. You can retry or add it later in Settings.`)
          const{data:urlData}=supabase.storage.from('shop-logos').getPublicUrl(path)
          const{error:updateError}=await supabase.from('shops').update({logo_url:urlData.publicUrl}).eq('id',newShopId)
          if(updateError){await supabase.storage.from('shop-logos').remove([path]);throw new Error(`Business was created, but the logo could not be saved: ${updateError.message}`)}
        }
        await onComplete()
      }else{
        // Demo mode keeps onboarding local so the workflow can be previewed without a backend.
        const demoLogo=logoBlob?await blobToDataUrl(logoBlob):null
        await onComplete({name:businessName.trim(),phone:phone.trim(),address:address.trim(),logoUrl:demoLogo})
      }
    }catch(err){setError(err instanceof Error?err.message:'Could not finish business setup.')}
    finally{setBusy(false)}
  }
  return <div className="onboarding-stage">
    <div className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="business-setup-title">
      <div className="onboarding-head"><div className="onboarding-icon"><Store size={24}/></div><div><small>FIRST-TIME SETUP</small><h1 id="business-setup-title">Tell us about your business</h1><p>This information creates your shop profile and can be changed later in Settings.</p></div></div>
      <form onSubmit={submit}>
        <div className="onboarding-grid">
          <label>Business name<input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Your company or shop name" required/></label>
          <label>Business phone number<input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="Business contact number" required/></label>
          <label className="full">Business address<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street, city / district, country" required/></label>
          <label className="full muted-field">Account email<input value={accountEmail} disabled/></label>
        </div>
        <div className="onboarding-logo">
          <div className="onboarding-logo-preview">{logoPreview?<img src={logoPreview} alt="Prepared business logo"/>:<div className="empty-logo"><ImagePlus size={28}/><span>No logo selected</span></div>}</div>
          <div className="onboarding-logo-actions"><strong>Business logo</strong><p>Optional. Upload PNG, JPG or WebP up to 8 MB. You can resize it before saving.</p><label className="upload-logo-btn"><Upload size={17}/>{logoPreview?'Change Logo':'Choose Logo'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{chooseLogo(e.target.files?.[0]);e.currentTarget.value=''}}/></label>{logoPreview&&<button type="button" className="danger-outline" onClick={removePreparedLogo}><Trash2 size={17}/> Remove</button>}</div>
        </div>
        {error&&<div className="error-box">{error}</div>}
        <div className="onboarding-actions"><button type="button" className="text-button" onClick={onLogout}>Sign out</button><button className="auth-submit" disabled={busy}>{busy?'Creating business…':'Create Business & Open POS'}</button></div>
      </form>
      {logoEditorSrc&&<LogoEditor src={logoEditorSrc} onCancel={()=>setLogoEditorSrc(null)} onUpload={keepPreparedLogo}/>} 
    </div>
  </div>
}


function OfflineStage() {
  return <div className="offline-stage">
    <div className="offline-card">
      <div className="offline-icon"><WifiOff size={28}/></div>
      <h1>No internet connection</h1>
      <p>The POS app shell is available, but your business data is protected in the cloud. Reconnect to sign in and safely load sales, inventory, customers and loyalty information.</p>
      <button className="auth-submit" onClick={() => window.location.reload()}>Try Again</button>
      <small>If this device was already using the POS when the connection was lost, keep that open session on screen until the connection returns.</small>
    </div>
  </div>
}

function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return <header className="page-header"><div><h1>{tr(title)}</h1><p>{new Date().toLocaleDateString(activeLanguage==='es'?'es-MX':'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>{children}</header>
}

function Dashboard({ sales, products, setPage, currency, role }: { role:Role; sales: SaleSummary[]; products: Product[]; setPage: (p: PageKey) => void; currency: string }) {
  const todaySales = sales.reduce((a, s) => a + netSaleTotal(s), 0)
  const low = products.filter(p => p.stock <= p.lowAt)
  const top = products[0]?.name ?? '—'
  return <>
    <PageHeader title="Dashboard" />
    <section className="stats-grid">
      <Stat label="Today's Sales" value={money(todaySales,currency)} sub="Current register total" />
      <Stat label="Orders" value={String(sales.length)} sub="Completed transactions" />
      <Stat label="Top Item" value={top} sub="Top seller" />
      <Stat label="Low Stock" value={String(low.length)} sub="Needs attention" />
    </section>
    <section className="two-col">
      <div className="panel"><div className="panel-title"><h2>Recent Sales</h2><button onClick={() => setPage('sales')}>View all</button></div><div className="sale-list">{sales.slice(0, 6).map(s => <div className="sale-row" key={s.id}><span>{s.time}</span><strong>{s.items}</strong><b>{money(netSaleTotal(s),currency)}</b></div>)}</div></div>
      <div className="panel"><h2>Quick Actions</h2><div className="quick-list">{[['New Sale','sale'],['Check Inventory','inventory'],['Add Customer','customers'],['Loyalty Overview','loyalty'],['View Reports','reports'],['Settings','settings']].filter(([,key])=>canAccessPage(role,key as PageKey)).map(([label,key]) => <button key={key} onClick={() => setPage(key as PageKey)}>{label}<ChevronRight size={18}/></button>)}</div></div>
    </section>
    <section className="panel"><div className="panel-title"><h2>Low Stock Alerts</h2>{role==='admin'&&<button onClick={() => setPage('inventory')}>View Inventory</button>}</div><Table headers={['Item','Current Stock','Reorder At','Status']} rows={(low.length ? low : products.slice(0,3)).map(p => [p.name, String(p.stock), String(p.lowAt), p.stock === 0 ? 'Out of Stock' : p.stock <= p.lowAt ? 'Low' : 'OK'])}/></section>
  </>
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div> }

function NewSale(props: {
  checkoutScope:string;
  products: Product[]; customers: Customer[]; rewards: Reward[]; cart: CartLine[]; setCart: React.Dispatch<React.SetStateAction<CartLine[]>>; taxRate: number; stampsRequired:number;
  selectedCustomerId: string; setSelectedCustomerId: (id: string) => void; setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>; setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setSales: React.Dispatch<React.SetStateAction<SaleSummary[]>>; showToast: (m: string) => void; refresh: () => Promise<void>; receiptConfig: ShopReceiptConfig
}) {
  const [pendingCheckout,setPendingCheckout]=useState<CheckoutAttempt|null>(()=>loadCheckout(props.checkoutScope))
  const checkoutLock=useRef(false)
  function rememberCheckout(attempt:CheckoutAttempt|null){saveCheckout(props.checkoutScope,attempt);setPendingCheckout(attempt)}
  async function completeCheckout(attempt:CheckoutAttempt){
    if(!supabase||checkoutLock.current)return
    checkoutLock.current=true;setBusy(true)
    let confirmed=false
    try{
      const {data,error}=await supabase.rpc('complete_pos_checkout',{p_checkout_id:attempt.id,...attempt.args})
      if(error){
        if(definitiveCheckoutFailure(error.code)){rememberCheckout(null);props.showToast(error.message);await syncPrices();await repriceCart()}
        else props.showToast('Payment confirmation is pending. Retry the same checkout to recover its result; do not take payment again.')
        return
      }
      confirmed=true
      rememberCheckout(null)
      props.setCart([]);props.setSelectedCustomerId('');setAppliedRewardId('')
      const loaded=await fetchReceipt(String(data.sale_id),props.receiptConfig);if(loaded)setReceipt(loaded)
      props.showToast(`${data.replayed?'Checkout recovered':'Sale complete'} • ${money(Number(data.total),props.receiptConfig.currency)}`)
      await props.refresh()
    }catch{props.showToast(confirmed?'Sale saved. Open Sales to retrieve its receipt; do not take payment again.':'The checkout response was interrupted. Retry confirmation using the saved checkout reference.')}
    finally{checkoutLock.current=false;setBusy(false)}
  }
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [appliedRewardId, setAppliedRewardId] = useState('')
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [cashTenderOpen, setCashTenderOpen] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [cameraOpen,setCameraOpen]=useState(false)
  const [pricedProducts,setPricedProducts]=useState<Product[]>(props.products)
  const [priceSyncError,setPriceSyncError]=useState('')
  const [commercialProducts,setCommercialProducts]=useState<CommercialProduct[]>([])
  const [serverQuote,setServerQuote]=useState<any>(null)
  const quoteSignature=JSON.stringify([props.cart.map(x=>[x.cartKey??x.id,x.qty]),appliedRewardId,props.selectedCustomerId])
  const currentQuote=serverQuote?.signature===quoteSignature?serverQuote:null
  async function repriceCart(){if(!supabase||!props.cart.length)return;const current=props.cart;const signature=quoteSignature;const r=await supabase.rpc('quote_commercial_sale',{p_customer:props.selectedCustomerId||null,p_reward:appliedRewardId||null,p_items:current.map(x=>({product_id:x.id,variant_id:x.variantId??null,option_label:x.catalogOption??null,combo_id:x.comboId??null,choices:x.comboChoices??null,qty:x.qty,catalogue_request:Boolean(x.selectionRequestId)}))});if(r.error){setPriceSyncError(r.error.message);setServerQuote(null);return}setPriceSyncError('');setServerQuote({...r.data,signature});props.setCart(old=>old.map(line=>{const i=current.findIndex(x=>x.cartKey===line.cartKey&&x.qty===line.qty);return i>=0?{...line,price:Number(r.data.items[i].price)}:line}))}
  useEffect(()=>{void repriceCart();const timer=window.setInterval(()=>void repriceCart(),5000);return()=>window.clearInterval(timer)},[quoteSignature])
  async function syncPrices(){
    if(!supabaseConfigured||!supabase){setPricedProducts(props.products);return}
    const {data,error}=await supabase.rpc('get_pos_catalogue_prices')
    if(error){setPriceSyncError('Current pricing is unavailable. Reconnect and refresh before payment.');return}
    setPriceSyncError('')
    const rows=new Map<string,any>((data??[]).map((r:any)=>[r.id,r]))
    const next=Array.from(rows.values()).map(r=>{const p=props.products.find(p=>p.id===r.id);return {...(p??{id:r.id,name:r.name,category:r.category,cost:Number(r.cost),lowAt:Number(r.lowAt),barcode:r.barcode??undefined,iconEmoji:r.iconEmoji??undefined}),price:Number(r.price),regularPrice:Number(r.regular_price),stock:Number(r.stock),active:r.active,image:r.image_url??undefined,catalogueVisible:r.catalogue_visible,catalogueSoldOut:r.catalogue_sold_out} as Product})
    setPricedProducts(next)
    props.setCart(old=>old.map(line=>{if(line.variantId||line.comboId)return line;const p=next.find(p=>p.id===line.id);return p?{...line,price:p.price,stock:p.stock,active:p.active,catalogueVisible:p.catalogueVisible,catalogueSoldOut:p.catalogueSoldOut}:line}))
  }
  useEffect(()=>{void syncPrices();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void syncPrices()},5000);return()=>window.clearInterval(timer)},[props.products])
  const categories = ['All', ...Array.from(new Set(pricedProducts.map(p => p.category)))]
  const visible = pricedProducts.filter(p => p.active && (cat === 'All' || p.category === cat) && p.name.toLowerCase().includes(search.toLowerCase()))
  const subtotal = currentQuote?Number(currentQuote.subtotal):props.cart.reduce((a, x) => a + x.price * x.qty, 0)
  const customer = props.customers.find(c => c.id === props.selectedCustomerId)
  const availableRewards = customer?.loyaltyStatus === 'member' ? props.rewards.filter(r => r.active && (r.costPoints ?? 0) <= customer.points && (r.requiredStamps ?? 0) <= customer.stamps) : []
  const appliedReward = availableRewards.find(r => r.id === appliedRewardId)
  let discount = 0
  if (appliedReward?.type === 'fixed_discount') discount = Math.min(subtotal, appliedReward.value)
  if (appliedReward?.type === 'percent_discount') discount = subtotal * Math.min(appliedReward.value, 100) / 100
  if (appliedReward?.type === 'free_product' && appliedReward.productId) { const rp = pricedProducts.find(p => p.id === appliedReward.productId); if (rp && props.cart.some(x => x.id === rp.id)) discount = Math.min(subtotal, rp.price) }
  if(currentQuote)discount=Number(currentQuote.discount)
  const taxable = Math.max(0, subtotal - discount)
  const tax = currentQuote?Number(currentQuote.tax):taxable * props.taxRate
  const total = currentQuote?Number(currentQuote.total):taxable + tax

  function add(p: Product) { if (p.stock <= 0) return; const key=p.cartKey??p.id; props.setCart(c => { const used=c.filter(x=>x.id===p.id).reduce((sum,x)=>sum+x.qty,0);if(used>=p.stock)return c;const old = c.find(x => (x.cartKey??x.id) === key); return old ? c.map(x => (x.cartKey??x.id) === key ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...p, cartKey:key, qty: 1 }] }) }
  function change(key: string, d: number) { props.setCart(c => {const target=c.find(x=>(x.cartKey??x.id)===key);if(!target)return c;const otherQty=c.filter(x=>x.id===target.id&&(x.cartKey??x.id)!==key).reduce((sum,x)=>sum+x.qty,0);const maxForLine=target.variantId||target.comboId?1000:Math.max(0,target.stock-otherQty);return c.map(x => (x.cartKey??x.id) === key ? { ...x, qty: Math.max(0, Math.min(x.qty + d, maxForLine)) } : x).filter(x => x.qty > 0)}) }
  function scanBarcode(raw:string){const code=raw.trim();if(!code)return;const variantProduct=commercialProducts.find(p=>p.variants.some(v=>v.barcode===code));if(variantProduct){const v=variantProduct.variants.find(v=>v.barcode===code)!;if(!v.available)return props.showToast('This variant is sold out.');const line=commercialCartLine({product_id:variantProduct.id,variant_id:v.id,qty:1,expected_unit_price:Number(v.price),name:variantProduct.name+' — '+v.name});props.setCart(old=>{const found=old.find(x=>x.cartKey===line.cartKey);return found?old.map(x=>x.cartKey===line.cartKey?{...x,qty:x.qty+1}:x):[...old,line]});setBarcodeInput('');return}const product=pricedProducts.find(p=>p.active&&p.barcode===code);if(!product)return props.showToast(`Barcode ${code} is not assigned to a product.`);if(product.stock<=0)return props.showToast(`${product.name} is out of stock.`);if(commercialProducts.find(p=>p.id===product.id)?.variants.length)return props.showToast('Choose the required product variant in the catalogue.');add(product);props.showToast(`${product.name} added by scanner.`);setBarcodeInput('')}
  useEffect(()=>{let buffer='';let last=0;const onKey=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName))return;const now=Date.now();if(now-last>100)buffer='';last=now;if(event.key==='Enter'){if(buffer.length>=3){event.preventDefault();scanBarcode(buffer)}buffer='';return}if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey)buffer+=event.key};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[pricedProducts,commercialProducts])

  const offlineLocked = supabaseConfigured && !navigator.onLine

  async function charge(payment: 'cash'|'card'|'qr', cashReceived?: number) {
    if (offlineLocked) { props.showToast('Reconnect to the internet before completing a sale.'); return }
    if (!props.cart.length || busy || checkoutLock.current || pendingCheckout) return
    if(supabaseConfigured&&!currentQuote){props.showToast('Wait for the current checkout quote.');await repriceCart();return}
    if(priceSyncError){props.showToast(priceSyncError);await syncPrices();await repriceCart();return}
    setBusy(true)
    const cartSnapshot = props.cart.map(x => ({ ...x }))
    const customerSnapshot = customer ? { ...customer } : undefined
    const rewardSnapshot = appliedReward ? { ...appliedReward } : undefined
    
    if (supabaseConfigured && supabase) {
      const items = cartSnapshot.map(x => ({ product_id: x.id, qty: x.qty, option_label: x.catalogOption ?? null, variant_id:x.variantId??null,combo_id:x.comboId??null,choices:x.comboChoices??null,expected_unit_price:x.price, catalogue_request:Boolean(x.selectionRequestId) }))
      const attempt:CheckoutAttempt={id:uid(),args:{p_customer_id:props.selectedCustomerId||null,p_payment_method:payment,p_items:items,p_reward_id:appliedRewardId||null,p_request_id:cartSnapshot.find(x=>x.selectionRequestId)?.selectionRequestId??null,p_cash_received:payment==='cash'?cashReceived??null:null}}
      rememberCheckout(attempt)
      await completeCheckout(attempt);return
    }

    const pointsRedeemed = rewardSnapshot?.costPoints ?? 0
    const stampsRedeemed = rewardSnapshot?.requiredStamps ?? 0
    const bonus = rewardSnapshot?.type === 'bonus_points' ? Math.floor(rewardSnapshot.value) : 0
    const pointsEarned = customerSnapshot?.loyaltyStatus === 'member' ? Math.floor(taxable) + bonus : 0
    const stampsEarned = customerSnapshot?.loyaltyStatus === 'member' ? 1 : 0
    const demoReceipt: ReceiptData = {
      saleId: uid(), receiptNumber: Math.floor(Date.now() / 1000) % 1000000, createdAt: new Date().toISOString(),
      shopName: props.receiptConfig.shopName, logoUrl: props.receiptConfig.logoUrl, address: props.receiptConfig.address, phone: props.receiptConfig.phone,
      shopEmail: props.receiptConfig.email, currency: props.receiptConfig.currency, timezone: props.receiptConfig.timezone, footer: props.receiptConfig.footer,
      staffName: props.receiptConfig.staffName, customerName: customerSnapshot?.name ?? null, customerEmail: customerSnapshot?.email ?? null,
      items: cartSnapshot.map((x,idx) => ({ saleItemId:`demo-${idx}`, productId: x.id, name: `${x.name}${x.catalogOption?` — ${x.catalogOption}`:''}`, qty: x.qty, unitPrice: x.price, lineTotal: x.price * x.qty, refundedQty:0 })),
      subtotal, discount, tax, total, payment: payment.toUpperCase(), cashReceived: payment === 'cash' ? cashReceived : null, changeDue: payment === 'cash' ? Number(((cashReceived ?? total) - total).toFixed(2)) : null, rewardName: rewardSnapshot?.name ?? null,
      pointsEarned, pointsRedeemed, stampsEarned, stampsRedeemed,
      pointsBalance: customerSnapshot?.loyaltyStatus === 'member' ? Math.max(0, customerSnapshot.points - pointsRedeemed) + pointsEarned : null,
      stampsBalance: customerSnapshot?.loyaltyStatus === 'member' ? Math.max(0, customerSnapshot.stamps - stampsRedeemed) + stampsEarned : null,
      status:'completed', refundedTotal:0, reprintCount:0, refunds:[],
    }
    const sale: SaleSummary = { id: demoReceipt.saleId, receiptNumber: demoReceipt.receiptNumber, createdAt: demoReceipt.createdAt, time: new Date(demoReceipt.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), items: cartSnapshot.map(x => `${x.qty}x ${x.name}${x.catalogOption?` (${x.catalogOption})`:''}`).join(', '), total, payment: payment.toUpperCase(), customerName: customerSnapshot?.name ?? null, status:'completed', refundedTotal:0, receipt: demoReceipt }
    props.setSales(s => [sale, ...s])
    props.setProducts(ps => ps.map(p => { const used = cartSnapshot.filter(x => x.id === p.id).reduce((sum,x)=>sum+x.qty,0); return used ? { ...p, stock: p.stock - used } : p }))
    if (customerSnapshot) props.setCustomers(cs => cs.map(c => c.id !== customerSnapshot.id ? c : { ...c, visits: c.visits + 1, totalSpent: c.totalSpent + total, points: c.loyaltyStatus === 'member' ? demoReceipt.pointsBalance ?? c.points : c.points, stamps: c.loyaltyStatus === 'member' ? demoReceipt.stampsBalance ?? c.stamps : c.stamps }))
    props.setCart([]); props.setSelectedCustomerId(''); setAppliedRewardId(''); setReceipt(demoReceipt); props.showToast('Sale completed'); setBusy(false)
  }

  return <>
    {priceSyncError&&<div role="alert" className="warning-box">{priceSyncError}</div>}<PageHeader title="New Sale"><div className="customer-picker"><select value={props.selectedCustomerId} onChange={e => { props.setSelectedCustomerId(e.target.value); setAppliedRewardId('') }}><option value="">Walk-in / Guest</option>{props.customers.map(c => <option value={c.id} key={c.id}>{c.name} {c.loyaltyStatus === 'member' ? `• ${c.points} pts • ${c.stamps} stamps` : ''}</option>)}</select></div></PageHeader>
    <CommercialSelectionInbox cart={props.cart} setCart={props.setCart} showToast={props.showToast}/>
    {customer && customer.loyaltyStatus !== 'member' && <div className="invite-banner"><div><strong>{customer.name} is not enrolled in loyalty.</strong><span>{customer.loyaltyStatus === 'invited' ? ' Invitation already sent.' : ' Invite them without blocking checkout.'}</span></div><button onClick={() => sendInvite(customer, props.setCustomers, props.showToast)}><Mail size={17}/> {customer.loyaltyStatus === 'invited' ? 'Resend Invite' : 'Invite to Loyalty'}</button></div>}
    {customer?.loyaltyStatus === 'member' && <div className="member-banner"><Sparkles size={18}/><strong>{customer.name}</strong><span>{customer.points} points</span><span>{customer.stamps}/{props.stampsRequired} stamps</span></div>}
    <div className="pos-grid">
      <section className="catalog">
        <div className="scanner-row"><form className="barcode-entry" onSubmit={e=>{e.preventDefault();scanBarcode(barcodeInput)}}><QrCode size={18}/><input aria-label="Barcode" inputMode="numeric" value={barcodeInput} onChange={e=>setBarcodeInput(e.target.value)} placeholder="Scan or enter barcode"/><button type="submit">Add</button></form><button className="camera-scan-btn" type="button" onClick={()=>setCameraOpen(true)}><Camera size={18}/> Camera Scan</button></div>
        <div className="scanner-note">Use a phone camera, webcam, or USB/Bluetooth keyboard-mode scanner. Camera permission is requested only while the scanner is open.</div>
        <CommercialCatalogue mode="pos" onData={setCommercialProducts} onAdd={item=>{const line=commercialCartLine(item);props.setCart(old=>{const found=old.find(x=>x.cartKey===line.cartKey);return found?old.map(x=>x.cartKey===line.cartKey?{...x,qty:x.qty+line.qty}:x):[...old,line]})}}/>
      </section>
      <aside className="cart-panel"><div className="panel-title"><h2>Cart ({props.cart.reduce((a,x)=>a+x.qty,0)})</h2><button onClick={() => props.setCart([])}>Clear</button></div>
        <div className="cart-lines">{props.cart.length === 0 ? <div className="empty"><ShoppingCart/><p>Tap a product to begin.</p></div> : props.cart.map(x => {const key=x.cartKey??x.id;return <div className="cart-line" key={key}><div className="mini-art">{x.iconEmoji??productEmoji(x.category)}</div><div className="cart-copy"><strong>{x.name}</strong>{x.catalogOption&&<small className="cart-option">Option: {x.catalogOption}</small>}<small>{money(x.price, props.receiptConfig.currency)}</small><div className="qty"><button onClick={() => change(key,-1)}><Minus size={14}/></button><span>{x.qty}</span><button onClick={() => change(key,1)}><Plus size={14}/></button></div></div><b>{money(x.price*x.qty, props.receiptConfig.currency)}</b></div>})}</div>
        {customer?.loyaltyStatus === 'member' && <div className="reward-box"><div className="reward-heading"><strong>Available Rewards</strong>{appliedReward && <button onClick={() => setAppliedRewardId('')}>Remove</button>}</div>{availableRewards.length === 0 ? <small>No reward is currently available.</small> : <div className="reward-options">{availableRewards.map(r => { const freeMissing = r.type === 'free_product' && r.productId && !props.cart.some(x => x.id === r.productId); return <button key={r.id} className={appliedRewardId===r.id?'active':''} disabled={Boolean(freeMissing)} onClick={() => setAppliedRewardId(r.id)}><span>{r.name}</span><small>{r.costPoints ? `${r.costPoints} pts` : ''}{r.requiredStamps ? `${r.requiredStamps} stamps` : ''}{freeMissing ? ' • add reward item first' : ''}</small></button>})}</div>}</div>}
        <div className="totals"><div><span>Subtotal</span><b>{money(subtotal, props.receiptConfig.currency)}</b></div>{discount>0&&<div className="discount-line"><span>Loyalty Reward</span><b>-{money(discount, props.receiptConfig.currency)}</b></div>}<div><span>Tax ({(props.taxRate*100).toFixed(1)}%)</span><b>{money(tax, props.receiptConfig.currency)}</b></div><div className="grand"><span>Total</span><b>{money(total, props.receiptConfig.currency)}</b></div></div>
        {offlineLocked&&<div className="offline-checkout-note"><WifiOff size={16}/> Reconnect before charging this order. Offline sales are intentionally blocked to protect inventory and loyalty balances.</div>}
        <div className="payments"><button disabled={!props.cart.length || busy || offlineLocked || (supabaseConfigured&&!currentQuote)} onClick={() => setCashTenderOpen(true)}><WalletCards/>Cash</button><button disabled={!props.cart.length || busy || offlineLocked} onClick={() => charge('card')}><CreditCard/>Card</button><button disabled={!props.cart.length || busy || offlineLocked} onClick={() => charge('qr')}><QrCode/>QR</button></div>
      </aside>
    </div>
    {pendingCheckout&&<div className="modal-backdrop"><section className="modal compact-modal" role="dialog" aria-modal="true" aria-label="Recover checkout confirmation"><h2>Confirm previous checkout</h2><p>A checkout was submitted but its result has not been confirmed on this device. Retry confirmation to recover the original receipt safely. Do not collect payment again.</p><p>Reference: <code>{pendingCheckout.id}</code></p><button className="primary-btn" disabled={busy} type="button" onClick={()=>void completeCheckout(pendingCheckout)}>{busy?'Confirming…':'Retry checkout confirmation'}</button></section></div>}
    {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    {cashTenderOpen && <CashTenderModal total={total} currency={props.receiptConfig.currency} busy={busy} onClose={() => setCashTenderOpen(false)} onConfirm={async received => { setCashTenderOpen(false); await charge('cash', received) }} />}
    {cameraOpen&&<CameraBarcodeScanner onClose={()=>setCameraOpen(false)} onDetected={code=>{setCameraOpen(false);scanBarcode(code)}}/>}
  </>
}

function CameraBarcodeScanner({onClose,onDetected}:{onClose:()=>void;onDetected:(code:string)=>void}){const videoRef=useRef<HTMLVideoElement|null>(null);const[error,setError]=useState('');const[ready,setReady]=useState(false);useEffect(()=>{let controls:{stop:()=>void}|undefined;let active=true;const reader=new BrowserMultiFormatReader();if(!videoRef.current)return;reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},videoRef.current,(result)=>{if(result&&active){active=false;controls?.stop();onDetected(result.getText())}}).then(c=>{controls=c;setReady(true)}).catch(e=>setError(e instanceof Error?e.message:'Camera could not start.'));return()=>{active=false;controls?.stop()}},[]);return <div className="modal-backdrop"><div className="modal camera-scanner-modal"><div className="panel-title"><h2><Camera size={20}/> Scan Product Barcode</h2><button onClick={onClose}>×</button></div><div className="camera-preview"><video ref={videoRef} autoPlay muted playsInline/><div className="camera-target"/></div>{!ready&&!error&&<div className="info-box">Starting camera… Allow camera permission when asked.</div>}{error&&<div className="error-box">{error}<br/>Check browser camera permission and make sure another app is not using the camera.</div>}<p className="muted">Hold the barcode inside the frame. The scanner closes automatically after a successful scan.</p><div className="modal-actions"><button onClick={onClose}>Cancel</button></div></div></div>}

function CashTenderModal({total,currency,busy,onClose,onConfirm}:{total:number;currency:string;busy:boolean;onClose:()=>void;onConfirm:(received:number)=>Promise<void>}) {
  const [received,setReceived]=useState(total.toFixed(2))
  const numeric=Number(received)
  const valid=received.trim()!==''&&Number.isFinite(numeric)&&numeric>=total
  const change=valid?Number((numeric-total).toFixed(2)):0
  return <div className="modal-backdrop"><form className="modal cash-tender-modal" onSubmit={e=>{e.preventDefault();if(valid)void onConfirm(Number(numeric.toFixed(2)))}}>
    <div className="panel-title"><h2>Cash Payment</h2><button type="button" onClick={onClose}>×</button></div>
    <div className="cash-tender-summary"><div><span>Sale total</span><strong>{money(total,currency)}</strong></div><label>Cash received<input autoFocus required type="number" min={total.toFixed(2)} step="0.01" inputMode="decimal" value={received} onChange={e=>setReceived(e.target.value)} onFocus={e=>e.currentTarget.select()}/></label><div className={`cash-change ${valid?'valid':'short'}`}><span>{valid?'Change due':'Amount short'}</span><strong>{money(valid?change:Math.max(0,total-(Number.isFinite(numeric)?numeric:0)),currency)}</strong></div></div>
    {!valid&&<div className="warning-box">Cash received must be at least the sale total.</div>}
    <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!valid||busy}>{busy?'Processing…':'Complete Cash Sale'}</button></div>
  </form></div>
}

async function fetchReceipt(saleId: string, fallback: ShopReceiptConfig): Promise<ReceiptData | null> {
  if (!supabaseConfigured || !supabase) return null
  const { data, error } = await supabase.rpc('get_sale_receipt', { p_sale_id: saleId })
  if (error || !data) return null
  const r: any = data
  const { data: tender } = await supabase.from('sales').select('cash_received,change_due').eq('id', saleId).maybeSingle()
  return {
    saleId: String(r.sale_id ?? saleId), receiptNumber: Number(r.receipt_number ?? 0), createdAt: String(r.created_at ?? new Date().toISOString()),
    shopName: r.shop_name ?? fallback.shopName, logoUrl: r.logo_url ?? fallback.logoUrl, address: r.address ?? fallback.address, phone: r.phone ?? fallback.phone,
    shopEmail: r.shop_email ?? fallback.email, currency: r.currency ?? fallback.currency, timezone: r.timezone ?? fallback.timezone, footer: r.footer ?? fallback.footer,
    staffName: r.staff_name ?? fallback.staffName, customerName: r.customer_name ?? null, customerEmail: r.customer_email ?? null,
    items: (r.items ?? []).map((i: any) => ({ saleItemId:i.sale_item_id ?? null, productId: i.product_id ?? null, name: i.name, qty: Number(i.qty), unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total), refundedQty:Number(i.refunded_qty ?? 0) })),
    subtotal: Number(r.subtotal ?? 0), discount: Number(r.discount ?? 0), tax: Number(r.tax ?? 0), total: Number(r.total ?? 0), depositApplied:Number(r.deposit_applied??0),balancePaid:r.balance_paid==null?null:Number(r.balance_paid),payment: String(r.payment_method ?? '').toUpperCase(), cashReceived: tender?.cash_received == null ? null : Number(tender.cash_received), changeDue: tender?.change_due == null ? null : Number(tender.change_due),
    rewardName: r.reward_name ?? null, pointsEarned: Number(r.points_earned ?? 0), pointsRedeemed: Number(r.points_redeemed ?? 0), stampsEarned: Number(r.stamps_earned ?? 0), stampsRedeemed: Number(r.stamps_redeemed ?? 0),
    pointsBalance: r.points_balance_after == null ? null : Number(r.points_balance_after), stampsBalance: r.stamps_balance_after == null ? null : Number(r.stamps_balance_after),
    status:(r.status ?? 'completed') as SaleStatus, refundedTotal:Number(r.refunded_total ?? 0), reprintCount:Number(r.reprint_count ?? 0),
    refunds:(r.refunds ?? []).map((x:any)=>({id:String(x.id),refundNumber:x.refund_number==null?undefined:Number(x.refund_number),type:x.refund_type,total:Number(x.total??0),reason:String(x.reason??''),restocked:Boolean(x.restocked),paymentNote:x.payment_note??null,createdAt:String(x.created_at),pointsReversed:Number(x.points_reversed??0),pointsRestored:Number(x.points_restored??0),stampsReversed:Number(x.stamps_reversed??0),stampsRestored:Number(x.stamps_restored??0)})),
  }
}

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  function printReceipt() { window.print() }
  function emailReceipt() {
    if (!receipt.customerEmail) return
    const lines = receipt.items.map(i => `${i.qty} x ${i.name} @ ${money(i.unitPrice, receipt.currency)} = ${money(i.lineTotal, receipt.currency)}`).join('\n')
    const loyalty = (receipt.pointsEarned || receipt.pointsRedeemed || receipt.stampsEarned || receipt.stampsRedeemed)
      ? `\nLoyalty:\nPoints: +${receipt.pointsEarned} / -${receipt.pointsRedeemed}${receipt.pointsBalance != null ? ` (Balance ${receipt.pointsBalance})` : ''}\nStamps: +${receipt.stampsEarned} / -${receipt.stampsRedeemed}${receipt.stampsBalance != null ? ` (Balance ${receipt.stampsBalance})` : ''}\n`
      : ''
    const subject = encodeURIComponent(`${receipt.shopName} receipt ${receiptNo(receipt.receiptNumber)}`)
    const deposit=receipt.depositApplied?`\nDeposit applied: ${money(receipt.depositApplied,receipt.currency)}\nFinal balance paid: ${money(receipt.balancePaid??0,receipt.currency)}`:''
    const cash = receipt.payment==='CASH'&&receipt.cashReceived!=null ? `\nCash received: ${money(receipt.cashReceived,receipt.currency)}\nChange: ${money(receipt.changeDue??0,receipt.currency)}` : ''
    const body = encodeURIComponent(`${receipt.shopName}\nReceipt ${receiptNo(receipt.receiptNumber)}\n${formatReceiptDate(receipt.createdAt, receipt.timezone)}\n\n${lines}\n\nSubtotal: ${money(receipt.subtotal, receipt.currency)}${receipt.discount ? `\nDiscount: -${money(receipt.discount, receipt.currency)}` : ''}\nTax: ${money(receipt.tax, receipt.currency)}\nTotal: ${money(receipt.total, receipt.currency)}\nPayment: ${receipt.payment}${deposit}${cash}${loyalty}\n${receipt.footer ?? ''}`)
    window.location.href = `mailto:${encodeURIComponent(receipt.customerEmail)}?subject=${subject}&body=${body}`
  }
  return <div className="modal-backdrop receipt-backdrop">
    <div className="receipt-dialog">
      <div className="receipt-toolbar no-print"><div><strong>{receipt.status==='completed'?'Receipt':statusLabel(receipt.status)}</strong><small>Receipt {receiptNo(receipt.receiptNumber)}</small></div><div className="receipt-actions"><button onClick={printReceipt}><Printer size={17}/> Print</button><button onClick={printReceipt}><FileBarChart size={17}/> Save PDF</button>{receipt.customerEmail && <button onClick={emailReceipt}><Mail size={17}/> Email</button>}<button className="primary-btn" onClick={onClose}>Close</button></div></div>
      <ReceiptSheet receipt={receipt}/>
    </div>
  </div>
}

function ReceiptSheet({ receipt }: { receipt: ReceiptData }) {
  const hasLoyalty = Boolean(receipt.pointsEarned || receipt.pointsRedeemed || receipt.stampsEarned || receipt.stampsRedeemed || receipt.pointsBalance != null || receipt.stampsBalance != null)
  return <article className="receipt-sheet receipt-print">
    {receipt.status!=='completed' && <div className={`receipt-status-banner ${receipt.status}`}>{statusLabel(receipt.status)}{receipt.refundedTotal>0?` • ${money(receipt.refundedTotal,receipt.currency)} adjusted`:''}</div>}
    <div className="receipt-brand">{receipt.logoUrl && <img src={receipt.logoUrl} alt="Business logo"/>}<h1>{receipt.shopName}</h1>{receipt.address && <p>{receipt.address}</p>}<p>{[receipt.phone, receipt.shopEmail].filter(Boolean).join(' • ')}</p></div>
    <div className="receipt-meta"><div><span>Receipt</span><strong>{receiptNo(receipt.receiptNumber)}</strong></div><div><span>Date</span><strong>{formatReceiptDate(receipt.createdAt, receipt.timezone)}</strong></div><div><span>Salesperson</span><strong>{receipt.staffName}</strong></div><div><span>Customer</span><strong>{receipt.customerName || 'Walk-in / Guest'}</strong></div></div>
    <div className="receipt-items"><div className="receipt-item-head"><span>Item</span><span>Qty</span><span>Total</span></div>{receipt.items.map((i,idx)=><div className="receipt-item" key={`${i.name}-${idx}`}><span><strong>{i.name}</strong><small>{money(i.unitPrice, receipt.currency)} each</small></span><span>{i.qty}</span><b>{money(i.lineTotal, receipt.currency)}</b></div>)}</div>
    <div className="receipt-totals"><div><span>Subtotal</span><b>{money(receipt.subtotal, receipt.currency)}</b></div>{receipt.discount > 0 && <div><span>{receipt.rewardName ? `Reward — ${receipt.rewardName}` : 'Discount'}</span><b>-{money(receipt.discount, receipt.currency)}</b></div>}<div><span>Tax</span><b>{money(receipt.tax, receipt.currency)}</b></div><div className="receipt-grand"><span>Original Total</span><b>{money(receipt.total, receipt.currency)}</b></div>{receipt.refundedTotal>0&&<><div><span>Refunded / Voided</span><b>-{money(receipt.refundedTotal,receipt.currency)}</b></div><div className="receipt-grand"><span>Net Sale</span><b>{money(receipt.status==='voided'?0:Math.max(0,receipt.total-receipt.refundedTotal),receipt.currency)}</b></div></>}<div><span>Payment</span><b>{receipt.payment}</b></div>{Boolean(receipt.depositApplied)&&<div><span>Deposit applied</span><strong>{money(receipt.depositApplied??0,receipt.currency)}</strong><span>Final balance paid</span><strong>{money(receipt.balancePaid??0,receipt.currency)}</strong></div>}{receipt.payment==='CASH'&&receipt.cashReceived!=null&&<><div><span>Cash Received</span><b>{money(receipt.cashReceived,receipt.currency)}</b></div><div className="receipt-grand"><span>Change</span><b>{money(receipt.changeDue??0,receipt.currency)}</b></div></>}</div>
    {receipt.refunds.length>0&&<div className="receipt-refunds"><strong>Adjustment History</strong>{receipt.refunds.map(r=><div key={r.id}><span>{r.type==='void'?'Void':r.type==='full'?'Full refund':'Partial refund'} • {formatReceiptDate(r.createdAt,receipt.timezone)}</span><b>-{money(r.total,receipt.currency)}</b><small>{r.reason}{r.restocked?' • stock restored':''}</small></div>)}</div>}
    {hasLoyalty && <div className="receipt-loyalty"><strong>Loyalty Activity</strong>{receipt.pointsEarned > 0 && <div><span>Points earned</span><b>+{receipt.pointsEarned}</b></div>}{receipt.pointsRedeemed > 0 && <div><span>Points redeemed</span><b>-{receipt.pointsRedeemed}</b></div>}{receipt.pointsBalance != null && <div><span>Points balance</span><b>{receipt.pointsBalance}</b></div>}{receipt.stampsEarned > 0 && <div><span>Stamps earned</span><b>+{receipt.stampsEarned}</b></div>}{receipt.stampsRedeemed > 0 && <div><span>Stamps redeemed</span><b>-{receipt.stampsRedeemed}</b></div>}{receipt.stampsBalance != null && <div><span>Stamp balance</span><b>{receipt.stampsBalance}</b></div>}</div>}
    <ReceiptCatalogueQr/><footer>{receipt.footer || 'Thank you!'}</footer>
  </article>
}

function formatReceiptDate(value: string, timezone: string) {
  try { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value)) }
  catch { return new Date(value).toLocaleString() }
}

async function sendInvite(customer: Customer, setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>, showToast: (m: string) => void) {
  if (!customer.email) { showToast('Add an email address before sending an invitation.'); return }
  let token = uid()
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('create_loyalty_invitation', { p_customer_id: customer.id })
    if (error) { showToast(error.message); return }
    token = data?.[0]?.token ?? token
  }
  setCustomers(cs => cs.map(c => c.id === customer.id ? { ...c, loyaltyStatus: 'invited' } : c))
  const base = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin
  const joinUrl = `${base}/?loyalty_invite=${token}`
  const subject = encodeURIComponent('You’re invited to our rewards program')
  const body = encodeURIComponent(`Hi ${customer.name},\n\nJoin our rewards program to earn and redeem customer rewards.\n\nJoin here: ${joinUrl}\n\nSee you soon!`)
  window.location.href = `mailto:${encodeURIComponent(customer.email)}?subject=${subject}&body=${body}`
  showToast('Invitation prepared in your email app.')
}

function Products({ products, setProducts, role, shopId, showToast, currency }: { products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>; role: Role; shopId: string|null; showToast: (m:string)=>void; currency:string }) {
  const[currentCatalogue,setCurrentCatalogue]=useState<CommercialProduct[]|null>(null)
  useEffect(()=>{let active=true,pending=false;async function load(){if(!supabase||pending)return;pending=true;try{const r=await supabase.rpc('get_commercial_catalogue',{p_token:null});if(active)setCurrentCatalogue(r.error?null:r.data.products)}finally{pending=false}}void load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},5000);return()=>{active=false;window.clearInterval(timer)}},[])
  function sellingPrice(product:Product){if(!supabaseConfigured)return money(product.price,currency);if(!currentCatalogue)return 'Pricing unavailable';const p=currentCatalogue.find(p=>p.id===product.id);if(!p)return 'Not published';const prices=p.variants.length?p.variants.map(v=>Number(v.price)):[Number(p.price)];const low=Math.min(...prices),high=Math.max(...prices);return low===high?money(low,currency):money(low,currency)+' – '+money(high,currency)}
  const [edit, setEdit] = useState<Product|null>(null)
  const [adding, setAdding] = useState(false)
  const [managingCategories,setManagingCategories]=useState(false)
  const [categories,setCategories]=useState<string[]>(['Breads','Pastries','Cakes','Cookies','Desserts','Drinks'])
  useEffect(()=>{if(!supabaseConfigured||!supabase||!shopId)return;void supabase.from('categories').select('name').eq('shop_id',shopId).order('sort_order').then(({data})=>{if(data?.length)setCategories(data.map(x=>x.name))})},[shopId])
  async function remove(id: string) {
    if (!confirm('Delete this product from the active catalog? Historical sale items remain unchanged.')) return
    if (supabaseConfigured && supabase) { const { error } = await supabase.from('products').update({ active: false }).eq('id',id); if(error){showToast(error.message);return} }
    setProducts(ps => ps.map(p => p.id===id ? {...p,active:false}:p)); showToast('Product removed from active catalog.')
  }
  return <><PageHeader title="Products"><div className="report-actions"><button disabled={role!=='admin'} onClick={()=>setManagingCategories(true)}>Manage Categories</button><button className="primary-btn small" disabled={role!=='admin'} onClick={() => setAdding(true)}><Plus size={17}/> Add Product</button></div></PageHeader>
    {role!=='admin' && <div className="info-box">Employee access is read-only. Product changes require an Admin.</div>}
    <section className="panel"><Table headers={['Product','Barcode','Category','Regular price','Current catalogue price',...(role==='admin'?['Unit cost','Base margin']:[]),'Stock','Status','Action']} rows={products.map(p=>[p.name,p.barcode||'—',p.category,money(p.price,currency),sellingPrice(p),...(role==='admin'?[money(p.cost??0,currency),p.price>0?`${(((p.price-(p.cost??0))/p.price)*100).toFixed(1)}%`:'—']:[]),String(p.stock),p.active?(p.stock<=p.lowAt?'Low Stock':'Active'):'Hidden / discontinued',<div className="table-actions" key={p.id}><button disabled={role!=='admin'} onClick={()=>setEdit(p)}>Modify</button><button disabled={role!=='admin'} className="danger-link" onClick={()=>remove(p.id)}>Discontinue</button></div>])}/><p className="muted">Regular price is the master product price. Current catalogue prices include active variant pricing and promotions; checkout verifies the same server prices. Base margin uses regular price; final margins are in Profitability.</p></section>
    {(edit||adding) && <ProductModal product={edit} shopId={shopId} categories={categories} onClose={()=>{setEdit(null);setAdding(false)}} onSaved={p=>{setProducts(ps=> edit ? ps.map(x=>x.id===p.id?p:x):[p,...ps]);setEdit(null);setAdding(false);showToast('Product saved.')}} />}
    {managingCategories&&<CategoryManager shopId={shopId} categories={categories} onClose={()=>setManagingCategories(false)} onChanged={(next,oldName,newName)=>{setCategories(next);if(oldName)setProducts(ps=>ps.map(p=>p.category===oldName?{...p,category:newName??'Other'}:p))}} showToast={showToast}/>} 
  </>
}

function ProductModal({ product, shopId, categories, onClose, onSaved }: { product: Product|null; shopId:string|null; categories:string[]; onClose:()=>void; onSaved:(p:Product)=>void }) {
  const [form,setForm]=useState<Product>(product ?? {id:uid(),name:'',category:'Pastries',price:0,stock:0,lowAt:5,active:true})
  const [busy,setBusy]=useState(false)
  const [imageFile,setImageFile]=useState<File|null>(null)
  const [imageInputKey,setImageInputKey]=useState(0)
  const [emojiOpen,setEmojiOpen]=useState(false)
  const [forceEmoji,setForceEmoji]=useState(false)
  async function save(e:FormEvent){e.preventDefault();setBusy(true);let image=form.image
    if(supabaseConfigured&&supabase&&shopId){
      if(imageFile){
        const ext=imageFile.name.split('.').pop()||'jpg'
        const path=`${shopId}/${form.id}-${Date.now()}.${ext}`
        const upload=await supabase.storage.from('product-images').upload(path,imageFile,{upsert:false,cacheControl:'3600',contentType:imageFile.type})
        if(upload.error){alert(upload.error.message.includes('row-level security')?'Supabase rejected the product image. Confirm Storage migrations 23 and 24 were run, then sign in again as an active administrator.':upload.error.message);setBusy(false);return}
        image=supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
      }
      if(forceEmoji) image=undefined
      const {data:cat}=await supabase.from('categories').select('id').eq('shop_id',shopId).eq('name',form.category).maybeSingle()
      const payload={shop_id:shopId,name:form.name,barcode:form.barcode?.trim()||null,category_id:cat?.id??null,price:form.price,cost_price:form.cost??0,...(product?{}:{stock:form.stock}),low_stock_at:form.lowAt,active:form.active,image_url:image??null,icon_emoji:form.iconEmoji||null}
      const res=product?await supabase.from('products').update(payload).eq('id',product.id).select('id,stock').single():await supabase.from('products').insert(payload).select('id,stock').single()
      if(res.error){alert(res.error.message);setBusy(false);return} form.id=res.data.id;form.stock=Number(res.data.stock)
    }
    onSaved({...form,barcode:form.barcode?.trim()||undefined,image:forceEmoji?undefined:image});setBusy(false)
  }
  function file(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)){alert('Choose a JPG, PNG, or WebP product image.');e.target.value='';return}if(f.size>5*1024*1024){alert('Product image must be 5 MB or smaller.');e.target.value='';return}setImageFile(f);const r=new FileReader();r.onload=()=>setForm(x=>({...x,image:String(r.result)}));r.readAsDataURL(f)}
  return <div className="modal-backdrop"><form className="modal" onSubmit={save}>
    <div className="panel-title"><h2>{product?'Modify Product':'Add Product'}</h2><button type="button" onClick={onClose}>×</button></div>
    <div className="form-grid">
      <label>Product name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
      <label>Barcode (optional)<input value={form.barcode??''} onChange={e=>setForm({...form,barcode:e.target.value.replace(/\s/g,'')})} placeholder="Scan into this field"/><small>Must be unique within this shop.</small></label>
      <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Regular selling price<input required min="0" step="0.01" type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></label>
      <label>Unit cost<input required min="0" step="0.01" type="number" value={form.cost??0} onChange={e=>setForm({...form,cost:Number(e.target.value)})}/><small>Ingredient/production cost per sellable unit.</small></label>
      <label>Current stock<input required disabled={Boolean(product)} min="0" step="1" type="number" value={product?product.stock:form.stock} onChange={e=>setForm({...form,stock:Number(e.target.value)})}/><small>{product?'Use Inventory → Adjust Stock so the batch ledger remains auditable.':'Opening stock creates an untracked initial batch.'}</small></label>
      <label>Low-stock warning<input required min="0" step="1" type="number" value={form.lowAt} onChange={e=>setForm({...form,lowAt:Number(e.target.value)})}/></label>
      <label>Product image<input key={imageInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{file(e);setForceEmoji(false)}}/><small>JPG, PNG, or WebP • maximum 5 MB.</small></label>
    </div>
    <div className="product-icon-picker">
      <div><strong>Food icon / emoji</strong><small>Used when no product image is selected.</small></div>
      <button type="button" className="emoji-picker-trigger" onClick={()=>setEmojiOpen(v=>!v)}><span>{form.iconEmoji??productEmoji(form.category)}</span> Choose Emoji</button>
      {emojiOpen&&<div className="emoji-grid" role="listbox" aria-label="Food emoji choices">{FOOD_EMOJIS.map(emoji=><button type="button" key={emoji} className={form.iconEmoji===emoji?'selected':''} aria-label={`Use ${emoji} icon`} onClick={()=>{setForm({...form,iconEmoji:emoji,image:undefined});setImageFile(null);setImageInputKey(k=>k+1);setForceEmoji(true);setEmojiOpen(false)}}>{emoji}</button>)}</div>}
    </div>
    <label className="switch-line"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active product</label>
    <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>Save Product</button></div>
  </form></div>
}

function CategoryManager({shopId,categories,onClose,onChanged,showToast}:{shopId:string|null;categories:string[];onClose:()=>void;onChanged:(next:string[],oldName?:string,newName?:string|null)=>void;showToast:(m:string)=>void}){
  const[name,setName]=useState('');const[busy,setBusy]=useState(false)
  async function add(){const clean=name.trim();if(!clean||categories.some(c=>c.toLowerCase()===clean.toLowerCase()))return;setBusy(true);if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('categories').insert({shop_id:shopId,name:clean,sort_order:categories.length});if(error){setBusy(false);return showToast(error.message)}}onChanged([...categories,clean]);setName('');setBusy(false);showToast('Category added.')}
  async function rename(oldName:string){const next=prompt('New category name',oldName)?.trim();if(!next||next===oldName)return;if(categories.some(c=>c.toLowerCase()===next.toLowerCase()))return showToast('That category already exists.');if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('categories').update({name:next}).eq('shop_id',shopId).eq('name',oldName);if(error)return showToast(error.message)}onChanged(categories.map(c=>c===oldName?next:c),oldName,next);showToast('Category renamed.')}
  async function remove(oldName:string){if(!confirm(`Delete category "${oldName}"? Products in it will become uncategorized.`))return;if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('categories').delete().eq('shop_id',shopId).eq('name',oldName);if(error)return showToast(error.message)}onChanged(categories.filter(c=>c!==oldName),oldName,null);showToast('Category deleted.')}
  async function move(index:number,direction:-1|1){const target=index+direction;if(target<0||target>=categories.length)return;const next=[...categories];[next[index],next[target]]=[next[target],next[index]];if(supabaseConfigured&&supabase&&shopId){const updates=next.map((category,sort_order)=>supabase!.from('categories').update({sort_order}).eq('shop_id',shopId).eq('name',category));const results=await Promise.all(updates);const failed=results.find(result=>result.error);if(failed?.error)return showToast(failed.error.message)}onChanged(next);showToast('Category display order updated. The customer catalogue follows this order.')}
  return <div className="modal-backdrop"><div className="modal"><div className="panel-title"><div><h2>Manage Categories</h2><p className="muted">Category order is also used by the  customer catalogue.</p></div><button onClick={onClose}>×</button></div><div className="category-add"><input value={name} maxLength={60} onChange={e=>setName(e.target.value)} placeholder="New category name"/><button className="primary-btn" disabled={busy||!name.trim()} onClick={add}><Plus size={16}/> Add</button></div><div className="management-list">{categories.map((c,index)=><div key={c}><strong>{c}</strong><span><button disabled={index===0} onClick={()=>void move(index,-1)}>↑</button><button disabled={index===categories.length-1} onClick={()=>void move(index,1)}>↓</button><button onClick={()=>rename(c)}>Rename</button><button className="danger-link" onClick={()=>remove(c)}>Delete</button></span></div>)}</div><div className="modal-actions"><button onClick={onClose}>Done</button></div></div></div>
}
function Inventory({ products, setProducts, showToast }: { products:Product[];setProducts:React.Dispatch<React.SetStateAction<Product[]>>;showToast:(m:string)=>void}) {
  const [adjust,setAdjust]=useState<Product|null>(null)
  return <><PageHeader title="Inventory"/><section className="stats-grid three"><Stat label="Total Items" value={String(products.length)} sub="Catalog items"/><Stat label="Low Stock" value={String(products.filter(p=>p.stock>0&&p.stock<=p.lowAt).length)} sub="Below reorder level"/><Stat label="Out of Stock" value={String(products.filter(p=>p.stock<=0).length)} sub="Unavailable"/></section><section className="panel"><Table headers={['Item','Current Stock','Reorder At','Status','Action']} rows={products.filter(p=>p.active).map(p=>[p.name,String(p.stock),String(p.lowAt),p.stock<=0?'Out':p.stock<=p.lowAt?'Low':'OK',<button key={p.id} onClick={()=>setAdjust(p)}>Adjust Stock</button>])}/></section>{adjust&&<AdjustStock product={adjust} onClose={()=>setAdjust(null)} onDone={n=>{setProducts(ps=>ps.map(p=>p.id===adjust.id?{...p,stock:n}:p));setAdjust(null);showToast('Stock adjusted.')}}/>}</>
}

type ProductionBatchRow={id:string;batch_number:number;product_id:string;product_name:string;status:string;scheduled_date:string;planned_quantity:number;actual_quantity:number|null;waste_quantity:number|null;note:string|null;completion_note:string|null;created_by_name:string;completed_by_name:string|null;created_at:string;completed_at:string|null}
function ProductionBatches({products,setProducts,role,showToast}:{products:Product[];setProducts:React.Dispatch<React.SetStateAction<Product[]>>;role:Role;showToast:(m:string)=>void}){const[batches,setBatches]=useState<ProductionBatchRow[]>([]);const[adding,setAdding]=useState(false);const[completing,setCompleting]=useState<ProductionBatchRow|null>(null);async function load(){if(role!=='admin'||!supabaseConfigured||!supabase)return;const{data,error}=await supabase.rpc('get_production_batches');if(error)return showToast(error.message);setBatches(data??[])}useEffect(()=>{void load()},[role]);async function cancel(id:string){if(!confirm('Cancel this scheduled production batch?'))return;if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('cancel_production_batch',{p_batch_id:id});if(error)return showToast(error.message)}await load();showToast('Production batch cancelled.')}if(role!=='admin')return <><PageHeader title="Production"/><div className="info-box">Administrator access is required.</div></>;const completed=batches.filter(b=>b.status==='completed'),good=completed.reduce((a,b)=>a+Number(b.actual_quantity??0),0),waste=completed.reduce((a,b)=>a+Number(b.waste_quantity??0),0);return <><PageHeader title="Bakery Production"><button className="primary-btn small" onClick={()=>setAdding(true)}><Plus size={17}/> Schedule Batch</button></PageHeader><div className="info-box drawer-security"><ShieldCheck size={18}/><span>Completing a batch atomically adds only sellable output to inventory. Waste is recorded separately and never increases stock.</span></div><section className="stats-grid three"><Stat label="Scheduled Batches" value={String(batches.filter(b=>b.status==='scheduled').length)} sub="Awaiting production"/><Stat label="Sellable Output" value={String(good)} sub="Completed batches shown"/><Stat label="Recorded Waste" value={String(waste)} sub={good+waste?`${((waste/(good+waste))*100).toFixed(1)}% of output`:'No completed output'}/></section><section className="panel"><Table headers={['Batch','Date','Product','Planned','Actual','Waste','Yield','Status','Action']} rows={batches.map(b=>[`B-${String(b.batch_number).padStart(6,'0')}`,new Date(`${b.scheduled_date}T00:00:00`).toLocaleDateString(),b.product_name,String(b.planned_quantity),b.actual_quantity==null?'—':String(b.actual_quantity),b.waste_quantity==null?'—':String(b.waste_quantity),b.actual_quantity==null?'—':`${(Number(b.actual_quantity)+Number(b.waste_quantity)>0?Number(b.actual_quantity)/(Number(b.actual_quantity)+Number(b.waste_quantity))*100:0).toFixed(1)}%`,b.status,<div className="table-actions" key={b.id}>{b.status==='scheduled'&&<><button onClick={()=>setCompleting(b)}>Complete</button><button className="danger-link" onClick={()=>cancel(b.id)}>Cancel</button></>}</div>])}/></section>{adding&&<ScheduleBatchModal products={products} onClose={()=>setAdding(false)} onSaved={async()=>{setAdding(false);await load();showToast('Production batch scheduled.')}}/>}{completing&&<CompleteBatchModal batch={completing} onClose={()=>setCompleting(null)} onSaved={async result=>{setProducts(ps=>ps.map(p=>p.id===result.product_id?{...p,stock:Number(result.new_stock)}:p));setCompleting(null);await load();showToast('Batch completed and inventory updated.')}}/>}</>}
function ScheduleBatchModal({products,onClose,onSaved}:{products:Product[];onClose:()=>void;onSaved:()=>Promise<void>}){const[product,setProduct]=useState(products[0]?.id??'');const[date,setDate]=useState(new Date().toISOString().slice(0,10));const[planned,setPlanned]=useState('1');const[note,setNote]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent){e.preventDefault();if(Number(planned)<=0)return;setBusy(true);if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('schedule_production_batch',{p_product_id:product,p_scheduled_date:date,p_planned_quantity:Number(planned),p_note:note.trim()||null});if(error){setBusy(false);alert(error.message);return}}await onSaved()}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>Schedule Production Batch</h2><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Product<select value={product} onChange={e=>setProduct(e.target.value)}>{products.filter(p=>p.active).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Production date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Planned sellable quantity<input required type="number" min="0.001" step="0.001" value={planned} onChange={e=>setPlanned(e.target.value)}/></label><label>Batch note<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Flavor, order, shift…"/></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>Schedule Batch</button></div></form></div>}
function CompleteBatchModal({batch,onClose,onSaved}:{batch:ProductionBatchRow;onClose:()=>void;onSaved:(r:{product_id:string;new_stock:number})=>Promise<void>}){const[actual,setActual]=useState(String(batch.planned_quantity));const[waste,setWaste]=useState('0');const[note,setNote]=useState('');const[batchCode,setBatchCode]=useState(`B-${String(batch.batch_number).padStart(6,'0')}`);const[bestBefore,setBestBefore]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent){e.preventDefault();if(Number(actual)<0||Number(waste)<0||Number(actual)+Number(waste)<=0||!batchCode.trim())return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('complete_production_batch_with_trace',{p_batch_id:batch.id,p_actual_quantity:Number(actual),p_waste_quantity:Number(waste),p_completion_note:note.trim()||null,p_batch_code:batchCode.trim(),p_best_before_on:bestBefore||null});if(error){setBusy(false);alert(error.message);return}await onSaved(data)}else await onSaved({product_id:batch.product_id,new_stock:Number(actual)})}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>Complete {batch.product_name}</h2><button type="button" onClick={onClose}>×</button></div><div className="info-box">Planned quantity: {batch.planned_quantity}. A finished batch record will connect these units to future receipts.</div><div className="form-grid"><label>Sellable quantity<input required type="number" min="0" step="0.001" value={actual} onChange={e=>setActual(e.target.value)}/></label><label>Waste / damaged quantity<input required type="number" min="0" step="0.001" value={waste} onChange={e=>setWaste(e.target.value)}/></label><label>Finished batch code<input required value={batchCode} onChange={e=>setBatchCode(e.target.value)} placeholder="Label printed on finished goods"/></label><label>Best-before date<input type="date" min={new Date().toISOString().slice(0,10)} value={bestBefore} onChange={e=>setBestBefore(e.target.value)}/></label><label className="full-field">Completion note<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Quality, variance, production notes…"/></label></div><div className="warning-box">Only {actual||0} sellable units will be added to product inventory. Checkout will allocate this finished batch automatically.</div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy||!batchCode.trim()}>{busy?'Completing…':'Complete & Add Tracked Stock'}</button></div></form></div>}

type SupplierRow={id:string;name:string;contact_name:string|null;phone:string|null;email:string|null;active:boolean}
type ReceiptRow={id:string;received_at:string;supplier_name:string;product_name:string;quantity:number;unit_cost:number;total_cost:number;invoice_reference:string|null;note:string|null;received_by_name:string;attachment_count:number}
function StockReceiving({products,setProducts,role,currency,shopId,showToast}:{products:Product[];setProducts:React.Dispatch<React.SetStateAction<Product[]>>;role:Role;currency:string;shopId:string|null;showToast:(m:string)=>void}){
  const[suppliers,setSuppliers]=useState<SupplierRow[]>([])
  const[receipts,setReceipts]=useState<ReceiptRow[]>([])
  const[receiving,setReceiving]=useState(false)
  const[addingSupplier,setAddingSupplier]=useState(false)
  async function load(){if(role!=='admin'||!supabaseConfigured||!supabase)return;const{data,error}=await supabase.rpc('get_stock_receiving');if(error)return showToast(error.message);setSuppliers(data?.suppliers??[]);setReceipts((data?.receipts??[]).map((r:any)=>({...r,attachment_count:Number(r.attachment_count??0)})))}
  useEffect(()=>{void load()},[role])
  async function viewPhoto(receipt:ReceiptRow){try{await openSupplyPhoto('stock_receipt',receipt.id)}catch(error){showToast(error instanceof Error?error.message:'Supply photo could not be opened.')}}
  if(role!=='admin')return <><PageHeader title="Stock Receiving"/><div className="info-box">Administrator access is required.</div></>
  const total=receipts.reduce((a,r)=>a+Number(r.total_cost),0)
  return <><PageHeader title="Suppliers & Stock Receiving"><div className="report-actions"><button onClick={()=>setAddingSupplier(true)}><Plus size={17}/> Supplier</button><button onClick={()=>setReceiving(true)} disabled={!suppliers.length||!products.length}><Package size={17}/> Receive Stock</button></div></PageHeader>
    <div className="info-box drawer-security"><ShieldCheck size={18}/><span>Receiving is atomic: the receipt, product stock increase, cost update, and inventory audit entry are saved together or not at all.  can also attach a private supplier/delivery photo to the saved receipt.</span></div>
    <section className="stats-grid three"><Stat label="Active Suppliers" value={String(suppliers.filter(s=>s.active).length)} sub="Available for receiving"/><Stat label="Recent Receipts" value={String(receipts.length)} sub="Latest 100 records"/><Stat label="Received Value" value={money(total,currency)} sub="Displayed receipt history"/></section>
    <section className="two-col receiving-grid"><div className="panel"><h2>Suppliers</h2>{suppliers.length?<Table headers={['Supplier','Contact','Phone','Email']} rows={suppliers.map(s=>[s.name,s.contact_name||'—',s.phone||'—',s.email||'—'])}/>:<p className="muted">Add the first supplier before receiving stock.</p>}</div><div className="panel"><h2>Receiving Rules</h2><p className="muted">Enter the quantity and actual unit cost from the supplier invoice. Choose whether that cost should become the product’s new cost for future sales.</p><ul className="plain-list"><li>Existing completed-sale cost snapshots stay unchanged.</li><li>Stock increases are recorded in the inventory audit trail.</li><li>Supply photos are private and visible only to administrators.</li><li>Receiving records cannot be deleted from the POS.</li></ul></div></section>
    <section className="panel"><h2>Receipt History</h2>{receipts.length?<Table headers={['Received','Supplier','Product','Qty','Unit Cost','Total','Invoice','Supply Photo','Staff']} rows={receipts.map(r=>[new Date(r.received_at).toLocaleString(),r.supplier_name,r.product_name,String(r.quantity),money(Number(r.unit_cost),currency),money(Number(r.total_cost),currency),r.invoice_reference||'—',r.attachment_count?<button key={`photo-${r.id}`} onClick={()=>viewPhoto(r)}><ImagePlus size={15}/> View</button>:'—',r.received_by_name])}/>:<p className="muted">No stock receipts yet.</p>}</section>
    {addingSupplier&&<SupplierModal onClose={()=>setAddingSupplier(false)} onSaved={async()=>{setAddingSupplier(false);await load();showToast('Supplier saved.')}}/>}
    {receiving&&<ReceiveStockModal suppliers={suppliers} products={products} currency={currency} shopId={shopId} onClose={()=>setReceiving(false)} onSaved={async(result)=>{setProducts(ps=>ps.map(p=>p.id===result.product_id?{...p,stock:Number(result.new_stock),cost:Number(result.cost_price)}:p));setReceiving(false);await load();showToast('Stock received and audited.')}}/>}
  </>
}
function SupplierModal({onClose,onSaved}:{onClose:()=>void;onSaved:()=>Promise<void>}){const[name,setName]=useState('');const[contact,setContact]=useState('');const[phone,setPhone]=useState('');const[email,setEmail]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('create_supplier',{p_name:name.trim(),p_contact_name:contact.trim()||null,p_phone:phone.trim()||null,p_email:email.trim()||null});if(error){setBusy(false);alert(error.message);return}}await onSaved()}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>Add Supplier</h2><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Supplier name<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Contact person<input value={contact} onChange={e=>setContact(e.target.value)}/></label><label>Phone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>Save Supplier</button></div></form></div>}
function ReceiveStockModal({suppliers,products,currency,shopId,onClose,onSaved}:{suppliers:SupplierRow[];products:Product[];currency:string;shopId:string|null;onClose:()=>void;onSaved:(r:{product_id:string;new_stock:number;cost_price:number})=>Promise<void>}){
  const[supplier,setSupplier]=useState(suppliers[0]?.id??''),[product,setProduct]=useState(products[0]?.id??''),[qty,setQty]=useState('1'),[cost,setCost]=useState(String(products[0]?.cost??0)),[invoice,setInvoice]=useState(''),[note,setNote]=useState(''),[updateCost,setUpdateCost]=useState(true),[photo,setPhoto]=useState<File|null>(null),[busy,setBusy]=useState(false)
  function chooseProduct(id:string){setProduct(id);setCost(String(products.find(p=>p.id===id)?.cost??0))}
  function choosePhoto(file:File|undefined){if(!file){setPhoto(null);return}try{validateSupplyPhoto(file);setPhoto(file)}catch(error){alert(error instanceof Error?error.message:'Invalid supply photo.');setPhoto(null)}}
  async function save(e:FormEvent){e.preventDefault();if(Number(qty)<=0||Number(cost)<0)return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('receive_stock',{p_supplier_id:supplier,p_product_id:product,p_quantity:Number(qty),p_unit_cost:Number(cost),p_invoice_reference:invoice.trim()||null,p_note:note.trim()||null,p_update_product_cost:updateCost});if(error){setBusy(false);alert(error.message);return}if(photo&&shopId&&data?.receipt_id){try{await uploadSupplyPhoto(photo,'stock_receipt',String(data.receipt_id),shopId)}catch(uploadError){alert(`Stock was received successfully, but the supply photo could not be attached: ${uploadError instanceof Error?uploadError.message:'Upload failed'}`)}}await onSaved(data)}else{const p=products.find(x=>x.id===product)!;await onSaved({product_id:product,new_stock:p.stock+Number(qty),cost_price:updateCost?Number(cost):(p.cost??0)})}}
  return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>Receive Stock</h2><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Supplier<select value={supplier} onChange={e=>setSupplier(e.target.value)}>{suppliers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Product<select value={product} onChange={e=>chooseProduct(e.target.value)}>{products.filter(p=>p.active).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Quantity<input required type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Unit cost<input required type="number" min="0" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></label><label>Invoice/reference<input value={invoice} onChange={e=>setInvoice(e.target.value)}/></label><label>Note<input value={note} onChange={e=>setNote(e.target.value)}/></label><label className="full-field">Supply / delivery photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>choosePhoto(e.target.files?.[0])}/><small>Optional. Photo of supplier invoice, delivery, packaging, or imported stock • JPG/PNG/WebP • max 8 MB.</small></label></div><label className="switch-line"><input type="checkbox" checked={updateCost} onChange={e=>setUpdateCost(e.target.checked)}/> Use {money(Number(cost)||0,currency)} as this product’s new unit cost</label><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Receiving…':'Receive Stock'}</button></div></form></div>
}

type PurchaseOrderRow={id:string;order_number:number;status:string;ordered_at:string;expected_date:string|null;received_at:string|null;supplier_name:string;invoice_reference:string|null;note:string|null;total:number;created_by_name:string;items:{product_id:string;product_name:string;quantity:number;unit_cost:number;line_total:number}[]}
function PurchaseOrders({products,setProducts,role,currency,showToast}:{products:Product[];setProducts:React.Dispatch<React.SetStateAction<Product[]>>;role:Role;currency:string;showToast:(m:string)=>void}){const[orders,setOrders]=useState<PurchaseOrderRow[]>([]);const[suppliers,setSuppliers]=useState<SupplierRow[]>([]);const[adding,setAdding]=useState(false);async function load(){if(role!=='admin'||!supabaseConfigured||!supabase)return;const{data,error}=await supabase.rpc('get_purchase_orders');if(error)return showToast(error.message);setOrders(data?.orders??[]);setSuppliers(data?.suppliers??[])}useEffect(()=>{void load()},[role]);async function action(id:string,mode:'receive'|'cancel'){if(!confirm(mode==='receive'?'Receive every item on this purchase order into inventory?':'Cancel this purchase order?'))return;if(supabaseConfigured&&supabase){const{data,error}=mode==='receive'?await supabase.rpc('receive_purchase_order',{p_order_id:id}):await supabase.rpc('cancel_purchase_order',{p_order_id:id});if(error)return showToast(error.message);if(mode==='receive'&&data?.products)setProducts(ps=>ps.map(p=>{const n=data.products.find((x:any)=>x.product_id===p.id);return n?{...p,stock:Number(n.new_stock),cost:Number(n.cost_price)}:p}))}await load();showToast(mode==='receive'?'Purchase order received and audited.':'Purchase order cancelled.')}if(role!=='admin')return <><PageHeader title="Purchase Orders"/><div className="info-box">Administrator access is required.</div></>;return <><PageHeader title="Purchase Orders"><button className="primary-btn small" disabled={!suppliers.length} onClick={()=>setAdding(true)}><Plus size={17}/> New Purchase Order</button></PageHeader>{!suppliers.length&&<div className="warning-box">Add an active supplier in Stock Receiving before creating a purchase order.</div>}<section className="stats-grid three"><Stat label="Open Orders" value={String(orders.filter(o=>o.status==='ordered').length)} sub="Awaiting delivery"/><Stat label="Received" value={String(orders.filter(o=>o.status==='received').length)} sub="Completed orders"/><Stat label="Ordered Value" value={money(orders.filter(o=>o.status==='ordered').reduce((a,o)=>a+Number(o.total),0),currency)} sub="Open commitment"/></section><section className="panel purchase-orders"><Table headers={['PO','Supplier','Ordered','Expected','Items','Total','Status','Action']} rows={orders.map(o=>[`PO-${String(o.order_number).padStart(6,'0')}`,o.supplier_name,new Date(o.ordered_at).toLocaleDateString(),o.expected_date?new Date(`${o.expected_date}T00:00:00`).toLocaleDateString():'—',o.items.map(i=>`${i.quantity}× ${i.product_name}`).join(', '),money(Number(o.total),currency),o.status,<div className="table-actions" key={o.id}>{o.status==='ordered'&&<><button onClick={()=>action(o.id,'receive')}>Receive</button><button className="danger-link" onClick={()=>action(o.id,'cancel')}>Cancel</button></>}</div>])}/></section>{adding&&<PurchaseOrderModal suppliers={suppliers} products={products} currency={currency} onClose={()=>setAdding(false)} onSaved={async()=>{setAdding(false);await load();showToast('Purchase order created.')}}/>}</>}
function PurchaseOrderModal({suppliers,products,currency,onClose,onSaved}:{suppliers:SupplierRow[];products:Product[];currency:string;onClose:()=>void;onSaved:()=>Promise<void>}){type Line={product_id:string;quantity:number;unit_cost:number};const[supplier,setSupplier]=useState(suppliers[0]?.id??'');const[expected,setExpected]=useState('');const[invoice,setInvoice]=useState('');const[note,setNote]=useState('');const[lines,setLines]=useState<Line[]>([{product_id:products[0]?.id??'',quantity:1,unit_cost:products[0]?.cost??0}]);const[busy,setBusy]=useState(false);function patchLine(i:number,p:Partial<Line>){setLines(ls=>ls.map((l,n)=>n===i?{...l,...p}:l))}const total=lines.reduce((a,l)=>a+l.quantity*l.unit_cost,0);async function save(e:FormEvent){e.preventDefault();if(lines.some(l=>!l.product_id||l.quantity<=0||l.unit_cost<0))return;setBusy(true);if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('create_purchase_order',{p_supplier_id:supplier,p_expected_date:expected||null,p_invoice_reference:invoice.trim()||null,p_note:note.trim()||null,p_items:lines});if(error){setBusy(false);alert(error.message);return}}await onSaved()}return <div className="modal-backdrop"><form className="modal purchase-modal" onSubmit={save}><div className="panel-title"><h2>New Purchase Order</h2><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Supplier<select value={supplier} onChange={e=>setSupplier(e.target.value)}>{suppliers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Expected date<input type="date" value={expected} min={new Date().toISOString().slice(0,10)} onChange={e=>setExpected(e.target.value)}/></label><label>Supplier reference<input value={invoice} onChange={e=>setInvoice(e.target.value)}/></label><label>Note<input value={note} onChange={e=>setNote(e.target.value)}/></label></div><div className="po-lines"><strong>Order items</strong>{lines.map((l,i)=><div className="po-line" key={i}><select value={l.product_id} onChange={e=>{const id=e.target.value;patchLine(i,{product_id:id,unit_cost:products.find(p=>p.id===id)?.cost??0})}}>{products.filter(p=>p.active).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><input aria-label="Quantity" type="number" min="0.001" step="0.001" value={l.quantity} onChange={e=>patchLine(i,{quantity:Number(e.target.value)})}/><input aria-label="Unit cost" type="number" min="0" step="0.01" value={l.unit_cost} onChange={e=>patchLine(i,{unit_cost:Number(e.target.value)})}/><span>{money(l.quantity*l.unit_cost,currency)}</span><button type="button" disabled={lines.length===1} onClick={()=>setLines(ls=>ls.filter((_,n)=>n!==i))}>×</button></div>)}<button type="button" onClick={()=>setLines(ls=>[...ls,{product_id:products[0]?.id??'',quantity:1,unit_cost:products[0]?.cost??0}])}><Plus size={15}/> Add Item</button><div className="po-total"><span>Order total</span><strong>{money(total,currency)}</strong></div></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>Create Order</button></div></form></div>}

function AdjustStock({product,onClose,onDone}:{product:Product;onClose:()=>void;onDone:(n:number)=>void}){const[expectedStock,setExpectedStock]=useState(product.stock);const[mode,setMode]=useState<'add'|'remove'|'set'>('add');const[qty,setQty]=useState(1);const[reason,setReason]=useState('');async function save(){const delta=mode==='set'?qty-product.stock:mode==='add'?qty:-qty;if(product.stock+delta<0)return alert('Stock cannot be negative.');if(supabaseConfigured&&supabase){const{data,error}=mode==='set'?await supabase.rpc('set_product_stock_checked',{p_product_id:product.id,p_expected_stock:expectedStock,p_target_stock:qty,p_reason:reason||null}):await supabase.rpc('adjust_stock',{p_product_id:product.id,p_delta:delta,p_reason:reason||null});if(error){if(mode==='set'&&error.message.includes('Stock changed')){const latest=await supabase.from('products').select('stock').eq('id',product.id).single();if(latest.data)setExpectedStock(Number(latest.data.stock))}return alert(error.message)}onDone(Number(data));return}onDone(product.stock+delta)}return <div className="modal-backdrop"><div className="modal"><div className="panel-title"><h2>Adjust {product.name}</h2><button onClick={onClose}>×</button></div><p className="muted">Current balance: {expectedStock}. A changed balance must be reviewed before setting a physical count.</p><div className="segmented"><button className={mode==='add'?'active':''} onClick={()=>setMode('add')}>Add</button><button className={mode==='remove'?'active':''} onClick={()=>setMode('remove')}>Remove</button><button className={mode==='set'?'active':''} onClick={()=>setMode('set')}>Set Quantity</button></div><label>Quantity<input min="0" type="number" value={qty} onChange={e=>setQty(Number(e.target.value))}/></label><label>Reason / note<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Morning production, damaged, recount…"/></label><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="primary-btn" onClick={save}>Save Adjustment</button></div></div></div>}

export function Customers({customers,setCustomers,setPage,setSelectedCustomerId,showToast,currency,shopId,stampsRequired}:{customers:Customer[];setCustomers:React.Dispatch<React.SetStateAction<Customer[]>>;setPage:(p:PageKey)=>void;setSelectedCustomerId:(id:string)=>void;showToast:(m:string)=>void;currency:string;shopId:string|null;stampsRequired:number}){const[add,setAdd]=useState(false);const[history,setHistory]=useState<Customer|null>(null);const[edit,setEdit]=useState<Customer|null>(null);const[query,setQuery]=useState('');const clean=query.trim().toLowerCase(),digits=query.replace(/\D/g,'');const visible=customers.filter(c=>!clean||c.name.toLowerCase().includes(clean)||(digits.length>0&&(c.phone??'').replace(/\D/g,'').includes(digits))||(c.cardIds??[]).some(id=>id.toLowerCase().includes(clean)));function submitSearch(e:FormEvent){e.preventDefault();if(visible.length===1){setSelectedCustomerId(visible[0].id);showToast(`${visible[0].name} selected.`);setPage('sale')}}return <><PageHeader title="Customers"><button className="primary-btn small" onClick={()=>setAdd(true)}><Plus size={17}/> Add Customer</button></PageHeader><form className="panel customer-search" onSubmit={submitSearch}><Search size={20}/><input autoComplete="off" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Scan Card ID or search by customer name or phone number"/><button className="primary-btn small" type="submit" disabled={visible.length!==1}>Select Match</button>{query&&<button type="button" onClick={()=>setQuery('')}>Clear</button>}</form>{clean&&<p className="customer-search-count">{visible.length} matching customer{visible.length===1?'':'s'}</p>}<section className="panel customer-cards">{visible.map(c=><div className="customer-card" key={c.id}><div className="avatar">{c.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div className="customer-main"><h3>{c.name}</h3><p>{c.email||'No email'} {c.phone?`• ${c.phone}`:''}</p>{Boolean(c.cardIds?.length)&&<small className="customer-card-id">Card ID: {c.cardIds?.join(' • ')}</small>}<small>{c.visits} visits • {money(c.totalSpent,currency)} spent</small>{c.notes&&<em>{c.notes}</em>}</div><div className="customer-loyalty"><span className={`badge ${c.loyaltyStatus}`}>{c.loyaltyStatus.replace('_',' ')}</span>{c.loyaltyStatus==='member'&&<><strong>{c.points} pts</strong><span>{c.stamps}/{stampsRequired} stamps</span></>}</div><div className="customer-actions"><button onClick={()=>setHistory(c)}>Order / sales history</button><button onClick={()=>setEdit(c)}>Edit</button><button onClick={()=>{setSelectedCustomerId(c.id);setPage('sale')}}>New Sale</button>{c.loyaltyStatus!=='member'&&<button onClick={()=>sendInvite(c,setCustomers,showToast)}><Mail size={15}/> Invite</button>}</div></div>)}{!visible.length&&<div className="empty customer-empty">No customer matches that Card ID, name, or phone number.</div>}</section>{(add||edit)&&<CustomerModal customer={edit} shopId={shopId} onClose={()=>{setAdd(false);setEdit(null)}} onSaved={c=>{setCustomers(cs=>edit?cs.map(x=>x.id===c.id?c:x):[c,...cs]);setAdd(false);setEdit(null);showToast('Customer saved.')}}/>}{history&&<CustomerOrderHistory customerId={history.id} name={history.name} onClose={()=>setHistory(null)} onOrders={()=>{setHistory(null);setPage('scheduled-orders')}} onSales={()=>{setHistory(null);setPage('sales')}}/>}</>}

function CustomerModal({customer,shopId,onClose,onSaved}:{customer:Customer|null;shopId:string|null;onClose:()=>void;onSaved:(c:Customer)=>void}){const[form,setForm]=useState<Customer>(customer??{id:uid(),name:'',email:'',phone:'',notes:'',loyaltyStatus:'not_enrolled',points:0,stamps:0,visits:0,totalSpent:0});const[busy,setBusy]=useState(false);const[error,setError]=useState('');async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{let savedId=form.id;const cleanEmail=form.email?.trim()??'',cleanPhone=form.phone?.trim()??'',cleanNotes=form.notes?.trim()??'';if(supabaseConfigured&&supabase){if(!shopId)throw new Error('Your active business could not be identified. Sign out and sign in again.');const payload={shop_id:shopId,name:form.name.trim(),email:cleanEmail||null,phone:cleanPhone||null,notes:cleanNotes||null,loyalty_status:form.loyaltyStatus};const res=customer?await supabase.from('customers').update(payload).eq('id',customer.id).eq('shop_id',shopId).select('id').single():await supabase.from('customers').insert(payload).select('id').single();if(res.error)throw res.error;savedId=res.data.id}onSaved({...form,id:savedId,name:form.name.trim(),email:cleanEmail,phone:cleanPhone,notes:cleanNotes})}catch(err){setError(err instanceof Error?err.message:'Customer could not be saved.')}finally{setBusy(false)}}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>{customer?'Edit Customer':'Add Customer'}</h2><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Notes<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div>{error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Saving…':'Save Customer'}</button></div></form></div>}

function Loyalty({rewards,setRewards,customers,setCustomers,shopId,role,showToast,currency}:{rewards:Reward[];setRewards:React.Dispatch<React.SetStateAction<Reward[]>>;customers:Customer[];setCustomers:React.Dispatch<React.SetStateAction<Customer[]>>;shopId:string|null;role:Role;showToast:(m:string)=>void;currency:string}){const[pointsExpire,setPointsExpire]=useState(false);const[expiryDays,setExpiryDays]=useState(365);const[pointsRate,setPointsRate]=useState(1);const[stampsRequired,setStampsRequired]=useState(10);const[editing,setEditing]=useState<Reward|null>(null);const[adding,setAdding]=useState(false);const[pointCustomer,setPointCustomer]=useState<Customer|null>(null);async function saveProgram(){if(role!=='admin')return;if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('loyalty_programs').update({points_expire:pointsExpire,points_expiry_days:pointsExpire?expiryDays:null,points_per_currency:pointsRate,stamps_required:stampsRequired}).eq('shop_id',shopId);if(error)return showToast(error.message)}showToast('Loyalty settings saved.')}async function enroll(c:Customer){if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('enroll_customer',{p_customer_id:c.id});if(error)return showToast(error.message)}setCustomers(cs=>cs.map(x=>x.id===c.id?{...x,loyaltyStatus:'member'}:x));showToast(`${c.name} enrolled in loyalty.`)}async function removeReward(r:Reward){if(role!=='admin'||!confirm(`Delete reward "${r.name}"? Historical transactions will remain.`))return;if(supabaseConfigured&&supabase){const{error}=await supabase.from('loyalty_rewards').delete().eq('id',r.id);if(error)return showToast(error.message)}setRewards(rs=>rs.filter(x=>x.id!==r.id));showToast('Reward deleted.')}return <><PageHeader title="Loyalty Program"><button className="primary-btn small" disabled={role!=='admin'} onClick={saveProgram}>Save Settings</button></PageHeader><section className="two-col loyalty-grid"><div className="panel"><h2>Points System</h2><label>Points per {currency} 1<input type="number" min="0" step="0.1" value={pointsRate} onChange={e=>setPointsRate(Number(e.target.value))}/></label><label className="switch-line"><input type="checkbox" checked={pointsExpire} onChange={e=>setPointsExpire(e.target.checked)}/> Points expire</label>{pointsExpire&&<label>Expiration period (days)<input type="number" min="1" value={expiryDays} onChange={e=>setExpiryDays(Number(e.target.value))}/><small>Each earned batch expires separately; older points are used first.</small></label>}</div><div className="panel"><h2>Stamp Card</h2><label>Stamps required for reward<input type="number" min="1" value={stampsRequired} onChange={e=>setStampsRequired(Number(e.target.value))}/></label><p className="muted">Default earning rule: 1 stamp per qualifying purchase. Rewards can be free products, discounts, or bonus points.</p></div></section><section className="panel"><div className="panel-title"><h2>Rewards</h2><button disabled={role!=='admin'} onClick={()=>setAdding(true)}><Plus size={16}/> Add Reward</button></div><Table headers={['Reward','Type','Points','Stamps','Value','Action']} rows={rewards.map(r=>[r.name,r.type.replace('_',' '),String(r.costPoints??'—'),String(r.requiredStamps??'—'),r.type==='percent_discount'?`${r.value}%`:money(r.value,currency),<div className="table-actions" key={r.id}><button disabled={role!=='admin'} onClick={()=>setEditing(r)}>Modify</button><button disabled={role!=='admin'} className="danger-link" onClick={()=>removeReward(r)}>Delete</button></div>])}/><div className="info-box"><strong>How to redeem:</strong> Start a New Sale, select a loyalty customer, add products, choose an available reward, then complete payment. Points or stamps are deducted automatically and printed on the receipt.</div></section><section className="panel"><h2>Loyalty Members</h2><div className="member-list">{customers.filter(c=>c.loyaltyStatus==='member').map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{c.points} points • {c.stamps} stamps</small></span><button disabled={role!=='admin'} onClick={()=>setPointCustomer(c)}>Give Points</button></div>)}</div></section><section className="panel"><h2>Enrollment</h2><div className="member-list">{customers.filter(c=>c.loyaltyStatus!=='member').map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{c.email}</small></span><button onClick={()=>enroll(c)}>Enroll Now</button></div>)}</div></section>{(adding||editing)&&<RewardModal reward={editing} shopId={shopId} onClose={()=>{setAdding(false);setEditing(null)}} onSaved={r=>{setRewards(rs=>editing?rs.map(x=>x.id===r.id?r:x):[r,...rs]);setAdding(false);setEditing(null);showToast('Reward saved.')}}/>}{pointCustomer&&<GivePointsModal customer={pointCustomer} onClose={()=>setPointCustomer(null)} onSaved={points=>{setCustomers(cs=>cs.map(c=>c.id===pointCustomer.id?{...c,points}:c));setPointCustomer(null);showToast('Points added and audited.')}}/>}</>}

function LoyaltyV2({rewards,setRewards,customers,setCustomers,shopId,role,showToast,currency,stampsRequired,setStampsRequired}:{rewards:Reward[];setRewards:React.Dispatch<React.SetStateAction<Reward[]>>;customers:Customer[];setCustomers:React.Dispatch<React.SetStateAction<Customer[]>>;shopId:string|null;role:Role;showToast:(m:string)=>void;currency:string;stampsRequired:number;setStampsRequired:(n:number)=>void}){
  const[pointsMode,setPointsMode]=useState<'percentage'|'per_currency'>('percentage')
  const[pointsValue,setPointsValue]=useState(5)
  const[pointsExpire,setPointsExpire]=useState(false)
  const[expiryDays,setExpiryDays]=useState(365)
  const[stampMode,setStampMode]=useState<'per_sale'|'per_amount'>('per_sale')
  const[stampThreshold,setStampThreshold]=useState(10)
  const[editing,setEditing]=useState<Reward|null>(null)
  const[adding,setAdding]=useState(false)
  const[pointCustomer,setPointCustomer]=useState<Customer|null>(null)
  useEffect(()=>{if(!supabaseConfigured||!supabase||!shopId)return;void supabase.from('loyalty_programs').select('points_expire,points_expiry_days,points_per_currency,points_rule_mode,points_rule_value,stamps_required,stamp_mode,stamp_threshold').eq('shop_id',shopId).maybeSingle().then(({data})=>{if(!data)return;const mode=data.points_rule_mode==='per_currency'?'per_currency':'percentage';setPointsMode(mode);setPointsValue(Number(data.points_rule_value??(mode==='percentage'?Number(data.points_per_currency??.05)*100:data.points_per_currency??1)));setPointsExpire(Boolean(data.points_expire));setExpiryDays(Number(data.points_expiry_days??365));setStampMode(data.stamp_mode==='per_amount'?'per_amount':'per_sale');setStampThreshold(Number(data.stamp_threshold??10));setStampsRequired(Number(data.stamps_required??10))})},[shopId])
  async function saveProgram(){if(role!=='admin')return;const rate=pointsMode==='percentage'?pointsValue/100:pointsValue;if(pointsValue<0||stampThreshold<=0||stampsRequired<1)return showToast('Enter valid earning values.');if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('loyalty_programs').update({points_per_currency:rate,points_rule_mode:pointsMode,points_rule_value:pointsValue,points_expire:pointsExpire,points_expiry_days:pointsExpire?expiryDays:null,stamp_mode:stampMode,stamp_threshold:stampThreshold,stamps_required:stampsRequired}).eq('shop_id',shopId);if(error)return showToast(error.message)}showToast('Loyalty earning rules saved.')}
  async function enroll(c:Customer){if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('enroll_customer',{p_customer_id:c.id});if(error)return showToast(error.message)}setCustomers(cs=>cs.map(x=>x.id===c.id?{...x,loyaltyStatus:'member'}:x));showToast(`${c.name} enrolled in loyalty.`)}
  async function removeReward(r:Reward){if(role!=='admin'||!confirm(`Delete reward "${r.name}"? Historical transactions remain.`))return;if(supabaseConfigured&&supabase){const{error}=await supabase.from('loyalty_rewards').delete().eq('id',r.id);if(error)return showToast(error.message)}setRewards(rs=>rs.filter(x=>x.id!==r.id));showToast('Reward deleted.')}
  const pointExample=pointsMode==='percentage'?`A ${money(100,currency)} eligible purchase earns ${Math.floor(pointsValue)} points at ${pointsValue}%.`:`A ${money(10,currency)} eligible purchase earns ${Math.floor(10*pointsValue)} points.`
  return <><PageHeader title="Loyalty Program"><button className="primary-btn small" disabled={role!=='admin'} onClick={saveProgram}>Save Earning Rules</button></PageHeader>
    <section className="two-col loyalty-grid"><div className="panel"><h2>Points Earning Rule</h2><label>Rule<select value={pointsMode} onChange={e=>setPointsMode(e.target.value as 'percentage'|'per_currency')}><option value="percentage">Percentage of spending</option><option value="per_currency">Points per currency unit</option></select></label><label>{pointsMode==='percentage'?'Earning percentage (%)':`Points per ${currency} 1`}<input type="number" min="0" max={pointsMode==='percentage'?100:1000} step="0.01" value={pointsValue} onChange={e=>setPointsValue(Number(e.target.value))}/><small>{pointExample} Points are rounded down to whole points.</small></label><label className="switch-line"><input type="checkbox" checked={pointsExpire} onChange={e=>setPointsExpire(e.target.checked)}/> Points expire</label>{pointsExpire&&<label>Expiration period (days)<input type="number" min="1" value={expiryDays} onChange={e=>setExpiryDays(Number(e.target.value))}/></label>}</div>
    <div className="panel"><h2>Stamp Earning Rule</h2><label>Rule<select value={stampMode} onChange={e=>setStampMode(e.target.value as 'per_sale'|'per_amount')}><option value="per_sale">One stamp when sale reaches threshold</option><option value="per_amount">One stamp for every threshold amount spent</option></select></label><label>{stampMode==='per_sale'?'Minimum qualifying purchase':`Spending required per stamp (${currency})`}<input type="number" min="0.01" step="0.01" value={stampThreshold} onChange={e=>setStampThreshold(Number(e.target.value))}/></label><label>Stamps needed to redeem a stamp reward<input type="number" min="1" value={stampsRequired} onChange={e=>setStampsRequired(Number(e.target.value))}/></label><div className="info-box">{stampMode==='per_sale'?`A sale of ${money(stampThreshold,currency)} or more earns 1 stamp.`:`Every ${money(stampThreshold,currency)} spent earns 1 stamp; ${money(stampThreshold*3,currency)} earns 3.`}</div></div></section>
    <section className="panel"><div className="panel-title"><h2>Rewards</h2><button disabled={role!=='admin'} onClick={()=>setAdding(true)}><Plus size={16}/> Add Reward</button></div><Table headers={['Reward','Type','Points','Stamps','Value','Action']} rows={rewards.map(r=>[r.name,r.type.replace('_',' '),String(r.costPoints??'—'),String(r.requiredStamps??'—'),r.type==='percent_discount'?`${r.value}%`:money(r.value,currency),<div className="table-actions" key={r.id}><button disabled={role!=='admin'} onClick={()=>setEditing(r)}>Modify</button><button disabled={role!=='admin'} className="danger-link" onClick={()=>removeReward(r)}>Delete</button></div>])}/><div className="info-box"><strong>Redeem at checkout:</strong> Select the loyalty customer in New Sale, add products, choose an available reward, and complete payment.</div></section>
    <section className="panel"><h2>Loyalty Members</h2><div className="member-list">{customers.filter(c=>c.loyaltyStatus==='member').map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{c.points} points • {c.stamps} stamps</small></span><button disabled={role!=='admin'} onClick={()=>setPointCustomer(c)}>Give Points</button></div>)}</div></section><section className="panel"><h2>Enrollment</h2><div className="member-list">{customers.filter(c=>c.loyaltyStatus!=='member').map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{c.email}</small></span><button onClick={()=>enroll(c)}>Enroll Now</button></div>)}</div></section>
    {(adding||editing)&&<RewardModal reward={editing} shopId={shopId} onClose={()=>{setAdding(false);setEditing(null)}} onSaved={r=>{setRewards(rs=>editing?rs.map(x=>x.id===r.id?r:x):[r,...rs]);setAdding(false);setEditing(null);showToast('Reward saved.')}}/>}{pointCustomer&&<GivePointsModal customer={pointCustomer} onClose={()=>setPointCustomer(null)} onSaved={points=>{setCustomers(cs=>cs.map(c=>c.id===pointCustomer.id?{...c,points}:c));setPointCustomer(null);showToast('Points added and audited.')}}/>}</>
}

function RewardModal({reward,shopId,onClose,onSaved}:{reward:Reward|null;shopId:string|null;onClose:()=>void;onSaved:(r:Reward)=>void}){const[f,setF]=useState<Reward>(reward??{id:uid(),name:'',type:'fixed_discount',costPoints:100,value:5,active:true});async function save(e:FormEvent){e.preventDefault();if(supabaseConfigured&&supabase&&shopId){const payload={shop_id:shopId,name:f.name,reward_type:f.type,points_cost:f.costPoints??null,stamps_cost:f.requiredStamps??null,reward_value:f.value,product_id:f.productId??null,active:f.active};const res=reward?await supabase.from('loyalty_rewards').update(payload).eq('id',reward.id).select('id').single():await supabase.from('loyalty_rewards').insert(payload).select('id').single();if(res.error)return alert(res.error.message);f.id=res.data.id}onSaved(f)}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>{reward?'Modify Reward':'Add Reward'}</h2><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Reward name<input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label><label>Reward type<select value={f.type} onChange={e=>setF({...f,type:e.target.value as Reward['type']})}><option value="free_product">Free Product</option><option value="percent_discount">Percentage Discount</option><option value="fixed_discount">Fixed Discount</option><option value="bonus_points">Bonus Points</option></select></label><label>Points required<input min="0" type="number" value={f.costPoints??''} onChange={e=>setF({...f,costPoints:e.target.value?Number(e.target.value):undefined})}/></label><label>Stamps required<input min="0" type="number" value={f.requiredStamps??''} onChange={e=>setF({...f,requiredStamps:e.target.value?Number(e.target.value):undefined})}/></label><label>Reward value<input min="0" step="0.01" type="number" value={f.value} onChange={e=>setF({...f,value:Number(e.target.value)})}/></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn">Save Reward</button></div></form></div>}

function GivePointsModal({customer,onClose,onSaved}:{customer:Customer;onClose:()=>void;onSaved:(balance:number)=>void}){const[amount,setAmount]=useState('');const[note,setNote]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');async function save(e:FormEvent){e.preventDefault();const points=Number(amount);if(!Number.isInteger(points)||points<1||points>100000)return setError('Enter between 1 and 100,000 whole points.');if(note.trim().length<3)return setError('Enter a reason for the point adjustment.');setBusy(true);setError('');try{let balance=customer.points+points;if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('grant_customer_points',{p_customer_id:customer.id,p_points:points,p_note:note.trim()});if(error)throw error;balance=Number(data)}onSaved(balance)}catch(err){setError(err instanceof Error?err.message:'Points could not be added.')}finally{setBusy(false)}}return <div className="modal-backdrop"><form className="modal compact" onSubmit={save}><div className="panel-title"><div><h2>Give Points</h2><p className="muted">{customer.name} currently has {customer.points} points.</p></div><button type="button" onClick={onClose}>×</button></div><label>Points to add<input autoFocus required type="number" min="1" max="100000" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Reason<input required minLength={3} maxLength={200} value={note} onChange={e=>setNote(e.target.value)} placeholder="Promotion, service recovery, correction…"/></label><div className="info-box">This administrator adjustment is recorded in the customer's loyalty transaction history.</div>{error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Adding…':'Add Points'}</button></div></form></div>}

type CardKind='loyalty'|'customer'|'employee';type CardDesign='solid'|'gradient'|'elegant_border';type CardStyle={background_color:string;design_style:CardDesign}
const defaultCardStyles:Record<CardKind,CardStyle>={loyalty:{background_color:'#6F1D2A',design_style:'elegant_border'},customer:{background_color:'#7A3E1D',design_style:'gradient'},employee:{background_color:'#24334A',design_style:'solid'}}
function Cards({customers,staffName,shopName,logoUrl,shopAddress,businessNumber,role,showToast,stampsRequired}:{customers:Customer[];staffName:string;shopName:string;logoUrl:string|null;shopAddress:string;businessNumber:string;role:Role;showToast:(m:string)=>void;stampsRequired:number}){
  const[type,setType]=useState<CardKind>('loyalty');const[customerId,setCustomerId]=useState(customers.find(c=>c.loyaltyStatus==='member')?.id??customers[0]?.id??'');const[staffId,setStaffId]=useState('');const[cardId,setCardId]=useState('');const[styles,setStyles]=useState<Record<CardKind,CardStyle>>(defaultCardStyles);const[printSide,setPrintSide]=useState<'front'|'back'|'both'|null>(null);const customer=customers.find(c=>c.id===customerId);const style=styles[type]
  useEffect(()=>{if(!supabase)return;void supabase.auth.getUser().then(({data})=>setStaffId(data.user?.id??''));void supabase.rpc('get_card_styles').then(({data})=>{if(data)setStyles(current=>({...current,...data}))})},[])
  useEffect(()=>{const subject=type==='employee'?staffId:customerId;setCardId('');if(!subject)return;if(supabaseConfigured&&supabase){void supabase.rpc('get_or_create_card_id',{p_card_type:type,p_subject_id:subject}).then(({data,error})=>{if(error)showToast(error.message);else setCardId(String(data))})}else setCardId(`${type==='customer'?'CUS':type==='loyalty'?'LOY':'EMP'}-${Math.abs(hash(subject)).toString().padStart(12,'0').slice(0,12)}`)},[type,customerId,staffId])
  async function saveStyle(){if(role!=='admin')return showToast('Administrator access is required to save card styles.');if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('save_card_style',{p_card_type:type,p_background_color:style.background_color,p_design_style:style.design_style});if(error)return showToast(error.message)}showToast(`${type[0].toUpperCase()+type.slice(1)} card style saved.`)}
  function updateStyle(change:Partial<CardStyle>){setStyles(all=>({...all,[type]:{...all[type],...change}}))}
  function print(side:'front'|'back'|'both'){setPrintSide(side);document.body.classList.add('card-print-mode');window.setTimeout(()=>window.print(),100)}
  useEffect(()=>{const done=()=>{setPrintSide(null);document.body.classList.remove('card-print-mode')};window.addEventListener('afterprint',done);return()=>{window.removeEventListener('afterprint',done);document.body.classList.remove('card-print-mode')}},[])
  const presets=[['Espresso','#6B3518'],['Burgundy','#6F1D2A'],['Forest','#294C3A'],['Navy','#24334A'],['Charcoal','#343434'],['Champagne','#B98B52']]
  return <><PageHeader title="Cards"/><div className="segmented cards-tabs"><button className={type==='loyalty'?'active':''} onClick={()=>setType('loyalty')}>Loyalty Card</button><button className={type==='customer'?'active':''} onClick={()=>setType('customer')}>Customer Card</button><button className={type==='employee'?'active':''} onClick={()=>setType('employee')}>Employee Card</button></div>{type!=='employee'&&<div className="card-picker"><label>Select customer<select value={customerId} onChange={e=>setCustomerId(e.target.value)}>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label></div>}<section className="card-designer"><div className={`cards-print-area ${printSide?`print-${printSide}`:''}`}><DigitalCard side="front" kind={type} name={type==='employee'?staffName:customer?.name??'Customer'} shopName={shopName} logoUrl={logoUrl} shopAddress={shopAddress} businessNumber={businessNumber} cardId={cardId||'Preparing card ID…'} style={style} points={customer?.points} stamps={customer?.stamps}/><DigitalCard side="back" kind={type} name={type==='employee'?staffName:customer?.name??'Customer'} shopName={shopName} logoUrl={logoUrl} shopAddress={shopAddress} businessNumber={businessNumber} cardId={cardId||'Preparing card ID…'} style={style} points={customer?.points} stamps={customer?.stamps}/></div><aside className="panel card-appearance"><h2>Card Appearance</h2><label>Elegant color presets<div className="card-swatches">{presets.map(([label,color])=><button type="button" key={color} className={style.background_color===color?'selected':''} title={label} onClick={()=>updateStyle({background_color:color})}><i style={{background:color}}/><span>{label}</span></button>)}</div></label><label>Custom color<input type="color" value={style.background_color} onChange={e=>updateStyle({background_color:e.target.value.toUpperCase()})}/></label><label>Style<select value={style.design_style} onChange={e=>updateStyle({design_style:e.target.value as CardDesign})}><option value="solid">Solid</option><option value="gradient">Soft Gradient</option><option value="elegant_border">Elegant Border</option></select></label><button className="primary-btn" onClick={saveStyle} disabled={role!=='admin'}>Save Card Style</button><hr/><h2>Print Card</h2><button onClick={()=>print('front')} disabled={!cardId}><Printer size={18}/> Print Front</button><button onClick={()=>print('back')} disabled={!cardId}><Printer size={18}/> Print Back</button><button onClick={()=>print('both')} disabled={!cardId}><FileBarChart size={18}/> Save Front & Back as PDF</button><p className="muted">The PDF option places both card sides on one page. In the print dialog choose Save as PDF and disable browser headers and footers. QR and barcode values both identify card {cardId||'…'}.</p></aside></section>{type==='loyalty'&&customer&&<LoyaltyProgressCard customer={customer} required={stampsRequired}/>}</>
}

function LoyaltyProgressCard({customer,required}:{customer:Customer;required:number}){const total=Math.max(1,required);return <section className="loyalty-progress-card panel"><div><small>LOYALTY STATUS</small><h2>{customer.name}</h2><p><strong>{customer.points}</strong> points earned</p></div><div className="stamp-progress"><div>{Array.from({length:total},(_,i)=><span key={i} className={i<customer.stamps?'filled':''}>{i<customer.stamps?'★':''}</span>)}</div><strong>{customer.stamps} of {total} stamps</strong><small>{customer.stamps>=total?'Reward ready to redeem':'Collect stamps to unlock the configured reward'}</small></div></section>}

function DigitalCard({side,kind,name,shopName,logoUrl,shopAddress,businessNumber,cardId,style,points=0,stamps=0}:{side:'front'|'back';kind:CardKind;name:string;shopName:string;logoUrl:string|null;shopAddress:string;businessNumber:string;cardId:string;style:CardStyle;points?:number;stamps?:number}){const[qr,setQr]=useState('');const barcodeRef=useRef<SVGSVGElement|null>(null);useEffect(()=>{setQr('');if(cardId.startsWith('Preparing'))return;QRCode.toDataURL(cardId,{width:260,margin:1,errorCorrectionLevel:'M'}).then(setQr);if(barcodeRef.current)JsBarcode(barcodeRef.current,cardId,{format:'CODE128',displayValue:true,fontSize:12,height:48,margin:4,background:'#FFFFFF',lineColor:'#000000'})},[cardId,side]);const hex=style.background_color;const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const light=(rgb[0]*299+rgb[1]*587+rgb[2]*114)/1000>155;const ink=light?'#26170F':'#FFFFFF';const cardVars={'--card-color':hex,'--card-ink':ink} as React.CSSProperties;return <article className={`digital-card-v31 print-card-side card-${side} style-${style.design_style}`} style={cardVars}>{side==='front'?<><div className="card-front-copy"><small>{kind==='employee'?'EMPLOYEE':kind==='loyalty'?'LOYALTY MEMBER':'CUSTOMER'}</small><h2>{name}</h2><strong>Card ID: {cardId}</strong></div>{qr&&<img className="card-qr" src={qr} alt={`${cardId} QR code`}/>}<div className="card-barcode-shell"><svg className="card-barcode" ref={barcodeRef} aria-label={`${cardId} barcode`}/></div></>:<div className="card-back-content">{logoUrl?<img src={logoUrl} alt="Business logo"/>:<Store size={46}/>}<h2>{shopName}</h2><p><strong>Business No:</strong> {businessNumber||'Not configured'}</p><p>{shopAddress||'Business address not configured'}</p></div>}</article>}
function hash(s:string){let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(31,h)+s.charCodeAt(i))|0;return h}

function Sales({sales,setSales,receiptConfig,showToast,refresh}:{sales:SaleSummary[];setSales:React.Dispatch<React.SetStateAction<SaleSummary[]>>;receiptConfig:ShopReceiptConfig;showToast:(m:string)=>void;refresh:()=>Promise<void>}){
  const[receipt,setReceipt]=useState<ReceiptData|null>(null)
  const[refundReceipt,setRefundReceipt]=useState<ReceiptData|null>(null)
  const[voidReceipt,setVoidReceipt]=useState<ReceiptData|null>(null)
  const[loadingId,setLoadingId]=useState('')

  async function loadReceipt(sale:SaleSummary,force=false){
    if(!force&&sale.receipt)return sale.receipt
    if(!supabaseConfigured){
      if(sale.receipt)return sale.receipt
      showToast('Detailed adjustment tools are available for new demo sales.');return null
    }
    setLoadingId(sale.id)
    const loaded=await fetchReceipt(sale.id,receiptConfig)
    setLoadingId('')
    if(!loaded){showToast('Could not load this receipt. Run the v4 refund/void migration if needed.');return null}
    setSales(rows=>rows.map(r=>r.id===sale.id?{...r,status:loaded.status,refundedTotal:loaded.refundedTotal,receipt:loaded}:r))
    return loaded
  }
  async function viewReceipt(sale:SaleSummary){const loaded=await loadReceipt(sale);if(loaded)setReceipt(loaded)}
  async function beginRefund(sale:SaleSummary){const loaded=await loadReceipt(sale,true);if(loaded)setRefundReceipt(loaded)}
  async function beginVoid(sale:SaleSummary){const loaded=await loadReceipt(sale,true);if(loaded)setVoidReceipt(loaded)}
  async function reprint(sale:SaleSummary){
    const loaded=await loadReceipt(sale,true);if(!loaded)return
    if(supabaseConfigured&&supabase){
      const{data,error}=await supabase.rpc('log_receipt_reprint',{p_sale_id:sale.id})
      if(error){showToast(error.message);return}
      loaded.reprintCount=Number(data??loaded.reprintCount+1)
    }else loaded.reprintCount+=1
    setReceipt({...loaded});showToast(`Receipt reprint logged • copy ${loaded.reprintCount}`)
  }
  async function adjusted(result:any,base:ReceiptData){
    const status=(result?.sale_status??'completed') as SaleStatus
    const refundedTotal=Number(result?.refunded_total??base.refundedTotal)
    if(supabaseConfigured){await refresh()}
    else setSales(rows=>rows.map(r=>r.id===base.saleId?{...r,status,refundedTotal,receipt:{...base,status,refundedTotal}}:r))
    setRefundReceipt(null);setVoidReceipt(null)
    showToast(`${status==='voided'?'Sale voided':'Refund recorded'} • ${money(Number(result?.refund_total??0),receiptConfig.currency)}`)
  }

  return <><PageHeader title="Sales"/>
    <div className="info-box adjustment-note"><ShieldCheck size={18}/><span>Refunds and voids require a manager PIN and are saved to the audit trail. Card/QR payment reversals must also be completed with the external payment terminal/provider until payment processing is integrated.</span></div>
    <section className="panel"><Table headers={['Receipt','Time','Customer','Items','Payment','Original','Refunded','Net','Status','Action']} rows={sales.map(s=>[
      receiptNo(s.receiptNumber),s.time,s.customerName||'Guest',s.items,s.payment,money(s.total,receiptConfig.currency),
      s.refundedTotal>0?money(s.refundedTotal,receiptConfig.currency):'—',money(netSaleTotal(s),receiptConfig.currency),
      <span key={`status-${s.id}`} className={`sale-status ${s.status}`}>{statusLabel(s.status)}</span>,
      <div className="table-actions sale-actions" key={s.id}>
        <button onClick={()=>viewReceipt(s)} disabled={loadingId===s.id}>{loadingId===s.id?'Loading…':'View'}</button>
        <button onClick={()=>reprint(s)} disabled={loadingId===s.id}><Printer size={14}/> Reprint</button>
        <button onClick={()=>beginRefund(s)} disabled={loadingId===s.id||s.status==='refunded'||s.status==='voided'}><RotateCcw size={14}/> Refund</button>
        <button className="danger-link" onClick={()=>beginVoid(s)} disabled={loadingId===s.id||s.status!=='completed'}><Ban size={14}/> Void</button>
      </div>
    ])}/></section>
    {receipt&&<ReceiptModal receipt={receipt} onClose={()=>setReceipt(null)}/>}
    {refundReceipt&&<RefundModal receipt={refundReceipt} showToast={showToast} onClose={()=>setRefundReceipt(null)} onDone={r=>adjusted(r,refundReceipt)}/>}
    {voidReceipt&&<VoidModal receipt={voidReceipt} showToast={showToast} onClose={()=>setVoidReceipt(null)} onDone={r=>adjusted(r,voidReceipt)}/>}
  </>
}

function RefundModal({receipt,onClose,onDone,showToast}:{receipt:ReceiptData;onClose:()=>void;onDone:(r:any)=>void;showToast:(m:string)=>void}){
  const[mode,setMode]=useState<'partial'|'full'>('partial')
  const[qty,setQty]=useState<Record<string,number>>({})
  const[restock,setRestock]=useState(false)
  const[reason,setReason]=useState('')
  const[managerPin,setManagerPin]=useState('')
  const[paymentNote,setPaymentNote]=useState('')
  const[busy,setBusy]=useState(false)
  const remainingLines=receipt.items.map((i,idx)=>({...i,key:i.saleItemId??`demo-${idx}`,remaining:Math.max(0,i.qty-(i.refundedQty??0))})).filter(i=>i.remaining>0)
  const selectedGross=remainingLines.reduce((a,i)=>a+(mode==='full'?i.remaining:Math.min(i.remaining,qty[i.key]??0))*i.unitPrice,0)
  const estimate=mode==='full'?Math.max(0,receipt.total-receipt.refundedTotal):(receipt.subtotal>0?Math.min(receipt.total-receipt.refundedTotal,receipt.total*(selectedGross/receipt.subtotal)):0)

  async function submit(e:FormEvent){
    e.preventDefault()
    if(!reason.trim())return showToast('Enter a refund reason.')
    if(managerPin.length<4)return showToast('Manager PIN is required.')
    const items=mode==='partial'?remainingLines.filter(i=>(qty[i.key]??0)>0).map(i=>({sale_item_id:i.saleItemId,qty:Math.min(i.remaining,qty[i.key]??0)})):[]
    if(mode==='partial'&&!items.length)return showToast('Select at least one item quantity to refund.')
    setBusy(true)
    if(supabaseConfigured&&supabase){
      const{data,error}=await supabase.rpc('process_sale_adjustment',{p_sale_id:receipt.saleId,p_mode:mode,p_items:items,p_restock:restock,p_reason:reason.trim(),p_manager_pin:managerPin,p_payment_note:paymentNote||null})
      setBusy(false);if(error){showToast(error.message);return}onDone(data);return
    }
    const refundTotal=Number(estimate.toFixed(2));const newRefunded=Math.min(receipt.total,receipt.refundedTotal+refundTotal)
    setBusy(false);onDone({sale_status:newRefunded>=receipt.total-0.01?'refunded':'partially_refunded',refund_total:refundTotal,refunded_total:newRefunded})
  }
  return <div className="modal-backdrop"><form className="modal refund-modal" onSubmit={submit}>
    <div className="panel-title"><div><h2>Refund {receiptNo(receipt.receiptNumber)}</h2><p className="muted">Original total {money(receipt.total,receipt.currency)} • already refunded {money(receipt.refundedTotal,receipt.currency)}</p></div><button type="button" onClick={onClose}>×</button></div>
    <div className="segmented"><button type="button" className={mode==='partial'?'active':''} onClick={()=>setMode('partial')}>Partial Refund</button><button type="button" className={mode==='full'?'active':''} onClick={()=>setMode('full')}>Refund Remaining Sale</button></div>
    {mode==='partial'?<div className="refund-items">{remainingLines.map(i=><div className="refund-item" key={i.key}><div><strong>{i.name}</strong><small>{i.remaining} remaining • {money(i.unitPrice,receipt.currency)} each</small></div><label>Qty<input type="number" min="0" max={i.remaining} step="1" value={qty[i.key]??0} onChange={e=>setQty({...qty,[i.key]:Math.max(0,Math.min(i.remaining,Number(e.target.value)))})}/></label></div>)}</div>:<div className="info-box">All remaining refundable quantities will be included. Previously refunded quantities are not refunded again.</div>}
    <div className="refund-estimate"><span>Estimated POS refund</span><strong>{money(estimate,receipt.currency)}</strong></div>
    <label className="switch-line"><input type="checkbox" checked={restock} onChange={e=>setRestock(e.target.checked)}/> Return refunded items to inventory</label>
    <label>Reason<textarea rows={2} required value={reason} onChange={e=>setReason(e.target.value)} placeholder="Customer return, duplicate charge, wrong item…"/></label>
    {receipt.payment!=='CASH'&&<div className="warning-box">This POS records the refund but does not send money back through the {receipt.payment} provider. Complete the financial refund on the payment terminal/provider too.</div>}
    <label>External refund/reference note (optional)<input value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder="Terminal refund ID or note"/></label>
    <label>Manager PIN<input type="password" inputMode="numeric" autoComplete="off" value={managerPin} onChange={e=>setManagerPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="4–8 digit manager PIN"/></label>
    <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy||estimate<=0}>{busy?'Processing…':'Confirm Refund'}</button></div>
  </form></div>
}

function VoidModal({receipt,onClose,onDone,showToast}:{receipt:ReceiptData;onClose:()=>void;onDone:(r:any)=>void;showToast:(m:string)=>void}){
  const[reason,setReason]=useState('')
  const[managerPin,setManagerPin]=useState('')
  const[paymentNote,setPaymentNote]=useState('')
  const[busy,setBusy]=useState(false)
  async function submit(e:FormEvent){
    e.preventDefault();if(!reason.trim())return showToast('Enter a void reason.');if(managerPin.length<4)return showToast('Manager PIN is required.')
    setBusy(true)
    if(supabaseConfigured&&supabase){
      const{data,error}=await supabase.rpc('process_sale_adjustment',{p_sale_id:receipt.saleId,p_mode:'void',p_items:[],p_restock:true,p_reason:reason.trim(),p_manager_pin:managerPin,p_payment_note:paymentNote||null})
      setBusy(false);if(error){showToast(error.message);return}onDone(data);return
    }
    setBusy(false);onDone({sale_status:'voided',refund_total:receipt.total,refunded_total:receipt.total})
  }
  return <div className="modal-backdrop"><form className="modal void-modal" onSubmit={submit}>
    <div className="panel-title"><div><h2>Void Sale {receiptNo(receipt.receiptNumber)}</h2><p className="muted">Use Void for a completed sale entered by mistake. All sale quantities are returned to inventory and loyalty activity is reversed.</p></div><button type="button" onClick={onClose}>×</button></div>
    <div className="danger-box"><Ban size={20}/><div><strong>Void {money(receipt.total,receipt.currency)} sale?</strong><span>This action remains in the audit history and cannot be deleted.</span></div></div>
    {receipt.payment!=='CASH'&&<div className="warning-box">Voiding the POS record does not automatically reverse the {receipt.payment} payment. Cancel/refund it on the external terminal/provider as well.</div>}
    <label>Reason<textarea rows={2} required value={reason} onChange={e=>setReason(e.target.value)} placeholder="Duplicate sale, wrong payment method, cashier error…"/></label>
    <label>External cancellation/reference note (optional)<input value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} /></label>
    <label>Manager PIN<input type="password" inputMode="numeric" autoComplete="off" value={managerPin} onChange={e=>setManagerPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="4–8 digit manager PIN"/></label>
    <div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="danger-btn" disabled={busy}>{busy?'Voiding…':'Void Sale'}</button></div>
  </form></div>
}

type ManagementReport={summary:{gross_sales:number;discounts:number;tax:number;refunds:number;net_sales:number;transactions:number};payments:{payment_method:string;gross:number;refunds:number;net:number;transactions:number}[];drawers:{sessions:number;expected:number;counted:number;variance:number};recent_drawers:{id:string;opened_at:string;closed_at:string;expected_amount:number;counted_amount:number;variance:number;opened_by_name:string;closed_by_name:string}[]}
function Reports({sales,products,currency,role}:{sales:SaleSummary[];products:Product[];currency:string;role:Role}){
  const today=new Date().toISOString().slice(0,10);const monthStart=`${today.slice(0,8)}01`
  const[from,setFrom]=useState(monthStart);const[to,setTo]=useState(today);const[busy,setBusy]=useState(false);const[report,setReport]=useState<ManagementReport|null>(null)
  const localRevenue=sales.reduce((a,s)=>a+netSaleTotal(s),0);const localRefunds=sales.reduce((a,s)=>a+(s.refundedTotal??0),0);const stockValue=products.reduce((a,p)=>a+p.price*p.stock,0)
  async function load(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_management_report',{p_from:`${from}T00:00:00`,p_to:`${to}T23:59:59.999`});if(error){setBusy(false);alert(error.message);return}setReport(data as ManagementReport)}else{const methods=['CASH','CARD','QR'].map(method=>{const rows=sales.filter(s=>s.payment===method);const gross=rows.reduce((a,s)=>a+s.total,0),refunds=rows.reduce((a,s)=>a+s.refundedTotal,0);return{payment_method:method.toLowerCase(),gross,refunds,net:gross-refunds,transactions:rows.length}});setReport({summary:{gross_sales:sales.reduce((a,s)=>a+s.total,0),discounts:0,tax:0,refunds:localRefunds,net_sales:localRevenue,transactions:sales.length},payments:methods,drawers:{sessions:0,expected:0,counted:0,variance:0},recent_drawers:[]})}setBusy(false)}
  useEffect(()=>{if(role==='admin')void load()},[])
  function exportCsv(){if(!report)return;const rows=[['ChubbyLu Management Report'],['From',from,'To',to],[],['Summary','Amount'],['Gross Sales',report.summary.gross_sales],['Discounts',report.summary.discounts],['Tax',report.summary.tax],['Refunds',report.summary.refunds],['Net Sales',report.summary.net_sales],[],['Payment','Gross','Refunds','Net','Transactions'],...report.payments.map(p=>[p.payment_method,p.gross,p.refunds,p.net,p.transactions]),[],['Drawer sessions','Expected','Counted','Variance'],[report.drawers.sessions,report.drawers.expected,report.drawers.counted,report.drawers.variance]];const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`chubbylu-management-report-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)}
  if(role!=='admin')return <><PageHeader title="Reports"/><div className="info-box">Management access is required for financial, payment, and daily-cash reports.</div></>
  const summary=report?.summary??{gross_sales:localRevenue,discounts:0,tax:0,refunds:localRefunds,net_sales:localRevenue,transactions:sales.length}
  return <><PageHeader title="Management Reports"><div className="report-actions"><button onClick={exportCsv} disabled={!report}><Download size={17}/> CSV</button><button onClick={()=>window.print()}><Printer size={17}/> Print / PDF</button></div></PageHeader>
    <section className="panel report-filter"><div className="form-grid"><label>From<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></label></div><button className="primary-btn small" onClick={load} disabled={busy||!from||!to}>{busy?'Loading…':'Run Report'}</button></section>
    <section className="stats-grid"><Stat label="Gross Sales" value={money(Number(summary.gross_sales),currency)} sub="Before refunds"/><Stat label="Refunds / Voids" value={money(Number(summary.refunds),currency)} sub="Recorded adjustments"/><Stat label="Net Sales" value={money(Number(summary.net_sales),currency)} sub="Gross less refunds"/><Stat label="Transactions" value={String(summary.transactions)} sub={`${from} to ${to}`}/></section>
    <section className="two-col report-grid"><div className="panel"><h2>Payment Breakdown</h2>{report?<Table headers={['Method','Transactions','Gross','Refunds','Net']} rows={report.payments.map(p=>[p.payment_method.toUpperCase(),String(p.transactions),money(Number(p.gross),currency),money(Number(p.refunds),currency),money(Number(p.net),currency)])}/>:<p className="muted">Run the report to load payment totals.</p>}</div><div className="panel"><h2>Daily Cash Reconciliation</h2><div className="report-metrics"><span><small>Closed days/shifts</small><strong>{report?.drawers.sessions??0}</strong></span><span><small>Expected</small><strong>{money(Number(report?.drawers.expected??0),currency)}</strong></span><span><small>Counted</small><strong>{money(Number(report?.drawers.counted??0),currency)}</strong></span><span><small>Total variance</small><strong>{money(Number(report?.drawers.variance??0),currency)}</strong></span></div></div></section>
    <section className="panel"><h2>Drawer Shift History</h2>{report?.recent_drawers.length?<Table headers={['Opened','Closed','Expected','Counted','Variance','Management']} rows={report.recent_drawers.map(d=>[new Date(d.opened_at).toLocaleString(),new Date(d.closed_at).toLocaleString(),money(Number(d.expected_amount),currency),money(Number(d.counted_amount),currency),money(Number(d.variance),currency),`${d.opened_by_name} → ${d.closed_by_name}`])}/>:<p className="muted">No closed drawers in this date range.</p>}</section>
    <section className="panel"><h2>Inventory Context</h2><p className="muted">Current retail stock value is {money(stockValue,currency)}. This is a live inventory estimate and is not included in sales revenue.</p></section></>}

type ProfitReport={summary:{net_sales:number;net_cogs:number;gross_profit:number;expenses:number;operating_result:number;gross_margin_percent:number;costed_items:number;uncosted_items:number};products:{product_name:string;qty_sold:number;net_revenue:number;net_cost:number;gross_profit:number;margin_percent:number}[]}
function ProfitabilityPage({role,currency,showToast}:{role:Role;currency:string;showToast:(m:string)=>void}){const today=new Date().toISOString().slice(0,10);const[from,setFrom]=useState(`${today.slice(0,8)}01`);const[to,setTo]=useState(today);const[report,setReport]=useState<ProfitReport|null>(null);const[busy,setBusy]=useState(false);async function load(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_profitability_report',{p_from:from,p_to:to});if(error){setBusy(false);return showToast(error.message)}setReport(data as ProfitReport)}else setReport({summary:{net_sales:0,net_cogs:0,gross_profit:0,expenses:0,operating_result:0,gross_margin_percent:0,costed_items:0,uncosted_items:0},products:[]});setBusy(false)}useEffect(()=>{if(role==='admin')void load()},[role]);function csv(){if(!report)return;const data=[['Profitability Report',from,to],[],['Net Sales',report.summary.net_sales],['Net COGS',report.summary.net_cogs],['Gross Profit',report.summary.gross_profit],['Expenses',report.summary.expenses],['Operating Result',report.summary.operating_result],[],['Product','Qty Sold','Net Revenue','Net Cost','Gross Profit','Margin %'],...report.products.map(p=>[p.product_name,p.qty_sold,p.net_revenue,p.net_cost,p.gross_profit,p.margin_percent])];const body=data.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([body],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`chubbylu-profitability-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)}if(role!=='admin')return <><PageHeader title="Profitability"/><div className="info-box">Administrator access is required.</div></>;const s=report?.summary;return <><PageHeader title="Profitability"><div className="report-actions"><button onClick={csv} disabled={!report}><Download size={17}/> CSV</button><button onClick={()=>window.print()}><Printer size={17}/> Print / PDF</button></div></PageHeader><div className="info-box drawer-security"><ShieldCheck size={18}/><span>Product cost is snapshotted at checkout. Later cost changes do not rewrite completed sales. Older sales without cost snapshots may show zero cost and are counted as uncosted.</span></div><section className="panel report-filter"><div className="form-grid"><label>From<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></label></div><button className="primary-btn small" onClick={load} disabled={busy}>{busy?'Loading…':'Run Profit Report'}</button></section><section className="stats-grid"><Stat label="Net Sales" value={money(Number(s?.net_sales??0),currency)} sub="After refunds"/><Stat label="Cost of Goods" value={money(Number(s?.net_cogs??0),currency)} sub="Cost snapshots after returns"/><Stat label="Gross Profit" value={money(Number(s?.gross_profit??0),currency)} sub={`${Number(s?.gross_margin_percent??0).toFixed(1)}% margin`}/><Stat label="Operating Result" value={money(Number(s?.operating_result??0),currency)} sub={`After ${money(Number(s?.expenses??0),currency)} expenses`}/></section>{(s?.uncosted_items??0)>0&&<div className="warning-box">{s?.uncosted_items} sold line item(s) have no cost snapshot. Profit may be overstated until all products have unit costs and new sales are recorded.</div>}<section className="panel"><h2>Product Profitability</h2>{report?.products.length?<Table headers={['Product','Qty Sold','Net Revenue','Net Cost','Gross Profit','Margin']} rows={report.products.map(p=>[p.product_name,String(p.qty_sold),money(Number(p.net_revenue),currency),money(Number(p.net_cost),currency),money(Number(p.gross_profit),currency),`${Number(p.margin_percent).toFixed(1)}%`])}/>:<p className="muted">No sales in this date range.</p>}</section></>}

type StaffRow={user_id:string;display_name:string;email:string|null;role:Role;active:boolean;pin_configured:boolean;must_change_password:boolean;password_initialized_at:string|null;created_at:string}
type StaffInviteRow={id:string;email:string;display_name:string;role:Role;token:string;status:string;expires_at:string;created_at:string}
function StaffManagement({role,showToast}:{role:Role;showToast:(m:string)=>void}){
  const[staff,setStaff]=useState<StaffRow[]>([]);const[invites,setInvites]=useState<StaffInviteRow[]>([]);const[email,setEmail]=useState('');const[name,setName]=useState('');const[inviteRole,setInviteRole]=useState<Role>('employee');const[temporaryPassword,setTemporaryPassword]=useState('');const[confirmTemporary,setConfirmTemporary]=useState('');const[createdCredential,setCreatedCredential]=useState<{name:string;email:string;password:string}|null>(null);const[resetTarget,setResetTarget]=useState<StaffRow|null>(null);const[busy,setBusy]=useState(false);const[showInvitations,setShowInvitations]=useState(false)
  async function load(){if(role!=='admin'||!supabaseConfigured||!supabase)return;const{data,error}=await supabase.rpc('get_staff_management');if(error)return showToast(error.message);setStaff(data?.staff??[]);setInvites(data?.invitations??[])}
  useEffect(()=>{void load()},[role])
  function generatePassword(){const lower='abcdefghijkmnopqrstuvwxyz',upper='ABCDEFGHJKLMNPQRSTUVWXYZ',digits='23456789',symbols='!@#$%*-_';const all=lower+upper+digits+symbols;const pick=(chars:string)=>chars[crypto.getRandomValues(new Uint32Array(1))[0]%chars.length];const chars=[pick(lower),pick(upper),pick(digits),pick(symbols),...Array.from({length:12},()=>pick(all))];for(let i=chars.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}const value=chars.join('');setTemporaryPassword(value);setConfirmTemporary(value)}
  async function directCreate(e:FormEvent){e.preventDefault();if(!email.trim()||!name.trim())return;if(temporaryPassword!==confirmTemporary)return showToast('Temporary passwords do not match.');if(temporaryPassword.length<12||!/[a-z]/.test(temporaryPassword)||!/[A-Z]/.test(temporaryPassword)||!/[0-9]/.test(temporaryPassword))return showToast('Temporary password does not meet the security requirements.');setBusy(true);if(!supabaseConfigured||!supabase){setCreatedCredential({name:name.trim(),email:email.trim(),password:temporaryPassword});showToast('Demo staff account created.')}else{const{data,error}=await supabase.functions.invoke('create-staff-account',{body:{email:email.trim(),display_name:name.trim(),role:inviteRole,temporary_password:temporaryPassword,confirm_password:confirmTemporary}});if(error){let message=error.message;try{const payload=await (error as any).context?.json();if(payload?.error)message=payload.error}catch{/* retain transport error */}setBusy(false);return showToast(userFacingText(message))}setCreatedCredential({name:data.display_name,email:data.email,password:temporaryPassword});await load();showToast('Confirmed staff account created.')}setEmail('');setName('');setTemporaryPassword('');setConfirmTemporary('');setBusy(false)}
  async function invite(e:FormEvent){e.preventDefault();if(!email.trim()||!name.trim())return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('create_staff_invitation',{p_email:email.trim(),p_display_name:name.trim(),p_role:inviteRole});if(error){setBusy(false);return showToast(error.message)}const link=`${window.location.origin}${window.location.pathname}?staff_invite=${data.token}`;await navigator.clipboard?.writeText(link).catch(()=>undefined);showToast('Invitation created and link copied.');await load()}else{showToast('Demo invitation created.')}setEmail('');setName('');setBusy(false)}
  async function update(userId:string,nextRole:Role,active:boolean){if(!confirm(`Save ${nextRole} / ${active?'active':'inactive'} access for this staff member?`))return;if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('update_staff_access',{p_user_id:userId,p_role:nextRole,p_active:active});if(error)return showToast(error.message);await load()}else setStaff(rows=>rows.map(s=>s.user_id===userId?{...s,role:nextRole,active}:s));showToast('Staff access updated and audited.')}
  function invitationLink(token:string){return `${window.location.origin}${window.location.pathname}?staff_invite=${token}`}
  if(role!=='admin')return <><PageHeader title="Staff"/><div className="info-box">Administrator access is required.</div></>
  return <><PageHeader title="Staff & Access"/><div className="info-box drawer-security"><ShieldCheck size={18}/><span>Administrators can create confirmed staff accounts without email delivery. Temporary passwords are never stored by CounterNest and must be replaced at first sign-in. All access changes are audited.</span></div>
    {createdCredential&&<section className="panel credential-once"><div><h2>Account created — copy this now</h2><p><strong>{createdCredential.name}</strong> can sign in with <strong>{createdCredential.email}</strong> and the temporary password below.</p><code>{createdCredential.password}</code><small>This password is shown only here. Give it to the staff member privately; do not email or post it publicly.</small></div><div className="credential-actions"><button onClick={()=>navigator.clipboard?.writeText(createdCredential.password).then(()=>showToast('Temporary password copied.'))}>Copy Password</button><button className="primary-btn" onClick={()=>setCreatedCredential(null)}>Done</button></div></section>}
    <section className="two-col staff-grid"><form className="panel staff-invite" onSubmit={directCreate}><h2>Create Staff Account</h2><label>Display name<input required value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></label><label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Role<select value={inviteRole} onChange={e=>setInviteRole(e.target.value as Role)}><option value="employee">Employee</option><option value="admin">Administrator</option></select></label><label>Temporary password<div className="password-generator"><PasswordInput required minLength={12} autoComplete="new-password" value={temporaryPassword} onChange={e=>setTemporaryPassword(e.target.value)}/><button type="button" onClick={generatePassword}>Generate</button></div></label><label>Confirm temporary password<PasswordInput required minLength={12} autoComplete="new-password" value={confirmTemporary} onChange={e=>setConfirmTemporary(e.target.value)}/></label><button className="primary-btn" disabled={busy}>{busy?'Creating…':'Create Confirmed Account'}</button><small className="muted">No email is sent. Share the temporary password privately. The staff member must create a new password at first sign-in.</small></form><div className="panel"><h2>Access Summary</h2><div className="report-metrics"><span><small>Active staff</small><strong>{staff.filter(s=>s.active).length}</strong></span><span><small>Administrators</small><strong>{staff.filter(s=>s.active&&s.role==='admin').length}</strong></span><span><small>Employees</small><strong>{staff.filter(s=>s.active&&s.role==='employee').length}</strong></span><span><small>Password change due</small><strong>{staff.filter(s=>s.must_change_password).length}</strong></span></div></div></section>
    <section className="panel"><h2>Staff Directory</h2>{staff.length?<div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Password</th><th>Manager PIN</th><th>Action</th></tr></thead><tbody>{staff.map(s=><StaffAccessRow key={s.user_id} staff={s} onSave={update} onReset={()=>setResetTarget(s)}/>)}</tbody></table></div>:<p className="muted">No staff profiles loaded.</p>}</section>
    <section className="panel invitation-fallback"><button type="button" className="section-toggle" onClick={()=>setShowInvitations(v=>!v)}>{showInvitations?'Hide':'Show'} email invitation fallback</button>{showInvitations&&<><form className="staff-invite compact" onSubmit={invite}><h2>Create Email Invitation</h2><p className="muted">Use this only when Supabase email delivery is configured. It uses the name, email, and role entered above.</p><button className="primary-btn" disabled={busy||!email.trim()||!name.trim()}>{busy?'Creating…':'Create Invitation from Form Above'}</button></form><h2>Invitation History</h2>{invites.length?<Table headers={['Name','Email','Role','Status','Expires','Action']} rows={invites.map(i=>[i.display_name,i.email,i.role,i.status,new Date(i.expires_at).toLocaleString(),<button key={i.id} disabled={i.status!=='pending'} onClick={()=>navigator.clipboard?.writeText(invitationLink(i.token)).then(()=>showToast('Invitation link copied.'))}>Copy Link</button>])}/>:<p className="muted">No invitations yet.</p>}</>}</section>  {resetTarget&&<ResetStaffPasswordModal staff={resetTarget} onClose={()=>setResetTarget(null)} onSaved={async credential=>{setResetTarget(null);setCreatedCredential({name:credential.name,email:credential.email,password:credential.password});await load();showToast('Temporary password reset. The staff member must change it at next sign-in.')}}/>}</>

}
function StaffAccessRow({staff,onSave,onReset}:{staff:StaffRow;onSave:(id:string,role:Role,active:boolean)=>void;onReset:()=>void}){const[nextRole,setNextRole]=useState(staff.role);const[active,setActive]=useState(staff.active);return <tr><td>{staff.display_name}</td><td>{staff.email??'—'}</td><td><select value={nextRole} onChange={e=>setNextRole(e.target.value as Role)}><option value="employee">Employee</option><option value="admin">Administrator</option></select></td><td><label className="staff-active"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>{active?'Active':'Inactive'}</label></td><td>{staff.must_change_password?'Change required':'Private password set'}</td><td>{staff.pin_configured?'Configured':'Not set'}</td><td><div className="table-actions"><button onClick={()=>onSave(staff.user_id,nextRole,active)}>Save</button><button onClick={onReset}>Reset Password</button></div></td></tr>}

function ResetStaffPasswordModal({staff,onClose,onSaved}:{staff:StaffRow;onClose:()=>void;onSaved:(credential:{name:string;email:string;password:string})=>Promise<void>}){
  const[password,setPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[busy,setBusy]=useState(false)
  function generate(){const lower='abcdefghijkmnopqrstuvwxyz',upper='ABCDEFGHJKLMNPQRSTUVWXYZ',digits='23456789',symbols='!@#$%*-_';const all=lower+upper+digits+symbols;const pick=(chars:string)=>chars[crypto.getRandomValues(new Uint32Array(1))[0]%chars.length];const chars=[pick(lower),pick(upper),pick(digits),pick(symbols),...Array.from({length:12},()=>pick(all))];for(let i=chars.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}const value=chars.join('');setPassword(value);setConfirmPassword(value)}
  async function save(e:FormEvent){e.preventDefault();if(password!==confirmPassword)return alert('Temporary passwords do not match.');if(password.length<12||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return alert('Use at least 12 characters with upper-case, lower-case, and a number.');setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.functions.invoke('reset-staff-password',{body:{target_user_id:staff.user_id,temporary_password:password,confirm_password:confirmPassword}});if(error){let message=error.message;try{const payload=await (error as any).context?.json();if(payload?.error)message=payload.error}catch{}setBusy(false);alert(message);return}if(!data?.complete){setBusy(false);alert('Password reset did not complete.');return}}await onSaved({name:staff.display_name,email:staff.email??'',password});setBusy(false)}
  return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><div><h2>Reset Staff Password</h2><p className="muted">{staff.display_name} • {staff.email??'No email'}</p></div><button type="button" onClick={onClose}><X size={18}/></button></div><div className="warning-box">This immediately replaces the staff member’s current password. They must create a private password at their next sign-in.</div><label>Temporary password<div className="password-generator"><PasswordInput required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={generate}>Generate</button></div></label><label>Confirm temporary password<PasswordInput required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Resetting…':'Reset Password'}</button></div></form></div>
}

type AuditRow={id:string;event_time:string;category:string;action:string;actor_name:string;target:string;details:Record<string,unknown>}
function AuditLog({role,showToast}:{role:Role;showToast:(m:string)=>void}){
  const today=new Date().toISOString().slice(0,10);const[from,setFrom]=useState(`${today.slice(0,8)}01`);const[to,setTo]=useState(today);const[category,setCategory]=useState('all');const[query,setQuery]=useState('');const[rows,setRows]=useState<AuditRow[]>([]);const[busy,setBusy]=useState(false)
  async function load(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_audit_log',{p_from:`${from}T00:00:00`,p_to:`${to}T23:59:59.999`,p_limit:500});if(error){setBusy(false);return showToast(error.message)}setRows(data??[])}else setRows([{id:'demo',event_time:new Date().toISOString(),category:'staff',action:'access_updated',actor_name:'ChubbyLu Admin',target:'Employee account',details:{role:'employee',active:true}}]);setBusy(false)}
  useEffect(()=>{if(role==='admin')void load()},[role])
  const visible=rows.filter(r=>(category==='all'||r.category===category)&&(!query.trim()||`${r.actor_name} ${r.target} ${r.action} ${JSON.stringify(r.details)}`.toLowerCase().includes(query.toLowerCase())))
  function details(d:Record<string,unknown>){return Object.entries(d??{}).filter(([,v])=>v!==null&&v!=='').map(([k,v])=>`${k.replace(/_/g,' ')}: ${String(v)}`).join(' • ')||'—'}
  function exportCsv(){const data=[['Time','Category','Action','Staff','Target','Details'],...visible.map(r=>[r.event_time,r.category,r.action,r.actor_name,r.target,details(r.details)])];const csv=data.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`chubbylu-audit-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)}
  if(role!=='admin')return <><PageHeader title="Audit Log"/><div className="info-box">Administrator access is required.</div></>
  return <><PageHeader title="Audit Log"><div className="report-actions"><button onClick={exportCsv} disabled={!visible.length}><Download size={17}/> CSV</button><button onClick={()=>window.print()}><Printer size={17}/> Print / PDF</button></div></PageHeader><div className="info-box drawer-security"><ShieldCheck size={18}/><span>This read-only history is assembled from protected operational records. Audit entries cannot be edited or deleted through the POS.</span></div>
    <section className="panel audit-filters"><div className="form-grid"><label>From<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option><option value="staff">Staff access</option><option value="cash_drawer">Cash drawer</option><option value="expense">Expenses</option><option value="sale_adjustment">Refunds & voids</option><option value="inventory">Inventory</option><option value="receipt">Receipt reprints</option><option value="catalogue_request">Catalogue requests / contact overrides</option></select></label><label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Staff, target, reason…"/></label></div><button className="primary-btn small" onClick={load} disabled={busy}>{busy?'Loading…':'Load Audit'}</button></section>
    <section className="stats-grid three"><Stat label="Events Loaded" value={String(rows.length)} sub="Maximum 500 per request"/><Stat label="Visible Results" value={String(visible.length)} sub="After local filters"/><Stat label="Categories" value={String(new Set(rows.map(r=>r.category)).size)} sub={`${from} to ${to}`}/></section>
    <section className="panel"><Table headers={['Time','Category','Action','Staff','Target','Details']} rows={visible.map(r=>[new Date(r.event_time).toLocaleString(),r.category.replace(/_/g,' '),r.action.replace(/_/g,' '),r.actor_name,r.target,details(r.details)])}/>{!visible.length&&<p className="muted">No audit entries match these filters.</p>}</section></>
}

type BackupHistoryRow={id:string;requested_at:string;requested_by_name:string;schema_version:string}
function BackupPage({role,shopName,showToast}:{role:Role;shopName:string;showToast:(m:string)=>void}){const[history,setHistory]=useState<BackupHistoryRow[]>([]);const[busy,setBusy]=useState(false);async function load(){if(role!=='admin'||!supabaseConfigured||!supabase)return;const{data,error}=await supabase.rpc('get_backup_history');if(error)return showToast(error.message);setHistory(data??[])}useEffect(()=>{void load()},[role]);function download(name:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}async function createBackup(){if(!confirm('Create and download a business backup? Store the file securely because it contains customer and operational data.'))return;setBusy(true);let backup:any;if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('export_business_backup');if(error){setBusy(false);return showToast(error.message)}backup=data}else backup={schema_version:'0.17.0-demo',exported_at:new Date().toISOString(),shop:{name:shopName},notice:'Demo-mode backup contains no Supabase data.'};const json=JSON.stringify(backup,null,2);const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json));const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');const stamp=new Date().toISOString().replace(/[:.]/g,'-');const safe=shopName.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'business';download(`${safe}-backup-${stamp}.json`,json,'application/json');download(`${safe}-backup-${stamp}.sha256`,`${hash}  ${safe}-backup-${stamp}.json\r\n`,'text/plain');await load();setBusy(false);showToast('Backup and SHA-256 integrity file downloaded.')}if(role!=='admin')return <><PageHeader title="Backup"/><div className="info-box">Administrator access is required.</div></>;return <><PageHeader title="Business Backup"><button className="primary-btn small" onClick={createBackup} disabled={busy}><Download size={17}/>{busy?'Preparing…':'Download Backup'}</button></PageHeader><div className="danger-box"><ShieldCheck size={20}/><div><strong>Backups contain personal and business data.</strong><span>Store them in an encrypted, access-controlled location. Do not email them casually or place them in a public cloud folder.</span></div></div><section className="three-col backup-cards"><div className="panel"><h2>Included</h2><ul className="plain-list"><li>Shop configuration and catalog</li><li>Customers and loyalty records</li><li>Sales, refunds, and inventory history</li><li>Drawers, expenses, suppliers, orders, and production</li><li>Variants, bundles, pre-orders, conversions and catalogue history</li></ul></div><div className="panel"><h2>Excluded</h2><ul className="plain-list"><li>Passwords and authentication secrets</li><li>Manager PIN hashes</li><li>Supabase keys and environment variables</li><li>Device-local hardware settings</li></ul></div><div className="panel"><h2>Integrity</h2><p className="muted">Each JSON backup includes a matching SHA-256 file. Use it to confirm the backup has not changed or become corrupted.</p></div></section><section className="panel"><h2>Backup Export History</h2>{history.length?<Table headers={['Requested','Administrator','Schema']} rows={history.map(h=>[new Date(h.requested_at).toLocaleString(),h.requested_by_name,h.schema_version])}/>:<p className="muted">No server backup exports have been requested yet.</p>}<small className="muted">This records export requests, not where downloaded files are stored.</small></section><section className="panel"><h2>Restore Readiness</h2><p className="muted">Automatic restore is intentionally not exposed in the POS. Restore operations can overwrite live records and must be performed by an administrator in a controlled Supabase test environment before production recovery.</p></section></>}

type ReadinessCheck={id:string;label:string;status:'pass'|'warning'|'fail';detail:string}
function LaunchReadiness({role,showToast,standalone,online}:{role:Role;showToast:(m:string)=>void;standalone:boolean;online:boolean}){const[serverChecks,setServerChecks]=useState<ReadinessCheck[]>([]);const[busy,setBusy]=useState(false);const[lastRun,setLastRun]=useState('');async function run(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_launch_readiness');if(error){setBusy(false);return showToast(error.message)}setServerChecks(data??[])}else setServerChecks([{id:'demo',label:'Demo mode',status:'warning',detail:'Configure Supabase before production launch.'}]);setLastRun(new Date().toISOString());setBusy(false)}useEffect(()=>{void run()},[role]);const printer=localStorage.getItem('counternest.printerProfile')||localStorage.getItem('chubbylu.printerProfile')||'system';const deviceChecks:ReadinessCheck[]=[{id:'online',label:'Cloud connectivity',status:online?'pass':'fail',detail:online?'This device is online.':'Reconnect before operating the POS.'},{id:'browser',label:'Browser access',status:'pass',detail:standalone?'Running as an installed browser app.':'Running in a browser; installation is optional.'},{id:'printer',label:'Receipt fallback',status:printer?'pass':'warning',detail:printer==='system'?'System Print fallback is configured.':`${printer} profile saved; physically test it and retain System Print fallback.`}];const checks=[...serverChecks,...deviceChecks];const failures=checks.filter(c=>c.status==='fail').length,warnings=checks.filter(c=>c.status==='warning').length;const launchStatus=failures?'Not Ready':warnings?'Ready with Warnings':'Ready';if(role!=='admin')return <><PageHeader title="Launch Readiness"/><div className="info-box">Administrator access is required.</div></>;return <><PageHeader title="Deployment / Readiness"><div className="report-actions"><button onClick={run} disabled={busy}><RotateCcw size={17}/>{busy?'Checking…':'Run Checks'}</button><button onClick={()=>window.print()}><Printer size={17}/> Print Checklist</button></div></PageHeader><section className={`launch-summary ${failures?'fail':warnings?'warning':'pass'}`}><ShieldCheck size={34}/><div><small>RELEASE STATUS</small><strong>{launchStatus}</strong><span>{failures} required issue(s) • {warnings} warning(s){lastRun?` • Checked ${new Date(lastRun).toLocaleString()}`:''}</span></div></section><section className="readiness-list">{checks.map(c=><div className={`readiness-item ${c.status}`} key={c.id}><span className="readiness-mark">{c.status==='pass'?'✓':c.status==='warning'?'!':'×'}</span><div><strong>{userFacingText(c.label)}</strong><p>{userFacingText(c.detail)}</p></div><b>{c.status}</b></div>)}</section><section className="panel"><h2>Deployment Procedure</h2><ol className="plain-list"><li>Resolve every required issue and review every warning.</li><li>Create and verify fresh business and Supply Operations backups.</li><li>Verify the applied migration level and rehearse only pending upgrades in a staging Supabase project.</li><li>Complete the administrator and employee UAT in the Admin Guide and UAT Checklist.</li><li>Open the production HTTPS URL on authorized devices and test System Print.</li><li>Run  Operational Acceptance, complete Internal Go-Live evidence, and follow the go-live runbook.</li></ol></section></>}

type ExpenseRow={id:string;expense_date:string;category_name:string;description:string;amount:number;payment_method:string;vendor:string|null;reference:string|null;created_at:string;created_by_name:string}
function ExpensesPage({role,currency,showToast}:{role:Role;currency:string;showToast:(m:string)=>void}){
  const today=new Date().toISOString().slice(0,10);const[from,setFrom]=useState(`${today.slice(0,8)}01`);const[to,setTo]=useState(today);const[rows,setRows]=useState<ExpenseRow[]>([]);const[categories,setCategories]=useState<string[]>(['Ingredients','Packaging','Utilities','Transport','Maintenance','Marketing','Other']);const[adding,setAdding]=useState(false);const[busy,setBusy]=useState(false)
  async function load(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_expenses',{p_from:from,p_to:to});if(error){setBusy(false);return showToast(error.message)}setRows(data?.expenses??[]);setCategories(data?.categories?.length?data.categories:categories)}else setRows([]);setBusy(false)}
  useEffect(()=>{if(role==='admin')void load()},[role])
  const total=rows.reduce((a,e)=>a+Number(e.amount),0),cash=rows.filter(e=>e.payment_method==='cash').reduce((a,e)=>a+Number(e.amount),0)
  function exportCsv(){const data=[['Date','Category','Description','Vendor','Payment','Amount','Reference','Created By'],...rows.map(e=>[e.expense_date,e.category_name,e.description,e.vendor??'',e.payment_method,e.amount,e.reference??'',e.created_by_name])];const csv=data.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`chubbylu-expenses-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)}
  if(role!=='admin')return <><PageHeader title="Expenses"/><div className="info-box">Administrator access is required.</div></>
  return <><PageHeader title="Expenses"><div className="report-actions"><button onClick={()=>setAdding(true)}><Plus size={17}/> Add Expense</button><button onClick={exportCsv} disabled={!rows.length}><Download size={17}/> CSV</button><button onClick={()=>window.print()}><Printer size={17}/> Print / PDF</button></div></PageHeader><div className="info-box drawer-security"><ShieldCheck size={18}/><span>Expenses are append-only. Cash expenses automatically create an audited cash-out entry when a drawer is open; card and bank expenses do not affect drawer cash.</span></div>
    <section className="panel report-filter"><div className="form-grid"><label>From<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></label></div><button className="primary-btn small" onClick={load} disabled={busy}>{busy?'Loading…':'Load Expenses'}</button></section>
    <section className="stats-grid three"><Stat label="Total Expenses" value={money(total,currency)} sub={`${from} to ${to}`}/><Stat label="Cash Expenses" value={money(cash,currency)} sub="Recorded against drawer when open"/><Stat label="Expense Records" value={String(rows.length)} sub="Append-only entries"/></section>
    <section className="panel"><Table headers={['Date','Category','Description','Vendor','Payment','Amount','Reference','Staff']} rows={rows.map(e=>[new Date(`${e.expense_date}T00:00:00`).toLocaleDateString(),e.category_name,e.description,e.vendor||'—',e.payment_method.toUpperCase(),money(Number(e.amount),currency),e.reference||'—',e.created_by_name])}/>{!rows.length&&<p className="muted">No expenses in this date range.</p>}</section>
    {adding&&<ExpenseModal categories={categories} onClose={()=>setAdding(false)} onSaved={async()=>{setAdding(false);await load();showToast('Expense recorded and audited.')}}/>}</>
}
function ExpenseModal({categories,onClose,onSaved}:{categories:string[];onClose:()=>void;onSaved:()=>Promise<void>}){const[date,setDate]=useState(new Date().toISOString().slice(0,10));const[category,setCategory]=useState(categories[0]??'Other');const[description,setDescription]=useState('');const[amount,setAmount]=useState('');const[payment,setPayment]=useState('cash');const[vendor,setVendor]=useState('');const[reference,setReference]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent){e.preventDefault();if(Number(amount)<=0)return;setBusy(true);if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('create_expense',{p_expense_date:date,p_category_name:category,p_description:description.trim(),p_amount:Number(amount),p_payment_method:payment,p_vendor:vendor.trim()||null,p_reference:reference.trim()||null});if(error){setBusy(false);alert(error.message);return}}await onSaved();setBusy(false)}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>Add Expense</h2><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Date<input type="date" required value={date} max={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="full-field">Description<input required maxLength={200} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What was purchased or paid?"/></label><label>Amount<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Payment method<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank / Transfer</option><option value="other">Other</option></select></label><label>Vendor (optional)<input value={vendor} onChange={e=>setVendor(e.target.value)}/></label><label>Receipt/reference (optional)<input value={reference} onChange={e=>setReference(e.target.value)}/></label></div>{payment==='cash'&&<div className="warning-box">If a cash drawer is open, this amount will reduce its expected balance automatically.</div>}<div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Saving…':'Record Expense'}</button></div></form></div>}

type DailyCashReportData={session:{id:string;status:string;business_date:string|null;closure_reference:string|null;opened_at:string;closed_at:string|null;opening_note:string|null;closing_note:string|null;variance_reason:string|null;close_confirmed:boolean;counted_amount:number|null;variance:number|null;opened_by:string|null;closed_by:string|null};summary:{opening_cash:number;cash_sales:number;cash_refunds:number;cash_in:number;cash_out:number;expected_cash:number;transaction_count:number};transactions:Array<{id:string;created_at:string;transaction_type:string;amount:number;reason:string;staff_name:string;receipt_number:number|null}>}
function CashDrawerPage({shopId,role,currency,online,showToast}:{shopId:string|null;role:Role;currency:string;online:boolean;showToast:(message:string)=>void}) {
  const [session,setSession]=useState<CashDrawerSession|null>(null)
  const [transactions,setTransactions]=useState<CashDrawerTransaction[]>([])
  const [history,setHistory]=useState<CashDrawerSession[]>([])
  const [amount,setAmount]=useState('')
  const [reason,setReason]=useState('')
  const [openingNote,setOpeningNote]=useState('Start-of-shift cash')
  const [station,setStation]=useState(()=>localStorage.getItem('counternest.stationLabel')||'Main Register')
  const [counted,setCounted]=useState('')
  const [closingNote,setClosingNote]=useState('')
  const [varianceReason,setVarianceReason]=useState('')
  const [closeConfirmed,setCloseConfirmed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [report,setReport]=useState<DailyCashReportData|null>(null)

  async function openReport(sessionId:string){
    if(!supabaseConfigured||!supabase){showToast('Detailed daily reports require Supabase.');return}
    setBusy(true);const{data,error}=await supabase.rpc('get_daily_cash_report',{p_session_id:sessionId});setBusy(false)
    if(error){showToast(error.message);return}setReport(data as DailyCashReportData)
  }

  async function load() {
    if(!supabaseConfigured||!supabase){return}
    const {data,error}=await supabase.rpc('get_cash_drawer')
    if(error){showToast(error.message);return}
    const raw=(data??{}) as any
    const mapSession=(s:any):CashDrawerSession=>({id:s.id,status:s.status,openingAmount:Number(s.opening_amount),expectedAmount:Number(s.expected_amount),countedAmount:s.counted_amount==null?null:Number(s.counted_amount),variance:s.variance==null?null:Number(s.variance),openedAt:s.opened_at,closedAt:s.closed_at,openedByName:s.opened_by_name??'Staff',stationLabel:s.station_label??'Main Register',closedByName:s.closed_by_name??null,openingNote:s.opening_note,closingNote:s.closing_note,businessDate:s.business_date??null,varianceReason:s.variance_reason??null,closureReference:s.closure_reference??null,closeConfirmed:Boolean(s.close_confirmed)})
    setSession(raw.open_session?mapSession(raw.open_session):null)
    setTransactions((raw.transactions??[]).map((t:any)=>({id:t.id,type:t.transaction_type,amount:Number(t.amount),reason:t.reason,createdAt:t.created_at,staffName:t.staff_name??'System',receiptNumber:t.receipt_number==null?null:Number(t.receipt_number)})))
    setHistory((raw.recent_sessions??[]).map(mapSession))
  }
  useEffect(()=>{if(role==='admin')void load()},[shopId,role])

  async function callRpc(name:string,args:Record<string,unknown>,success:string){
    if(!online)return showToast('Reconnect to manage the daily cash record.')
    setBusy(true)
    if(supabaseConfigured&&supabase){const{error}=await supabase.rpc(name,args);if(error){setBusy(false);return showToast(error.message)}}
    else if(name==='open_register'){
      const opening=Number(args.p_opening_amount);const id=uid();const now=new Date().toISOString()
      setSession({id,status:'open',openingAmount:opening,expectedAmount:opening,openedAt:now,openedByName:'Demo Administrator',openingNote:String(args.p_note??'')})
      setTransactions([{id:uid(),type:'opening_float',amount:opening,reason:String(args.p_note??'Opening float'),createdAt:now,staffName:'Demo Administrator'}])
    } else if(name==='adjust_cash_drawer'){
      const signed=args.p_transaction_type==='cash_out'?-Number(args.p_amount):Number(args.p_amount);const now=new Date().toISOString()
      setSession(s=>s?{...s,expectedAmount:s.expectedAmount+signed}:s)
      setTransactions(ts=>[{id:uid(),type:args.p_transaction_type as 'cash_in'|'cash_out',amount:signed,reason:String(args.p_reason),createdAt:now,staffName:'Demo Administrator'},...ts])
    } else if(name==='close_daily_cash'){
      const count=Number(args.p_counted_amount);setHistory(h=>session?[{...session,status:'closed',countedAmount:count,variance:count-session.expectedAmount,closedAt:new Date().toISOString(),closedByName:'Demo Administrator',closingNote:String(args.p_closing_note??''),varianceReason:String(args.p_variance_reason??''),closureReference:`DC-DEMO-${Date.now()}`,closeConfirmed:true},...h]:h);setSession(null);setTransactions([])
    }
    if(supabaseConfigured)await load()
    setBusy(false);setAmount('');setReason('');setCounted('');setClosingNote('');setVarianceReason('');setCloseConfirmed(false);showToast(success)
  }
  if(role!=='admin')return <><PageHeader title="Daily Cash"/><div className="info-box">Management access is required to view or adjust the daily cash record.</div></>
  const positiveAmount=Number(amount)>0
  return <>
    <PageHeader title="Daily Cash"><div className="drawer-header-actions">{session&&<button type="button" onClick={()=>void openReport(session.id)} disabled={busy||!online}><FileBarChart size={16}/> Current Report</button>}<button type="button" onClick={()=>void load()} disabled={busy||!online}><RotateCcw size={16}/> Refresh</button><span className={`drawer-status ${session?'open':'closed'}`}>{session?'Day Open':'Day Closed'}</span></div></PageHeader>
    <div className="info-box drawer-security"><ShieldCheck size={18}/><span>This is a system cash record, not a physical-drawer controller. Only administrators can start the day, record cash in/out, count cash, or close the day. Every action is audited.</span></div>
    {!session?<section className="panel drawer-open-panel"><h2><Landmark size={20}/> Open Register</h2><p className="muted">Enter the existing cash or opening amount available at the beginning of the business day.</p><div className="drawer-form"><label>Register / station<input required maxLength={60} value={station} onChange={e=>setStation(e.target.value)}/></label><label>Opening Cash<input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label><label>Opening note<input value={openingNote} onChange={e=>setOpeningNote(e.target.value)} maxLength={200}/></label><button className="primary-btn" disabled={busy||!online||Number(amount)<0||amount===''} onClick={()=>callRpc('open_register',{p_opening_amount:Number(amount),p_station:station.trim(),p_note:openingNote.trim()||null},'Register opened and audited.')}>Open Register</button></div></section>:
    <>
      <p className="muted">Register / station: <strong>{session.stationLabel??station}</strong></p><section className="stats-grid three drawer-stats"><Stat label="Opening Cash" value={money(session.openingAmount,currency)} sub={`Started by ${session.openedByName}`}/><Stat label="Expected Cash" value={money(session.expectedAmount,currency)} sub="Opening + cash sales + cash in − cash out/refunds"/><Stat label="Day Started" value={new Date(session.openedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} sub={new Date(session.openedAt).toLocaleDateString()}/></section>
      <section className="two-col drawer-actions-grid"><div className="panel"><h2><Plus size={19}/> Add or remove cash</h2><div className="drawer-form"><label>Amount<input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label><label>Required reason<input value={reason} onChange={e=>setReason(e.target.value)} maxLength={200} placeholder="Extra float, safe drop, petty cash…"/></label><div className="drawer-action-buttons"><button className="primary-btn" disabled={busy||!online||!positiveAmount||!reason.trim()} onClick={()=>callRpc('adjust_cash_drawer',{p_transaction_type:'cash_in',p_amount:Number(amount),p_reason:reason.trim()},'Cash added and audited.')}><Plus size={17}/> Add Cash</button><button className="danger-outline" disabled={busy||!online||!positiveAmount||!reason.trim()} onClick={()=>callRpc('adjust_cash_drawer',{p_transaction_type:'cash_out',p_amount:Number(amount),p_reason:reason.trim()},'Cash removal recorded.')}><Minus size={17}/> Remove Cash</button></div></div></div>
      <div className="panel"><h2>Count and close day</h2><div className="drawer-form"><label>Counted cash<input type="number" min="0" step="0.01" inputMode="decimal" value={counted} onChange={e=>setCounted(e.target.value)} placeholder="0.00"/></label>{counted!==''&&<div className="variance-preview"><span>Expected {money(session.expectedAmount,currency)}</span><strong>Variance {money(Number(counted)-session.expectedAmount,currency)}</strong></div>}{counted!==''&&Math.abs(Number(counted)-session.expectedAmount)>=.01&&<label>Required variance explanation<input value={varianceReason} onChange={e=>setVarianceReason(e.target.value)} minLength={5} maxLength={200} placeholder="Counting difference, cash drop, entry correction…"/></label>}<label>Required closing note<input value={closingNote} onChange={e=>setClosingNote(e.target.value)} minLength={5} maxLength={300} placeholder="Count performed, records reviewed, handover details…"/></label><label className="close-confirmation"><input type="checkbox" checked={closeConfirmed} onChange={e=>setCloseConfirmed(e.target.checked)}/><span>I confirm that I physically counted the cash and reviewed today’s entries.</span></label><button className="danger-btn" disabled={busy||!online||counted===''||Number(counted)<0||closingNote.trim().length<5||!closeConfirmed||(Math.abs(Number(counted)-session.expectedAmount)>=.01&&varianceReason.trim().length<5)} onClick={()=>confirm('Close today’s cash record? It cannot be reopened or deleted.')&&callRpc('close_daily_cash',{p_counted_amount:Number(counted),p_variance_reason:varianceReason.trim()||null,p_closing_note:closingNote.trim(),p_confirmation:true},'Daily cash record closed with an immutable closure reference.')}>Close Day</button></div></div></section>
      <section className="panel"><h2>Current daily cash audit trail</h2>{transactions.length?<Table headers={['Time','Type','Amount','Reason / Receipt','Staff']} rows={transactions.map(t=>[new Date(t.createdAt).toLocaleString(),t.type.replace(/_/g,' '),money(t.amount,currency),t.receiptNumber?`Receipt ${receiptNo(t.receiptNumber)} — ${t.reason}`:t.reason,t.staffName])}/>:<p className="muted">No cash activity yet.</p>}</section>
    </>}
    <section className="panel drawer-history"><h2>Recent closed cash records</h2>{history.length?<Table headers={['Business date','Closure reference','Expected','Counted','Variance','Closed by','Report']} rows={history.map(s=>[s.businessDate??new Date(s.openedAt).toLocaleDateString(),s.closureReference??'Legacy record',money(s.expectedAmount,currency),money(s.countedAmount??0,currency),money(s.variance??0,currency),s.closedByName??'—',<button key={s.id} onClick={()=>void openReport(s.id)}>View</button>])}/>:<p className="muted">No closed daily cash records yet.</p>}</section>
    {report&&<DailyCashReportModal report={report} currency={currency} onClose={()=>setReport(null)}/>}
  </>
}

function DailyCashReportModal({report,currency,onClose}:{report:DailyCashReportData;currency:string;onClose:()=>void}){
  const s=report.summary
  function exportCsv(){const rows=[['CounterNest POS Daily Cash Report'],['Opened',report.session.opened_at],['Closed',report.session.closed_at??'Open'],[],['Opening Cash',s.opening_cash],['Cash Sales',s.cash_sales],['Cash Refunds',-s.cash_refunds],['Cash In',s.cash_in],['Cash Out',-s.cash_out],['Expected Cash',s.expected_cash],['Counted Cash',report.session.counted_amount??''],['Variance',report.session.variance??''],[],['Time','Type','Amount','Reason','Receipt','Staff'],...report.transactions.map(t=>[t.created_at,t.transaction_type,t.amount,t.reason,t.receipt_number??'',t.staff_name])];const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`counternest-daily-cash-${report.session.opened_at.slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}
  return <div className="modal-backdrop receipt-backdrop"><div className="receipt-dialog"><div className="receipt-toolbar no-print"><div><strong>Daily Cash Report</strong><small>{report.session.business_date??new Date(report.session.opened_at).toLocaleDateString()} • {report.session.status}</small></div><div className="receipt-actions"><button onClick={exportCsv}><Download size={17}/> CSV</button><button onClick={()=>window.print()}><Printer size={17}/> Print / PDF</button><button className="primary-btn" onClick={onClose}>Close</button></div></div><article className="receipt-sheet daily-cash-report"><div className="receipt-brand"><h1>CounterNest POS</h1><p>Daily Cash Report</p><strong>{report.session.closure_reference??'OPEN / LEGACY RECORD'}</strong></div><div className="receipt-meta"><div><span>Business date</span><strong>{report.session.business_date??'—'}</strong></div><div><span>Opened</span><strong>{new Date(report.session.opened_at).toLocaleString()}</strong></div><div><span>Closed</span><strong>{report.session.closed_at?new Date(report.session.closed_at).toLocaleString():'Open'}</strong></div><div><span>Opened by</span><strong>{report.session.opened_by??'Staff'}</strong></div></div><div className="receipt-totals"><div><span>Opening Cash</span><b>{money(s.opening_cash,currency)}</b></div><div><span>Cash Sales</span><b>{money(s.cash_sales,currency)}</b></div><div><span>Cash Refunds</span><b>-{money(s.cash_refunds,currency)}</b></div><div><span>Cash In</span><b>{money(s.cash_in,currency)}</b></div><div><span>Cash Out</span><b>-{money(s.cash_out,currency)}</b></div><div className="receipt-grand"><span>Expected Cash</span><b>{money(s.expected_cash,currency)}</b></div>{report.session.counted_amount!=null&&<><div><span>Counted Cash</span><b>{money(report.session.counted_amount,currency)}</b></div><div className="receipt-grand"><span>Variance</span><b>{money(report.session.variance??0,currency)}</b></div>{report.session.variance_reason&&<div><span>Variance reason</span><b>{report.session.variance_reason}</b></div>}{report.session.closing_note&&<div><span>Closing note</span><b>{report.session.closing_note}</b></div>}</>}</div><div className="cash-report-lines"><strong>Audit Entries ({s.transaction_count})</strong>{report.transactions.map(t=><div key={t.id}><span>{new Date(t.created_at).toLocaleTimeString()} • {t.transaction_type.replace(/_/g,' ')}</span><b>{money(t.amount,currency)}</b><small>{t.reason}{t.receipt_number?` • Receipt ${receiptNo(t.receipt_number)}`:''} • {t.staff_name}</small></div>)}</div></article></div></div>
}

type TranslationRow={entity_type:'category'|'product'|'reward'|'expense_category';entity_id:string;source:string;translation:string}
function TranslationManager({shopId,role,showToast}:{shopId:string|null;role:Role;showToast:(m:string)=>void}){
  const[rows,setRows]=useState<TranslationRow[]>([]);const[busy,setBusy]=useState(false)
  async function load(){if(!supabase||!shopId)return;setBusy(true);const[cat,prod,reward,expense,current]=await Promise.all([supabase.from('categories').select('id,name').eq('shop_id',shopId).order('name'),supabase.from('products').select('id,name').eq('shop_id',shopId).order('name'),supabase.from('loyalty_rewards').select('id,name').eq('shop_id',shopId).order('name'),supabase.from('expense_categories').select('id,name').eq('shop_id',shopId).order('name'),supabase.from('entity_translations').select('entity_type,entity_id,translated_text').eq('shop_id',shopId).eq('language_code','es').eq('field_name','name')]);if(current.error){setBusy(false);showToast('Apply migration 27 before managing translations.');return}const map=new Map((current.data??[]).map((x:any)=>[`${x.entity_type}:${x.entity_id}`,x.translated_text]));const combine=(type:TranslationRow['entity_type'],data:any[]|null)=>(data??[]).map(x=>({entity_type:type,entity_id:x.id,source:x.name,translation:String(map.get(`${type}:${x.id}`)??'')}));setRows([...combine('category',cat.data),...combine('product',prod.data),...combine('reward',reward.data),...combine('expense_category',expense.data)]);setBusy(false)}
  useEffect(()=>{void load()},[shopId])
  async function save(){if(!supabase||!shopId||role!=='admin')return;setBusy(true);const filled=rows.filter(r=>r.translation.trim()).map(r=>({shop_id:shopId,entity_type:r.entity_type,entity_id:r.entity_id,language_code:'es',field_name:'name',translated_text:r.translation.trim(),updated_at:new Date().toISOString()}));if(filled.length){const{error}=await supabase.from('entity_translations').upsert(filled,{onConflict:'shop_id,entity_type,entity_id,language_code,field_name'});if(error){setBusy(false);showToast(error.message);return}}setBusy(false);showToast('Spanish translations saved. Change System Language to Spanish to preview them.')}
  if(!supabaseConfigured)return <div className="info-box">Connect Supabase to save business translations.</div>
  return <section className="panel translation-settings-panel"><div className="panel-title"><h2>Business Data Translations</h2><button className="primary-btn small" disabled={busy||role!=='admin'} onClick={save}>{busy?'Saving…':'Save Spanish Translations'}</button></div><p className="muted">The original name remains the fallback. Blank Spanish fields display the original name.</p><div className="translation-list">{rows.map((r,i)=><label key={`${r.entity_type}:${r.entity_id}`}><span><small>{r.entity_type.replace('_',' ')}</small><strong>{r.source}</strong></span><input value={r.translation} placeholder="Spanish name" onChange={e=>setRows(old=>old.map((x,n)=>n===i?{...x,translation:e.target.value}:x))}/></label>)}</div></section>
}

function ChangePasswordPanel({showToast}:{showToast:(m:string)=>void}){
  const[currentPassword,setCurrentPassword]=useState('');const[newPassword,setNewPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[busy,setBusy]=useState(false)
  async function save(e:FormEvent){e.preventDefault();if(newPassword!==confirmPassword)return showToast('New passwords do not match.');if(newPassword.length<12||!/[a-z]/.test(newPassword)||!/[A-Z]/.test(newPassword)||!/[0-9]/.test(newPassword))return showToast('Use at least 12 characters with upper-case, lower-case, and a number.');if(currentPassword===newPassword)return showToast('Choose a new password different from the current password.');setBusy(true);if(!supabaseConfigured||!supabase){setCurrentPassword('');setNewPassword('');setConfirmPassword('');setBusy(false);return showToast('Demo password validation completed.')}const{data,error}=await supabase.functions.invoke('change-password',{body:{current_password:currentPassword,new_password:newPassword,confirm_password:confirmPassword}});setBusy(false);if(error){let message=error.message;try{const payload=await (error as any).context?.json();if(payload?.error)message=payload.error}catch{}return showToast(message)}if(!data?.complete)return showToast('Password change did not complete.');setCurrentPassword('');setNewPassword('');setConfirmPassword('');showToast('Password changed successfully.')}
  return <section className="panel account-security-panel"><h2><ShieldCheck size={20}/> Account Password</h2><p className="muted">Verify your current password, then enter and confirm the new password. Password values are never written to CounterNest audit logs.</p><form onSubmit={save}><div className="form-grid"><label>Current password<PasswordInput required autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>New password<PasswordInput required minLength={12} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label>Confirm new password<PasswordInput required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label></div><small className="muted">At least 12 characters with upper-case, lower-case, and a number.</small><div className="receipt-actions"><button className="primary-btn small" disabled={busy}>{busy?'Changing…':'Change Password'}</button></div></form></section>
}

function SettingsPage({theme,setTheme,shopName,setShopName,logoUrl,setLogoUrl,taxRate,setTaxRate,shopAddress,setShopAddress,shopPhone,setShopPhone,businessNumber,setBusinessNumber,shopEmail,setShopEmail,currency,setCurrency,timezone,setTimezone,receiptFooter,setReceiptFooter,shopId,role,showToast,installApp,installAvailable,standalone,online,uiLanguage,setUiLanguage,autoLogoutEnabled,setAutoLogoutEnabled,autoLogoutMinutes,setAutoLogoutMinutes}:{theme:ThemeConfig;setTheme:(t:ThemeConfig)=>void;shopName:string;setShopName:(s:string)=>void;logoUrl:string|null;setLogoUrl:(s:string|null)=>void;taxRate:number;setTaxRate:(n:number)=>void;shopAddress:string;setShopAddress:(s:string)=>void;shopPhone:string;setShopPhone:(s:string)=>void;businessNumber:string;setBusinessNumber:(s:string)=>void;shopEmail:string;setShopEmail:(s:string)=>void;currency:string;setCurrency:(s:string)=>void;timezone:string;setTimezone:(s:string)=>void;receiptFooter:string;setReceiptFooter:(s:string)=>void;shopId:string|null;role:Role;showToast:(m:string)=>void;installApp:()=>Promise<void>;installAvailable:boolean;standalone:boolean;online:boolean;uiLanguage:UiLanguage;setUiLanguage:(v:UiLanguage)=>void;autoLogoutEnabled:boolean;setAutoLogoutEnabled:(v:boolean)=>void;autoLogoutMinutes:number;setAutoLogoutMinutes:(v:number)=>void}){
  const[preset,setPreset]=useState('Brand')
  const[logoEditorSrc,setLogoEditorSrc]=useState<string|null>(null)
  const[managerPin,setManagerPin]=useState('')
  const[managerPinConfirm,setManagerPinConfirm]=useState('')
  const[printerProfile,setPrinterProfile]=useState(()=>localStorage.getItem('counternest.printerProfile')||localStorage.getItem('chubbylu.printerProfile')||'system')
  const[paperWidth,setPaperWidth]=useState(()=>localStorage.getItem('counternest.paperWidth')||localStorage.getItem('chubbylu.paperWidth')||'80')
  const[printerHost,setPrinterHost]=useState(()=>localStorage.getItem('counternest.printerHost')||localStorage.getItem('chubbylu.printerHost')||'')
  const[printerPort,setPrinterPort]=useState(()=>localStorage.getItem('counternest.printerPort')||localStorage.getItem('chubbylu.printerPort')||'9100')
  const[bluetoothName,setBluetoothName]=useState(()=>localStorage.getItem('counternest.bluetoothName')||localStorage.getItem('chubbylu.bluetoothName')||'')
  const[usbVendorId,setUsbVendorId]=useState(()=>localStorage.getItem('counternest.usbVendorId')||localStorage.getItem('chubbylu.usbVendorId')||'')
  const[usbProductId,setUsbProductId]=useState(()=>localStorage.getItem('counternest.usbProductId')||localStorage.getItem('chubbylu.usbProductId')||'')
  const[currentOrigin]=useState(()=>window.location.origin)
  const[networkQr,setNetworkQr]=useState('')
  const deploymentMode=currentOrigin.startsWith('https://')?'Cloud web app (HTTPS)':'Local development (HTTP)'
  const secureBrowser=window.isSecureContext||window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'
  useEffect(()=>{let active=true;void QRCode.toDataURL(currentOrigin,{width:220,margin:1}).then(url=>{if(active)setNetworkQr(url)}).catch(()=>{if(active)setNetworkQr('')});return()=>{active=false}},[currentOrigin])
  const presets:{name:string;t:ThemeConfig}[]=[
    {name:'Brand',t:{primary:'#8b451f',background:'#f8efe6',text:'#482e20'}},
    {name:'Mint Fresh',t:{primary:'#4d8a73',background:'#f2f8f5',text:'#28493d'}},
    {name:'Ocean Blue',t:{primary:'#4a6fa5',background:'#f0f4fa',text:'#263b58'}},
    {name:'Lavender',t:{primary:'#8064a2',background:'#f6f1fa',text:'#49395e'}},
    {name:'Forest Green',t:{primary:'#3d684a',background:'#f1f5f0',text:'#263f2d'}},
    {name:'Sunset',t:{primary:'#d96d3b',background:'#fff5ee',text:'#6d3420'}}
  ]
  async function save(){
    if(role!=='admin')return
    if(supabaseConfigured&&supabase&&shopId){
      const{error}=await supabase.from('shops').update({name:shopName,address:shopAddress||null,phone:shopPhone||null,business_number:businessNumber||null,email:shopEmail||null,currency,timezone,receipt_footer:receiptFooter||null,tax_rate:taxRate,theme}).eq('id',shopId)
      if(error)return showToast(error.message)
      const{error:sessionError}=await supabase.rpc('save_session_security_policy',{p_enabled:autoLogoutEnabled,p_minutes:autoLogoutMinutes})
      if(sessionError)return showToast(sessionError.message)
    }else{
      localStorage.setItem('counternest.autoLogoutEnabled',String(autoLogoutEnabled))
      localStorage.setItem('counternest.autoLogoutMinutes',String(autoLogoutMinutes))
    }
    localStorage.setItem('counternest.autoLogoutEnabled',String(autoLogoutEnabled))
    localStorage.setItem('counternest.autoLogoutMinutes',String(autoLogoutMinutes))
    showToast('Settings saved.')
  }
  async function saveManagerPin(){
    if(role!=='admin')return
    if(!/^\d{4,8}$/.test(managerPin))return showToast('Manager PIN must contain 4 to 8 digits.')
    if(managerPin!==managerPinConfirm)return showToast('Manager PIN confirmation does not match.')
    if(supabaseConfigured&&supabase){
      const{error}=await supabase.rpc('set_my_manager_pin',{p_pin:managerPin})
      if(error)return showToast(error.message)
    }
    setManagerPin('');setManagerPinConfirm('');showToast('Manager approval PIN saved.')
  }
  function saveHardware(){
    localStorage.setItem('counternest.printerProfile',printerProfile)
    localStorage.setItem('counternest.paperWidth',paperWidth)
    localStorage.setItem('counternest.printerHost',printerHost.trim())
    localStorage.setItem('counternest.printerPort',printerPort)
    localStorage.setItem('counternest.bluetoothName',bluetoothName.trim())
    localStorage.setItem('counternest.usbVendorId',usbVendorId.trim())
    localStorage.setItem('counternest.usbProductId',usbProductId.trim())
    showToast('Hardware settings saved on this device.')
  }
  function validateHardware(){
    if(printerProfile==='system')return showToast('System Print is ready. Select the installed printer in the print dialog.')
    if(printerProfile==='escpos-wifi'&&(!printerHost.trim()||!Number(printerPort)))return showToast('Enter the printer IP address and port.')
    if(printerProfile==='escpos-bluetooth'&&!bluetoothName.trim())return showToast('Enter a Bluetooth printer name or identifier.')
    if(printerProfile==='escpos-usb'&&(!usbVendorId.trim()||!usbProductId.trim()))return showToast('Enter the USB vendor and product IDs after selecting a printer.')
    showToast('Configuration is complete. Direct connection remains pending device selection and adapter testing.')
  }
  function testPrinter(){
    const w=window.open('','_blank','width=420,height=720')
    if(!w)return showToast('Allow pop-ups to run the printer test.')
    const width=paperWidth==='58'?'58mm':'80mm'
    w.document.write(`<!doctype html><html><head><title>ChubbyLu Printer Test</title><style>@page{size:${width} auto;margin:3mm}body{font-family:monospace;width:${width};margin:0;padding:3mm;box-sizing:border-box;text-align:center}hr{border:0;border-top:1px dashed #000}.left{text-align:left}</style></head><body><h3>${shopName||'CHUBBYLU BAKES'}</h3><b> PRINTER TEST</b><hr><div class="left">Profile: ${printerProfile}<br>Paper: ${paperWidth} mm<br>Date: ${new Date().toLocaleString()}</div><hr><p>If this prints clearly, the system print path is ready.</p><script>setTimeout(()=>window.print(),250)<\/script></body></html>`)
    w.document.close()
  }
  async function copyInternalUrl(){
    try{await navigator.clipboard.writeText(currentOrigin);showToast('Internal CounterNest address copied.')}catch{window.prompt('Copy this CounterNest internal address:',currentOrigin)}
  }
  function chooseLogo(file?:File){
    if(!file)return
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))return showToast('Please choose a PNG, JPG, or WebP image.')
    if(file.size>8*1024*1024)return showToast('Logo file must be 8 MB or smaller.')
    const reader=new FileReader()
    reader.onload=()=>setLogoEditorSrc(String(reader.result))
    reader.readAsDataURL(file)
  }
  async function uploadLogo(blob:Blob){
    if(role!=='admin')return
    if(!supabaseConfigured||!supabase||!shopId){
      setLogoUrl(URL.createObjectURL(blob));setLogoEditorSrc(null);showToast('Logo preview updated in demo mode.');return
    }
    const path=`${shopId}/logo-${Date.now()}.png`
    const uploaded=await supabase.storage.from('shop-logos').upload(path,blob,{contentType:'image/png',cacheControl:'3600',upsert:false})
    if(uploaded.error)return showToast(uploaded.error.message)
    const{data:urlData}=supabase.storage.from('shop-logos').getPublicUrl(path)
    const newUrl=urlData.publicUrl
    const{error}=await supabase.from('shops').update({logo_url:newUrl}).eq('id',shopId)
    if(error){await supabase.storage.from('shop-logos').remove([path]);return showToast(error.message)}
    setLogoUrl(newUrl);setLogoEditorSrc(null);showToast('Logo updated. Historical receipt logo snapshots are retained.')
  }
  async function removeLogo(){
    if(role!=='admin'||!confirm('Remove the business logo? The business name will remain visible.'))return
    if(supabaseConfigured&&supabase&&shopId){
      const{error}=await supabase.from('shops').update({logo_url:null}).eq('id',shopId)
      if(error)return showToast(error.message)
    }
    setLogoUrl(null);showToast('Logo removed from the current shop profile. Historical receipt snapshots are retained.')
  }
  return <>
    <PageHeader title="Settings"><button className="primary-btn small" onClick={save} disabled={role!=='admin'}>Save Changes</button></PageHeader><CustomerContactSettings role={role} showToast={showToast}/>
    <div className="settings-grid">
      <section className="panel">
        <h2>Shop Profile</h2>
        <label>Business name<input value={shopName} onChange={e=>setShopName(e.target.value)}/></label>
        <div className="form-grid"><label>Address<input value={shopAddress} onChange={e=>setShopAddress(e.target.value)} placeholder="Street / city"/></label><label>Phone<input value={shopPhone} onChange={e=>setShopPhone(e.target.value)} placeholder="Business phone"/></label><label>Business number<input value={businessNumber} onChange={e=>setBusinessNumber(e.target.value)} placeholder="Registration or business number"/></label><label>Email<input type="email" value={shopEmail} onChange={e=>setShopEmail(e.target.value)} placeholder="Business email"/></label><label>Tax rate (%)<input min="0" step="0.1" type="number" value={(taxRate*100).toFixed(1)} onChange={e=>setTaxRate(Number(e.target.value)/100)}/></label></div>
        <div className="logo-manager">
          <div className="logo-manager-heading"><div><strong>Business Logo</strong><p className="muted">Displayed as a circle with the business name below it.</p></div></div>
          <div className="logo-manager-body">
            <Brand shopName={shopName||'Business Name'} logoUrl={logoUrl} compact />
            <div className="logo-manager-actions">
              <label className={`upload-logo-btn ${role!=='admin'?'disabled':''}`}><Upload size={17}/>{logoUrl?'Change Logo':'Upload Logo'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={role!=='admin'} onChange={e=>{chooseLogo(e.target.files?.[0]);e.currentTarget.value=''}}/></label>
              {logoUrl&&<button className="danger-outline" disabled={role!=='admin'} onClick={removeLogo}><Trash2 size={17}/> Remove Logo</button>}
            </div>
          </div>
          <small>PNG, JPG or WebP • up to 8 MB. You can resize the logo before it is uploaded.</small>
        </div>
      </section>
      <section className="panel receipt-settings-panel">
        <h2><Printer size={20}/> Receipt Settings</h2>
        <p className="muted">These details appear on printed, PDF, and emailed receipt summaries. Each completed sale keeps a receipt snapshot for historical records.</p>
        <div className="form-grid"><label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="USD">USD — US Dollar</option><option value="BZD">BZD — Belize Dollar</option><option value="MXN">MXN — Mexican Peso</option><option value="GTQ">GTQ — Guatemalan Quetzal</option><option value="HNL">HNL — Honduran Lempira</option><option value="SVC">SVC — Salvadoran Colón</option></select></label><label>Timezone<input value={timezone} onChange={e=>setTimezone(e.target.value)} placeholder="America/Belize"/></label></div>
        <label>Receipt footer<textarea rows={3} value={receiptFooter} onChange={e=>setReceiptFooter(e.target.value)} placeholder="Thank you for your business!"/></label>
        <div className="mini-receipt-preview"><strong>{shopName||'Business Name'}</strong><span>Receipt #000123</span><span>{shopAddress||'Business address'}</span><span>Salesperson: Staff Name</span><b>Total {money(12.50,currency)}</b><small>{receiptFooter||'Thank you!'}</small></div>
      </section>
      <section className="panel hardware-settings-panel">
        <h2><Printer size={20}/> Hardware & Receipt Printer</h2>
        <p className="muted">Configure a generic ESC/POS connection now and keep System Print as the working fallback. Direct communication is activated only after a compatible printer is selected and tested.</p>
        <div className="form-grid"><label>Connection profile<select value={printerProfile} onChange={e=>setPrinterProfile(e.target.value)}><option value="system">System Print (recommended fallback)</option><option value="escpos-usb">Generic ESC/POS — USB</option><option value="escpos-bluetooth">Generic ESC/POS — Bluetooth</option><option value="escpos-wifi">Generic ESC/POS — Wi-Fi / LAN</option></select></label><label>Receipt paper width<select value={paperWidth} onChange={e=>setPaperWidth(e.target.value)}><option value="58">58 mm</option><option value="80">80 mm</option></select></label></div>
        {printerProfile==='escpos-wifi'&&<div className="form-grid hardware-detail-grid"><label>Printer IP address<input value={printerHost} onChange={e=>setPrinterHost(e.target.value)} placeholder="192.168.1.50"/></label><label>RAW print port<input type="number" min="1" max="65535" value={printerPort} onChange={e=>setPrinterPort(e.target.value)} placeholder="9100"/></label></div>}
        {printerProfile==='escpos-bluetooth'&&<div className="hardware-detail-grid"><label>Bluetooth printer name / identifier<input value={bluetoothName} onChange={e=>setBluetoothName(e.target.value)} placeholder="Select after purchasing the printer"/></label></div>}
        {printerProfile==='escpos-usb'&&<div className="form-grid hardware-detail-grid"><label>USB vendor ID<input value={usbVendorId} onChange={e=>setUsbVendorId(e.target.value)} placeholder="Example: 0x04b8"/></label><label>USB product ID<input value={usbProductId} onChange={e=>setUsbProductId(e.target.value)} placeholder="From printer/device details"/></label></div>}
        <div className="hardware-capabilities"><span className={'capability '+(('usb' in navigator)?'available':'pending')}><strong>USB</strong><small>{'usb' in navigator?'Browser API detected':'Native adapter may be required'}</small></span><span className={'capability '+(('bluetooth' in navigator)?'available':'pending')}><strong>Bluetooth</strong><small>{'bluetooth' in navigator?'Browser API detected':'Native adapter may be required'}</small></span><span className="capability available"><strong>Wi-Fi</strong><small>Network profile supported</small></span></div>
        <div className="receipt-actions"><button className="primary-btn small" type="button" onClick={saveHardware}>Save Hardware Settings</button><button type="button" onClick={validateHardware}>Validate Configuration</button><button type="button" onClick={testPrinter}><Printer size={17}/> System Test Print</button></div>
        <div className="info-box"><strong>Status:</strong> {printerProfile==='system'?'System Print is available now.':'ESC/POS profile saved; direct connection is pending a compatible printer and on-device adapter test.'} Physical cash-drawer verification and printer-driver opening tests are available under POS Hardware Setup.</div>
        <small className="muted">Hardware settings stay on this device and contain no Supabase credentials. System Print remains available if a direct connection fails.</small>
      </section>
      <section className="panel session-security-panel">
        <h2><ShieldCheck size={20}/> {tr('Session Security')}</h2>
        <p className="muted">Automatically sign out inactive staff on shared CounterNest devices. The policy applies across this business after it is saved by an Administrator.</p>
        {role==='admin'?<><label className="switch-line"><input type="checkbox" checked={autoLogoutEnabled} onChange={e=>setAutoLogoutEnabled(e.target.checked)}/><span>{tr('Automatic logoff')}</span></label><label>{tr('Inactivity timeout')}<select value={autoLogoutMinutes} disabled={!autoLogoutEnabled} onChange={e=>setAutoLogoutMinutes(Number(e.target.value))}><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={240}>4 hours</option><option value={480}>8 hours</option></select></label></>:<div className="info-box">Automatic logoff is <strong>{autoLogoutEnabled?'enabled':'disabled'}</strong>{autoLogoutEnabled?` after ${autoLogoutMinutes} minutes of inactivity`:''}. Only an Administrator can change this policy.</div>}
        <div className="info-box"><strong>How it works:</strong> a warning appears before timeout. Pointer, keyboard, touch, or wheel activity resets the timer. If the device remains inactive, CounterNest signs out and clears unsaved cart data; Daily Cash and completed records remain unchanged.</div>
      </section>
      <section className="panel manager-security-panel">
        <h2><ShieldCheck size={20}/> Manager Authorization</h2>
        <p className="muted">Refunds and voids require an active Admin's approval PIN. The PIN is stored as a secure hash in Supabase and is never shown again.</p>
        {role==='admin'?<><div className="form-grid"><label>New manager PIN<input type="password" inputMode="numeric" autoComplete="new-password" value={managerPin} onChange={e=>setManagerPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="4–8 digits"/></label><label>Confirm PIN<input type="password" inputMode="numeric" autoComplete="new-password" value={managerPinConfirm} onChange={e=>setManagerPinConfirm(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="Repeat PIN"/></label></div><button className="primary-btn small" type="button" onClick={saveManagerPin}>Set / Change Manager PIN</button></>:<div className="info-box">Only an Administrator can configure the manager approval PIN.</div>}
        <small className="muted">For production use, a 6-digit or longer PIN is recommended. Each refund or void records both the staff member who processed it and the manager who approved it.</small>
      </section>
      <section className="panel pwa-settings-panel">
        <h2><Download size={20}/> App & Device</h2>
        <p className="muted">Install the POS on a phone, tablet or desktop so it opens in its own app window. The app shell is cached for startup, while live business data stays in Supabase.</p>
        <div className="pwa-status-row"><span className={`connection-dot ${online?'online':'offline'}`}></span><div><strong>{online?'Online':'Offline'}</strong><small>{online?'Cloud sales and syncing are available.':'Checkout and cloud changes are paused until the connection returns.'}</small></div></div>
        {standalone?<div className="info-box">This POS is already running as an installed app on this device.</div>:installAvailable?<button className="primary-btn small" type="button" onClick={installApp}><Download size={17}/> Install POS App</button>:<div className="info-box"><strong>Install from your browser.</strong><br/>On Chrome or Edge, use the browser Install app option when available. On iPhone/iPad Safari, use Share → Add to Home Screen.</div>}
        <small className="muted">For safety, v6 does not queue offline sales. Inventory, loyalty balances, refunds and new sales remain server-authoritative and require a connection.</small>
        <hr/><h2>{tr('Android Installation')}</h2><p className="muted">On Android Chrome, open the HTTPS CounterNest address, sign in, then select Install POS App or Chrome menu → Add to Home screen. Use the browser installation option on each device.</p>{!standalone&&<button className="primary-btn small" type="button" onClick={installApp}><Download size={17}/>{tr('Install on this Android device')}</button>}
      </section>
      <section className="panel network-commission-panel">
        <h2><Network size={20}/> Web Deployment</h2>
        <p className="muted">Open the deployed CounterNest URL on each authorized device. Staff pages require sign-in; customer displays use protected share links.</p>
        <div className="network-commission-grid">
          <div className="network-details">
            <span><strong>Current address</strong><code>{currentOrigin}</code></span>
            <span><strong>Mode</strong><small>{deploymentMode}</small></span>
            <span><strong>Network</strong><small><Wifi size={15}/>{online?'Online — Supabase access available':'Offline — cloud operations paused'}</small></span>
            <span><strong>Secure browser features</strong><small>{secureBrowser?'Ready':'Use HTTPS for camera and clipboard access'}</small></span>
            <button type="button" onClick={copyInternalUrl}><Copy size={16}/> Copy App Address</button>
          </div>
          <div className="network-qr-card">{networkQr?<img src={networkQr} alt="CounterNest app QR code"/>:<QrCode size={88}/>}<strong>Connect approved device</strong><small>Scan to open this app on another device.</small></div>
        </div>
        <div className="info-box">{currentOrigin.startsWith('https://')?'Use this HTTPS address on authorized devices. Keep customer share links private and rotate them in Customer View Setup when necessary.':'This is a development address. Use the final HTTPS production URL when commissioning devices.'}</div>
      </section>
      <ChangePasswordPanel showToast={showToast}/>
      <section className="panel language-settings-panel"><h2>{tr('System Language')}</h2><p className="muted">Choose the interface navigation language for this device. The selection is saved locally.</p><label>{tr('System Language')}<select value={uiLanguage} onChange={e=>setUiLanguage(e.target.value as UiLanguage)}><option value="en">{tr('English')}</option><option value="es">{tr('Spanish')}</option></select></label></section>
      <TranslationManager shopId={shopId} role={role} showToast={showToast}/>
      <section className="panel">
        <h2><Palette size={20}/> Appearance</h2>
        <p className="muted">Each future business can choose a preset or its own page colors.</p>
        <div className="theme-presets">{presets.map(p=><button key={p.name} data-name={p.name} className={preset===p.name?'active':''} onClick={()=>{setPreset(p.name);setTheme(p.t)}}><span style={{background:p.t.primary}}></span><span style={{background:p.t.background}}></span>{p.name}</button>)}</div>
        <div className="color-controls"><label>Primary Color<input type="color" value={theme.primary} onChange={e=>{setPreset('Custom');setTheme({...theme,primary:e.target.value})}}/><code>{theme.primary}</code></label><label>Page Background<input type="color" value={theme.background} onChange={e=>{setPreset('Custom');setTheme({...theme,background:e.target.value})}}/><code>{theme.background}</code></label><label>Text & Icon Color<input type="color" value={theme.text} onChange={e=>{setPreset('Custom');setTheme({...theme,text:e.target.value})}}/><code>{theme.text}</code></label></div>
        <button onClick={()=>{setPreset('Brand');setTheme(presets[0].t)}}>Reset to Brand Theme</button>
      </section>
    </div>
    {logoEditorSrc&&<LogoEditor src={logoEditorSrc} onCancel={()=>setLogoEditorSrc(null)} onUpload={uploadLogo}/>} 
  </>
}

function LogoEditor({src,onCancel,onUpload}:{src:string;onCancel:()=>void;onUpload:(blob:Blob)=>Promise<void>}){
  const[zoom,setZoom]=useState(100)
  const[panX,setPanX]=useState(0)
  const[panY,setPanY]=useState(0)
  const[trimBackground,setTrimBackground]=useState(true)
  const[busy,setBusy]=useState(false)
  const previewRef=useRef<HTMLCanvasElement|null>(null)
  function drawCrop(ctx:CanvasRenderingContext2D,img:HTMLImageElement,size:number){const bounds=trimBackground?detectLogoBounds(img):{x:0,y:0,width:img.naturalWidth,height:img.naturalHeight};const cover=Math.max(size/bounds.width,size/bounds.height);const factor=cover*(zoom/100);const w=bounds.width*factor,h=bounds.height*factor;const roomX=Math.max(0,(w-size)/2),roomY=Math.max(0,(h-size)/2);const x=(size-w)/2+(panX/100)*roomX,y=(size-h)/2+(panY/100)*roomY;ctx.clearRect(0,0,size,size);ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,size,size);ctx.drawImage(img,bounds.x,bounds.y,bounds.width,bounds.height,x,y,w,h)}
  useEffect(()=>{let cancelled=false;void loadImage(src).then(img=>{if(cancelled||!previewRef.current)return;const ctx=previewRef.current.getContext('2d');if(ctx)drawCrop(ctx,img,512)});return()=>{cancelled=true}},[src,zoom,panX,panY,trimBackground])
  async function confirmLogo(){
    setBusy(true)
    try{
      const img=await loadImage(src)
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512
      const ctx=canvas.getContext('2d')
      if(!ctx)throw new Error('Image editor is not available in this browser.')
      drawCrop(ctx,img,512)
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png',0.92))
      if(!blob)throw new Error('Could not prepare the logo.')
      await onUpload(blob)
    }catch(error){alert(error instanceof Error?error.message:'Could not prepare logo.')}
    finally{setBusy(false)}
  }
  return <div className="modal-backdrop"><div className="modal logo-editor-modal">
    <div className="panel-title"><div><h2>Crop Business Logo</h2><p className="muted">Choose exactly what will appear inside the circular logo display.</p></div><button type="button" onClick={onCancel}>×</button></div>
    <div className="logo-editor-preview"><div className="logo-circle logo-crop-preview"><canvas ref={previewRef} width="512" height="512"/></div></div>
    <div className="logo-crop-controls"><label className="logo-trim-control"><input type="checkbox" checked={trimBackground} onChange={e=>setTrimBackground(e.target.checked)}/><span>Automatically trim empty space around the logo</span></label><label className="logo-scale-control"><span>Zoom <strong>{zoom}%</strong></span><input type="range" min="100" max="250" step="1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label><label className="logo-scale-control"><span>Move left / right</span><input type="range" min="-100" max="100" step="1" value={panX} onChange={e=>setPanX(Number(e.target.value))}/></label><label className="logo-scale-control"><span>Move up / down</span><input type="range" min="-100" max="100" step="1" value={panY} onChange={e=>setPanY(Number(e.target.value))}/></label><button type="button" onClick={()=>{setZoom(100);setPanX(0);setPanY(0);setTrimBackground(true)}}>Reset Crop</button></div>
    <div className="logo-editor-notes"><ImagePlus size={18}/><span>The saved 512 × 512 crop is reused for the sidebar, mobile header, receipts, cards, login screens, and shop profile.</span></div>
    <div className="modal-actions"><button type="button" onClick={onCancel}>Cancel</button><button className="primary-btn" onClick={confirmLogo} disabled={busy}>{busy?'Uploading…':'Use This Logo'}</button></div>
  </div></div>
}

function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not read the selected image.'));img.src=src})}
function detectLogoBounds(img:HTMLImageElement){const max=512,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const width=Math.max(1,Math.round(img.naturalWidth*scale)),height=Math.max(1,Math.round(img.naturalHeight*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return{x:0,y:0,width:img.naturalWidth,height:img.naturalHeight};ctx.drawImage(img,0,0,width,height);const data=ctx.getImageData(0,0,width,height).data;const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1]];const background=corners.reduce((sum,[x,y])=>{const i=(y*width+x)*4;return[sum[0]+data[i],sum[1]+data[i+1],sum[2]+data[i+2]]},[0,0,0]).map(v=>v/4);let left=width,top=height,right=-1,bottom=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,alpha=data[i+3];const distance=Math.abs(data[i]-background[0])+Math.abs(data[i+1]-background[1])+Math.abs(data[i+2]-background[2]);if(alpha>20&&distance>54){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}if(right<left||bottom<top)return{x:0,y:0,width:img.naturalWidth,height:img.naturalHeight};const padding=Math.max(4,Math.round(Math.max(right-left,bottom-top)*.08));left=Math.max(0,left-padding);top=Math.max(0,top-padding);right=Math.min(width-1,right+padding);bottom=Math.min(height-1,bottom+padding);return{x:left/scale,y:top/scale,width:(right-left+1)/scale,height:(bottom-top+1)/scale}}
function blobToDataUrl(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not prepare the logo preview.'));reader.readAsDataURL(blob)})}

function Table({headers,rows}:{headers:string[];rows:React.ReactNode[][]}){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}

export {ProductModal}

