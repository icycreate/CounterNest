import {PosProductBrowser,PosOptions,usePosCatalogue} from './PosProductBrowser'
import {BrandLogo} from './BrandLogo'
import {isPublicCatalogueRoute} from './customerRoutes'
import {readableForeground} from './accessiblePalette'
import {ProductImages} from './ProductImages'
import {BarcodeField} from './Fields'
import {localizeCategory} from './categoryLocalization'
import {NotificationRuntime,NotificationSettings,disconnectOrderPush} from './OrderNotifications'
import {BusinessContactSettings} from './BusinessContacts'
import {StickyActions} from './StickyActions'
import {RecordRemovalDialog} from './RecordRemovalDialog'
import {FormField,InputField,SelectField,TextAreaField} from './Fields'
import {Save} from 'lucide-react'
import {Toggle} from './Fields'
import {SectionHeader} from './Surface'
import {SegmentedNav} from './SegmentedNav'
import {PageHeader} from './PageHeader'
import {Card} from './Surface'
import OperationsCalendar,{CalendarSourcePanel} from './OperationsCalendar'
import {useSharedTheme,defaultTheme,normalizeTheme} from './sharedTheme'
import {BackButton} from './NavigationBoundary'
import {resetUnsaved} from './appNavigation'
import {notifyStartupReady} from './startupLifecycle'
import AuthStartupPending from './AuthStartupPending'
import {RecordTable} from './RecordTable'
import {SearchField} from './SearchField'
import {PhoneInput} from './PhoneInput'
import {companyPhoneCountry,setCompanyPhoneCountry,normalizePhone,getCompanyPhoneCountry,isValidPhone} from './phone'
import {Button} from './Button'
import CashierHome from './CashierHome'
import ImageCropper from './ImageCropper'
import {updateBrowserBranding} from './branding'
import InventorySources from './InventorySources'
import {systemLabel} from './systemLabels'
import {useDialogFocus} from './useDialogFocus'
import {trError,tr,useUiLanguage,setUiLanguage,setLanguageScope,getUiLanguage,getUiLocale,LanguageSelector} from './i18n'
import type {UiLanguage} from './i18n'
import {PosTools} from './PosTools'
import type {HeldLine} from './PosTools'
import {useWorkspace,UxHeader,WorkspaceDashboard,InventoryCards,PersonalSettings,WhatsNew,RecordPreview,QuickActionBridge,WorkspaceStaffRoles} from './UxShell'
import type {SearchResult} from './UxShell'
import {RequestStatus} from './CataloguePreorders'
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
const IngredientPurchasing=lazy(()=>import('./IngredientPurchasing'))
const ProductionOperations=lazy(()=>import('./ProductionOperations').then(m=>({default:m.ProductionOperations})))
const OperationalWorkspace=lazy(()=>import('./OperationalWorkspace'))
const WorkspaceRecovery=lazy(()=>import('./WorkspaceRecovery').then(m=>({default:m.WorkspaceRecovery})))
const WorkspaceHealth=lazy(()=>import('./WorkspaceRecovery').then(m=>({default:m.WorkspaceHealth})))
const PermissionPresets=lazy(()=>import('./OperationsSetup').then(m=>({default:m.PermissionPresets})))
const AccountingSummary=lazy(()=>import('./OperationsSetup').then(m=>({default:m.AccountingSummary})))
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

let activeLanguage:UiLanguage=getUiLanguage()

export default function App() {
  const customerDisplayToken = new URLSearchParams(window.location.search).get('customer_display')
  const inviteToken = new URLSearchParams(window.location.search).get('loyalty_invite')
  const staffInviteToken = new URLSearchParams(window.location.search).get('staff_invite')
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordRecovery,setPasswordRecovery]=useState(false)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  const [onboardingRequired, setOnboardingRequired] = useState(false)
  const [pendingWorkspace,setPendingWorkspace]=useState<any>(null)
  const [accountEmail, setAccountEmail] = useState('')
  const [page, setPage] = useBrowserPage()
  const [compactSidebar,setCompactSidebar]=useState(readCompactSidebar)
  function toggleCompactSidebar(){setCompactSidebar(old=>{const next=!old;try{localStorage.setItem('counternest.navigation.compact',String(next))}catch{}return next})}
  const [role, setRole] = useState<Role>('admin')
  const [staffName, setStaffName] = useState('')
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [shopId, setShopId] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
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
  const uiLanguage=useUiLanguage()
  const scope=`${shopId??'public'}:${accountEmail}`
  const {workspace,error:workspaceError,ready:workspaceReady,save:savePreferences}=useWorkspace(scope,authenticated&&!mustChangePassword&&Boolean(shopId),shopId)
  const [record,setRecord]=useState<SearchResult|null>(null)
  useEffect(()=>{if(authReady&&(!authenticated||!shopId||mustChangePassword||pendingWorkspace||workspaceReady||workspaceError))notifyStartupReady()},[authReady,authenticated,shopId,mustChangePassword,pendingWorkspace,workspaceReady,workspaceError])
  useEffect(()=>{const refresh=()=>void hydrateFromSupabase();window.addEventListener('counternest:workspace-lifecycle',refresh);return()=>window.removeEventListener('counternest:workspace-lifecycle',refresh)},[authenticated])
  const effectiveRole:Role=role==='admin'?'admin':workspace.role==='employee'?'production':workspace.role
  useEffect(()=>{setLanguageScope(authenticated?scope:null)},[scope,authenticated])
  useEffect(()=>{if(shopId)setCompanyPhoneCountry(companyPhoneCountry(shopPhone,currency,timezone));else setCompanyPhoneCountry('BZ')},[shopId,shopPhone,currency,timezone])
  useEffect(()=>{if(workspace.preferences.language)setUiLanguage(workspace.preferences.language)},[workspace.preferences.language])
  useEffect(()=>{const handler=(e:Event)=>{if(authenticated&&shopId)void savePreferences({language:(e as CustomEvent).detail})};window.addEventListener('counternest:language',handler);return()=>window.removeEventListener('counternest:language',handler)},[authenticated,shopId,workspace.preferences])
  activeLanguage=uiLanguage
  useEffect(()=>{if(authenticated&&shopId&&workspace.role!=='employee'&&canAccessPage(effectiveRole,page)){void savePreferences({recent:[page,...(workspace.preferences.recent??[]).filter((p:PageKey)=>p!==page)].slice(0,8)})}},[page,workspace.role,scope])
  const [products, setProducts] = useState<Product[]>(demoProducts)
  const [customers, setCustomers] = useState<Customer[]>(demoCustomers)
  const [rewards, setRewards] = useState<Reward[]>(demoRewards)
  const [stampsRequired, setStampsRequired] = useState(10)
  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)
  const [toast, setToast] = useState('')
  const [sales, setSales] = useState<SaleSummary[]>([
    { id: 's1', receiptNumber: 1001, time: '10:42 AM', items: '2x Croissant, Latte', total: 12, payment: 'Cash', status:'completed', refundedTotal:0 },
    { id: 's2', receiptNumber: 1000, time: '10:28 AM', items: 'Sourdough + Cookies', total: 11.5, payment: 'Card', status:'completed', refundedTotal:0 },
    { id: 's3', receiptNumber: 999, time: '10:05 AM', items: 'Chocolate Cake', total: 28, payment: 'QR', status:'completed', refundedTotal:0 },
  ])

  useSharedTheme(theme,workspace.preferences.appearance??theme.appearance??'system',shopId?'counternest.workspace-theme.'+shopId:undefined,!isPublicCatalogueRoute(location.pathname,location.search))

  useEffect(()=>{activeLanguage=uiLanguage;document.documentElement.lang=uiLanguage},[uiLanguage])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => { setInstallPrompt(null); setStandalone(true); showToast(trError(tr("POS app installed on this device."))) }
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
    if(!isPublicCatalogueRoute(location.pathname,location.search))updateBrowserBranding(authenticated?shopName:'',authenticated?logoUrl:null)
  }, [shopName,logoUrl,authenticated])

  async function installApp() {
    if (standalone) return showToast(trError(tr("POS is already installed on this device.")))
    if (!installPrompt) return showToast(trError(tr("Use your browser menu and choose Install app or Add to Home Screen.")))
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return
    const publicPath=window.location.pathname.replace(/\/$/,'')
    if(['/catalogue-display','/ready-display','/request-status'].includes(publicPath)||(publicPath==='/catalogue'&&new URLSearchParams(window.location.search).has('token'))||new URLSearchParams(window.location.search).has('customer_display'))return
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setAuthenticated(true)
        setAccountEmail(data.user.email ?? '')
        await hydrateFromSupabase()
      }
      setAuthReady(true)
    }).catch(() => setAuthReady(true))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if(event==='PASSWORD_RECOVERY'){setPasswordRecovery(true);setAuthReady(true)}
      setAuthenticated(Boolean(session?.user))
      setAccountEmail(session?.user?.email ?? '')
      if (!session?.user) {
        setOnboardingRequired(false)
        setShopId(null);setShopName('');setLogoUrl(null);setTheme(defaultTheme)
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

    const pending=await supabase.rpc('workspace_pending_state');setPendingWorkspace(pending.data?.pending_at?pending.data:null);if(pending.data?.pending_at)return
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
      supabase.from('customers').select('id,name,email,phone,notes,loyalty_status,visits,total_spent').eq('shop_id', profile.shop_id).eq('active',true).order('name'),
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
      setShopPhone(shop.phone ?? ''); setCompanyPhoneCountry(companyPhoneCountry(shop.phone??'',shop.currency??'',shop.timezone??''))
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
      setTheme(normalizeTheme(shop.theme))
    }
    if (productRows) setProducts(productRows.map((p: any) => ({ id: p.id, name: p.name, barcode: p.barcode ?? undefined, iconEmoji:p.icon_emoji??undefined, category: p.categories?.name??'Other', price: Number(p.price), cost: Number(p.cost_price??0), stock: Number(p.stock), lowAt: Number(p.low_stock_at), active: p.active, image: p.image_url ?? undefined })))
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
    if (supabase) {await disconnectOrderPush();await supabase.auth.signOut()}
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    setIdleWarningSeconds(null)
    setAuthenticated(false)
    setAuthReady(true)
    setOnboardingRequired(false)
    setMustChangePassword(false)
    setShopId(null)
    setShopName('');setLogoUrl(null);setTheme(defaultTheme);resetUnsaved()
    setCart([])
    setAuthMessage(trError(reason === 'inactivity' ? `You were signed out automatically after ${autoLogoutMinutes} minutes of inactivity.` : ''))
  }

  async function enterAuthenticatedSession(newBusiness = false) {
    setPage('dashboard')
    markSessionActivity()
    setAuthMessage(trError(''))
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
      await hydrateFromSupabase();setPage('backup')
      setAuthReady(true)
      return
    }
    if (demoInfo) {
      setShopName(demoInfo.name); setShopPhone(demoInfo.phone); setShopAddress(demoInfo.address); setShopEmail(accountEmail)
      setLogoUrl(demoInfo.logoUrl); setStaffName('Owner'); setRole('admin')
      setProducts([]); setCustomers([]); setRewards([]); setSales([])
    }
    setOnboardingRequired(false);setPage('backup')
  }

  const displayParams=new URLSearchParams(window.location.search)
  const standaloneToken=displayParams.get('catalogue_display')??(window.location.pathname.replace(/\/$/,'')==='/catalogue-display'?displayParams.get('token'):null)
  const readyToken=displayParams.get('ready_display')??(window.location.pathname.replace(/\/$/,'')==='/ready-display'?displayParams.get('token'):null)
  if(window.location.pathname.replace(/\/$/,'')==='/catalogue-display'||standaloneToken)return <CommercialCatalogue key={standaloneToken??'display'} token={standaloneToken??undefined} mode="display"/>
  if(window.location.pathname.replace(/\/$/,'')==='/request-status')return <RequestStatus key={new URLSearchParams(window.location.search).get('token')??''} token={new URLSearchParams(window.location.search).get('token')??''}/>
  if(window.location.pathname.replace(/\/$/,'')==='/ready-display'||readyToken)return readyToken?<ReadyDisplay token={readyToken}/>:<main className="commercial-catalogue"><p role="alert">{tr("Open the protected ready-display link from Display Settings.")}</p></main>
  if (customerDisplayToken || (window.location.pathname.replace(/\/$/,'')==='/catalogue'&&displayParams.has('token'))) return <CommercialCatalogue key={customerDisplayToken??displayParams.get('token')??'customer'} token={customerDisplayToken??displayParams.get('token')??undefined} mode="customer"/>
  if((displayParams.get('preparation')==='1'||['/preparation','/kitchen'].includes(window.location.pathname.replace(/\/$/,'')))&&authenticated&&!mustChangePassword)return <><CalendarSourcePanel/><PreparationScreen standalone/></>
  if (!online && supabaseConfigured && !authenticated) return <OfflineStage />
  if (inviteToken) return <LoyaltyJoin token={inviteToken} />
  if (staffInviteToken) return <StaffInvitationJoin token={staffInviteToken} />
  if(passwordRecovery)return <PasswordRecovery reset onCancel={()=>{setPasswordRecovery(false);void logout()}} onDone={()=>{setPasswordRecovery(false);setAuthMessage(tr('Password updated. Sign in with your new password.'));void logout()}}/>
  if (!authReady) return <AuthStartupPending/>
  if (!authenticated) return <AuthStage onAuthenticated={enterAuthenticatedSession} message={tr(authMessage)} />
  if(pendingWorkspace)return <main className="auth-stage"><Card className="panel"><h1>{tr('Workspace Pending Deletion')}</h1><WorkspaceRecovery shopName={pendingWorkspace.business_name} onRestored={()=>void hydrateFromSupabase()}/><Button onClick={()=>void hydrateFromSupabase()}>{tr('Refresh workspace')}</Button><Button onClick={()=>void logout()}>{tr('Sign out')}</Button></Card></main>
  if (onboardingRequired) return <BusinessOnboarding accountEmail={accountEmail} onComplete={finishBusinessOnboarding} onLogout={logout} />
  if (mustChangePassword) return <InitialPasswordChange accountEmail={accountEmail} onComplete={()=>setMustChangePassword(false)} onLogout={logout} />

  const receiptConfig: ShopReceiptConfig = {
    shopName, logoUrl, address: shopAddress, phone: shopPhone, email: shopEmail, currency, timezone, footer: receiptFooter, staffName
  }

  return (
    <div className={`app-shell ${compactSidebar?'compact-sidebar':''}`}>
      <Sidebar compact={compactSidebar} onToggleCompact={toggleCompactSidebar} page={page} setPage={setPage} staffName={staffName} role={effectiveRole} shopName={shopName} logoUrl={logoUrl} logout={logout} />
      <MobileNavigation page={page} setPage={setPage} staffName={staffName} role={effectiveRole} shopName={shopName} logoUrl={logoUrl} logout={logout} />
      <main className="main"><div className="print-business-brand"><BrandLogo logoUrl={logoUrl} businessName={shopName} theme="light"/><strong>{shopName}</strong></div>
        <QuickActionBridge page={page}/>
        <BackButton/>
        <NotificationRuntime key={scope} enabled={['admin','manager','cashier'].includes(effectiveRole)}/><UxHeader logoUrl={logoUrl} role={effectiveRole} page={page} setPage={setPage} workspace={workspace} save={savePreferences} shopName={shopName} onRecord={setRecord}/>
        <WhatsNew key={scope} scope={scope} seen={workspace.preferences.whats_new==="2026-10-17-operations1"} onDismiss={()=>void savePreferences({whats_new:'2026-10-17-operations1'})}/>
        {workspaceError&&<p role="alert">{workspaceError}</p>}
        {record&&<RecordPreview record={record} workspace={workspace} onClose={()=>setRecord(null)} setPage={setPage}/> }
        {!online && <div className="network-banner"><WifiOff size={17}/><div><strong>{tr("Offline")}</strong><span>{tr("Cached screens remain available, but sales, refunds, sign-in and cloud updates require an internet connection.")}</span></div></div>}
        <CustomerSelectionNotifier setPage={setPage} showToast={showToast} />
        {canAccessPage(effectiveRole,page)?<>
        {['catalogue','commercial','customer-display'].includes(page)&&<SectionTabs label={tr("Catalogue sections")} page={page} setPage={setPage} items={[["catalogue","Catalogue"],["commercial","Variants & Bundles"],["customer-display","Display Settings"]]}/>}
        {['customers','loyalty','cards'].includes(page)&&<SectionTabs label={tr("Customer sections")} page={page} setPage={setPage} items={[["customers","Customers"],["loyalty","Loyalty"],["cards","Cards"]]}/>}
        {['planning','production','forecast-shortages'].includes(page)&&<SectionTabs label={tr("Production planning sections")} page={page} setPage={setPage} items={[["planning","Production Plans"],["production","Production Batches"],["forecast-shortages","Forecast & Shortages"]]}/>}
        {['readiness','acceptance','go-live','security-recovery','release-candidate','operations'].includes(page)&&<SectionTabs label={tr("Deployment and readiness sections")} page={page} setPage={setPage} items={[["readiness","Deployment Overview"],["acceptance","Validation"],["go-live","Launch Sign-off"],["security-recovery","Security & Recovery"],["release-candidate","Release Checks"],["operations","System Health"]]}/>}
        {['tasks','checklists','handover','schedule','alerts','analytics'].includes(page)&&<SectionTabs label={tr("Team workspace sections")} page={page} setPage={setPage} items={([['tasks','Tasks'],['checklists','Checklists'],['handover','Shift Handover'],['schedule','Schedule & Attendance'],['alerts','Alerts'],['analytics','Analytics']] as [PageKey,string][]).filter(([key])=>canAccessPage(effectiveRole,key))}/>}
        {page === 'dashboard' && <>{effectiveRole==='accounting'&&<AccountingSummary/>}{effectiveRole==='cashier'&&<CashierHome scope={scope} customers={customers} onSale={customer=>{if(customer)setSelectedCustomerId(customer);setPage('sale')}}/>}<WorkspaceDashboard workspace={workspace} role={effectiveRole} setPage={setPage} onRecord={setRecord} overview={['admin','cashier'].includes(effectiveRole)?<Dashboard role={effectiveRole} sales={sales} products={products} setPage={setPage} currency={currency}/>:undefined}/>{['admin','inventory','production','manager'].includes(effectiveRole)&&workspace.operational&&<ProductionOperations role={effectiveRole} initialData={workspace.operational} onNavigate={setPage}/>}</>}
        {page === 'sale' && <NewSale checkoutScope={`${shopId??'demo'}:${accountEmail}`} products={products} customers={customers} rewards={rewards} cart={cart} setCart={setCart} taxRate={taxRate} stampsRequired={stampsRequired} selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId} setCustomers={setCustomers} setProducts={setProducts} setSales={setSales} showToast={showToast} refresh={hydrateFromSupabase} receiptConfig={receiptConfig} />}
        {['scheduled-orders','preparation','purchasing','receiving'].includes(page)&&<CalendarSourcePanel/>}
        {page === 'calendar' && <OperationsCalendar key={scope} scope={scope} timezone={timezone}/>}
        {page === 'products' && <Products products={products} setProducts={setProducts} role={effectiveRole} shopId={shopId} showToast={showToast} currency={currency} />}
        {page==='commercial'&&<CommercialManagement role={effectiveRole} showToast={showToast}/>}
        {page==='scheduled-orders'&&<ScheduledOrders role={effectiveRole} showToast={showToast} onPaid={async()=>{await hydrateFromSupabase();setPage('sales');showToast(trError(tr("Order paid. Open its receipt in Sales.")))}}/>}
        {page==='preparation'&&<PreparationScreen/>}
        {page==='forecast-shortages'&&<ForecastShortages role={effectiveRole} showToast={showToast}/>}
        {page === 'catalogue' && <Catalogue role={effectiveRole} shopName={shopName} logoUrl={logoUrl} currency={currency} showToast={showToast} />}
        {page === 'inventory' && (effectiveRole==='admin'?<Inventory products={products} setProducts={setProducts} showToast={showToast}/>:<InventoryCards workspace={workspace} role={effectiveRole} setPage={setPage} onRecord={setRecord}/>)}
        {page === 'recipes' && <RecipeInventory products={products} setProducts={setProducts} role={effectiveRole} currencyCode={currency} showToast={showToast} />}
        {page === 'production-studio' && <ProductionStudio role={effectiveRole} shopId={shopId??''} currency={currency} products={products} showToast={showToast} />}
        {page === 'production' && <ProductionBatches products={products} setProducts={setProducts} role={effectiveRole} showToast={showToast} />}
        {page === 'planning' && <ProductionPlanning products={products} role={effectiveRole} showToast={showToast} />}
        {page==='receiving'&&<IngredientPurchasing key="receiving" initialTab="receiving" role={effectiveRole} currency={currency} showToast={showToast}/>} 
        {page==='purchasing'&&<IngredientPurchasing key="purchasing" initialTab="orders" role={effectiveRole} currency={currency} showToast={showToast}/>} 
        {page==='supply'&&<><IngredientPurchasing role={effectiveRole} currency={currency} showToast={showToast}/>{effectiveRole==='admin'&&<SupplyOperations products={products} role={effectiveRole} currency={currency} shopId={shopId} showToast={showToast}/>}</>}
        {page === 'customers' && <Customers role={effectiveRole} customers={customers} setCustomers={setCustomers} setPage={setPage} setSelectedCustomerId={setSelectedCustomerId} showToast={showToast} currency={currency} shopId={shopId} stampsRequired={stampsRequired} />}
        {page === 'loyalty' && <LoyaltyV2 rewards={rewards} setRewards={setRewards} customers={customers} setCustomers={setCustomers} shopId={shopId} role={effectiveRole} showToast={showToast} currency={currency} stampsRequired={stampsRequired} setStampsRequired={setStampsRequired} />}
        {page === 'cards' && <Cards customers={customers} staffName={staffName} shopName={shopName} logoUrl={logoUrl} shopAddress={shopAddress} businessNumber={businessNumber} role={effectiveRole} showToast={showToast} stampsRequired={stampsRequired} />}
        {page === 'sales' && <Sales sales={sales} setSales={setSales} receiptConfig={receiptConfig} showToast={showToast} refresh={hydrateFromSupabase} />}
        {page==='reports'&&(effectiveRole==='accounting'?<AccountingSummary/>:<Reports logoUrl={logoUrl} shopName={shopName} sales={sales} products={products} currency={currency} role={effectiveRole}/>)}
        {page === 'profit' && <ProfitabilityPage shopName={shopName} role={effectiveRole} currency={currency} showToast={showToast} />}
        {page === 'cash-drawer' && <CashDrawerPage shopId={shopId} role={effectiveRole} currency={currency} online={online} showToast={showToast} />}
        {page === 'hardware' && <HardwareCommissioning role={effectiveRole} staffName={staffName} shopName={shopName} online={online} showToast={showToast} setPage={setPage} />}
        {page === 'customer-display' && <><CustomerDisplaySetup role={effectiveRole} showToast={showToast}/><CustomerContactSettings shopName={shopName} logoUrl={logoUrl} role={effectiveRole} showToast={showToast} display/><CommercialManagement key="display-settings" section="displays" role={effectiveRole} showToast={showToast}/></>}
        {page==='expenses'&&(effectiveRole==='accounting'?<AccountingSummary/>:<ExpensesPage role={effectiveRole} currency={currency} showToast={showToast}/>)}
        {page === 'staff' && <><StaffManagement role={effectiveRole} showToast={showToast}/><PermissionPresets/></>}
        {page === 'audit' && <AuditLog role={effectiveRole} showToast={showToast} />}
        {page==='backup'&&<OperationalWorkspace shopName={shopName} onNavigate={setPage}/>}
        {page==='readiness'&&<><WorkspaceHealth/><LaunchReadiness role={effectiveRole} showToast={showToast} standalone={standalone} online={online}/></>}
        {page === 'acceptance' && <OperationalAcceptance role={effectiveRole} showToast={showToast} />}
        {page === 'go-live' && <InternalGoLive role={effectiveRole} online={online} standalone={standalone} showToast={showToast} />}
        {page === 'report-issue' && <IssueReport role={effectiveRole} online={online} showToast={showToast} />}
        {page === 'handover' && <ShiftHandover role={effectiveRole} online={online} showToast={showToast} />}
        {page === 'tasks' && <OperationalTasks role={effectiveRole} online={online} showToast={showToast} />}
        {page === 'checklists' && <DailyChecklists role={effectiveRole} online={online} showToast={showToast} />}
        {page === 'alerts' && <AlertsEscalations role={effectiveRole} online={online} showToast={showToast} />}
        {page === 'schedule' && <StaffSchedule role={effectiveRole} online={online} showToast={showToast} />}
        {page === 'analytics' && <OperationsAnalytics role={effectiveRole} currency={currency} showToast={showToast} />}
        {page === 'security-recovery' && <SecurityRecovery role={effectiveRole} online={online} showToast={showToast} />}
        {page === 'release-candidate' && <InternalReleaseCandidate role={effectiveRole} online={online} showToast={showToast} />}
        {page === 'operations' && <OperationsCenter role={effectiveRole} online={online} showToast={showToast} />}
        
        {page === 'settings' && <SettingsPage preferences={<PersonalSettings workspace={workspace} save={savePreferences} role={effectiveRole}/>} theme={{...theme,appearance:workspace.preferences.appearance??theme.appearance??'system'}} setTheme={setTheme} shopName={shopName} setShopName={setShopName} logoUrl={logoUrl} setLogoUrl={setLogoUrl} taxRate={taxRate} setTaxRate={setTaxRate} shopAddress={shopAddress} setShopAddress={setShopAddress} shopPhone={shopPhone} setShopPhone={setShopPhone} businessNumber={businessNumber} setBusinessNumber={setBusinessNumber} shopEmail={shopEmail} setShopEmail={setShopEmail} currency={currency} setCurrency={setCurrency} timezone={timezone} setTimezone={setTimezone} receiptFooter={receiptFooter} setReceiptFooter={setReceiptFooter} shopId={shopId} role={effectiveRole} showToast={showToast} installApp={installApp} installAvailable={Boolean(installPrompt)} standalone={standalone} online={online} uiLanguage={uiLanguage} setUiLanguage={setUiLanguage} autoLogoutEnabled={autoLogoutEnabled} setAutoLogoutEnabled={setAutoLogoutEnabled} autoLogoutMinutes={autoLogoutMinutes} setAutoLogoutMinutes={setAutoLogoutMinutes} />}
        </>:<Card className="panel"><h1>{tr("Administrator access required")}</h1><p>{tr("This page is restricted to management. Choose an available section from the menu.")}</p><Button variant="secondary" type="button" onClick={()=>setPage('dashboard')}>{tr("Return to dashboard")}</Button></Card>}
      </main>
      {idleWarningSeconds!==null&&<div className="session-timeout-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-timeout-title"><div className="session-timeout-card"><ShieldAlert size={34}/><h2 id="session-timeout-title">{tr("Session expiring")}</h2><p>{tr("No activity has been detected. For shared-device security, CounterNest will sign you out in")+' '} <strong>{idleWarningSeconds}{' '+tr("second")}{idleWarningSeconds===1?'':tr("s")}</strong>.</p><small>{tr("Any unsaved cart or form work will be cleared when the session ends.")}</small><div><Button variant="secondary" type="button" onClick={()=>void logout()}>{tr("Log Out Now")}</Button><Button variant="primary" className="primary-btn" type="button" onClick={markSessionActivity}>{tr("Stay Signed In")}</Button></div></div></div>}
      {toast && <div className="toast">{tr(toast)}</div>}
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
        if (err || !data?.length) { setError(trError(err?.message ?? tr("Invitation not found."))); setLoading(false); return }
        const row = data[0]
        setInfo(row); setName(row.customer_name ?? ''); setLoading(false)
      } else {
        setInfo({ shop_name: 'CounterNest POS', logo_url: null, customer_name: 'Guest Customer', email: 'customer@example.com', status: 'pending', expires_at: new Date(Date.now()+7*86400000).toISOString() })
        setName('Guest Customer'); setLoading(false)
      }
    }
    load()
  }, [token])

  async function join(e: FormEvent) {
    e.preventDefault(); setError(trError(''))
    if (!info || info.status !== 'pending') return
    if (supabaseConfigured && supabase) {
      const { data, error: err } = await supabase.rpc('accept_loyalty_invitation', { p_token: token, p_name: name, p_phone: normalizePhone(phone,getCompanyPhoneCountry()) || null })
      if (err) { setError(trError(err.message)); return }
      setMemberCode(data.member_code)
    } else setMemberCode('LOY-DEMO1234')
  }

  if (loading) return <div className="login-screen"><div className="login-card"><p>{tr("Loading invitation…")}</p></div></div>
  if (error && !info) return <div className="login-screen"><div className="login-card"><Brand shopName="CounterNest POS"/><h1>{tr("Invitation unavailable")}</h1><div className="error-box">{tr(error)}</div></div></div>
  if (memberCode) return <div className="login-screen"><div className="login-card join-success"><Brand shopName={info?.shop_name ?? 'CounterNest POS'} logoUrl={info?.logo_url ?? null}/><Sparkles size={42}/><h1>{tr("Welcome to Rewards!")}</h1><p>{tr("Your loyalty membership is active.")}</p><strong className="member-code">{memberCode}</strong><p>{tr("Keep this member code for future reference. The business can also send or print your digital loyalty card.")}</p></div></div>
  const inactive = info?.status !== 'pending'
  return <div className="login-screen"><form className="login-card" onSubmit={join}><Brand shopName={info?.shop_name ?? 'CounterNest POS'} logoUrl={info?.logo_url ?? null}/><h1>{tr("Join Rewards")}</h1><p>{tr("Earn and redeem customer rewards.")}</p>{inactive && <div className="error-box">{tr("This invitation is")+' '} {systemLabel(info?.status)}.</div>}<FormField>{tr("Name")}<InputField value={name} onChange={e=>setName(e.target.value)} required/></FormField><FormField>{tr("Email")}<InputField value={info?.email ?? ''} disabled/></FormField><FormField>{tr("Phone (optional)")}<PhoneInput value={phone} onChange={setPhone} /></FormField><FormField className="switch-line"><InputField type="checkbox" required/>{' '+tr("I agree to join the loyalty program.")}</FormField>{error&&<div className="error-box">{tr(error)}</div>}<Button type="submit" variant="primary" className="primary-btn" disabled={inactive}>{tr("Join Rewards")}</Button></form></div>
}

function PasswordInput(props:InputHTMLAttributes<HTMLInputElement>){
  const[visible,setVisible]=useState(false)
  const{className,...rest}=props
  return <div className={`password-field ${className??''}`}><InputField {...rest} type={visible?'text':'password'}/><Button variant="ghost" type="button" className="password-visibility" onClick={()=>setVisible(v=>!v)} aria-label={visible?tr("Hide password"):tr("Show password")} title={visible?tr("Hide password"):tr("Show password")}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</Button></div>
}

function Brand({ shopName, compact = false, logoUrl = null }: { shopName: string; compact?: boolean; logoUrl?: string | null }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}>
    <div className={`logo-circle ${!logoUrl ? 'logo-empty' : ''}`}><BrandLogo logoUrl={logoUrl} businessName={shopName} variant={compact?'icon':'full'} theme="auto"/></div>
    <div className="brand-name">{shopName}</div>
  </div>
}

function StaffInvitationJoin({token}:{token:string}){
  const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[mode,setMode]=useState<'signin'|'signup'>('signup');const[info,setInfo]=useState<any>(null);const[message,setMessage]=useState('');const[busy,setBusy]=useState(true)
  async function accept(){if(!supabase)return;const{data:user}=await supabase.auth.getUser();if(!user.user)return false;const{error}=await supabase.rpc('accept_staff_invitation',{p_token:token});if(error){setMessage(error.message);return false}setMessage(tr("Invitation accepted. Opening the POS…"));window.setTimeout(()=>{window.location.href=window.location.origin+window.location.pathname},900);return true}
  useEffect(()=>{async function load(){if(!supabaseConfigured||!supabase){setInfo({shop_name:'CounterNest POS',display_name:'Invited Employee',email:'employee@example.com',role:'employee'});setEmail('employee@example.com');setBusy(false);return}const{data,error}=await supabase.rpc('get_staff_invitation',{p_token:token});if(error||!data){setMessage(error?.message??tr("Invitation not found."));setBusy(false);return}setInfo(data);setEmail(data.email);if(await accept())return;setBusy(false)}void load()},[token])
  async function submit(e:FormEvent){e.preventDefault();if(!supabaseConfigured||!supabase){setMessage(tr("Demo invitation accepted."));return}setBusy(true);setMessage('');if(mode==='signup'){if(password!==confirmPassword){setMessage(tr("Passwords do not match."));setBusy(false);return}const{data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.href,data:{display_name:info?.display_name}}});if(error)setMessage(error.message);else if(data.session)await accept();else setMessage(tr("Check your email to confirm the account, then return through this invitation link."))}else{const{error}=await supabase.auth.signInWithPassword({email,password});if(error)setMessage(error.message);else await accept()}setBusy(false)}
  if(busy&&!info)return <div className="auth-stage"><div className="auth-loading">{tr("Checking staff invitation…")}</div></div>
  return <div className="auth-stage"><form className="auth-card" onSubmit={submit}><div className="auth-heading"><h1>{tr("Join")+' '} {info?.shop_name??tr("the POS team")}</h1><p>{tr("You were invited as")+' '} {info?.role??tr("employee")}{tr(". Sign in or create the account for the invited email.")}</p></div>{message&&<div className={message.includes('accepted')||message.startsWith('Check')?'auth-notice':'error-box'}>{message}</div>}<FormField>{tr("Display name")}<InputField value={info?.display_name??''} disabled/></FormField><FormField>{tr("Email")}<InputField type="email" value={email} disabled/></FormField><FormField>{tr("Password")}<PasswordInput minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></FormField>{mode==='signup'&&<FormField>{tr("Confirm password")}<PasswordInput minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></FormField>}<Button type="submit" variant="primary" className="auth-submit" disabled={busy}>{busy?tr("Please wait…"):mode==='signup'?tr("Create Staff Account"):tr("Sign In & Accept")}</Button><div className="auth-switch"><span>{mode==='signup'?tr("Already have an account?"):tr("Need an account?")}</span><Button variant="secondary" type="button" onClick={()=>{setMode(mode==='signup'?'signin':'signup');setPassword('');setConfirmPassword('')}}>{mode==='signup'?tr("Sign in"):tr("Create account")}</Button></div></form></div>
}

function AuthStage({ onAuthenticated, message = '' }: { onAuthenticated: (newBusiness?: boolean) => Promise<void> | void; message?: string }) {
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [forgot,setForgot]=useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function switchMode(next:'signin'|'signup') {
    setMode(next); setError(trError('')); setNotice(''); setPassword(''); setConfirmPassword('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(trError('')); setNotice('')
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
      setError(trError(err instanceof Error ? err.message : tr("Could not continue.")))
    } finally { setBusy(false) }
  }

  if(forgot)return <PasswordRecovery reset={false} onCancel={()=>setForgot(false)} onDone={()=>setForgot(false)}/>
  return <div className="auth-stage"><div className="auth-language"><LanguageSelector id="login-language"/></div>
    <form className="auth-card" onSubmit={submit}>
      <BrandLogo mode="platform" theme="light" className="auth-platform-logo"/>
      <div className="auth-heading">
        <h1>{mode==='signin'?tr("Sign in"):tr("Create your account")}</h1>
        <p>{mode==='signin'?tr("Enter your account details to open the POS."):tr("Create the owner account first. Your business information is collected on the next screen.")}</p>
      </div>
      {message&&mode==='signin'&&<div className="auth-notice">{message}</div>}
      {mode==='signup'&&<FormField>{tr("Owner name")}<InputField value={ownerName} onChange={e=>setOwnerName(e.target.value)} autoComplete="name" placeholder={tr("Your name")} required/></FormField>}
      <FormField>{tr("Email address")}<InputField value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder={tr("you@business.com")} required/></FormField>
      <FormField>{tr("Password")}<PasswordInput value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'} placeholder={mode==='signup'?tr("At least 8 characters"):tr("Enter your password")} required/></FormField>
      {mode==='signup'&&<FormField>{tr("Confirm password")}<PasswordInput value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder={tr("Repeat your password")} required/></FormField>}
      {error&&<div className="error-box">{tr(error)}</div>}
      {notice&&<div className="auth-notice">{notice}</div>}
      <Button type="submit" variant="primary" className="auth-submit" disabled={busy}>{busy?(mode==='signin'?tr("Signing in…"):tr("Creating account…")):(mode==='signin'?tr("Sign In"):tr("Create Account"))}</Button>
      {mode==='signin'&&<Button variant="ghost" type="button" className="text-button" onClick={()=>setForgot(true)}>{tr('Forgot password?')}</Button>}
      <div className="auth-switch">
        <span>{mode==='signin'?tr("Don't have a business account?"):tr("Already have an account?")}</span>
        <Button variant="secondary" type="button" onClick={()=>switchMode(mode==='signin'?'signup':'signin')}>{mode==='signin'?tr("Sign up"):tr("Sign in")}</Button>
      </div>
      {!supabaseConfigured&&<div className="demo-note">{tr("Demo mode is active because Supabase environment values are not configured.")}</div>}
    </form>
  </div>
}


function PasswordRecovery({reset,onCancel,onDone}:{reset:boolean;onCancel:()=>void;onDone:()=>void}){
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError('');try{
  if(reset){if(password.length<12||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))throw new Error('Use at least 12 characters with upper-case, lower-case, and a number.');if(password!==confirmPassword)throw new Error('Passwords do not match.');const result=await supabase.auth.updateUser({password});if(result.error)throw result.error;await supabase.auth.signOut();onDone()}
  else{const result=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/dashboard'});if(result.error)throw result.error;setNotice(tr('If an account matches, a password reset link will arrive by email.'))}
 }catch(err){setError(trError(err instanceof Error?err.message:'Could not continue.'))}finally{setBusy(false)}}
 return <div className="auth-stage"><div className="auth-language"><LanguageSelector id="recovery-language"/></div><form className="auth-card" onSubmit={submit}><div className="auth-heading"><h1>{tr('Reset password')}</h1></div>{reset?<><FormField>{tr('New password')}<PasswordInput required autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></FormField><FormField>{tr('Confirm new password')}<PasswordInput required autoComplete="new-password" minLength={12} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></FormField><small>{tr('At least 12 characters, including upper-case, lower-case, and a number.')}</small></>:<FormField>{tr('Email address')}<InputField required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></FormField>}{error&&<p className="error-box" role="alert">{error}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}<Button type="submit" variant="primary" className="auth-submit" disabled={busy}>{busy?tr('Please wait…'):tr(reset?'Save new password':'Send reset link')}</Button><Button variant="ghost" className="text-button" type="button" onClick={onCancel}>{tr('Back')}</Button></form></div>
}

function InitialPasswordChange({accountEmail,onComplete,onLogout}:{accountEmail:string;onComplete:()=>void;onLogout:()=>Promise<void>|void}){
  const[currentPassword,setCurrentPassword]=useState('');const[newPassword,setNewPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('')
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError(trError(''));try{
    if(!supabase)throw new Error('Supabase is not configured.')
    if(newPassword.length<12||!/[a-z]/.test(newPassword)||!/[A-Z]/.test(newPassword)||!/[0-9]/.test(newPassword))throw new Error('Use at least 12 characters with upper-case, lower-case, and a number.')
    if(newPassword!==confirmPassword)throw new Error('New passwords do not match.')
    const{error:changeError}=await supabase.functions.invoke('change-initial-password',{body:{current_password:currentPassword,new_password:newPassword,confirm_password:confirmPassword}})
    if(changeError){let message=changeError.message;try{const payload=await (changeError as any).context?.json();if(payload?.error)message=payload.error}catch{/* retain transport error */}throw new Error(message)}
    onComplete()
  }catch(err){setError(trError(err instanceof Error?err.message:tr("Password could not be changed.")))}finally{setBusy(false)}}
  return <div className="auth-stage"><form className="auth-card" onSubmit={submit}><div className="auth-heading"><h1>{tr("Create your private password")}</h1><p>{tr("An administrator created this account with a temporary password. Replace it before using CounterNest POS.")}</p></div><FormField>{tr("Email address")}<InputField value={accountEmail} disabled/></FormField><FormField>{tr("Current temporary password")}<PasswordInput autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></FormField><FormField>{tr("New password")}<PasswordInput autoComplete="new-password" minLength={12} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></FormField><FormField>{tr("Confirm new password")}<PasswordInput autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></FormField><small className="muted">{tr("At least 12 characters, including upper-case, lower-case, and a number.")}</small>{error&&<div className="error-box">{tr(error)}</div>}<Button type="submit" variant="primary" className="auth-submit" disabled={busy}>{busy?tr("Saving…"):tr("Change Password & Continue")}</Button><Button variant="ghost" className="text-button" type="button" onClick={()=>void onLogout()}>{tr("Sign out")}</Button></form></div>
}


function BusinessOnboarding({accountEmail,onComplete,onLogout}:{accountEmail:string;onComplete:(demoInfo?:{name:string;phone:string;address:string;logoUrl:string|null})=>Promise<void>;onLogout:()=>Promise<void>|void}){
  const [restore,setRestore]=useState(false)
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
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))return setError(trError(tr("Choose a PNG, JPG, or WebP logo.")))
    if(file.size>8*1024*1024)return setError(trError(tr("The logo must be 8 MB or smaller.")))
    setError(trError(''))
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
    e.preventDefault();setError(trError(''))
    if(!businessName.trim()||!phone.trim()||!address.trim())return setError(trError(tr("Business name, phone number, and address are required.")))
    setBusy(true)
    try{
      if(supabaseConfigured&&supabase){
        const{data:userData}=await supabase.auth.getUser()
        if(!userData.user)throw new Error('Your sign-in session expired. Please sign in again.')
        const displayName=String(userData.user.user_metadata?.display_name??userData.user.email?.split('@')[0]??'Owner')
        const{data:newShopId,error:bootstrapError}=await supabase.rpc('bootstrap_business',{p_shop_name:businessName.trim(),p_phone:normalizePhone(phone,getCompanyPhoneCountry()),p_address:address.trim(),p_display_name:displayName})
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
        await onComplete({name:businessName.trim(),phone:normalizePhone(phone,getCompanyPhoneCountry()),address:address.trim(),logoUrl:demoLogo})
      }
    }catch(err){setError(trError(err instanceof Error?err.message:tr("Could not finish business setup.")))}
    finally{setBusy(false)}
  }
  if(restore)return <main className="onboarding-stage"><Card className="panel"><Button data-back-close="true" onClick={()=>setRestore(false)}>{tr('Back')}</Button><WorkspaceRecovery restoreOnly onRestored={()=>void onComplete()}/></Card></main>
  return <div className="onboarding-stage">
    <div className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="business-setup-title">
      <LanguageSelector id="onboarding-language"/><div className="onboarding-head"><div className="onboarding-icon"><Store size={24}/></div><div><small>{tr("FIRST-TIME SETUP")}</small><h1 id="business-setup-title">{tr("Tell us about your business")}</h1><p>{tr("This information creates your shop profile and can be changed later in Settings.")}</p></div></div>
      <Button onClick={()=>setRestore(true)}>{tr('Restore from CounterNest Backup')}</Button><form onSubmit={submit}>
        <div className="onboarding-grid">
          <FormField>{tr("Business name")}<InputField value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder={tr("Your company or shop name")} required/></FormField>
          <FormField>{tr("Business phone number")}<PhoneInput value={phone} onChange={setPhone} placeholder={tr("Business contact number")} required/></FormField>
          <FormField className="full">{tr("Business address")}<InputField value={address} onChange={e=>setAddress(e.target.value)} placeholder={tr("Street, city / district, country")} required/></FormField>
          <FormField className="full muted-field">{tr("Account email")}<InputField value={accountEmail} disabled/></FormField>
        </div>
        <div className="onboarding-logo">
          <div className="onboarding-logo-preview"><BrandLogo logoUrl={logoPreview} businessName={businessName}/></div>
          <div className="onboarding-logo-actions"><strong>{tr("Business logo")}</strong><p>{tr("Optional. Upload PNG, JPG or WebP up to 8 MB. You can resize it before saving.")}</p><FormField className="upload-logo-btn"><Upload size={17}/>{logoPreview?tr("Change Logo"):tr("Choose Logo")}<InputField type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{chooseLogo(e.target.files?.[0]);e.currentTarget.value=''}}/></FormField>{logoPreview&&<Button variant="danger" type="button" className="danger-outline" onClick={removePreparedLogo}><Trash2 size={17}/>{' '+tr("Remove")}</Button>}</div>
        </div>
        {error&&<div className="error-box">{tr(error)}</div>}
        <div className="onboarding-actions"><Button variant="ghost" type="button" className="text-button" onClick={onLogout}>{tr("Sign out")}</Button><Button type="submit" variant="primary" className="auth-submit" disabled={busy}>{busy?tr("Creating business…"):tr("Create Business & Open POS")}</Button></div>
      </form>
      {logoEditorSrc&&<LogoEditor src={logoEditorSrc} onCancel={()=>setLogoEditorSrc(null)} onUpload={keepPreparedLogo}/>} 
    </div>
  </div>
}


function OfflineStage() {
  return <div className="offline-stage">
    <div className="offline-card">
      <div className="offline-icon"><WifiOff size={28}/></div>
      <h1>{tr("No internet connection")}</h1>
      <p>{tr("The POS app shell is available, but your business data is protected in the cloud. Reconnect to sign in and safely load sales, inventory, customers and loyalty information.")}</p>
      <Button type="submit" variant="primary" className="auth-submit" onClick={() => window.location.reload()}>{tr("Try Again")}</Button>
      <small>{tr("If this device was already using the POS when the connection was lost, keep that open session on screen until the connection returns.")}</small>
    </div>
  </div>
}


function Dashboard({ sales, products, setPage, currency, role }: { role:Role; sales: SaleSummary[]; products: Product[]; setPage: (p: PageKey) => void; currency: string }) {
  const todaySales = sales.reduce((a, s) => a + netSaleTotal(s), 0)
  const low = products.filter(p => p.stock <= p.lowAt)
  const top = products[0]?.name ?? '—'
  return <>
    <h2>{tr("Sales & Activity")}</h2>
    <div className="dashboard-sales-grid">{sales.length>0&&<section className="panel redesign-chart" aria-label={tr('Recent sales overview')}><div className="panel-title"><h2>{tr('Recent sales overview')}</h2><span>{tr('Recent Sales')}</span></div><div className="redesign-bars">{sales.slice(0,8).reverse().map(s=><div key={s.id}><strong>{money(netSaleTotal(s),currency)}</strong><span style={{height:Math.max(4,Math.max(0,netSaleTotal(s))/Math.max(1,...sales.slice(0,8).map(netSaleTotal))*110)}}/><small>{s.time}</small></div>)}</div></section>}
    <section className="two-col redesign-sales">
      <div className="panel"><div className="panel-title"><h2>{tr("Recent Sales")}</h2><Button type="submit" variant="secondary" onClick={() => setPage('sales')}>{tr("View all")}</Button></div><div className="sale-list">{sales.slice(0, 6).map(s => <div className="sale-row" key={s.id}><span>{s.time}</span><strong>{s.items}</strong><b>{money(netSaleTotal(s),currency)}</b></div>)}</div></div>

    </section>
    </div><Card className="panel"><div className="panel-title"><h2>{tr("Low Stock Alerts")}</h2>{role==='admin'&&<Button type="submit" variant="secondary" onClick={() => setPage('inventory')}>{tr("View Inventory")}</Button>}</div><Table headers={['Item','Current Stock','Reorder At','Status']} rows={(low.length ? low : products.slice(0,3)).map(p => [p.name, String(p.stock), String(p.lowAt), p.stock === 0 ? 'Out of Stock' : p.stock <= p.lowAt ? 'Low' : 'OK'])}/></Card>
  </>
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) { return <div className="stat-card"><span>{tr(label)}</span><strong>{value}</strong><small>{tr(sub)}</small></div> }

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
        if(definitiveCheckoutFailure(error.code)){rememberCheckout(null);props.showToast(trError(error.message));await syncPrices();await repriceCart()}
        else props.showToast(trError('Payment confirmation is pending. Retry the same checkout to recover its result; do not take payment again.'))
        return
      }
      confirmed=true
      rememberCheckout(null)
      props.setCart([]);props.setSelectedCustomerId('');setAppliedRewardId('')
      const loaded=await fetchReceipt(String(data.sale_id),props.receiptConfig);if(loaded)setReceipt(loaded)
      props.showToast(trError(`${data.replayed?'Checkout recovered':'Sale complete'} • ${money(Number(data.total),props.receiptConfig.currency)}`))
      await props.refresh()
    }catch{props.showToast(trError(confirmed?'Sale saved. Open Sales to retrieve its receipt; do not take payment again.':'The checkout response was interrupted. Retry confirmation using the saved checkout reference.'))}
    finally{checkoutLock.current=false;setBusy(false)}
  }
  const [busy, setBusy] = useState(false)
  const [appliedRewardId, setAppliedRewardId] = useState('')
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [cashTenderOpen, setCashTenderOpen] = useState(false)
  const [paymentConfirm,setPaymentConfirm]=useState<'card'|'qr'|null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [cameraOpen,setCameraOpen]=useState(false)
  const [pricedProducts,setPricedProducts]=useState<Product[]>(props.products)
  const [priceSyncError,setPriceSyncError]=useState('')
  const {data:posCatalogue,error:optionsError}=usePosCatalogue()
  const commercialProducts=posCatalogue?.products??[]
  const [optionProduct,setOptionProduct]=useState<CommercialProduct|null>(null)
  const [mobileCartOpen,setMobileCartOpen]=useState(false)
  const cartHeading=useRef<HTMLHeadingElement>(null)
  const viewCartButton=useRef<HTMLButtonElement>(null)
  useEffect(()=>{if(mobileCartOpen){cartHeading.current?.focus();cartHeading.current?.scrollIntoView({block:'nearest'})}},[mobileCartOpen])
  function closeMobileCart(){setMobileCartOpen(false);window.requestAnimationFrame(()=>viewCartButton.current?.focus())}
  function addCommercial(item:CommercialItem){
    const line=commercialCartLine(item)
    props.setCart(old=>{
      const found=old.find(x=>x.id===line.id&&(x.variantId??null)===(line.variantId??null)&&(x.catalogOption??null)===(line.catalogOption??null)&&(x.comboId??null)===(line.comboId??null)&&JSON.stringify(x.comboChoices??null)===JSON.stringify(line.comboChoices??null))
      return found?old.map(x=>x===found?{...x,qty:x.qty+line.qty}:x):[...old,line]
    })
  }
  function selectProduct(p:Product){
    if(supabaseConfigured&&!posCatalogue){props.showToast(trError('Product options are unavailable. Refresh before adding products.'));return}
    const detail=commercialProducts.find(x=>x.id===p.id)
    if(detail&&(detail.variants.length||detail.option_labels.length)){setOptionProduct(detail);return}
    add(p)
  }
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

  function add(p: Product) { if (p.stock <= 0) return; const key=p.cartKey??p.id; props.setCart(c => { const used=c.filter(x=>x.id===p.id).reduce((sum,x)=>sum+x.qty,0);if(used>=p.stock)return c;const old = c.find(x => x.id===p.id&&!x.variantId&&!x.comboId&&!x.catalogOption); return old ? c.map(x => x===old ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...p, cartKey:key, qty: 1 }] }) }
  function change(key: string, d: number) { props.setCart(c => {const target=c.find(x=>(x.cartKey??x.id)===key);if(!target)return c;const otherQty=c.filter(x=>x.id===target.id&&(x.cartKey??x.id)!==key).reduce((sum,x)=>sum+x.qty,0);const maxForLine=target.variantId||target.comboId?1000:Math.max(0,target.stock-otherQty);return c.map(x => (x.cartKey??x.id) === key ? { ...x, qty: Math.max(0, Math.min(x.qty + d, maxForLine)) } : x).filter(x => x.qty > 0)}) }
  function scanBarcode(raw:string){const code=raw.trim();if(!code)return;const variantProduct=commercialProducts.find(p=>p.variants.some(v=>v.barcode===code));if(variantProduct){const v=variantProduct.variants.find(v=>v.barcode===code)!;if(!v.available)return props.showToast(trError('This variant is sold out.'));addCommercial({product_id:variantProduct.id,variant_id:v.id,qty:1,expected_unit_price:Number(v.price),name:variantProduct.name+' — '+v.name});setBarcodeInput('');return}const product=pricedProducts.find(p=>p.active&&p.barcode===code);if(!product)return props.showToast(trError(`Barcode ${code} is not assigned to a product.`));if(product.stock<=0)return props.showToast(trError(`${product.name} is out of stock.`));selectProduct(product);setBarcodeInput('')}
  useEffect(()=>{let buffer='';let last=0;const onKey=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target&&['INPUT','TEXTAREA','SELECT'].includes(target.tagName))return;const now=Date.now();if(now-last>100)buffer='';last=now;if(event.key==='Enter'){if(buffer.length>=3){event.preventDefault();scanBarcode(buffer)}buffer='';return}if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey)buffer+=event.key};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[pricedProducts,commercialProducts,posCatalogue])

  async function resumeHeld(lines:HeldLine[]):Promise<boolean>{
    if(pendingCheckout||busy||props.cart.length)return false
    if(supabaseConfigured&&supabase){
      const r=await supabase.rpc('quote_commercial_sale',{p_items:lines,p_customer:null,p_reward:null})
      if(r.error||!Array.isArray(r.data?.items)||r.data.items.length!==lines.length){props.showToast(trError(r.error?.message??'Held sale could not be priced.'));return false}
      if(r.data.items.some((x:any)=>!Number.isFinite(Number(x.price))||Number(x.price)<0))return false
      const rebuilt=lines.map((line,i)=>commercialCartLine({...line,expected_unit_price:Number(r.data.items[i].price),name:pricedProducts.find(p=>p.id===line.product_id)?.name??commercialProducts.find(p=>p.id===line.product_id)?.name??'Bundle'}))
      props.setCart(rebuilt)
    }else{
      const rebuilt:CartLine[]=[]
      for(const line of lines){const p=pricedProducts.find(p=>p.id===line.product_id);if(!p||!p.active||line.variant_id||line.combo_id||p.stock<lines.filter(x=>x.product_id===p.id).reduce((n,x)=>n+x.qty,0)){props.showToast(trError('A held product is unavailable.'));return false}rebuilt.push({...p,cartKey:p.id,qty:line.qty})}
      props.setCart(rebuilt)
    }
    props.setSelectedCustomerId('');setAppliedRewardId('');return true
  }
  const offlineLocked = supabaseConfigured && !navigator.onLine

  async function charge(payment: 'cash'|'card'|'qr', cashReceived?: number) {
    if (offlineLocked) { props.showToast(trError('Reconnect to the internet before completing a sale.')); return }
    if (!props.cart.length || busy || checkoutLock.current || pendingCheckout) return
    if(supabaseConfigured&&!currentQuote){props.showToast(trError('Wait for the current checkout quote.'));await repriceCart();return}
    if(priceSyncError){props.showToast(trError(priceSyncError));await syncPrices();await repriceCart();return}
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
    props.setCart([]); props.setSelectedCustomerId(''); setAppliedRewardId(''); setReceipt(demoReceipt); props.showToast(trError('Sale completed')); setBusy(false)
  }

  return <>
    <span hidden data-payment-active={Boolean(busy||pendingCheckout||cashTenderOpen||paymentConfirm)}/>
    {priceSyncError&&<div role="alert" className="warning-box">{priceSyncError}</div>}<PageHeader title={tr("New Sale")}></PageHeader>
    <PosTools scope={props.checkoutScope} products={pricedProducts} customers={props.customers} cart={props.cart} locked={Boolean(pendingCheckout)||busy} onAdd={selectProduct} onResume={resumeHeld} onHeld={()=>{props.setCart([]);props.setSelectedCustomerId('');setAppliedRewardId('')}} onCustomer={id=>{props.setSelectedCustomerId(id);setAppliedRewardId('')}} onBarcodeFocus={()=>document.querySelector<HTMLInputElement>('input[aria-label="Barcode"]')?.focus()} notify={props.showToast}/>
    <CommercialSelectionInbox cart={props.cart} setCart={props.setCart} showToast={props.showToast}/>
    {customer && customer.loyaltyStatus !== 'member' && <div className="invite-banner"><div><strong>{customer.name}{' '+tr("is not enrolled in loyalty.")}</strong><span>{customer.loyaltyStatus === 'invited' ? tr(" Invitation already sent.") : tr(" Invite them without blocking checkout.")}</span></div><Button type="submit" variant="secondary" onClick={() => sendInvite(customer, props.setCustomers, props.showToast)}><Mail size={17}/> {customer.loyaltyStatus === 'invited' ? tr("Resend Invite") : tr("Invite to Loyalty")}</Button></div>}
    {customer?.loyaltyStatus === 'member' && <div className="member-banner"><Sparkles size={18}/><strong>{customer.name}</strong><span>{customer.points}{' '+tr("points")}</span><span>{customer.stamps}/{props.stampsRequired}{' '+tr("stamps")}</span></div>}
    <div className="new-sale-workspace"><div className={`pos-grid new-sale-grid ${mobileCartOpen?'mobile-cart-open':''}`}>
      <section className="catalog">
        <div className="scanner-row"><form className="barcode-entry" onSubmit={e=>{e.preventDefault();scanBarcode(barcodeInput)}}><QrCode size={18}/><InputField aria-label={tr("Barcode")} inputMode="numeric" value={barcodeInput} onChange={e=>setBarcodeInput(e.target.value)} placeholder={tr("Scan or enter barcode")}/><Button variant="secondary" type="submit">{tr("Add")}</Button></form><Button variant="secondary" className="camera-scan-btn" type="button" onClick={()=>setCameraOpen(true)}><Camera size={18}/>{' '+tr("Camera Scan")}</Button></div>
        <div className="scanner-note">{tr("Use a phone camera, webcam, or USB/Bluetooth keyboard-mode scanner. Camera permission is requested only while the scanner is open.")}</div>
        <PosProductBrowser products={pricedProducts} data={posCatalogue} error={optionsError} currency={props.receiptConfig.currency} onSelect={selectProduct} onAdd={addCommercial}/>
      </section>
      <aside className="cart-panel" aria-label={tr("Current cart")}><Button type="button" variant="secondary" className="pos-back-products" onClick={closeMobileCart}>{tr("Back to products")}</Button><div className="panel-title"><h2 ref={cartHeading} tabIndex={-1}>{tr("Cart (")}{props.cart.reduce((a,x)=>a+x.qty,0)})</h2><Button type="submit" variant="danger" onClick={() => props.setCart([])}>{tr("Clear")}</Button></div>
        <div className="customer-picker"><SelectField aria-label={tr("Customer")} value={props.selectedCustomerId} onChange={e => { props.setSelectedCustomerId(e.target.value); setAppliedRewardId('') }}><option value="">{tr("Walk-in / Guest")}</option>{props.customers.map(c => <option value={c.id} key={c.id}>{c.name} {c.loyaltyStatus === 'member' ? `• ${c.points} pts • ${c.stamps} stamps` : ''}</option>)}</SelectField></div>
        <div className="pos-cart-scroll"><div className="cart-lines">{props.cart.length === 0 ? <div className="empty"><ShoppingCart/><p>{tr("Tap a product to begin.")}</p></div> : props.cart.map(x => {const key=x.cartKey??x.id;return <div className="cart-line" key={key}><div className="mini-art">{x.iconEmoji??productEmoji(x.category)}</div><div className="cart-copy"><strong>{x.name}</strong>{x.catalogOption&&<small className="cart-option">{tr("Option:")+' '} {x.catalogOption}</small>}<small>{money(x.price, props.receiptConfig.currency)}</small><div className="qty"><Button type="submit" variant="secondary" aria-label={`${tr("Decrease quantity")}: ${x.name}`} onClick={() => change(key,-1)}><Minus size={14}/></Button><span aria-label={tr("Quantity")}>{x.qty}</span><Button type="submit" variant="secondary" aria-label={`${tr("Increase quantity")}: ${x.name}`} onClick={() => change(key,1)}><Plus size={14}/></Button></div></div><div className="pos-line-end"><b>{money(x.price*x.qty, props.receiptConfig.currency)}</b><Button type="button" variant="ghost" aria-label={`${tr("Remove")}: ${x.name}`} onClick={()=>props.setCart(old=>old.filter(line=>(line.cartKey??line.id)!==key))}>{tr("Remove")}</Button></div></div>})}</div>
        {customer?.loyaltyStatus === 'member' && <div className="reward-box"><div className="reward-heading"><strong>{tr("Available Rewards")}</strong>{appliedReward && <Button type="submit" variant="danger" onClick={() => setAppliedRewardId('')}>{tr("Remove")}</Button>}</div>{availableRewards.length === 0 ? <small>{tr("No reward is currently available.")}</small> : <div className="reward-options">{availableRewards.map(r => { const freeMissing = r.type === 'free_product' && r.productId && !props.cart.some(x => x.id === r.productId); return <Button type="submit" variant="secondary" key={r.id} className={appliedRewardId===r.id?'active':''} disabled={Boolean(freeMissing)} onClick={() => setAppliedRewardId(r.id)}><span>{r.name}</span><small>{r.costPoints ? `${r.costPoints} pts` : ''}{r.requiredStamps ? `${r.requiredStamps} stamps` : ''}{freeMissing ? tr(" • add reward item first") : ''}</small></Button>})}</div>}</div>}
        </div><div className="pos-checkout-footer"><div className="totals"><div><span>{tr("Subtotal")}</span><b>{money(subtotal, props.receiptConfig.currency)}</b></div>{discount>0&&<div className="discount-line"><span>{tr("Loyalty Reward")}</span><b>-{money(discount, props.receiptConfig.currency)}</b></div>}<div><span>{tr("Tax (")}{(props.taxRate*100).toFixed(1)}%)</span><b>{money(tax, props.receiptConfig.currency)}</b></div><div className="grand"><span>{tr("Total")}</span><b>{money(total, props.receiptConfig.currency)}</b></div></div>
        {offlineLocked&&<div className="offline-checkout-note"><WifiOff size={16}/>{' '+tr("Reconnect before charging this order. Offline sales are intentionally blocked to protect inventory and loyalty balances.")}</div>}
        <div className="payments"><Button type="submit" variant="secondary" disabled={!props.cart.length || busy || offlineLocked || (supabaseConfigured&&!currentQuote)} onClick={() => setCashTenderOpen(true)}><WalletCards/>{tr("Cash")}</Button><Button type="submit" variant="secondary" disabled={!props.cart.length || busy || offlineLocked} onClick={() => setPaymentConfirm('card')}><CreditCard/>{tr("Card")}</Button><Button type="submit" variant="secondary" disabled={!props.cart.length || busy || offlineLocked} onClick={() => setPaymentConfirm('qr')}><QrCode/>{tr("QR")}</Button></div>
        </div>
      </aside>
    </div>
    {!mobileCartOpen&&<div className="pos-mobile-summary"><span role="status" aria-live="polite">{props.cart.reduce((n,x)=>n+x.qty,0)} {tr('item(s)')} · {props.receiptConfig.currency} {money(total,props.receiptConfig.currency)}</span><Button ref={viewCartButton} type="button" variant="primary" aria-expanded={mobileCartOpen} onClick={()=>setMobileCartOpen(true)}>{tr('View cart')}</Button></div>}
    </div>
    {optionProduct&&<PosOptions key={optionProduct.id} product={optionProduct} currency={props.receiptConfig.currency} onClose={()=>setOptionProduct(null)} onAdd={addCommercial}/>}
    {pendingCheckout&&<div className="modal-backdrop"><section className="modal compact-modal" role="dialog" aria-modal="true" aria-label={tr("Recover checkout confirmation")}><h2>{tr("Confirm previous checkout")}</h2><p>{tr("A checkout was submitted but its result has not been confirmed on this device. Retry confirmation to recover the original receipt safely. Do not collect payment again.")}</p><p>{tr("Reference:")+' '} <code>{pendingCheckout.id}</code></p><Button variant="primary" className="primary-btn" disabled={busy} type="button" onClick={()=>void completeCheckout(pendingCheckout)}>{busy?tr("Confirming…"):tr("Retry checkout confirmation")}</Button></section></div>}
    {paymentConfirm&&<PaymentConfirmation method={paymentConfirm} total={total} currency={props.receiptConfig.currency} busy={busy} onClose={()=>setPaymentConfirm(null)} onConfirm={async()=>{const method=paymentConfirm;setPaymentConfirm(null);await charge(method)}}/>}
    {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    {cashTenderOpen && <CashTenderModal total={total} currency={props.receiptConfig.currency} busy={busy} onClose={() => setCashTenderOpen(false)} onConfirm={async received => { setCashTenderOpen(false); await charge('cash', received) }} />}
    {cameraOpen&&<CameraBarcodeScanner onClose={()=>setCameraOpen(false)} onDetected={code=>{setCameraOpen(false);scanBarcode(code)}}/>}
  </>
}

function CameraBarcodeScanner({onClose,onDetected}:{onClose:()=>void;onDetected:(code:string)=>void}){const videoRef=useRef<HTMLVideoElement|null>(null);const[error,setError]=useState('');const[ready,setReady]=useState(false);useEffect(()=>{let controls:{stop:()=>void}|undefined;let active=true;const reader=new BrowserMultiFormatReader();if(!videoRef.current)return;reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},videoRef.current,(result)=>{if(result&&active){active=false;controls?.stop();onDetected(result.getText())}}).then(c=>{controls=c;setReady(true)}).catch(e=>setError(trError(e instanceof Error?e.message:tr("Camera could not start."))));return()=>{active=false;controls?.stop()}},[]);return <div className="modal-backdrop"><div className="modal camera-scanner-modal"><div className="panel-title"><h2><Camera size={20}/>{' '+tr("Scan Product Barcode")}</h2><Button type="submit" variant="secondary" data-back-close="true" onClick={onClose}>×</Button></div><div className="camera-preview"><video ref={videoRef} autoPlay muted playsInline/><div className="camera-target"/></div>{!ready&&!error&&<div className="info-box">{tr("Starting camera… Allow camera permission when asked.")}</div>}{error&&<div className="error-box">{tr(error)}<br/>{tr("Check browser camera permission and make sure another app is not using the camera.")}</div>}<p className="muted">{tr("Hold the barcode inside the frame. The scanner closes automatically after a successful scan.")}</p><StickyActions className="modal-actions"><Button type="submit" variant="secondary" data-back-close="true" onClick={onClose}>{tr("Cancel")}</Button></StickyActions></div></div>}

function CashTenderModal({total,currency,busy,onClose,onConfirm}:{total:number;currency:string;busy:boolean;onClose:()=>void;onConfirm:(received:number)=>Promise<void>}) {
  const [received,setReceived]=useState(total.toFixed(2))
  const numeric=Number(received)
  const valid=received.trim()!==''&&Number.isFinite(numeric)&&numeric>=total
  const change=valid?Number((numeric-total).toFixed(2)):0
  return <div className="modal-backdrop"><form className="modal cash-tender-modal" onSubmit={e=>{e.preventDefault();if(valid)void onConfirm(Number(numeric.toFixed(2)))}}>
    <div className="panel-title"><h2>{tr("Cash Payment")}</h2><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div>
    <div className="cash-tender-summary"><div><span>{tr("Sale total")}</span><strong>{money(total,currency)}</strong></div><FormField>{tr("Cash received")}<InputField autoFocus required type="number" min={total.toFixed(2)} step="0.01" inputMode="decimal" value={received} onChange={e=>setReceived(e.target.value)} onFocus={e=>e.currentTarget.select()}/></FormField><div className={`cash-change ${valid?'valid':'short'}`}><span>{valid?tr("Change due"):tr("Amount short")}</span><strong>{money(valid?change:Math.max(0,total-(Number.isFinite(numeric)?numeric:0)),currency)}</strong></div></div>
    {!valid&&<div className="warning-box">{tr("Cash received must be at least the sale total.")}</div>}
    <StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={!valid||busy}>{busy?tr("Processing…"):tr("Complete Cash Sale")}</Button></StickyActions>
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
      ? `\n${tr("Loyalty")}:\n${tr("Points")}: +${receipt.pointsEarned} / -${receipt.pointsRedeemed}${receipt.pointsBalance != null ? ` (${tr("Balance")} ${receipt.pointsBalance})` : ''}\n${tr("Stamps")}: +${receipt.stampsEarned} / -${receipt.stampsRedeemed}${receipt.stampsBalance != null ? ` (${tr("Balance")} ${receipt.stampsBalance})` : ''}\n`
      : ''
    const subject = encodeURIComponent(`${receipt.shopName} ${tr("Receipt")} ${receiptNo(receipt.receiptNumber)}`)
    const deposit=receipt.depositApplied?`\n${tr("Deposit applied")}: ${money(receipt.depositApplied,receipt.currency)}\n${tr("Final balance paid")}: ${money(receipt.balancePaid??0,receipt.currency)}`:''
    const cash = receipt.payment==='CASH'&&receipt.cashReceived!=null ? `\n${tr("Cash received")}: ${money(receipt.cashReceived,receipt.currency)}\n${tr("Change")}: ${money(receipt.changeDue??0,receipt.currency)}` : ''
    const body = encodeURIComponent(`${receipt.shopName}\n${tr("Receipt")} ${receiptNo(receipt.receiptNumber)}\n${formatReceiptDate(receipt.createdAt, receipt.timezone)}\n\n${lines}\n\n${tr("Subtotal")}: ${money(receipt.subtotal, receipt.currency)}${receipt.discount ? `\n${tr("Discount")}: -${money(receipt.discount, receipt.currency)}` : ''}\n${tr("Tax")}: ${money(receipt.tax, receipt.currency)}\n${tr("Total")}: ${money(receipt.total, receipt.currency)}\n${tr("Payment")}: ${tr(({CASH:"Cash",CARD:"Card",QR:"QR"} as Record<string,string>)[receipt.payment]??receipt.payment)}${deposit}${cash}${loyalty}\n${receipt.footer ?? ''}`)
    window.location.href = `mailto:${encodeURIComponent(receipt.customerEmail)}?subject=${subject}&body=${body}`
  }
  return <div className="modal-backdrop receipt-backdrop">
    <div className="receipt-dialog">
      <div className="receipt-toolbar no-print"><div><strong>{receipt.status==='completed'?tr("Receipt"):statusLabel(receipt.status)}</strong><small>{tr("Receipt")+' '} {receiptNo(receipt.receiptNumber)}</small></div><div className="receipt-actions"><Button onClick={printReceipt} type="button" variant="secondary"><Printer size={17}/>{' '+tr("Print")}</Button><Button onClick={printReceipt} type="button" variant="secondary"><FileBarChart size={17}/>{' '+tr("Save PDF")}</Button>{receipt.customerEmail && <Button onClick={emailReceipt} type="button" variant="secondary"><Mail size={17}/>{' '+tr("Email")}</Button>}<Button type="submit" variant="primary" data-back-close="true" className="primary-btn" onClick={onClose}>{tr("Close")}</Button></div></div>
      <ReceiptSheet receipt={receipt}/>
    </div>
  </div>
}

function ReceiptSheet({ receipt }: { receipt: ReceiptData }) {
  const hasLoyalty = Boolean(receipt.pointsEarned || receipt.pointsRedeemed || receipt.stampsEarned || receipt.stampsRedeemed || receipt.pointsBalance != null || receipt.stampsBalance != null)
  return <article className="receipt-sheet receipt-print">
    {receipt.status!=='completed' && <div className={`receipt-status-banner ${receipt.status}`}>{statusLabel(receipt.status)}{receipt.refundedTotal>0?` • ${money(receipt.refundedTotal,receipt.currency)} ${tr("adjusted")}`:''}</div>}
    <div className="receipt-brand"><BrandLogo logoUrl={receipt.logoUrl} businessName={receipt.shopName} theme="light"/><h1>{receipt.shopName}</h1>{receipt.address && <p>{receipt.address}</p>}<p>{[receipt.phone, receipt.shopEmail].filter(Boolean).join(' • ')}</p></div>
    <div className="receipt-meta"><div><span>{tr("Receipt")}</span><strong>{receiptNo(receipt.receiptNumber)}</strong></div><div><span>{tr("Date")}</span><strong>{formatReceiptDate(receipt.createdAt, receipt.timezone)}</strong></div><div><span>{tr("Salesperson")}</span><strong>{receipt.staffName}</strong></div><div><span>{tr("Customer")}</span><strong>{receipt.customerName || tr("Walk-in / Guest")}</strong></div></div>
    <div className="receipt-items"><div className="receipt-item-head"><span>{tr("Item")}</span><span>{tr("Qty")}</span><span>{tr("Unit Price")}</span><span>{tr("Total")}</span></div>{receipt.items.map((i,idx)=><div className="receipt-item" key={`${i.name}-${idx}`}><span><strong>{i.name}</strong></span><span>{i.qty}</span><span>{money(i.unitPrice, receipt.currency)}</span><b>{money(i.lineTotal, receipt.currency)}</b></div>)}</div>
    <div className="receipt-totals"><div><span>{tr("Subtotal")}</span><b>{money(receipt.subtotal, receipt.currency)}</b></div>{receipt.discount > 0 && <div><span>{receipt.rewardName ? `${tr("Reward")} — ${receipt.rewardName}` : tr("Discount")}</span><b>-{money(receipt.discount, receipt.currency)}</b></div>}<div><span>{tr("Tax")}</span><b>{money(receipt.tax, receipt.currency)}</b></div><div className="receipt-grand"><span>{tr("Original Total")}</span><b>{money(receipt.total, receipt.currency)}</b></div>{receipt.refundedTotal>0&&<><div><span>{tr("Refunded / Voided")}</span><b>-{money(receipt.refundedTotal,receipt.currency)}</b></div><div className="receipt-grand"><span>{tr("Net Sale")}</span><b>{money(receipt.status==='voided'?0:Math.max(0,receipt.total-receipt.refundedTotal),receipt.currency)}</b></div></>}<div><span>{tr("Payment")}</span><b>{tr(({CASH:"Cash",CARD:"Card",QR:"QR"} as Record<string,string>)[receipt.payment]??receipt.payment)}</b></div>{Boolean(receipt.depositApplied)&&<div><span>{tr("Deposit applied")}</span><strong>{money(receipt.depositApplied??0,receipt.currency)}</strong><span>{tr("Final balance paid")}</span><strong>{money(receipt.balancePaid??0,receipt.currency)}</strong></div>}{receipt.payment==='CASH'&&receipt.cashReceived!=null&&<><div><span>{tr("Cash Received")}</span><b>{money(receipt.cashReceived,receipt.currency)}</b></div><div className="receipt-grand"><span>{tr("Change")}</span><b>{money(receipt.changeDue??0,receipt.currency)}</b></div></>}</div>
    {receipt.refunds.length>0&&<div className="receipt-refunds"><strong>{tr("Adjustment History")}</strong>{receipt.refunds.map(r=><div key={r.id}><span>{r.type==='void'?tr("Void"):r.type==='full'?tr("Full refund"):tr("Partial refund")} • {formatReceiptDate(r.createdAt,receipt.timezone)}</span><b>-{money(r.total,receipt.currency)}</b><small>{r.reason}{r.restocked?tr(" • stock restored"):''}</small></div>)}</div>}
    {hasLoyalty && <div className="receipt-loyalty"><strong>{tr("Loyalty Activity")}</strong>{receipt.pointsEarned > 0 && <div><span>{tr("Points earned")}</span><b>+{receipt.pointsEarned}</b></div>}{receipt.pointsRedeemed > 0 && <div><span>{tr("Points redeemed")}</span><b>-{receipt.pointsRedeemed}</b></div>}{receipt.pointsBalance != null && <div><span>{tr("Points balance")}</span><b>{receipt.pointsBalance}</b></div>}{receipt.stampsEarned > 0 && <div><span>{tr("Stamps earned")}</span><b>+{receipt.stampsEarned}</b></div>}{receipt.stampsRedeemed > 0 && <div><span>{tr("Stamps redeemed")}</span><b>-{receipt.stampsRedeemed}</b></div>}{receipt.stampsBalance != null && <div><span>{tr("Stamp balance")}</span><b>{receipt.stampsBalance}</b></div>}</div>}
    <ReceiptCatalogueQr/><footer>{receipt.footer || tr("Thank you!")}</footer>
  </article>
}

function formatReceiptDate(value: string, timezone: string) {
  try { return new Intl.DateTimeFormat(getUiLocale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value)) }
  catch { return new Date(value).toLocaleString() }
}

async function sendInvite(customer: Customer, setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>, showToast: (m: string) => void) {
  if (!customer.email) { showToast(trError(tr("Add an email address before sending an invitation."))); return }
  let token = uid()
  if (supabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('create_loyalty_invitation', { p_customer_id: customer.id })
    if (error) { showToast(trError(error.message)); return }
    token = data?.[0]?.token ?? token
  }
  setCustomers(cs => cs.map(c => c.id === customer.id ? { ...c, loyaltyStatus: 'invited' } : c))
  const base = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin
  const joinUrl = `${base}/?loyalty_invite=${token}`
  const subject = encodeURIComponent('You’re invited to our rewards program')
  const body = encodeURIComponent(`Hi ${customer.name},\n\nJoin our rewards program to earn and redeem customer rewards.\n\nJoin here: ${joinUrl}\n\nSee you soon!`)
  window.location.href = `mailto:${encodeURIComponent(customer.email)}?subject=${subject}&body=${body}`
  showToast(trError(tr("Invitation prepared in your email app.")))
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
  const [removing,setRemoving]=useState<Product|null>(null)
  function remove(id:string){setRemoving(products.find(p=>p.id===id)??null)}

  return <><PageHeader title={tr("Products")}><div className="report-actions"><Button type="submit" variant="secondary" disabled={role!=='admin'} onClick={()=>setManagingCategories(true)}>{tr("Manage Categories")}</Button><Button type="submit" variant="primary" className="primary-btn small" data-quick-action="Add Product" disabled={role!=='admin'} onClick={() => setAdding(true)}><Plus size={17}/>{' '+tr("Add Product")}</Button></div></PageHeader>{role==='admin'&&<InventorySources showToast={showToast}/>}
    {role!=='admin' && <div className="info-box">{tr("Employee access is read-only. Product changes require an Admin.")}</div>}
    <Card className="panel"><Table headers={['Product','Barcode','Category','Regular price','Current catalogue price',...(role==='admin'?['Unit cost','Base margin']:[]),'Stock','Status','Action']} rows={products.map(p=>[p.name,p.barcode||'—',p.category,money(p.price,currency),sellingPrice(p),...(role==='admin'?[money(p.cost??0,currency),p.price>0?`${(((p.price-(p.cost??0))/p.price)*100).toFixed(1)}%`:'—']:[]),String(p.stock),p.active?(p.stock<=p.lowAt?'Low Stock':'Active'):'Hidden / discontinued',<div className="table-actions" key={p.id}><Button type="submit" variant="secondary" disabled={role!=='admin'} onClick={()=>setEdit(p)}>{tr("Modify")}</Button><Button type="submit" variant="danger" disabled={role!=='admin'} className="danger-link" onClick={()=>remove(p.id)}>{tr("Remove")}</Button></div>])}/><p className="muted">{tr("Regular price is the master product price. Current catalogue prices include active variant pricing and promotions; checkout verifies the same server prices. Base margin uses regular price; final margins are in Profitability.")}</p></Card>
    {(edit||adding) && <ProductModal product={edit} shopId={shopId} categories={categories} onClose={()=>{setEdit(null);setAdding(false)}} onSaved={p=>{setProducts(ps=> edit ? ps.map(x=>x.id===p.id?p:x):[p,...ps]);setEdit(null);setAdding(false);showToast(trError(tr("Product saved.")))}} />}
    {removing&&<RecordRemovalDialog entity="product" id={removing.id} name={removing.name} onClose={()=>setRemoving(null)} onRemoved={action=>{setProducts(ps=>action==='delete'?ps.filter(p=>p.id!==removing.id):ps.map(p=>p.id===removing.id?{...p,active:false}:p));showToast(tr(action==='delete'?'Record deleted.':'Record archived.'))}}/>}
    {managingCategories&&<CategoryManager shopId={shopId} categories={categories} onClose={()=>setManagingCategories(false)} onChanged={(next,oldName,newName)=>{setCategories(next);if(oldName)setProducts(ps=>ps.map(p=>p.category===oldName?{...p,category:newName??'Other'}:p))}} showToast={showToast}/>} 
  </>
}

function ProductModal({ product, shopId, categories, onClose, onSaved }: { product: Product|null; shopId:string|null; categories:string[]; onClose:()=>void; onSaved:(p:Product)=>void }) {
 const dialog=useDialogFocus<HTMLFormElement>(onClose)
  const [form,setForm]=useState<Product>(product ?? {id:uid(),name:'',category:'Pastries',price:0,stock:0,lowAt:5,active:true})
  const [busy,setBusy]=useState(false)
  const [imageFile,setImageFile]=useState<File|null>(null)
  const [originalImageFile,setOriginalImageFile]=useState<File|null>(null)
  const [cropFile,setCropFile]=useState<File|null>(null)
  const [imageInputKey,setImageInputKey]=useState(0)
  const [emojiOpen,setEmojiOpen]=useState(false)
  const [forceEmoji,setForceEmoji]=useState(false)
  async function save(e:FormEvent){e.preventDefault();setBusy(true);let image=form.image;let originalImage:string|undefined;const uploadedImagePaths:string[]=[]
    if(supabaseConfigured&&supabase&&shopId){
      if(imageFile){
        const ext=imageFile.name.split('.').pop()||'jpg'
        const path=`${shopId}/${form.id}-${Date.now()}.${ext}`
        const upload=await supabase.storage.from('product-images').upload(path,imageFile,{upsert:false,cacheControl:'3600',contentType:imageFile.type})
        if(upload.error){alert(upload.error.message.includes('row-level security')?tr("Supabase rejected the product image. Confirm Storage migrations 23 and 24 were run, then sign in again as an active administrator."):upload.error.message);setBusy(false);return}
        uploadedImagePaths.push(path)
        image=supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
        if(originalImageFile){const originalPath=`${shopId}/${form.id}-${Date.now()}-original.${originalImageFile.name.split('.').pop()||'jpg'}`;const originalUpload=await supabase.storage.from('product-images').upload(originalPath,originalImageFile,{upsert:false,cacheControl:'3600',contentType:originalImageFile.type});if(originalUpload.error){await supabase.storage.from('product-images').remove(uploadedImagePaths);alert(originalUpload.error.message);setBusy(false);return}uploadedImagePaths.push(originalPath);originalImage=supabase.storage.from('product-images').getPublicUrl(originalPath).data.publicUrl}
      }
      if(forceEmoji) image=undefined
      const {data:cat}=await supabase.from('categories').select('id').eq('shop_id',shopId).eq('name',form.category).maybeSingle()
      const payload={shop_id:shopId,name:form.name,barcode:form.barcode?.trim()||null,category_id:cat?.id??null,price:form.price,cost_price:form.cost??0,...(product?{}:{stock:form.stock}),low_stock_at:form.lowAt,active:form.active,image_url:image??null,...(imageFile?{original_image:originalImage??image??null,cropped_catalogue_image:image??null}:{}),...(forceEmoji?{original_image:null,cropped_catalogue_image:null}:{}),icon_emoji:form.iconEmoji||null}
      const res=product?await supabase.from('products').update(payload).eq('id',product.id).select('id,stock').single():await supabase.from('products').insert(payload).select('id,stock').single()
      if(res.error){if(uploadedImagePaths.length)await supabase.storage.from('product-images').remove(uploadedImagePaths);alert(res.error.message);setBusy(false);return} form.id=res.data.id;form.stock=Number(res.data.stock)
    }
    onSaved({...form,barcode:form.barcode?.trim()||undefined,image:forceEmoji?undefined:image});setBusy(false)
  }
  function file(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)){alert(tr('Choose a JPG, PNG, or WebP product image.'));e.target.value='';return}if(f.size>5*1024*1024){alert(tr('Product image must be 5 MB or smaller.'));e.target.value='';return}setCropFile(f);e.target.value=''}
  function saveCroppedProduct(blob:Blob){setOriginalImageFile(cropFile);const cropped=new File([blob],'product-crop.jpg',{type:'image/jpeg'});setImageFile(cropped);setForceEmoji(false);setCropFile(null);const reader=new FileReader();reader.onload=()=>setForm(old=>({...old,image:String(reader.result)}));reader.readAsDataURL(cropped)}

  return <>{cropFile&&<ImageCropper file={cropFile} onCancel={()=>setCropFile(null)} onSave={saveCroppedProduct}/>}<div className="modal-backdrop"><form ref={dialog} className="modal" onSubmit={save} role="dialog" aria-modal="true" aria-label={tr(product?'Modify Product':'Add Product')}>
    <div className="panel-title"><h2>{product?tr("Modify Product"):tr("Add Product")}</h2><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div>
    <div className="form-grid">
      <FormField>{tr("Product name")}<InputField required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></FormField>
      <BarcodeField label={tr("Barcode (optional)")} value={form.barcode??''} onChange={e=>setForm({...form,barcode:e.target.value.replace(/\s/g,'')})} placeholder={tr("Scan into this field")} helper={tr("Must be unique within this shop.")}/>
      <FormField>{tr("Category")}<SelectField value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c} value={c}>{localizeCategory(c)}</option>)}</SelectField></FormField>
      <FormField>{tr("Regular selling price")}<InputField required min="0" step="0.01" type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></FormField>
      <FormField>{tr("Unit cost")}<InputField required min="0" step="0.01" type="number" value={form.cost??0} onChange={e=>setForm({...form,cost:Number(e.target.value)})}/><small>{tr("Ingredient/production cost per sellable unit.")}</small></FormField>
      <FormField>{tr("Current stock")}<InputField required disabled={Boolean(product)} min="0" step="1" type="number" value={product?product.stock:form.stock} onChange={e=>setForm({...form,stock:Number(e.target.value)})}/><small>{product?tr("Use Inventory → Adjust Stock so the batch ledger remains auditable."):tr("Opening stock creates an untracked initial batch.")}</small></FormField>
      <FormField>{tr("Low-stock warning")}<InputField required min="0" step="1" type="number" value={form.lowAt} onChange={e=>setForm({...form,lowAt:Number(e.target.value)})}/></FormField>
      <FormField>{tr("Product image")}<InputField key={imageInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{file(e);setForceEmoji(false)}}/><small>{tr("JPG, PNG, or WebP • maximum 5 MB.")}</small></FormField>
    </div>
    <div className="product-icon-picker">
      <div><strong>{tr("Food icon / emoji")}</strong><small>{tr("Used when no product image is selected.")}</small></div>
      <Button variant="secondary" type="button" className="emoji-picker-trigger" onClick={()=>setEmojiOpen(v=>!v)}><span>{form.iconEmoji??productEmoji(form.category)}</span>{' '+tr("Choose Emoji")}</Button>
      {emojiOpen&&<div className="emoji-grid" role="listbox" aria-label={tr("Food emoji choices")}>{FOOD_EMOJIS.map(emoji=><Button variant="secondary" type="button" key={emoji} className={form.iconEmoji===emoji?'selected':''} aria-label={`Use ${emoji} icon`} onClick={()=>{setForm({...form,iconEmoji:emoji,image:undefined});setImageFile(null);setImageInputKey(k=>k+1);setForceEmoji(true);setEmojiOpen(false)}}>{emoji}</Button>)}</div>}
    </div>
    <FormField className="switch-line"><InputField type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>{' '+tr("Active product")}</FormField>
    {product&&<ProductImages id={product.id} onPrimaryChange={image=>setForm(current=>({...current,image}))}/>}
    <StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy}>{tr("Save Product")}</Button></StickyActions>
  </form></div></>
}

function CategoryManager({shopId,categories,onClose,onChanged,showToast}:{shopId:string|null;categories:string[];onClose:()=>void;onChanged:(next:string[],oldName?:string,newName?:string|null)=>void;showToast:(m:string)=>void}){
  const[name,setName]=useState('');const[busy,setBusy]=useState(false)
  async function add(){const clean=name.trim();if(!clean||categories.some(c=>c.toLowerCase()===clean.toLowerCase()))return;setBusy(true);if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('categories').insert({shop_id:shopId,name:clean,sort_order:categories.length});if(error){setBusy(false);return showToast(trError(error.message))}}onChanged([...categories,clean]);setName('');setBusy(false);showToast(trError(tr("Category added.")))}
  async function rename(oldName:string){const next=prompt('New category name',oldName)?.trim();if(!next||next===oldName)return;if(categories.some(c=>c.toLowerCase()===next.toLowerCase()))return showToast(trError(tr("That category already exists.")));if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('categories').update({name:next}).eq('shop_id',shopId).eq('name',oldName);if(error)return showToast(trError(error.message))}onChanged(categories.map(c=>c===oldName?next:c),oldName,next);showToast(trError(tr("Category renamed.")))}
  async function remove(oldName:string){if(!confirm(`Delete category "${oldName}"? Products in it will become uncategorized.`))return;if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('categories').delete().eq('shop_id',shopId).eq('name',oldName);if(error)return showToast(trError(error.message))}onChanged(categories.filter(c=>c!==oldName),oldName,null);showToast(trError(tr("Category deleted.")))}
  async function move(index:number,direction:-1|1){const target=index+direction;if(target<0||target>=categories.length)return;const next=[...categories];[next[index],next[target]]=[next[target],next[index]];if(supabaseConfigured&&supabase&&shopId){const updates=next.map((category,sort_order)=>supabase!.from('categories').update({sort_order}).eq('shop_id',shopId).eq('name',category));const results=await Promise.all(updates);const failed=results.find(result=>result.error);if(failed?.error)return showToast(trError(failed.error.message))}onChanged(next);showToast(trError(tr("Category display order updated. The customer catalogue follows this order.")))}
  return <div className="modal-backdrop"><div className="modal"><div className="panel-title"><div><h2>{tr("Manage Categories")}</h2><p className="muted">{tr("Category order is also used by the customer catalogue.")}</p></div><Button type="submit" variant="secondary" data-back-close="true" onClick={onClose}>×</Button></div><div className="category-add"><InputField value={name} maxLength={60} onChange={e=>setName(e.target.value)} placeholder={tr("New category name")}/><Button type="submit" variant="primary" className="primary-btn" disabled={busy||!name.trim()} onClick={add}><Plus size={16}/>{' '+tr("Add")}</Button></div><div className="management-list">{categories.map((c,index)=><div key={c}><strong>{c}</strong><span><Button type="submit" variant="secondary" disabled={index===0} onClick={()=>void move(index,-1)}>↑</Button><Button type="submit" variant="secondary" disabled={index===categories.length-1} onClick={()=>void move(index,1)}>↓</Button><Button type="submit" variant="secondary" onClick={()=>rename(c)}>{tr("Rename")}</Button><Button type="submit" variant="danger" className="danger-link" onClick={()=>remove(c)}>{tr("Delete")}</Button></span></div>)}</div><StickyActions className="modal-actions"><Button type="submit" variant="secondary" data-back-close="true" onClick={onClose}>{tr("Done")}</Button></StickyActions></div></div>
}
function Inventory({ products, setProducts, showToast }: { products:Product[];setProducts:React.Dispatch<React.SetStateAction<Product[]>>;showToast:(m:string)=>void}) {
  const [adjust,setAdjust]=useState<Product|null>(null)
  return <><PageHeader title={tr("Inventory")}/><section className="stats-grid three"><Stat label={tr("Total Items")} value={String(products.length)} sub={tr("Catalog items")}/><Stat label={tr("Low Stock")} value={String(products.filter(p=>p.stock>0&&p.stock<=p.lowAt).length)} sub={tr("Below reorder level")}/><Stat label={tr("Out of Stock")} value={String(products.filter(p=>p.stock<=0).length)} sub={tr("Unavailable")}/></section><Card className="panel"><Table headers={['Item','Current Stock','Reorder At','Status','Action']} rows={products.filter(p=>p.active).map(p=>[p.name,String(p.stock),String(p.lowAt),p.stock<=0?'Out':p.stock<=p.lowAt?'Low':'OK',<Button type="submit" variant="secondary" key={p.id} onClick={()=>setAdjust(p)}>{tr("Adjust Stock")}</Button>])}/></Card>{adjust&&<AdjustStock product={adjust} onClose={()=>setAdjust(null)} onDone={n=>{setProducts(ps=>ps.map(p=>p.id===adjust.id?{...p,stock:n}:p));setAdjust(null);showToast(trError(tr("Stock adjusted.")))}}/>}</>
}

type ProductionBatchRow={id:string;batch_number:number;product_id:string;product_name:string;status:string;scheduled_date:string;planned_quantity:number;actual_quantity:number|null;waste_quantity:number|null;note:string|null;completion_note:string|null;created_by_name:string;completed_by_name:string|null;created_at:string;completed_at:string|null}
function ProductionBatches({products,setProducts,role,showToast}:{products:Product[];setProducts:React.Dispatch<React.SetStateAction<Product[]>>;role:Role;showToast:(m:string)=>void}){const[batches,setBatches]=useState<ProductionBatchRow[]>([]);const[adding,setAdding]=useState(false);const[completing,setCompleting]=useState<ProductionBatchRow|null>(null);async function load(){if(role!=='admin'||!supabaseConfigured||!supabase)return;const{data,error}=await supabase.rpc('get_production_batches');if(error)return showToast(trError(error.message));setBatches(data??[])}useEffect(()=>{void load()},[role]);async function cancel(id:string){if(!confirm(tr("Cancel this scheduled production batch?")))return;if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('cancel_production_batch',{p_batch_id:id});if(error)return showToast(trError(error.message))}await load();showToast(trError(tr("Production batch cancelled.")))}if(role!=='admin')return <><PageHeader title={tr("Production")}/><div className="info-box">{tr("Administrator access is required.")}</div></>;const completed=batches.filter(b=>b.status==='completed'),good=completed.reduce((a,b)=>a+Number(b.actual_quantity??0),0),waste=completed.reduce((a,b)=>a+Number(b.waste_quantity??0),0);return <><PageHeader title={tr("Bakery Production")}><Button type="submit" variant="primary" className="primary-btn small" onClick={()=>setAdding(true)}><Plus size={17}/>{' '+tr("Schedule Batch")}</Button></PageHeader><div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr("Completing a batch atomically adds only sellable output to inventory. Waste is recorded separately and never increases stock.")}</span></div><section className="stats-grid three"><Stat label={tr("Scheduled Batches")} value={String(batches.filter(b=>b.status==='scheduled').length)} sub={tr("Awaiting production")}/><Stat label={tr("Sellable Output")} value={String(good)} sub={tr("Completed batches shown")}/><Stat label={tr("Recorded Waste")} value={String(waste)} sub={good+waste?`${((waste/(good+waste))*100).toFixed(1)}% of output`:'No completed output'}/></section><Card className="panel"><Table headers={['Batch','Date','Product','Planned','Actual','Waste','Yield','Status','Action']} rows={batches.map(b=>[`B-${String(b.batch_number).padStart(6,'0')}`,new Date(`${b.scheduled_date}T00:00:00`).toLocaleDateString(),b.product_name,String(b.planned_quantity),b.actual_quantity==null?'—':String(b.actual_quantity),b.waste_quantity==null?'—':String(b.waste_quantity),b.actual_quantity==null?'—':`${(Number(b.actual_quantity)+Number(b.waste_quantity)>0?Number(b.actual_quantity)/(Number(b.actual_quantity)+Number(b.waste_quantity))*100:0).toFixed(1)}%`,b.status,<div className="table-actions" key={b.id}>{b.status==='scheduled'&&<><Button type="submit" variant="secondary" onClick={()=>setCompleting(b)}>{tr("Complete")}</Button><Button type="submit" variant="danger" className="danger-link" onClick={()=>cancel(b.id)}>{tr("Cancel")}</Button></>}</div>])}/></Card>{adding&&<ScheduleBatchModal products={products} onClose={()=>setAdding(false)} onSaved={async()=>{setAdding(false);await load();showToast(trError(tr("Production batch scheduled.")))}}/>}{completing&&<CompleteBatchModal batch={completing} onClose={()=>setCompleting(null)} onSaved={async result=>{setProducts(ps=>ps.map(p=>p.id===result.product_id?{...p,stock:Number(result.new_stock)}:p));setCompleting(null);await load();showToast(trError(tr("Batch completed and inventory updated.")))}}/>}</>}
function ScheduleBatchModal({products,onClose,onSaved}:{products:Product[];onClose:()=>void;onSaved:()=>Promise<void>}){const[product,setProduct]=useState(products[0]?.id??'');const[date,setDate]=useState(new Date().toISOString().slice(0,10));const[planned,setPlanned]=useState('1');const[note,setNote]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent){e.preventDefault();if(Number(planned)<=0)return;setBusy(true);if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('schedule_production_batch',{p_product_id:product,p_scheduled_date:date,p_planned_quantity:Number(planned),p_note:note.trim()||null});if(error){setBusy(false);alert(error.message);return}}await onSaved()}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>{tr("Schedule Production Batch")}</h2><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div><div className="form-grid"><FormField>{tr("Product")}<SelectField value={product} onChange={e=>setProduct(e.target.value)}>{products.filter(p=>p.active).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</SelectField></FormField><FormField>{tr("Production date")}<InputField required type="date" value={date} onChange={e=>setDate(e.target.value)}/></FormField><FormField>{tr("Planned sellable quantity")}<InputField required type="number" min="0.001" step="0.001" value={planned} onChange={e=>setPlanned(e.target.value)}/></FormField><FormField>{tr("Batch note")}<InputField value={note} onChange={e=>setNote(e.target.value)} placeholder={tr("Flavor, order, shift…")}/></FormField></div><StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy}>{tr("Schedule Batch")}</Button></StickyActions></form></div>}
function CompleteBatchModal({batch,onClose,onSaved}:{batch:ProductionBatchRow;onClose:()=>void;onSaved:(r:{product_id:string;new_stock:number})=>Promise<void>}){const[actual,setActual]=useState(String(batch.planned_quantity));const[waste,setWaste]=useState('0');const[note,setNote]=useState('');const[batchCode,setBatchCode]=useState(`B-${String(batch.batch_number).padStart(6,'0')}`);const[bestBefore,setBestBefore]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent){e.preventDefault();if(Number(actual)<0||Number(waste)<0||Number(actual)+Number(waste)<=0||!batchCode.trim())return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('complete_production_batch_with_trace',{p_batch_id:batch.id,p_actual_quantity:Number(actual),p_waste_quantity:Number(waste),p_completion_note:note.trim()||null,p_batch_code:batchCode.trim(),p_best_before_on:bestBefore||null});if(error){setBusy(false);alert(error.message);return}await onSaved(data)}else await onSaved({product_id:batch.product_id,new_stock:Number(actual)})}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>{tr("Complete")+' '} {batch.product_name}</h2><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div><div className="info-box">{tr("Planned quantity:")+' '} {batch.planned_quantity}{tr(". A finished batch record will connect these units to future receipts.")}</div><div className="form-grid"><FormField>{tr("Sellable quantity")}<InputField required type="number" min="0" step="0.001" value={actual} onChange={e=>setActual(e.target.value)}/></FormField><FormField>{tr("Waste / damaged quantity")}<InputField required type="number" min="0" step="0.001" value={waste} onChange={e=>setWaste(e.target.value)}/></FormField><FormField>{tr("Finished batch code")}<InputField required value={batchCode} onChange={e=>setBatchCode(e.target.value)} placeholder={tr("Label printed on finished goods")}/></FormField><FormField>{tr("Best-before date")}<InputField type="date" min={new Date().toISOString().slice(0,10)} value={bestBefore} onChange={e=>setBestBefore(e.target.value)}/></FormField><FormField className="full-field">{tr("Completion note")}<InputField value={note} onChange={e=>setNote(e.target.value)} placeholder={tr("Quality, variance, production notes…")}/></FormField></div><div className="warning-box">{tr("Only")+' '} {actual||0}{' '+tr("sellable units will be added to product inventory. Checkout will allocate this finished batch automatically.")}</div><StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy||!batchCode.trim()}>{busy?tr("Completing…"):tr("Complete & Add Tracked Stock")}</Button></StickyActions></form></div>}

type SupplierRow={id:string;name:string;contact_name:string|null;phone:string|null;email:string|null;active:boolean}
type ReceiptRow={id:string;received_at:string;supplier_name:string;product_name:string;quantity:number;unit_cost:number;total_cost:number;invoice_reference:string|null;note:string|null;received_by_name:string;attachment_count:number}

function AdjustStock({product,onClose,onDone}:{product:Product;onClose:()=>void;onDone:(n:number)=>void}){const[expectedStock,setExpectedStock]=useState(product.stock);const[mode,setMode]=useState<'add'|'remove'|'set'>('add');const[qty,setQty]=useState(1);const[reason,setReason]=useState('');async function save(){const delta=mode==='set'?qty-product.stock:mode==='add'?qty:-qty;if(product.stock+delta<0)return alert(tr("Stock cannot be negative."));if(supabaseConfigured&&supabase){const{data,error}=mode==='set'?await supabase.rpc('set_product_stock_checked',{p_product_id:product.id,p_expected_stock:expectedStock,p_target_stock:qty,p_reason:reason||null}):await supabase.rpc('adjust_stock',{p_product_id:product.id,p_delta:delta,p_reason:reason||null});if(error){if(mode==='set'&&error.message.includes('Stock changed')){const latest=await supabase.from('products').select('stock').eq('id',product.id).single();if(latest.data)setExpectedStock(Number(latest.data.stock))}return alert(error.message)}onDone(Number(data));return}onDone(product.stock+delta)}return <div className="modal-backdrop"><div className="modal"><div className="panel-title"><h2>{tr("Adjust")+' '} {product.name}</h2><Button type="submit" variant="secondary" data-back-close="true" onClick={onClose}>×</Button></div><p className="muted">{tr("Current balance:")+' '} {expectedStock}{tr(". A changed balance must be reviewed before setting a physical count.")}</p><SegmentedNav className="segmented"><Button type="submit" variant="secondary" className={mode==='add'?'active':''} onClick={()=>setMode('add')}>{tr("Add")}</Button><Button type="submit" variant="danger" className={mode==='remove'?'active':''} onClick={()=>setMode('remove')}>{tr("Remove")}</Button><Button type="submit" variant="secondary" className={mode==='set'?'active':''} onClick={()=>setMode('set')}>{tr("Set Quantity")}</Button></SegmentedNav><FormField>{tr("Quantity")}<InputField min="0" type="number" value={qty} onChange={e=>setQty(Number(e.target.value))}/></FormField><FormField>{tr("Reason / note")}<InputField value={reason} onChange={e=>setReason(e.target.value)} placeholder={tr("Morning production, damaged, recount…")}/></FormField><StickyActions className="modal-actions"><Button type="submit" variant="secondary" data-back-close="true" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" onClick={save}>{tr("Save Adjustment")}</Button></StickyActions></div></div>}

export function Customers({role='cashier',customers,setCustomers,setPage,setSelectedCustomerId,showToast,currency,shopId,stampsRequired}:{customers:Customer[];setCustomers:React.Dispatch<React.SetStateAction<Customer[]>>;setPage:(p:PageKey)=>void;setSelectedCustomerId:(id:string)=>void;showToast:(m:string)=>void;currency:string;shopId:string|null;stampsRequired:number;role?:Role}){const[removing,setRemoving]=useState<Customer|null>(null);const[add,setAdd]=useState(false);const[history,setHistory]=useState<Customer|null>(null);const[edit,setEdit]=useState<Customer|null>(null);const[query,setQuery]=useState('');const clean=query.trim().toLowerCase(),digits=query.replace(/\D/g,'');const visible=customers.filter(c=>!clean||c.name.toLowerCase().includes(clean)||(digits.length>0&&(c.phone??'').replace(/\D/g,'').includes(digits))||(c.cardIds??[]).some(id=>id.toLowerCase().includes(clean)));function submitSearch(e:FormEvent){e.preventDefault();if(visible.length===1){setSelectedCustomerId(visible[0].id);showToast(trError(`${visible[0].name} selected.`));setPage('sale')}}return <><PageHeader title={tr("Customers")}><Button type="submit" variant="primary" data-quick-action="Add Customer" className="primary-btn small" onClick={()=>setAdd(true)}><Plus size={17}/>{' '+tr("Add Customer")}</Button></PageHeader><form className="panel customer-search" onSubmit={submitSearch}><SearchField autoComplete="off" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr("Scan Card ID or search by customer name or phone number")}/><Button variant="primary" className="primary-btn small" type="submit" disabled={visible.length!==1}>{tr("Select Match")}</Button>{query&&<Button variant="danger" type="button" onClick={()=>setQuery('')}>{tr("Clear")}</Button>}</form>{clean&&<p className="customer-search-count">{visible.length}{' '+tr("matching customer")}{visible.length===1?'':tr("s")}</p>}<Card className="panel customer-cards">{visible.map(c=><div className="customer-card" key={c.id}><div className="avatar">{c.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div className="customer-main"><h3>{c.name}</h3><p>{c.email||tr("No email")} {c.phone?`• ${c.phone}`:''}</p>{Boolean(c.cardIds?.length)&&<small className="customer-card-id">{tr("Card ID:")+' '} {c.cardIds?.join(' • ')}</small>}<small>{c.visits}{' '+tr("visits •")+' '} {money(c.totalSpent,currency)}{' '+tr("spent")}</small>{c.notes&&<em>{c.notes}</em>}</div><div className="customer-loyalty"><span className={`badge ${c.loyaltyStatus}`}>{c.loyaltyStatus.replace('_',' ')}</span>{c.loyaltyStatus==='member'&&<><strong>{c.points}{' '+tr("pts")}</strong><span>{c.stamps}/{stampsRequired}{' '+tr("stamps")}</span></>}</div><div className="customer-actions"><Button type="submit" variant="secondary" onClick={()=>setHistory(c)}>{tr("Order / sales history")}</Button><Button type="submit" variant="secondary" onClick={()=>setEdit(c)}>{tr("Edit")}</Button>{role==='admin'&&<Button variant="danger" onClick={()=>setRemoving(c)}>{tr('Remove')}</Button>}<Button type="submit" variant="secondary" onClick={()=>{setSelectedCustomerId(c.id);setPage('sale')}}>{tr("New Sale")}</Button>{c.loyaltyStatus!=='member'&&<Button type="submit" variant="secondary" onClick={()=>sendInvite(c,setCustomers,showToast)}><Mail size={15}/>{' '+tr("Invite")}</Button>}</div></div>)}{!visible.length&&<div className="empty customer-empty">{tr("No customer matches that Card ID, name, or phone number.")}</div>}</Card>{(add||edit)&&<CustomerModal customer={edit} shopId={shopId} onClose={()=>{setAdd(false);setEdit(null)}} onSaved={c=>{setCustomers(cs=>edit?cs.map(x=>x.id===c.id?c:x):[c,...cs]);setAdd(false);setEdit(null);showToast(trError(tr("Customer saved.")))}}/>}{history&&<CustomerOrderHistory customerId={history.id} name={history.name} onClose={()=>setHistory(null)} onOrders={()=>{setHistory(null);setPage('scheduled-orders')}} onSales={()=>{setHistory(null);setPage('sales')}}/>}{removing&&<RecordRemovalDialog entity="customer" id={removing.id} name={removing.name} onClose={()=>setRemoving(null)} onRemoved={action=>{setCustomers(cs=>cs.filter(c=>c.id!==removing.id));showToast(tr(action==='delete'?'Record deleted.':'Record archived.'))}}/>}</>}

function CustomerModal({customer,shopId,onClose,onSaved}:{customer:Customer|null;shopId:string|null;onClose:()=>void;onSaved:(c:Customer)=>void}){const[form,setForm]=useState<Customer>(customer??{id:uid(),name:'',email:'',phone:'',notes:'',loyaltyStatus:'not_enrolled',points:0,stamps:0,visits:0,totalSpent:0});const[busy,setBusy]=useState(false);const[error,setError]=useState('');async function save(e:FormEvent){e.preventDefault();setBusy(true);setError(trError(''));try{let savedId=form.id;const cleanEmail=form.email?.trim()??'',cleanPhone=normalizePhone(form.phone??'',getCompanyPhoneCountry()),cleanNotes=form.notes?.trim()??'';if(supabaseConfigured&&supabase){if(!shopId)throw new Error('Your active business could not be identified. Sign out and sign in again.');const payload={shop_id:shopId,name:form.name.trim(),email:cleanEmail||null,phone:cleanPhone||null,notes:cleanNotes||null,loyalty_status:form.loyaltyStatus};const res=customer?await supabase.from('customers').update(payload).eq('id',customer.id).eq('shop_id',shopId).select('id').single():await supabase.from('customers').insert(payload).select('id').single();if(res.error)throw res.error;savedId=res.data.id}onSaved({...form,id:savedId,name:form.name.trim(),email:cleanEmail,phone:cleanPhone,notes:cleanNotes})}catch(err){setError(trError(err instanceof Error?err.message:tr("Customer could not be saved.")))}finally{setBusy(false)}}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>{customer?tr("Edit Customer"):tr("Add Customer")}</h2><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div><div className="form-grid"><FormField>{tr("Name")}<InputField required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></FormField><FormField>{tr("Email")}<InputField type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></FormField><FormField>{tr("Phone")}<PhoneInput value={form.phone??''} onChange={phone=>setForm({...form,phone})}/></FormField><FormField>{tr("Notes")}<InputField value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></FormField></div>{error&&<div className="error-box">{tr(error)}</div>}<StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy}>{busy?tr("Saving…"):tr("Save Customer")}</Button></StickyActions></form></div>}

function Loyalty({rewards,setRewards,customers,setCustomers,shopId,role,showToast,currency}:{rewards:Reward[];setRewards:React.Dispatch<React.SetStateAction<Reward[]>>;customers:Customer[];setCustomers:React.Dispatch<React.SetStateAction<Customer[]>>;shopId:string|null;role:Role;showToast:(m:string)=>void;currency:string}){const[pointsExpire,setPointsExpire]=useState(false);const[expiryDays,setExpiryDays]=useState(365);const[pointsRate,setPointsRate]=useState(1);const[stampsRequired,setStampsRequired]=useState(10);const[editing,setEditing]=useState<Reward|null>(null);const[adding,setAdding]=useState(false);const[pointCustomer,setPointCustomer]=useState<Customer|null>(null);async function saveProgram(){if(role!=='admin')return;if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('loyalty_programs').update({points_expire:pointsExpire,points_expiry_days:pointsExpire?expiryDays:null,points_per_currency:pointsRate,stamps_required:stampsRequired}).eq('shop_id',shopId);if(error)return showToast(trError(error.message))}showToast(trError(tr("Loyalty settings saved.")))}async function enroll(c:Customer){if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('enroll_customer',{p_customer_id:c.id});if(error)return showToast(trError(error.message))}setCustomers(cs=>cs.map(x=>x.id===c.id?{...x,loyaltyStatus:'member'}:x));showToast(trError(`${c.name} enrolled in loyalty.`))}async function removeReward(r:Reward){if(role!=='admin'||!confirm(`Delete reward "${r.name}"? Historical transactions will remain.`))return;if(supabaseConfigured&&supabase){const{error}=await supabase.from('loyalty_rewards').delete().eq('id',r.id);if(error)return showToast(trError(error.message))}setRewards(rs=>rs.filter(x=>x.id!==r.id));showToast(trError(tr("Reward deleted.")))}return <><PageHeader title={tr("Loyalty Program")}><Button type="submit" variant="primary" className="primary-btn small" disabled={role!=='admin'} onClick={saveProgram}>{tr("Save Settings")}</Button></PageHeader><section className="two-col loyalty-grid"><div className="panel"><h2>{tr("Points System")}</h2><FormField>{tr("Points per")+' '} {currency} 1<InputField type="number" min="0" step="0.1" value={pointsRate} onChange={e=>setPointsRate(Number(e.target.value))}/></FormField><FormField className="switch-line"><InputField type="checkbox" checked={pointsExpire} onChange={e=>setPointsExpire(e.target.checked)}/>{' '+tr("Points expire")}</FormField>{pointsExpire&&<FormField>{tr("Expiration period (days)")}<InputField type="number" min="1" value={expiryDays} onChange={e=>setExpiryDays(Number(e.target.value))}/><small>{tr("Each earned batch expires separately; older points are used first.")}</small></FormField>}</div><div className="panel"><h2>{tr("Stamp Card")}</h2><FormField>{tr("Stamps required for reward")}<InputField type="number" min="1" value={stampsRequired} onChange={e=>setStampsRequired(Number(e.target.value))}/></FormField><p className="muted">{tr("Default earning rule: 1 stamp per qualifying purchase. Rewards can be free products, discounts, or bonus points.")}</p></div></section><Card className="panel"><div className="panel-title"><h2>{tr("Rewards")}</h2><Button type="submit" variant="secondary" disabled={role!=='admin'} onClick={()=>setAdding(true)}><Plus size={16}/>{' '+tr("Add Reward")}</Button></div><Table headers={['Reward','Type','Points','Stamps','Value','Action']} rows={rewards.map(r=>[r.name,r.type.replace('_',' '),String(r.costPoints??'—'),String(r.requiredStamps??'—'),r.type==='percent_discount'?`${r.value}%`:money(r.value,currency),<div className="table-actions" key={r.id}><Button type="submit" variant="secondary" disabled={role!=='admin'} onClick={()=>setEditing(r)}>{tr("Modify")}</Button><Button type="submit" variant="danger" disabled={role!=='admin'} className="danger-link" onClick={()=>removeReward(r)}>{tr("Delete")}</Button></div>])}/><div className="info-box"><strong>{tr("How to redeem:")}</strong>{' '+tr("Start a New Sale, select a loyalty customer, add products, choose an available reward, then complete payment. Points or stamps are deducted automatically and printed on the receipt.")}</div></Card><Card className="panel"><h2>{tr("Loyalty Members")}</h2><div className="member-list">{customers.filter(c=>c.loyaltyStatus==='member').map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{c.points}{' '+tr("points •")+' '} {c.stamps}{' '+tr("stamps")}</small></span><Button type="submit" variant="secondary" disabled={role!=='admin'} onClick={()=>setPointCustomer(c)}>{tr("Give Points")}</Button></div>)}</div></Card><Card className="panel"><h2>{tr("Enrollment")}</h2><div className="member-list">{customers.filter(c=>c.loyaltyStatus!=='member').map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{c.email}</small></span><Button type="submit" variant="secondary" onClick={()=>enroll(c)}>{tr("Enroll Now")}</Button></div>)}</div></Card>{(adding||editing)&&<RewardModal reward={editing} shopId={shopId} onClose={()=>{setAdding(false);setEditing(null)}} onSaved={r=>{setRewards(rs=>editing?rs.map(x=>x.id===r.id?r:x):[r,...rs]);setAdding(false);setEditing(null);showToast(trError(tr("Reward saved.")))}}/>}{pointCustomer&&<GivePointsModal customer={pointCustomer} onClose={()=>setPointCustomer(null)} onSaved={points=>{setCustomers(cs=>cs.map(c=>c.id===pointCustomer.id?{...c,points}:c));setPointCustomer(null);showToast(trError(tr("Points added and audited.")))}}/>}</>}

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
  async function saveProgram(){if(role!=='admin')return;const rate=pointsMode==='percentage'?pointsValue/100:pointsValue;if(pointsValue<0||stampThreshold<=0||stampsRequired<1)return showToast(trError(tr("Enter valid earning values.")));if(supabaseConfigured&&supabase&&shopId){const{error}=await supabase.from('loyalty_programs').update({points_per_currency:rate,points_rule_mode:pointsMode,points_rule_value:pointsValue,points_expire:pointsExpire,points_expiry_days:pointsExpire?expiryDays:null,stamp_mode:stampMode,stamp_threshold:stampThreshold,stamps_required:stampsRequired}).eq('shop_id',shopId);if(error)return showToast(trError(error.message))}showToast(trError(tr("Loyalty earning rules saved.")))}
  async function enroll(c:Customer){if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('enroll_customer',{p_customer_id:c.id});if(error)return showToast(trError(error.message))}setCustomers(cs=>cs.map(x=>x.id===c.id?{...x,loyaltyStatus:'member'}:x));showToast(trError(`${c.name} enrolled in loyalty.`))}
  async function removeReward(r:Reward){if(role!=='admin'||!confirm(`Delete reward "${r.name}"? Historical transactions remain.`))return;if(supabaseConfigured&&supabase){const{error}=await supabase.from('loyalty_rewards').delete().eq('id',r.id);if(error)return showToast(trError(error.message))}setRewards(rs=>rs.filter(x=>x.id!==r.id));showToast(trError(tr("Reward deleted.")))}
  const pointExample=pointsMode==='percentage'?`A ${money(100,currency)} eligible purchase earns ${Math.floor(pointsValue)} points at ${pointsValue}%.`:`A ${money(10,currency)} eligible purchase earns ${Math.floor(10*pointsValue)} points.`
  return <><PageHeader title={tr("Loyalty Program")}><Button type="submit" variant="primary" className="primary-btn small" disabled={role!=='admin'} onClick={saveProgram}>{tr("Save Earning Rules")}</Button></PageHeader>
    <section className="two-col loyalty-grid"><div className="panel"><h2>{tr("Points Earning Rule")}</h2><FormField>{tr("Rule")}<SelectField value={pointsMode} onChange={e=>setPointsMode(e.target.value as 'percentage'|'per_currency')}><option value="percentage">{tr("Percentage of spending")}</option><option value="per_currency">{tr("Points per currency unit")}</option></SelectField></FormField><FormField>{pointsMode==='percentage'?tr("Earning percentage (%)"):`Points per ${currency} 1`}<InputField type="number" min="0" max={pointsMode==='percentage'?100:1000} step="0.01" value={pointsValue} onChange={e=>setPointsValue(Number(e.target.value))}/><small>{pointExample}{' '+tr("Points are rounded down to whole points.")}</small></FormField><FormField className="switch-line"><InputField type="checkbox" checked={pointsExpire} onChange={e=>setPointsExpire(e.target.checked)}/>{' '+tr("Points expire")}</FormField>{pointsExpire&&<FormField>{tr("Expiration period (days)")}<InputField type="number" min="1" value={expiryDays} onChange={e=>setExpiryDays(Number(e.target.value))}/></FormField>}</div>
    <div className="panel"><h2>{tr("Stamp Earning Rule")}</h2><FormField>{tr("Rule")}<SelectField value={stampMode} onChange={e=>setStampMode(e.target.value as 'per_sale'|'per_amount')}><option value="per_sale">{tr("One stamp when sale reaches threshold")}</option><option value="per_amount">{tr("One stamp for every threshold amount spent")}</option></SelectField></FormField><FormField>{stampMode==='per_sale'?tr("Minimum qualifying purchase"):`Spending required per stamp (${currency})`}<InputField type="number" min="0.01" step="0.01" value={stampThreshold} onChange={e=>setStampThreshold(Number(e.target.value))}/></FormField><FormField>{tr("Stamps needed to redeem a stamp reward")}<InputField type="number" min="1" value={stampsRequired} onChange={e=>setStampsRequired(Number(e.target.value))}/></FormField><div className="info-box">{stampMode==='per_sale'?`A sale of ${money(stampThreshold,currency)} or more earns 1 stamp.`:`Every ${money(stampThreshold,currency)} spent earns 1 stamp; ${money(stampThreshold*3,currency)} earns 3.`}</div></div></section>
    <Card className="panel"><div className="panel-title"><h2>{tr("Rewards")}</h2><Button type="submit" variant="secondary" disabled={role!=='admin'} onClick={()=>setAdding(true)}><Plus size={16}/>{' '+tr("Add Reward")}</Button></div><Table headers={['Reward','Type','Points','Stamps','Value','Action']} rows={rewards.map(r=>[r.name,r.type.replace('_',' '),String(r.costPoints??'—'),String(r.requiredStamps??'—'),r.type==='percent_discount'?`${r.value}%`:money(r.value,currency),<div className="table-actions" key={r.id}><Button type="submit" variant="secondary" disabled={role!=='admin'} onClick={()=>setEditing(r)}>{tr("Modify")}</Button><Button type="submit" variant="danger" disabled={role!=='admin'} className="danger-link" onClick={()=>removeReward(r)}>{tr("Delete")}</Button></div>])}/><div className="info-box"><strong>{tr("Redeem at checkout:")}</strong>{' '+tr("Select the loyalty customer in New Sale, add products, choose an available reward, and complete payment.")}</div></Card>
    <Card className="panel"><h2>{tr("Loyalty Members")}</h2><div className="member-list">{customers.filter(c=>c.loyaltyStatus==='member').map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{c.points}{' '+tr("points •")+' '} {c.stamps}{' '+tr("stamps")}</small></span><Button type="submit" variant="secondary" disabled={role!=='admin'} onClick={()=>setPointCustomer(c)}>{tr("Give Points")}</Button></div>)}</div></Card><Card className="panel"><h2>{tr("Enrollment")}</h2><div className="member-list">{customers.filter(c=>c.loyaltyStatus!=='member').map(c=><div key={c.id}><span><strong>{c.name}</strong><small>{c.email}</small></span><Button type="submit" variant="secondary" onClick={()=>enroll(c)}>{tr("Enroll Now")}</Button></div>)}</div></Card>
    {(adding||editing)&&<RewardModal reward={editing} shopId={shopId} onClose={()=>{setAdding(false);setEditing(null)}} onSaved={r=>{setRewards(rs=>editing?rs.map(x=>x.id===r.id?r:x):[r,...rs]);setAdding(false);setEditing(null);showToast(trError(tr("Reward saved.")))}}/>}{pointCustomer&&<GivePointsModal customer={pointCustomer} onClose={()=>setPointCustomer(null)} onSaved={points=>{setCustomers(cs=>cs.map(c=>c.id===pointCustomer.id?{...c,points}:c));setPointCustomer(null);showToast(trError(tr("Points added and audited.")))}}/>}</>
}

function RewardModal({reward,shopId,onClose,onSaved}:{reward:Reward|null;shopId:string|null;onClose:()=>void;onSaved:(r:Reward)=>void}){const[f,setF]=useState<Reward>(reward??{id:uid(),name:'',type:'fixed_discount',costPoints:100,value:5,active:true});async function save(e:FormEvent){e.preventDefault();if(supabaseConfigured&&supabase&&shopId){const payload={shop_id:shopId,name:f.name,reward_type:f.type,points_cost:f.costPoints??null,stamps_cost:f.requiredStamps??null,reward_value:f.value,product_id:f.productId??null,active:f.active};const res=reward?await supabase.from('loyalty_rewards').update(payload).eq('id',reward.id).select('id').single():await supabase.from('loyalty_rewards').insert(payload).select('id').single();if(res.error)return alert(res.error.message);f.id=res.data.id}onSaved(f)}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>{reward?tr("Modify Reward"):tr("Add Reward")}</h2><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div><div className="form-grid"><FormField>{tr("Reward name")}<InputField required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></FormField><FormField>{tr("Reward type")}<SelectField value={f.type} onChange={e=>setF({...f,type:e.target.value as Reward['type']})}><option value="free_product">{tr("Free Product")}</option><option value="percent_discount">{tr("Percentage Discount")}</option><option value="fixed_discount">{tr("Fixed Discount")}</option><option value="bonus_points">{tr("Bonus Points")}</option></SelectField></FormField><FormField>{tr("Points required")}<InputField min="0" type="number" value={f.costPoints??''} onChange={e=>setF({...f,costPoints:e.target.value?Number(e.target.value):undefined})}/></FormField><FormField>{tr("Stamps required")}<InputField min="0" type="number" value={f.requiredStamps??''} onChange={e=>setF({...f,requiredStamps:e.target.value?Number(e.target.value):undefined})}/></FormField><FormField>{tr("Reward value")}<InputField min="0" step="0.01" type="number" value={f.value} onChange={e=>setF({...f,value:Number(e.target.value)})}/></FormField></div><StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn">{tr("Save Reward")}</Button></StickyActions></form></div>}

function GivePointsModal({customer,onClose,onSaved}:{customer:Customer;onClose:()=>void;onSaved:(balance:number)=>void}){const[amount,setAmount]=useState('');const[note,setNote]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');async function save(e:FormEvent){e.preventDefault();const points=Number(amount);if(!Number.isInteger(points)||points<1||points>100000)return setError(trError(tr("Enter between 1 and 100,000 whole points.")));if(note.trim().length<3)return setError(trError(tr("Enter a reason for the point adjustment.")));setBusy(true);setError(trError(''));try{let balance=customer.points+points;if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('grant_customer_points',{p_customer_id:customer.id,p_points:points,p_note:note.trim()});if(error)throw error;balance=Number(data)}onSaved(balance)}catch(err){setError(trError(err instanceof Error?err.message:tr("Points could not be added.")))}finally{setBusy(false)}}return <div className="modal-backdrop"><form className="modal compact" onSubmit={save}><div className="panel-title"><div><h2>{tr("Give Points")}</h2><p className="muted">{customer.name}{' '+tr("currently has")+' '} {customer.points}{' '+tr("points.")}</p></div><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div><FormField>{tr("Points to add")}<InputField autoFocus required type="number" min="1" max="100000" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/></FormField><FormField>{tr("Reason")}<InputField required minLength={3} maxLength={200} value={note} onChange={e=>setNote(e.target.value)} placeholder={tr("Promotion, service recovery, correction…")}/></FormField><div className="info-box">{tr("This administrator adjustment is recorded in the customer's loyalty transaction history.")}</div>{error&&<div className="error-box">{tr(error)}</div>}<StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy}>{busy?tr("Adding…"):tr("Add Points")}</Button></StickyActions></form></div>}

type CardKind='loyalty'|'customer'|'employee';type CardDesign='solid'|'gradient'|'elegant_border';type CardStyle={background_color:string;design_style:CardDesign}
const defaultCardStyles:Record<CardKind,CardStyle>={loyalty:{background_color:'#6F1D2A',design_style:'elegant_border'},customer:{background_color:'#7A3E1D',design_style:'gradient'},employee:{background_color:'#24334A',design_style:'solid'}}
function Cards({customers,staffName,shopName,logoUrl,shopAddress,businessNumber,role,showToast,stampsRequired}:{customers:Customer[];staffName:string;shopName:string;logoUrl:string|null;shopAddress:string;businessNumber:string;role:Role;showToast:(m:string)=>void;stampsRequired:number}){
  const[type,setType]=useState<CardKind>('loyalty');const[customerId,setCustomerId]=useState(customers.find(c=>c.loyaltyStatus==='member')?.id??customers[0]?.id??'');const[staffId,setStaffId]=useState('');const[cardId,setCardId]=useState('');const[styles,setStyles]=useState<Record<CardKind,CardStyle>>(defaultCardStyles);const[printSide,setPrintSide]=useState<'front'|'back'|'both'|null>(null);const customer=customers.find(c=>c.id===customerId);const style=styles[type]
  useEffect(()=>{if(!supabase)return;void supabase.auth.getUser().then(({data})=>setStaffId(data.user?.id??''));void supabase.rpc('get_card_styles').then(({data})=>{if(data)setStyles(current=>({...current,...data}))})},[])
  useEffect(()=>{const subject=type==='employee'?staffId:customerId;setCardId('');if(!subject)return;if(supabaseConfigured&&supabase){void supabase.rpc('get_or_create_card_id',{p_card_type:type,p_subject_id:subject}).then(({data,error})=>{if(error)showToast(trError(error.message));else setCardId(String(data))})}else setCardId(`${type==='customer'?'CUS':type==='loyalty'?'LOY':'EMP'}-${Math.abs(hash(subject)).toString().padStart(12,'0').slice(0,12)}`)},[type,customerId,staffId])
  async function saveStyle(){if(role!=='admin')return showToast(trError(tr("Administrator access is required to save card styles.")));if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('save_card_style',{p_card_type:type,p_background_color:style.background_color,p_design_style:style.design_style});if(error)return showToast(trError(error.message))}showToast(trError(`${type[0].toUpperCase()+type.slice(1)} card style saved.`))}
  function updateStyle(change:Partial<CardStyle>){setStyles(all=>({...all,[type]:{...all[type],...change}}))}
  function print(side:'front'|'back'|'both'){setPrintSide(side);document.body.classList.add('card-print-mode');window.setTimeout(()=>window.print(),100)}
  useEffect(()=>{const done=()=>{setPrintSide(null);document.body.classList.remove('card-print-mode')};window.addEventListener('afterprint',done);return()=>{window.removeEventListener('afterprint',done);document.body.classList.remove('card-print-mode')}},[])
  const presets=[['Espresso','#6B3518'],['Burgundy','#6F1D2A'],['Forest','#294C3A'],['Navy','#24334A'],['Charcoal','#343434'],['Champagne','#B98B52']]
  return <><PageHeader title={tr("Cards")}/><SegmentedNav className="segmented cards-tabs"><Button type="submit" variant="secondary" className={type==='loyalty'?'active':''} onClick={()=>setType('loyalty')}>{tr("Loyalty Card")}</Button><Button type="submit" variant="secondary" className={type==='customer'?'active':''} onClick={()=>setType('customer')}>{tr("Customer Card")}</Button><Button type="submit" variant="secondary" className={type==='employee'?'active':''} onClick={()=>setType('employee')}>{tr("Employee Card")}</Button></SegmentedNav>{type!=='employee'&&<div className="card-picker"><FormField>{tr("Select customer")}<SelectField value={customerId} onChange={e=>setCustomerId(e.target.value)}>{customers.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</SelectField></FormField></div>}<section className="card-designer"><div className={`cards-print-area ${printSide?`print-${printSide}`:''}`}><DigitalCard side="front" kind={type} name={type==='employee'?staffName:customer?.name??'Customer'} shopName={shopName} logoUrl={logoUrl} shopAddress={shopAddress} businessNumber={businessNumber} cardId={cardId||'Preparing card ID…'} style={style} points={customer?.points} stamps={customer?.stamps}/><DigitalCard side="back" kind={type} name={type==='employee'?staffName:customer?.name??'Customer'} shopName={shopName} logoUrl={logoUrl} shopAddress={shopAddress} businessNumber={businessNumber} cardId={cardId||'Preparing card ID…'} style={style} points={customer?.points} stamps={customer?.stamps}/></div><aside className="panel card-appearance"><h2>{tr("Card Appearance")}</h2><FormField>{tr("Elegant color presets")}<div className="card-swatches">{presets.map(([label,color])=><Button variant="secondary" type="button" key={color} className={style.background_color===color?'selected':''} title={label} onClick={()=>updateStyle({background_color:color})}><i style={{background:color}}/><span>{label}</span></Button>)}</div></FormField><FormField>{tr("Custom color")}<InputField type="color" value={style.background_color} onChange={e=>updateStyle({background_color:e.target.value.toUpperCase()})}/></FormField><FormField>{tr("Style")}<SelectField value={style.design_style} onChange={e=>updateStyle({design_style:e.target.value as CardDesign})}><option value="solid">{tr("Solid")}</option><option value="gradient">{tr("Soft Gradient")}</option><option value="elegant_border">{tr("Elegant Border")}</option></SelectField></FormField><Button type="submit" variant="primary" className="primary-btn" onClick={saveStyle} disabled={role!=='admin'}>{tr("Save Card Style")}</Button><hr/><h2>{tr("Print Card")}</h2><Button type="submit" variant="secondary" onClick={()=>print('front')} disabled={!cardId}><Printer size={18}/>{' '+tr("Print Front")}</Button><Button type="submit" variant="secondary" onClick={()=>print('back')} disabled={!cardId}><Printer size={18}/>{' '+tr("Print Back")}</Button><Button type="submit" variant="secondary" onClick={()=>print('both')} disabled={!cardId}><FileBarChart size={18}/>{' '+tr("Save Front & Back as PDF")}</Button><p className="muted">{tr("The PDF option places both card sides on one page. In the print dialog choose Save as PDF and disable browser headers and footers. QR and barcode values both identify card")+' '} {cardId||'…'}.</p></aside></section>{type==='loyalty'&&customer&&<LoyaltyProgressCard customer={customer} required={stampsRequired}/>}</>
}

function LoyaltyProgressCard({customer,required}:{customer:Customer;required:number}){const total=Math.max(1,required);return <Card className="loyalty-progress-card panel"><div><small>{tr("LOYALTY STATUS")}</small><h2>{customer.name}</h2><p><strong>{customer.points}</strong>{' '+tr("points earned")}</p></div><div className="stamp-progress"><div>{Array.from({length:total},(_,i)=><span key={i} className={i<customer.stamps?'filled':''}>{i<customer.stamps?'★':''}</span>)}</div><strong>{customer.stamps}{' '+tr("of")+' '} {total}{' '+tr("stamps")}</strong><small>{customer.stamps>=total?tr("Reward ready to redeem"):tr("Collect stamps to unlock the configured reward")}</small></div></Card>}

function DigitalCard({side,kind,name,shopName,logoUrl,shopAddress,businessNumber,cardId,style,points=0,stamps=0}:{side:'front'|'back';kind:CardKind;name:string;shopName:string;logoUrl:string|null;shopAddress:string;businessNumber:string;cardId:string;style:CardStyle;points?:number;stamps?:number}){const[qr,setQr]=useState('');const barcodeRef=useRef<SVGSVGElement|null>(null);useEffect(()=>{setQr('');if(cardId.startsWith('Preparing'))return;QRCode.toDataURL(cardId,{width:260,margin:1,errorCorrectionLevel:'M'}).then(setQr);if(barcodeRef.current)JsBarcode(barcodeRef.current,cardId,{format:'CODE128',displayValue:true,fontSize:12,height:48,margin:4,background:'#FFFFFF',lineColor:'#000000'})},[cardId,side]);const hex=style.background_color;const ink=readableForeground([hex]);const cardVars={'--card-color':hex,'--card-ink':ink} as React.CSSProperties;return <article className={`digital-card-v31 print-card-side card-${side} style-${style.design_style}`} style={cardVars}>{side==='front'?<><div className="card-front-copy"><small>{kind==='employee'?tr("EMPLOYEE"):kind==='loyalty'?tr("LOYALTY MEMBER"):tr("CUSTOMER")}</small><h2>{name}</h2><strong>{tr("Card ID:")+' '} {cardId}</strong></div>{qr&&<img className="card-qr" src={qr} alt={`${cardId} QR code`}/>}<div className="card-barcode-shell"><svg className="card-barcode" ref={barcodeRef} aria-label={`${cardId} barcode`}/></div></>:<div className="card-back-content"><BrandLogo logoUrl={logoUrl} businessName={shopName}/><h2>{shopName}</h2><p><strong>{tr("Business No:")}</strong> {businessNumber||tr("Not configured")}</p><p>{shopAddress||tr("Business address not configured")}</p></div>}</article>}
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
      showToast(trError(tr("Detailed adjustment tools are available for new demo sales.")));return null
    }
    setLoadingId(sale.id)
    const loaded=await fetchReceipt(sale.id,receiptConfig)
    setLoadingId('')
    if(!loaded){showToast(trError(tr("Could not load this receipt. Run the v4 refund/void migration if needed.")));return null}
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
      if(error){showToast(trError(error.message));return}
      loaded.reprintCount=Number(data??loaded.reprintCount+1)
    }else loaded.reprintCount+=1
    setReceipt({...loaded});showToast(trError(`Receipt reprint logged • copy ${loaded.reprintCount}`))
  }
  async function adjusted(result:any,base:ReceiptData){
    const status=(result?.sale_status??'completed') as SaleStatus
    const refundedTotal=Number(result?.refunded_total??base.refundedTotal)
    if(supabaseConfigured){await refresh()}
    else setSales(rows=>rows.map(r=>r.id===base.saleId?{...r,status,refundedTotal,receipt:{...base,status,refundedTotal}}:r))
    setRefundReceipt(null);setVoidReceipt(null)
    showToast(trError(`${status==='voided'?'Sale voided':'Refund recorded'} • ${money(Number(result?.refund_total??0),receiptConfig.currency)}`))
  }

  return <><PageHeader title={tr("Sales")}/>
    <div className="info-box adjustment-note"><ShieldCheck size={18}/><span>{tr("Refunds and voids require a manager PIN and are saved to the audit trail. Card/QR payment reversals must also be completed with the external payment terminal/provider until payment processing is integrated.")}</span></div>
    <Card className="panel"><Table headers={['Receipt','Time','Customer','Items','Payment','Original','Refunded','Net','Status','Action']} rows={sales.map(s=>[
      receiptNo(s.receiptNumber),s.time,s.customerName||'Guest',s.items,s.payment,money(s.total,receiptConfig.currency),
      s.refundedTotal>0?money(s.refundedTotal,receiptConfig.currency):'—',money(netSaleTotal(s),receiptConfig.currency),
      <span key={`status-${s.id}`} className={`sale-status ${s.status}`}>{statusLabel(s.status)}</span>,
      <div className="table-actions sale-actions" key={s.id}>
        <Button type="submit" variant="secondary" onClick={()=>viewReceipt(s)} disabled={loadingId===s.id}>{loadingId===s.id?tr("Loading…"):tr("View")}</Button>
        <Button type="submit" variant="secondary" onClick={()=>reprint(s)} disabled={loadingId===s.id}><Printer size={14}/>{' '+tr("Reprint")}</Button>
        <Button type="submit" variant="secondary" onClick={()=>beginRefund(s)} disabled={loadingId===s.id||s.status==='refunded'||s.status==='voided'}><RotateCcw size={14}/>{' '+tr("Refund")}</Button>
        <Button type="submit" variant="danger" className="danger-link" onClick={()=>beginVoid(s)} disabled={loadingId===s.id||s.status!=='completed'}><Ban size={14}/>{' '+tr("Void")}</Button>
      </div>
    ])}/></Card>
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
    if(!reason.trim())return showToast(trError(tr("Enter a refund reason.")))
    if(managerPin.length<4)return showToast(trError(tr("Manager PIN is required.")))
    const items=mode==='partial'?remainingLines.filter(i=>(qty[i.key]??0)>0).map(i=>({sale_item_id:i.saleItemId,qty:Math.min(i.remaining,qty[i.key]??0)})):[]
    if(mode==='partial'&&!items.length)return showToast(trError(tr("Select at least one item quantity to refund.")))
    setBusy(true)
    if(supabaseConfigured&&supabase){
      const{data,error}=await supabase.rpc('process_sale_adjustment',{p_sale_id:receipt.saleId,p_mode:mode,p_items:items,p_restock:restock,p_reason:reason.trim(),p_manager_pin:managerPin,p_payment_note:paymentNote||null})
      setBusy(false);if(error){showToast(trError(error.message));return}onDone(data);return
    }
    const refundTotal=Number(estimate.toFixed(2));const newRefunded=Math.min(receipt.total,receipt.refundedTotal+refundTotal)
    setBusy(false);onDone({sale_status:newRefunded>=receipt.total-0.01?'refunded':'partially_refunded',refund_total:refundTotal,refunded_total:newRefunded})
  }
  return <div className="modal-backdrop"><form className="modal refund-modal" onSubmit={submit}>
    <div className="panel-title"><div><h2>{tr("Refund")+' '} {receiptNo(receipt.receiptNumber)}</h2><p className="muted">{tr("Original total")+' '} {money(receipt.total,receipt.currency)}{' '+tr("• already refunded")+' '} {money(receipt.refundedTotal,receipt.currency)}</p></div><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div>
    <SegmentedNav className="segmented"><Button variant="secondary" type="button" className={mode==='partial'?'active':''} onClick={()=>setMode('partial')}>{tr("Partial Refund")}</Button><Button variant="secondary" type="button" className={mode==='full'?'active':''} onClick={()=>setMode('full')}>{tr("Refund Remaining Sale")}</Button></SegmentedNav>
    {mode==='partial'?<div className="refund-items">{remainingLines.map(i=><div className="refund-item" key={i.key}><div><strong>{i.name}</strong><small>{i.remaining}{' '+tr("remaining •")+' '} {money(i.unitPrice,receipt.currency)}{' '+tr("each")}</small></div><FormField>{tr("Qty")}<InputField type="number" min="0" max={i.remaining} step="1" value={qty[i.key]??0} onChange={e=>setQty({...qty,[i.key]:Math.max(0,Math.min(i.remaining,Number(e.target.value)))})}/></FormField></div>)}</div>:<div className="info-box">{tr("All remaining refundable quantities will be included. Previously refunded quantities are not refunded again.")}</div>}
    <div className="refund-estimate"><span>{tr("Estimated POS refund")}</span><strong>{money(estimate,receipt.currency)}</strong></div>
    <FormField className="switch-line"><InputField type="checkbox" checked={restock} onChange={e=>setRestock(e.target.checked)}/>{' '+tr("Return refunded items to inventory")}</FormField>
    <FormField>{tr("Reason")}<TextAreaField rows={2} required value={reason} onChange={e=>setReason(e.target.value)} placeholder={tr("Customer return, duplicate charge, wrong item…")}/></FormField>
    {receipt.payment!=='CASH'&&<div className="warning-box">{tr("This POS records the refund but does not send money back through the")+' '} {receipt.payment}{' '+tr("provider. Complete the financial refund on the payment terminal/provider too.")}</div>}
    <FormField>{tr("External refund/reference note (optional)")}<InputField value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder={tr("Terminal refund ID or note")}/></FormField>
    <FormField>{tr("Manager PIN")}<InputField type="password" inputMode="numeric" autoComplete="off" value={managerPin} onChange={e=>setManagerPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder={tr("4–8 digit manager PIN")}/></FormField>
    <StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy||estimate<=0}>{busy?tr("Processing…"):tr("Confirm Refund")}</Button></StickyActions>
  </form></div>
}

function VoidModal({receipt,onClose,onDone,showToast}:{receipt:ReceiptData;onClose:()=>void;onDone:(r:any)=>void;showToast:(m:string)=>void}){
  const[reason,setReason]=useState('')
  const[managerPin,setManagerPin]=useState('')
  const[paymentNote,setPaymentNote]=useState('')
  const[busy,setBusy]=useState(false)
  async function submit(e:FormEvent){
    e.preventDefault();if(!reason.trim())return showToast(trError(tr("Enter a void reason.")));if(managerPin.length<4)return showToast(trError(tr("Manager PIN is required.")))
    setBusy(true)
    if(supabaseConfigured&&supabase){
      const{data,error}=await supabase.rpc('process_sale_adjustment',{p_sale_id:receipt.saleId,p_mode:'void',p_items:[],p_restock:true,p_reason:reason.trim(),p_manager_pin:managerPin,p_payment_note:paymentNote||null})
      setBusy(false);if(error){showToast(trError(error.message));return}onDone(data);return
    }
    setBusy(false);onDone({sale_status:'voided',refund_total:receipt.total,refunded_total:receipt.total})
  }
  return <div className="modal-backdrop"><form className="modal void-modal" onSubmit={submit}>
    <div className="panel-title"><div><h2>{tr("Void Sale")+' '} {receiptNo(receipt.receiptNumber)}</h2><p className="muted">{tr("Use Void for a completed sale entered by mistake. All sale quantities are returned to inventory and loyalty activity is reversed.")}</p></div><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div>
    <div className="danger-box"><Ban size={20}/><div><strong>{tr("Void")+' '} {money(receipt.total,receipt.currency)}{' '+tr("sale?")}</strong><span>{tr("This action remains in the audit history and cannot be deleted.")}</span></div></div>
    {receipt.payment!=='CASH'&&<div className="warning-box">{tr("Voiding the POS record does not automatically reverse the")+' '} {receipt.payment}{' '+tr("payment. Cancel/refund it on the external terminal/provider as well.")}</div>}
    <FormField>{tr("Reason")}<TextAreaField rows={2} required value={reason} onChange={e=>setReason(e.target.value)} placeholder={tr("Duplicate sale, wrong payment method, cashier error…")}/></FormField>
    <FormField>{tr("External cancellation/reference note (optional)")}<InputField value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} /></FormField>
    <FormField>{tr("Manager PIN")}<InputField type="password" inputMode="numeric" autoComplete="off" value={managerPin} onChange={e=>setManagerPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder={tr("4–8 digit manager PIN")}/></FormField>
    <StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="danger" className="danger-btn" disabled={busy}>{busy?tr("Voiding…"):tr("Void Sale")}</Button></StickyActions>
  </form></div>
}

type ManagementReport={summary:{gross_sales:number;discounts:number;tax:number;refunds:number;net_sales:number;transactions:number};payments:{payment_method:string;gross:number;refunds:number;net:number;transactions:number}[];drawers:{sessions:number;expected:number;counted:number;variance:number};recent_drawers:{id:string;opened_at:string;closed_at:string;expected_amount:number;counted_amount:number;variance:number;opened_by_name:string;closed_by_name:string}[]}
function Reports({logoUrl,shopName,sales,products,currency,role}:{logoUrl:string|null;shopName:string;sales:SaleSummary[];products:Product[];currency:string;role:Role}){
  const today=new Date().toISOString().slice(0,10);const monthStart=`${today.slice(0,8)}01`
  const[from,setFrom]=useState(monthStart);const[to,setTo]=useState(today);const[busy,setBusy]=useState(false);const[report,setReport]=useState<ManagementReport|null>(null)
  const localRevenue=sales.reduce((a,s)=>a+netSaleTotal(s),0);const localRefunds=sales.reduce((a,s)=>a+(s.refundedTotal??0),0);const stockValue=products.reduce((a,p)=>a+p.price*p.stock,0)
  async function load(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_management_report',{p_from:`${from}T00:00:00`,p_to:`${to}T23:59:59.999`});if(error){setBusy(false);alert(error.message);return}setReport(data as ManagementReport)}else{const methods=['CASH','CARD','QR'].map(method=>{const rows=sales.filter(s=>s.payment===method);const gross=rows.reduce((a,s)=>a+s.total,0),refunds=rows.reduce((a,s)=>a+s.refundedTotal,0);return{payment_method:method.toLowerCase(),gross,refunds,net:gross-refunds,transactions:rows.length}});setReport({summary:{gross_sales:sales.reduce((a,s)=>a+s.total,0),discounts:0,tax:0,refunds:localRefunds,net_sales:localRevenue,transactions:sales.length},payments:methods,drawers:{sessions:0,expected:0,counted:0,variance:0},recent_drawers:[]})}setBusy(false)}
  useEffect(()=>{if(role==='admin')void load()},[])
  function exportCsv(){if(!report)return;const rows=[[shopName||'CounterNest POS',tr('Management Reports')],[tr("From"),from,tr("To"),to],[],[tr("Summary"),tr("Amount")],[tr("Gross Sales"),report.summary.gross_sales],[tr("Discounts"),report.summary.discounts],[tr("Tax"),report.summary.tax],[tr("Refunds"),report.summary.refunds],[tr("Net Sales"),report.summary.net_sales],[],[tr("Payment"),tr("Gross"),tr("Refunds"),tr("Net"),tr("Transactions")],...report.payments.map(p=>[p.payment_method,p.gross,p.refunds,p.net,p.transactions]),[],[tr("Drawer sessions"),tr("Expected"),tr("Counted"),tr("Variance")],[report.drawers.sessions,report.drawers.expected,report.drawers.counted,report.drawers.variance]];const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`counternest-management-report-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)}
  if(role!=='admin')return <><PageHeader title={tr("Reports")}/><div className="info-box">{tr("Management access is required for financial, payment, and daily-cash reports.")}</div></>
  const summary=report?.summary??{gross_sales:localRevenue,discounts:0,tax:0,refunds:localRefunds,net_sales:localRevenue,transactions:sales.length}
  return <><h2 className="report-business"><BrandLogo className="report-business-logo" logoUrl={logoUrl} businessName={shopName}/>{shopName||'CounterNest POS'}</h2><PageHeader title={tr("Management Reports")}><div className="report-actions"><Button type="submit" variant="secondary" onClick={exportCsv} disabled={!report}><Download size={17}/>{' '+tr("CSV")}</Button><Button type="submit" variant="secondary" onClick={()=>window.print()}><Printer size={17}/>{' '+tr("Print / PDF")}</Button></div></PageHeader>
    <Card className="panel report-filter"><div className="form-grid"><FormField>{tr("From")}<InputField type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></FormField><FormField>{tr("To")}<InputField type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></FormField></div><Button type="submit" variant="primary" className="primary-btn small" onClick={load} disabled={busy||!from||!to}>{busy?tr("Loading…"):tr("Run Report")}</Button></Card>
    <section className="stats-grid"><Stat label={tr("Gross Sales")} value={money(Number(summary.gross_sales),currency)} sub={tr("Before refunds")}/><Stat label={tr("Refunds / Voids")} value={money(Number(summary.refunds),currency)} sub={tr("Recorded adjustments")}/><Stat label={tr("Net Sales")} value={money(Number(summary.net_sales),currency)} sub={tr("Gross less refunds")}/><Stat label={tr("Transactions")} value={String(summary.transactions)} sub={`${from} to ${to}`}/></section>
    <section className="two-col report-grid"><div className="panel"><h2>{tr("Payment Breakdown")}</h2>{report?<Table headers={['Method','Transactions','Gross','Refunds','Net']} rows={report.payments.map(p=>[p.payment_method.toUpperCase(),String(p.transactions),money(Number(p.gross),currency),money(Number(p.refunds),currency),money(Number(p.net),currency)])}/>:<p className="muted">{tr("Run the report to load payment totals.")}</p>}</div><div className="panel"><h2>{tr("Daily Cash Reconciliation")}</h2><div className="report-metrics"><span><small>{tr("Closed days/shifts")}</small><strong>{report?.drawers.sessions??0}</strong></span><span><small>{tr("Expected")}</small><strong>{money(Number(report?.drawers.expected??0),currency)}</strong></span><span><small>{tr("Counted")}</small><strong>{money(Number(report?.drawers.counted??0),currency)}</strong></span><span><small>{tr("Total variance")}</small><strong>{money(Number(report?.drawers.variance??0),currency)}</strong></span></div></div></section>
    <Card className="panel"><h2>{tr("Drawer Shift History")}</h2>{report?.recent_drawers.length?<Table headers={['Opened','Closed','Expected','Counted','Variance','Management']} rows={report.recent_drawers.map(d=>[new Date(d.opened_at).toLocaleString(),new Date(d.closed_at).toLocaleString(),money(Number(d.expected_amount),currency),money(Number(d.counted_amount),currency),money(Number(d.variance),currency),`${d.opened_by_name} → ${d.closed_by_name}`])}/>:<p className="muted">{tr("No closed drawers in this date range.")}</p>}</Card>
    <Card className="panel"><h2>{tr("Inventory Context")}</h2><p className="muted">{tr("Current retail stock value is")+' '} {money(stockValue,currency)}{tr(". This is a live inventory estimate and is not included in sales revenue.")}</p></Card></>}

type ProfitReport={summary:{net_sales:number;net_cogs:number;gross_profit:number;expenses:number;operating_result:number;gross_margin_percent:number;costed_items:number;uncosted_items:number};products:{product_name:string;qty_sold:number;net_revenue:number;net_cost:number;gross_profit:number;margin_percent:number}[]}
function ProfitabilityPage({shopName,role,currency,showToast}:{shopName:string;role:Role;currency:string;showToast:(m:string)=>void}){const today=new Date().toISOString().slice(0,10);const[from,setFrom]=useState(`${today.slice(0,8)}01`);const[to,setTo]=useState(today);const[report,setReport]=useState<ProfitReport|null>(null);const[busy,setBusy]=useState(false);async function load(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_profitability_report',{p_from:from,p_to:to});if(error){setBusy(false);return showToast(trError(error.message))}setReport(data as ProfitReport)}else setReport({summary:{net_sales:0,net_cogs:0,gross_profit:0,expenses:0,operating_result:0,gross_margin_percent:0,costed_items:0,uncosted_items:0},products:[]});setBusy(false)}useEffect(()=>{if(role==='admin')void load()},[role]);function csv(){if(!report)return;const data=[[shopName||'CounterNest POS',tr('Profitability Report'),from,to],[],['Net Sales',report.summary.net_sales],['Net COGS',report.summary.net_cogs],['Gross Profit',report.summary.gross_profit],['Expenses',report.summary.expenses],['Operating Result',report.summary.operating_result],[],['Product','Qty Sold','Net Revenue','Net Cost','Gross Profit','Margin %'],...report.products.map(p=>[p.product_name,p.qty_sold,p.net_revenue,p.net_cost,p.gross_profit,p.margin_percent])];const body=data.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([body],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`counternest-profitability-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)}if(role!=='admin')return <><PageHeader title={tr("Profitability")}/><div className="info-box">{tr("Administrator access is required.")}</div></>;const s=report?.summary;return <><PageHeader title={tr("Profitability")}><div className="report-actions"><Button type="submit" variant="secondary" onClick={csv} disabled={!report}><Download size={17}/>{' '+tr("CSV")}</Button><Button type="submit" variant="secondary" onClick={()=>window.print()}><Printer size={17}/>{' '+tr("Print / PDF")}</Button></div></PageHeader><div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr("Product cost is snapshotted at checkout. Later cost changes do not rewrite completed sales. Older sales without cost snapshots may show zero cost and are counted as uncosted.")}</span></div><Card className="panel report-filter"><div className="form-grid"><FormField>{tr("From")}<InputField type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></FormField><FormField>{tr("To")}<InputField type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></FormField></div><Button type="submit" variant="primary" className="primary-btn small" onClick={load} disabled={busy}>{busy?tr("Loading…"):tr("Run Profit Report")}</Button></Card><section className="stats-grid"><Stat label={tr("Net Sales")} value={money(Number(s?.net_sales??0),currency)} sub={tr("After refunds")}/><Stat label={tr("Cost of Goods")} value={money(Number(s?.net_cogs??0),currency)} sub={tr("Cost snapshots after returns")}/><Stat label={tr("Gross Profit")} value={money(Number(s?.gross_profit??0),currency)} sub={`${Number(s?.gross_margin_percent??0).toFixed(1)}% margin`}/><Stat label={tr("Operating Result")} value={money(Number(s?.operating_result??0),currency)} sub={`After ${money(Number(s?.expenses??0),currency)} expenses`}/></section>{(s?.uncosted_items??0)>0&&<div className="warning-box">{s?.uncosted_items}{' '+tr("sold line item(s) have no cost snapshot. Profit may be overstated until all products have unit costs and new sales are recorded.")}</div>}<Card className="panel"><h2>{tr("Product Profitability")}</h2>{report?.products.length?<Table headers={['Product','Qty Sold','Net Revenue','Net Cost','Gross Profit','Margin']} rows={report.products.map(p=>[p.product_name,String(p.qty_sold),money(Number(p.net_revenue),currency),money(Number(p.net_cost),currency),money(Number(p.gross_profit),currency),`${Number(p.margin_percent).toFixed(1)}%`])}/>:<p className="muted">{tr("No sales in this date range.")}</p>}</Card></>}

type StaffRow={user_id:string;display_name:string;email:string|null;role:Role;active:boolean;pin_configured:boolean;must_change_password:boolean;password_initialized_at:string|null;created_at:string}
type StaffInviteRow={id:string;email:string;display_name:string;role:Role;token:string;status:string;expires_at:string;created_at:string}
function StaffManagement({role,showToast}:{role:Role;showToast:(m:string)=>void}){
  const[staff,setStaff]=useState<StaffRow[]>([]);const[invites,setInvites]=useState<StaffInviteRow[]>([]);const[email,setEmail]=useState('');const[name,setName]=useState('');const[inviteRole,setInviteRole]=useState<Role>('employee');const[temporaryPassword,setTemporaryPassword]=useState('');const[confirmTemporary,setConfirmTemporary]=useState('');const[createdCredential,setCreatedCredential]=useState<{name:string;email:string;password:string}|null>(null);const[resetTarget,setResetTarget]=useState<StaffRow|null>(null);const[busy,setBusy]=useState(false);const[showInvitations,setShowInvitations]=useState(false)
  async function load(){if(role!=='admin'||!supabaseConfigured||!supabase)return;const{data,error}=await supabase.rpc('get_staff_management');if(error)return showToast(trError(error.message));setStaff(data?.staff??[]);setInvites(data?.invitations??[])}
  useEffect(()=>{void load()},[role])
  function generatePassword(){const lower='abcdefghijkmnopqrstuvwxyz',upper='ABCDEFGHJKLMNPQRSTUVWXYZ',digits='23456789',symbols='!@#$%*-_';const all=lower+upper+digits+symbols;const pick=(chars:string)=>chars[crypto.getRandomValues(new Uint32Array(1))[0]%chars.length];const chars=[pick(lower),pick(upper),pick(digits),pick(symbols),...Array.from({length:12},()=>pick(all))];for(let i=chars.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}const value=chars.join('');setTemporaryPassword(value);setConfirmTemporary(value)}
  async function directCreate(e:FormEvent){e.preventDefault();if(!email.trim()||!name.trim())return;if(temporaryPassword!==confirmTemporary)return showToast(trError(tr("Temporary passwords do not match.")));if(temporaryPassword.length<12||!/[a-z]/.test(temporaryPassword)||!/[A-Z]/.test(temporaryPassword)||!/[0-9]/.test(temporaryPassword))return showToast(trError(tr("Temporary password does not meet the security requirements.")));setBusy(true);if(!supabaseConfigured||!supabase){setCreatedCredential({name:name.trim(),email:email.trim(),password:temporaryPassword});showToast(trError(tr("Demo staff account created.")))}else{const{data,error}=await supabase.functions.invoke('create-staff-account',{body:{email:email.trim(),display_name:name.trim(),role:inviteRole,temporary_password:temporaryPassword,confirm_password:confirmTemporary}});if(error){let message=error.message;try{const payload=await (error as any).context?.json();if(payload?.error)message=payload.error}catch{/* retain transport error */}setBusy(false);return showToast(trError(userFacingText(message)))}setCreatedCredential({name:data.display_name,email:data.email,password:temporaryPassword});await load();showToast(trError(tr("Confirmed staff account created.")))}setEmail('');setName('');setTemporaryPassword('');setConfirmTemporary('');setBusy(false)}
  async function invite(e:FormEvent){e.preventDefault();if(!email.trim()||!name.trim())return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('create_staff_invitation',{p_email:email.trim(),p_display_name:name.trim(),p_role:inviteRole});if(error){setBusy(false);return showToast(trError(error.message))}const link=`${window.location.origin}${window.location.pathname}?staff_invite=${data.token}`;await navigator.clipboard?.writeText(link).catch(()=>undefined);showToast(trError(tr("Invitation created and link copied.")));await load()}else{showToast(trError(tr("Demo invitation created.")))}setEmail('');setName('');setBusy(false)}
  async function update(userId:string,nextRole:Role,active:boolean){if(!confirm(`Save ${nextRole} / ${active?'active':'inactive'} access for this staff member?`))return;if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('update_staff_access',{p_user_id:userId,p_role:nextRole,p_active:active});if(error)return showToast(trError(error.message));await load()}else setStaff(rows=>rows.map(s=>s.user_id===userId?{...s,role:nextRole,active}:s));showToast(trError(tr("Staff access updated and audited.")))}
  function invitationLink(token:string){return `${window.location.origin}${window.location.pathname}?staff_invite=${token}`}
  if(role!=='admin')return <><PageHeader title={tr("Staff")}/><div className="info-box">{tr("Administrator access is required.")}</div></>
  return <><PageHeader title={tr("Staff & Access")}/><div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr("Administrators can create confirmed staff accounts without email delivery. Temporary passwords are never stored by CounterNest and must be replaced at first sign-in. All access changes are audited.")}</span></div>
    {createdCredential&&<Card className="panel credential-once"><div><h2>{tr("Account created — copy this now")}</h2><p><strong>{createdCredential.name}</strong>{' '+tr("can sign in with")+' '} <strong>{createdCredential.email}</strong>{' '+tr("and the temporary password below.")}</p><code>{createdCredential.password}</code><small>{tr("This password is shown only here. Give it to the staff member privately; do not email or post it publicly.")}</small></div><div className="credential-actions"><Button type="submit" variant="secondary" onClick={()=>navigator.clipboard?.writeText(createdCredential.password).then(()=>showToast(trError(tr("Temporary password copied."))))}>{tr("Copy Password")}</Button><Button type="submit" variant="primary" data-back-close="true" className="primary-btn" onClick={()=>setCreatedCredential(null)}>{tr("Done")}</Button></div></Card>}
    <section className="two-col staff-grid"><form className="panel staff-invite" onSubmit={directCreate}><h2>{tr("Create Staff Account")}</h2><FormField>{tr("Display name")}<InputField required value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></FormField><FormField>{tr("Email")}<InputField required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></FormField><FormField>{tr("Role")}<SelectField value={inviteRole} onChange={e=>setInviteRole(e.target.value as Role)}><option value="employee">{tr("Employee")}</option><option value="admin">{tr("Administrator")}</option></SelectField></FormField><FormField>{tr("Temporary password")}<div className="password-generator"><PasswordInput required minLength={12} autoComplete="new-password" value={temporaryPassword} onChange={e=>setTemporaryPassword(e.target.value)}/><Button variant="secondary" type="button" onClick={generatePassword}>{tr("Generate")}</Button></div></FormField><FormField>{tr("Confirm temporary password")}<PasswordInput required minLength={12} autoComplete="new-password" value={confirmTemporary} onChange={e=>setConfirmTemporary(e.target.value)}/></FormField><Button type="submit" variant="primary" className="primary-btn" disabled={busy}>{busy?tr("Creating…"):tr("Create Confirmed Account")}</Button><small className="muted">{tr("No email is sent. Share the temporary password privately. The staff member must create a new password at first sign-in.")}</small></form><div className="panel"><h2>{tr("Access Summary")}</h2><div className="report-metrics"><span><small>{tr("Active staff")}</small><strong>{staff.filter(s=>s.active).length}</strong></span><span><small>{tr("Administrators")}</small><strong>{staff.filter(s=>s.active&&s.role==='admin').length}</strong></span><span><small>{tr("Employees")}</small><strong>{staff.filter(s=>s.active&&s.role==='employee').length}</strong></span><span><small>{tr("Password change due")}</small><strong>{staff.filter(s=>s.must_change_password).length}</strong></span></div></div></section>
    <Card className="panel"><h2>{tr("Staff Directory")}</h2>{staff.length?<div className="table-wrap"><table><thead><tr><th>{tr("Name")}</th><th>{tr("Email")}</th><th>{tr("Role")}</th><th>{tr("Status")}</th><th>{tr("Password")}</th><th>{tr("Manager PIN")}</th><th>{tr("Action")}</th></tr></thead><tbody>{staff.map(s=><StaffAccessRow key={s.user_id} staff={s} onSave={update} onReset={()=>setResetTarget(s)}/>)}</tbody></table></div>:<p className="muted">{tr("No staff profiles loaded.")}</p>}</Card>
    <Card className="panel invitation-fallback"><Button variant="secondary" type="button" className="section-toggle" onClick={()=>setShowInvitations(v=>!v)}>{showInvitations?tr("Hide"):tr("Show")}{' '+tr("email invitation fallback")}</Button>{showInvitations&&<><form className="staff-invite compact" onSubmit={invite}><h2>{tr("Create Email Invitation")}</h2><p className="muted">{tr("Use this only when Supabase email delivery is configured. It uses the name, email, and role entered above.")}</p><Button type="submit" variant="primary" className="primary-btn" disabled={busy||!email.trim()||!name.trim()}>{busy?tr("Creating…"):tr("Create Invitation from Form Above")}</Button></form><h2>{tr("Invitation History")}</h2>{invites.length?<Table headers={['Name','Email','Role','Status','Expires','Action']} rows={invites.map(i=>[i.display_name,i.email,i.role,i.status,new Date(i.expires_at).toLocaleString(),<Button type="submit" variant="secondary" key={i.id} disabled={i.status!=='pending'} onClick={()=>navigator.clipboard?.writeText(invitationLink(i.token)).then(()=>showToast(trError(tr("Invitation link copied."))))}>{tr("Copy Link")}</Button>])}/>:<p className="muted">{tr("No invitations yet.")}</p>}</>}</Card>  {resetTarget&&<ResetStaffPasswordModal staff={resetTarget} onClose={()=>setResetTarget(null)} onSaved={async credential=>{setResetTarget(null);setCreatedCredential({name:credential.name,email:credential.email,password:credential.password});await load();showToast(trError(tr("Temporary password reset. The staff member must change it at next sign-in.")))}}/>}</>

}
function StaffAccessRow({staff,onSave,onReset}:{staff:StaffRow;onSave:(id:string,role:Role,active:boolean)=>void;onReset:()=>void}){const[nextRole,setNextRole]=useState(staff.role);const[active,setActive]=useState(staff.active);return <tr><td>{staff.display_name}</td><td>{staff.email??'—'}</td><td><SelectField value={nextRole} onChange={e=>setNextRole(e.target.value as Role)}><option value="employee">{tr("Employee")}</option><option value="admin">{tr("Administrator")}</option></SelectField></td><td><FormField className="staff-active"><InputField type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>{active?tr("Active"):tr("Inactive")}</FormField></td><td>{staff.must_change_password?tr("Change required"):tr("Private password set")}</td><td>{staff.pin_configured?tr("Configured"):tr("Not set")}</td><td><div className="table-actions"><Button type="submit" variant="secondary" onClick={()=>onSave(staff.user_id,nextRole,active)}>{tr("Save")}</Button><Button type="submit" variant="danger" onClick={onReset}>{tr("Reset Password")}</Button></div></td></tr>}

function ResetStaffPasswordModal({staff,onClose,onSaved}:{staff:StaffRow;onClose:()=>void;onSaved:(credential:{name:string;email:string;password:string})=>Promise<void>}){
  const[password,setPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[busy,setBusy]=useState(false)
  function generate(){const lower='abcdefghijkmnopqrstuvwxyz',upper='ABCDEFGHJKLMNPQRSTUVWXYZ',digits='23456789',symbols='!@#$%*-_';const all=lower+upper+digits+symbols;const pick=(chars:string)=>chars[crypto.getRandomValues(new Uint32Array(1))[0]%chars.length];const chars=[pick(lower),pick(upper),pick(digits),pick(symbols),...Array.from({length:12},()=>pick(all))];for(let i=chars.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[chars[i],chars[j]]=[chars[j],chars[i]]}const value=chars.join('');setPassword(value);setConfirmPassword(value)}
  async function save(e:FormEvent){e.preventDefault();if(password!==confirmPassword)return alert(tr("Temporary passwords do not match."));if(password.length<12||!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return alert(tr("Use at least 12 characters with upper-case, lower-case, and a number."));setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.functions.invoke('reset-staff-password',{body:{target_user_id:staff.user_id,temporary_password:password,confirm_password:confirmPassword}});if(error){let message=error.message;try{const payload=await (error as any).context?.json();if(payload?.error)message=payload.error}catch{}setBusy(false);alert(message);return}if(!data?.complete){setBusy(false);alert(tr("Password reset did not complete."));return}}await onSaved({name:staff.display_name,email:staff.email??'',password});setBusy(false)}
  return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><div><h2>{tr("Reset Staff Password")}</h2><p className="muted">{staff.display_name} • {staff.email??tr("No email")}</p></div><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}><X size={18}/></Button></div><div className="warning-box">{tr("This immediately replaces the staff member’s current password. They must create a private password at their next sign-in.")}</div><FormField>{tr("Temporary password")}<div className="password-generator"><PasswordInput required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><Button variant="secondary" type="button" onClick={generate}>{tr("Generate")}</Button></div></FormField><FormField>{tr("Confirm temporary password")}<PasswordInput required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></FormField><StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy}>{busy?tr("Resetting…"):tr("Reset Password")}</Button></StickyActions></form></div>
}

type AuditRow={id:string;event_time:string;category:string;action:string;actor_name:string;target:string;details:Record<string,unknown>}
function AuditLog({role,showToast}:{role:Role;showToast:(m:string)=>void}){
  const today=new Date().toISOString().slice(0,10);const[from,setFrom]=useState(`${today.slice(0,8)}01`);const[to,setTo]=useState(today);const[category,setCategory]=useState('all');const[query,setQuery]=useState('');const[rows,setRows]=useState<AuditRow[]>([]);const[busy,setBusy]=useState(false)
  async function load(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_audit_log',{p_from:`${from}T00:00:00`,p_to:`${to}T23:59:59.999`,p_limit:500});if(error){setBusy(false);return showToast(trError(error.message))}setRows(data??[])}else setRows([{id:'demo',event_time:new Date().toISOString(),category:'staff',action:'access_updated',actor_name:'Administrator',target:'Employee account',details:{role:'employee',active:true}}]);setBusy(false)}
  useEffect(()=>{if(role==='admin')void load()},[role])
  const visible=rows.filter(r=>(category==='all'||r.category===category)&&(!query.trim()||`${r.actor_name} ${r.target} ${r.action} ${JSON.stringify(r.details)}`.toLowerCase().includes(query.toLowerCase())))
  function details(d:Record<string,unknown>){return Object.entries(d??{}).filter(([,v])=>v!==null&&v!=='').map(([k,v])=>`${k.replace(/_/g,' ')}: ${String(v)}`).join(' • ')||'—'}
  function exportCsv(){const data=[[tr("Time"),tr("Category"),tr("Action"),tr("Staff"),tr("Target"),tr("Details")],...visible.map(r=>[r.event_time,r.category,r.action,r.actor_name,r.target,details(r.details)])];const csv=data.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`counternest-audit-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)}
  if(role!=='admin')return <><PageHeader title={tr("Audit Log")}/><div className="info-box">{tr("Administrator access is required.")}</div></>
  return <><PageHeader title={tr("Audit Log")}><div className="report-actions"><Button type="submit" variant="secondary" onClick={exportCsv} disabled={!visible.length}><Download size={17}/>{' '+tr("CSV")}</Button><Button type="submit" variant="secondary" onClick={()=>window.print()}><Printer size={17}/>{' '+tr("Print / PDF")}</Button></div></PageHeader><div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr("This read-only history is assembled from protected operational records. Audit entries cannot be edited or deleted through the POS.")}</span></div>
    <Card className="panel audit-filters"><div className="form-grid"><FormField>{tr("From")}<InputField type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></FormField><FormField>{tr("To")}<InputField type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></FormField><FormField>{tr("Category")}<SelectField value={category} onChange={e=>setCategory(e.target.value)}><option value="all">{tr("All categories")}</option><option value="staff">{tr("Staff access")}</option><option value="cash_drawer">{tr("Cash drawer")}</option><option value="expense">{tr("Expenses")}</option><option value="sale_adjustment">{tr("Refunds & voids")}</option><option value="inventory">{tr("Inventory")}</option><option value="receipt">{tr("Receipt reprints")}</option><option value="catalogue_request">{tr("Catalogue requests / contact overrides")}</option></SelectField></FormField><FormField>{tr("Search")}<SearchField value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr("Staff, target, reason…")}/></FormField></div><Button type="submit" variant="primary" className="primary-btn small" onClick={load} disabled={busy}>{busy?tr("Loading…"):tr("Load Audit")}</Button></Card>
    <section className="stats-grid three"><Stat label={tr("Events Loaded")} value={String(rows.length)} sub={tr("Maximum 500 per request")}/><Stat label={tr("Visible Results")} value={String(visible.length)} sub={tr("After local filters")}/><Stat label={tr("Categories")} value={String(new Set(rows.map(r=>r.category)).size)} sub={`${from} to ${to}`}/></section>
    <Card className="panel"><Table headers={['Time','Category','Action','Staff','Target','Details']} rows={visible.map(r=>[new Date(r.event_time).toLocaleString(),r.category.replace(/_/g,' '),r.action.replace(/_/g,' '),r.actor_name,r.target,details(r.details)])}/>{!visible.length&&<p className="muted">{tr("No audit entries match these filters.")}</p>}</Card></>
}

type BackupHistoryRow={id:string;requested_at:string;requested_by_name:string;schema_version:string}
function BackupPage({role,shopName,showToast}:{role:Role;shopName:string;showToast:(m:string)=>void}){const[history,setHistory]=useState<BackupHistoryRow[]>([]);const[busy,setBusy]=useState(false);async function load(){if(role!=='admin'||!supabaseConfigured||!supabase)return;const{data,error}=await supabase.rpc('get_backup_history');if(error)return showToast(trError(error.message));setHistory(data??[])}useEffect(()=>{void load()},[role]);function download(name:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}async function createBackup(){if(!confirm(tr("Create and download a business backup? Store the file securely because it contains customer and operational data.")))return;setBusy(true);let backup:any;if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('export_business_backup');if(error){setBusy(false);return showToast(trError(error.message))}backup=data}else backup={schema_version:'0.17.0-demo',exported_at:new Date().toISOString(),shop:{name:shopName},notice:'Demo-mode backup contains no Supabase data.'};const json=JSON.stringify(backup,null,2);const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json));const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');const stamp=new Date().toISOString().replace(/[:.]/g,'-');const safe=shopName.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'business';download(`${safe}-backup-${stamp}.json`,json,'application/json');download(`${safe}-backup-${stamp}.sha256`,`${hash}  ${safe}-backup-${stamp}.json\r\n`,'text/plain');await load();setBusy(false);showToast(trError(tr("Backup and SHA-256 integrity file downloaded.")))}if(role!=='admin')return <><PageHeader title={tr("Backup")}/><div className="info-box">{tr("Administrator access is required.")}</div></>;return <><PageHeader title={tr("Business Backup")}><Button type="submit" variant="primary" className="primary-btn small" onClick={createBackup} disabled={busy}><Download size={17}/>{busy?tr("Preparing…"):tr("Download Backup")}</Button></PageHeader><div className="danger-box"><ShieldCheck size={20}/><div><strong>{tr("Backups contain personal and business data.")}</strong><span>{tr("Store them in an encrypted, access-controlled location. Do not email them casually or place them in a public cloud folder.")}</span></div></div><section className="three-col backup-cards"><div className="panel"><h2>{tr("Included")}</h2><ul className="plain-list"><li>{tr("Shop configuration and catalog")}</li><li>{tr("Customers and loyalty records")}</li><li>{tr("Sales, refunds, and inventory history")}</li><li>{tr("Drawers, expenses, suppliers, orders, and production")}</li><li>{tr("Variants, bundles, pre-orders, conversions and catalogue history")}</li></ul></div><div className="panel"><h2>{tr("Excluded")}</h2><ul className="plain-list"><li>{tr("Passwords and authentication secrets")}</li><li>{tr("Manager PIN hashes")}</li><li>{tr("Supabase keys and environment variables")}</li><li>{tr("Device-local hardware settings")}</li></ul></div><div className="panel"><h2>{tr("Integrity")}</h2><p className="muted">{tr("Each JSON backup includes a matching SHA-256 file. Use it to confirm the backup has not changed or become corrupted.")}</p></div></section><Card className="panel"><h2>{tr("Backup Export History")}</h2>{history.length?<Table headers={['Requested','Administrator','Schema']} rows={history.map(h=>[new Date(h.requested_at).toLocaleString(),h.requested_by_name,h.schema_version])}/>:<p className="muted">{tr("No server backup exports have been requested yet.")}</p>}<small className="muted">{tr("This records export requests, not where downloaded files are stored.")}</small></Card><Card className="panel"><h2>{tr("Restore Readiness")}</h2><p className="muted">{tr("Automatic restore is intentionally not exposed in the POS. Restore operations can overwrite live records and must be performed by an administrator in a controlled Supabase test environment before production recovery.")}</p></Card></>}

type ReadinessCheck={id:string;label:string;status:'pass'|'warning'|'fail';detail:string}
function LaunchReadiness({role,showToast,standalone,online}:{role:Role;showToast:(m:string)=>void;standalone:boolean;online:boolean}){const[serverChecks,setServerChecks]=useState<ReadinessCheck[]>([]);const[busy,setBusy]=useState(false);const[lastRun,setLastRun]=useState('');async function run(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_launch_readiness');if(error){setBusy(false);return showToast(trError(error.message))}setServerChecks(data??[])}else setServerChecks([{id:'demo',label:'Demo mode',status:'warning',detail:'Configure Supabase before production launch.'}]);setLastRun(new Date().toISOString());setBusy(false)}useEffect(()=>{void run()},[role]);const printer=localStorage.getItem('counternest.printerProfile')||localStorage.getItem('chubbylu.printerProfile')||'system';const deviceChecks:ReadinessCheck[]=[{id:'online',label:'Cloud connectivity',status:online?'pass':'fail',detail:online?'This device is online.':'Reconnect before operating the POS.'},{id:'browser',label:'Browser access',status:'pass',detail:standalone?'Running as an installed browser app.':'Running in a browser; installation is optional.'},{id:'printer',label:'Receipt fallback',status:printer?'pass':'warning',detail:printer==='system'?'System Print fallback is configured.':`${printer} profile saved; physically test it and retain System Print fallback.`}];const checks=[...serverChecks,...deviceChecks];const failures=checks.filter(c=>c.status==='fail').length,warnings=checks.filter(c=>c.status==='warning').length;const launchStatus=failures?'Not Ready':warnings?'Ready with Warnings':'Ready';if(role!=='admin')return <><PageHeader title={tr("Launch Readiness")}/><div className="info-box">{tr("Administrator access is required.")}</div></>;return <><PageHeader title={tr("Deployment / Readiness")}><div className="report-actions"><Button type="submit" variant="secondary" onClick={run} disabled={busy}><RotateCcw size={17}/>{busy?tr("Checking…"):tr("Run Checks")}</Button><Button type="submit" variant="secondary" onClick={()=>window.print()}><Printer size={17}/>{' '+tr("Print Checklist")}</Button></div></PageHeader><section className={`launch-summary ${failures?'fail':warnings?'warning':'pass'}`}><ShieldCheck size={34}/><div><small>{tr("RELEASE STATUS")}</small><strong>{launchStatus}</strong><span>{failures}{' '+tr("required issue(s) •")+' '} {warnings}{' '+tr("warning(s)")}{lastRun?` • Checked ${new Date(lastRun).toLocaleString()}`:''}</span></div></section><section className="readiness-list">{checks.map(c=><div className={`readiness-item ${c.status}`} key={c.id}><span className="readiness-mark">{c.status==='pass'?'✓':c.status==='warning'?'!':'×'}</span><div><strong>{userFacingText(c.label)}</strong><p>{userFacingText(c.detail)}</p></div><b>{systemLabel(c.status)}</b></div>)}</section><Card className="panel"><h2>{tr("Deployment Procedure")}</h2><ol className="plain-list"><li>{tr("Resolve every required issue and review every warning.")}</li><li>{tr("Create and verify fresh business and Supply Operations backups.")}</li><li>{tr("Verify the applied migration level and rehearse only pending upgrades in a staging Supabase project.")}</li><li>{tr("Complete the administrator and employee UAT in the Admin Guide and UAT Checklist.")}</li><li>{tr("Open the production HTTPS URL on authorized devices and test System Print.")}</li><li>{tr("Run Operational Acceptance, complete Internal Go-Live evidence, and follow the go-live runbook.")}</li></ol></Card></>}

type ExpenseRow={id:string;expense_date:string;category_name:string;description:string;amount:number;payment_method:string;vendor:string|null;reference:string|null;created_at:string;created_by_name:string}
function ExpensesPage({role,currency,showToast}:{role:Role;currency:string;showToast:(m:string)=>void}){
  const today=new Date().toISOString().slice(0,10);const[from,setFrom]=useState(`${today.slice(0,8)}01`);const[to,setTo]=useState(today);const[rows,setRows]=useState<ExpenseRow[]>([]);const[categories,setCategories]=useState<string[]>(['Ingredients','Packaging','Utilities','Transport','Maintenance','Marketing','Other']);const[adding,setAdding]=useState(false);const[busy,setBusy]=useState(false)
  async function load(){if(role!=='admin')return;setBusy(true);if(supabaseConfigured&&supabase){const{data,error}=await supabase.rpc('get_expenses',{p_from:from,p_to:to});if(error){setBusy(false);return showToast(trError(error.message))}setRows(data?.expenses??[]);setCategories(data?.categories?.length?data.categories:categories)}else setRows([]);setBusy(false)}
  useEffect(()=>{if(role==='admin')void load()},[role])
  const total=rows.reduce((a,e)=>a+Number(e.amount),0),cash=rows.filter(e=>e.payment_method==='cash').reduce((a,e)=>a+Number(e.amount),0)
  function exportCsv(){const data=[[tr("Date"),tr("Category"),tr("Description"),tr("Vendor"),tr("Payment"),tr("Amount"),tr("Reference"),tr("Created By")],...rows.map(e=>[e.expense_date,e.category_name,e.description,e.vendor??'',e.payment_method,e.amount,e.reference??'',e.created_by_name])];const csv=data.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`counternest-expenses-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)}
  if(role!=='admin')return <><PageHeader title={tr("Expenses")}/><div className="info-box">{tr("Administrator access is required.")}</div></>
  return <><PageHeader title={tr("Expenses")}><div className="report-actions"><Button type="submit" variant="secondary" data-quick-action="Add Expense" onClick={()=>setAdding(true)}><Plus size={17}/>{' '+tr("Add Expense")}</Button><Button type="submit" variant="secondary" onClick={exportCsv} disabled={!rows.length}><Download size={17}/>{' '+tr("CSV")}</Button><Button type="submit" variant="secondary" onClick={()=>window.print()}><Printer size={17}/>{' '+tr("Print / PDF")}</Button></div></PageHeader><div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr("Expenses are append-only. Cash expenses automatically create an audited cash-out entry when a drawer is open; card and bank expenses do not affect drawer cash.")}</span></div>
    <Card className="panel report-filter"><div className="form-grid"><FormField>{tr("From")}<InputField type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></FormField><FormField>{tr("To")}<InputField type="date" value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></FormField></div><Button type="submit" variant="primary" className="primary-btn small" onClick={load} disabled={busy}>{busy?tr("Loading…"):tr("Load Expenses")}</Button></Card>
    <section className="stats-grid three"><Stat label={tr("Total Expenses")} value={money(total,currency)} sub={`${from} to ${to}`}/><Stat label={tr("Cash Expenses")} value={money(cash,currency)} sub={tr("Recorded against drawer when open")}/><Stat label={tr("Expense Records")} value={String(rows.length)} sub={tr("Append-only entries")}/></section>
    <Card className="panel"><Table headers={['Date','Category','Description','Vendor','Payment','Amount','Reference','Staff']} rows={rows.map(e=>[new Date(`${e.expense_date}T00:00:00`).toLocaleDateString(),e.category_name,e.description,e.vendor||'—',e.payment_method.toUpperCase(),money(Number(e.amount),currency),e.reference||'—',e.created_by_name])}/>{!rows.length&&<p className="muted">{tr("No expenses in this date range.")}</p>}</Card>
    {adding&&<ExpenseModal categories={categories} onClose={()=>setAdding(false)} onSaved={async()=>{setAdding(false);await load();showToast(trError(tr("Expense recorded and audited.")))}}/>}</>
}
function ExpenseModal({categories,onClose,onSaved}:{categories:string[];onClose:()=>void;onSaved:()=>Promise<void>}){const[date,setDate]=useState(new Date().toISOString().slice(0,10));const[category,setCategory]=useState(categories[0]??'Other');const[description,setDescription]=useState('');const[amount,setAmount]=useState('');const[payment,setPayment]=useState('cash');const[vendor,setVendor]=useState('');const[reference,setReference]=useState('');const[busy,setBusy]=useState(false);async function save(e:FormEvent){e.preventDefault();if(Number(amount)<=0)return;setBusy(true);if(supabaseConfigured&&supabase){const{error}=await supabase.rpc('create_expense',{p_expense_date:date,p_category_name:category,p_description:description.trim(),p_amount:Number(amount),p_payment_method:payment,p_vendor:vendor.trim()||null,p_reference:reference.trim()||null});if(error){setBusy(false);alert(error.message);return}}await onSaved();setBusy(false)}return <div className="modal-backdrop"><form className="modal" onSubmit={save}><div className="panel-title"><h2>{tr("Add Expense")}</h2><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>×</Button></div><div className="form-grid"><FormField>{tr("Date")}<InputField type="date" required value={date} max={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></FormField><FormField>{tr("Category")}<SelectField value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{localizeCategory(c)}</option>)}</SelectField></FormField><FormField className="full-field">{tr("Description")}<InputField required maxLength={200} value={description} onChange={e=>setDescription(e.target.value)} placeholder={tr("What was purchased or paid?")}/></FormField><FormField>{tr("Amount")}<InputField required type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></FormField><FormField>{tr("Payment method")}<SelectField value={payment} onChange={e=>setPayment(e.target.value)}><option value="cash">{tr("Cash")}</option><option value="card">{tr("Card")}</option><option value="bank">{tr("Bank / Transfer")}</option><option value="other">{tr("Other")}</option></SelectField></FormField><FormField>{tr("Vendor (optional)")}<InputField value={vendor} onChange={e=>setVendor(e.target.value)}/></FormField><FormField>{tr("Receipt/reference (optional)")}<InputField value={reference} onChange={e=>setReference(e.target.value)}/></FormField></div>{payment==='cash'&&<div className="warning-box">{tr("If a cash drawer is open, this amount will reduce its expected balance automatically.")}</div>}<StickyActions className="modal-actions"><Button variant="secondary" data-back-close="true" type="button" onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy}>{busy?tr("Saving…"):tr("Record Expense")}</Button></StickyActions></form></div>}

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
    if(!supabaseConfigured||!supabase){showToast(trError(tr("Detailed daily reports require Supabase.")));return}
    setBusy(true);const{data,error}=await supabase.rpc('get_daily_cash_report',{p_session_id:sessionId});setBusy(false)
    if(error){showToast(trError(error.message));return}setReport(data as DailyCashReportData)
  }

  async function load() {
    if(!supabaseConfigured||!supabase){return}
    const {data,error}=await supabase.rpc('get_cash_drawer')
    if(error){showToast(trError(error.message));return}
    const raw=(data??{}) as any
    const mapSession=(s:any):CashDrawerSession=>({id:s.id,status:s.status,openingAmount:Number(s.opening_amount),expectedAmount:Number(s.expected_amount),countedAmount:s.counted_amount==null?null:Number(s.counted_amount),variance:s.variance==null?null:Number(s.variance),openedAt:s.opened_at,closedAt:s.closed_at,openedByName:s.opened_by_name??'Staff',stationLabel:s.station_label??'Main Register',closedByName:s.closed_by_name??null,openingNote:s.opening_note,closingNote:s.closing_note,businessDate:s.business_date??null,varianceReason:s.variance_reason??null,closureReference:s.closure_reference??null,closeConfirmed:Boolean(s.close_confirmed)})
    setSession(raw.open_session?mapSession(raw.open_session):null)
    setTransactions((raw.transactions??[]).map((t:any)=>({id:t.id,type:t.transaction_type,amount:Number(t.amount),reason:t.reason,createdAt:t.created_at,staffName:t.staff_name??'System',receiptNumber:t.receipt_number==null?null:Number(t.receipt_number)})))
    setHistory((raw.recent_sessions??[]).map(mapSession))
  }
  useEffect(()=>{if(role==='admin')void load()},[shopId,role])

  async function callRpc(name:string,args:Record<string,unknown>,success:string){
    if(!online)return showToast(trError(tr("Reconnect to manage the daily cash record.")))
    setBusy(true)
    if(supabaseConfigured&&supabase){const{error}=await supabase.rpc(name,args);if(error){setBusy(false);return showToast(trError(error.message))}}
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
    setBusy(false);setAmount('');setReason('');setCounted('');setClosingNote('');setVarianceReason('');setCloseConfirmed(false);showToast(trError(success))
  }
  if(role!=='admin')return <><PageHeader title={tr("Daily Cash")}/><div className="info-box">{tr("Management access is required to view or adjust the daily cash record.")}</div></>
  const positiveAmount=Number(amount)>0
  return <>
    <PageHeader title={tr("Daily Cash")}><div className="drawer-header-actions">{session&&<Button variant="secondary" type="button" onClick={()=>void openReport(session.id)} disabled={busy||!online}><FileBarChart size={16}/>{' '+tr("Current Report")}</Button>}<Button variant="secondary" type="button" onClick={()=>void load()} disabled={busy||!online}><RotateCcw size={16}/>{' '+tr("Refresh")}</Button><span className={`drawer-status ${session?'open':'closed'}`}>{session?tr("Day Open"):tr("Day Closed")}</span></div></PageHeader>
    <div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr("This is a system cash record, not a physical-drawer controller. Only administrators can start the day, record cash in/out, count cash, or close the day. Every action is audited.")}</span></div>
    {!session?<Card className="panel drawer-open-panel"><h2><Landmark size={20}/>{' '+tr("Open Register")}</h2><p className="muted">{tr("Enter the existing cash or opening amount available at the beginning of the business day.")}</p><div className="drawer-form"><FormField>{tr("Register / station")}<InputField required maxLength={60} value={station} onChange={e=>setStation(e.target.value)}/></FormField><FormField>{tr("Opening Cash")}<InputField type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></FormField><FormField>{tr("Opening note")}<InputField value={openingNote} onChange={e=>setOpeningNote(e.target.value)} maxLength={200}/></FormField><Button  disabled={busy||!online||Number(amount)<0||amount===''} onClick={()=>callRpc('open_register',{p_opening_amount:Number(amount),p_station:station.trim(),p_note:openingNote.trim()||null},'Register opened and audited.')} type="button" variant="success">{tr("Open Register")}</Button></div></Card>:
    <>
      <p className="muted">{tr("Register / station:")+' '} <strong>{session.stationLabel??station}</strong></p><section className="stats-grid three drawer-stats"><Stat label={tr("Opening Cash")} value={money(session.openingAmount,currency)} sub={`Started by ${session.openedByName}`}/><Stat label={tr("Expected Cash")} value={money(session.expectedAmount,currency)} sub={tr("Opening + cash sales + cash in − cash out/refunds")}/><Stat label={tr("Day Started")} value={new Date(session.openedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} sub={new Date(session.openedAt).toLocaleDateString()}/></section>
      <section className="two-col drawer-actions-grid"><div className="panel"><h2><Plus size={19}/>{' '+tr("Add or remove cash")}</h2><div className="drawer-form"><FormField>{tr("Amount")}<InputField type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></FormField><FormField>{tr("Required reason")}<InputField value={reason} onChange={e=>setReason(e.target.value)} maxLength={200} placeholder={tr("Extra float, safe drop, petty cash…")}/></FormField><div className="drawer-action-buttons"><Button type="submit" variant="primary" className="primary-btn" disabled={busy||!online||!positiveAmount||!reason.trim()} onClick={()=>callRpc('adjust_cash_drawer',{p_transaction_type:'cash_in',p_amount:Number(amount),p_reason:reason.trim()},'Cash added and audited.')}><Plus size={17}/>{' '+tr("Add Cash")}</Button><Button type="submit" variant="danger" className="danger-outline" disabled={busy||!online||!positiveAmount||!reason.trim()} onClick={()=>callRpc('adjust_cash_drawer',{p_transaction_type:'cash_out',p_amount:Number(amount),p_reason:reason.trim()},'Cash removal recorded.')}><Minus size={17}/>{' '+tr("Remove Cash")}</Button></div></div></div>
      <div className="panel"><h2>{tr("Count and close day")}</h2><div className="drawer-form"><FormField>{tr("Counted cash")}<InputField type="number" min="0" step="0.01" inputMode="decimal" value={counted} onChange={e=>setCounted(e.target.value)} placeholder="0.00"/></FormField>{counted!==''&&<div className="variance-preview"><span>{tr("Expected")+' '} {money(session.expectedAmount,currency)}</span><strong>{tr("Variance")+' '} {money(Number(counted)-session.expectedAmount,currency)}</strong></div>}{counted!==''&&Math.abs(Number(counted)-session.expectedAmount)>=.01&&<FormField>{tr("Required variance explanation")}<InputField value={varianceReason} onChange={e=>setVarianceReason(e.target.value)} minLength={5} maxLength={200} placeholder={tr("Counting difference, cash drop, entry correction…")}/></FormField>}<FormField>{tr("Required closing note")}<InputField value={closingNote} onChange={e=>setClosingNote(e.target.value)} minLength={5} maxLength={300} placeholder={tr("Count performed, records reviewed, handover details…")}/></FormField><FormField className="close-confirmation"><InputField type="checkbox" checked={closeConfirmed} onChange={e=>setCloseConfirmed(e.target.checked)}/><span>{tr("I confirm that I physically counted the cash and reviewed today’s entries.")}</span></FormField><Button type="submit" variant="danger" className="danger-btn" disabled={busy||!online||counted===''||Number(counted)<0||closingNote.trim().length<5||!closeConfirmed||(Math.abs(Number(counted)-session.expectedAmount)>=.01&&varianceReason.trim().length<5)} onClick={()=>confirm(tr("Close today’s cash record? It cannot be reopened or deleted."))&&callRpc('close_daily_cash',{p_counted_amount:Number(counted),p_variance_reason:varianceReason.trim()||null,p_closing_note:closingNote.trim(),p_confirmation:true},'Daily cash record closed with an immutable closure reference.')}>{tr("Close Day")}</Button></div></div></section>
      <Card className="panel"><h2>{tr("Current daily cash audit trail")}</h2>{transactions.length?<Table headers={['Time','Type','Amount','Reason / Receipt','Staff']} rows={transactions.map(t=>[new Date(t.createdAt).toLocaleString(),t.type.replace(/_/g,' '),money(t.amount,currency),t.receiptNumber?`Receipt ${receiptNo(t.receiptNumber)} — ${t.reason}`:t.reason,t.staffName])}/>:<p className="muted">{tr("No cash activity yet.")}</p>}</Card>
    </>}
    <Card className="panel drawer-history"><h2>{tr("Recent closed cash records")}</h2>{history.length?<Table headers={['Business date','Closure reference','Expected','Counted','Variance','Closed by','Report']} rows={history.map(s=>[s.businessDate??new Date(s.openedAt).toLocaleDateString(),s.closureReference??'Legacy record',money(s.expectedAmount,currency),money(s.countedAmount??0,currency),money(s.variance??0,currency),s.closedByName??'—',<Button type="submit" variant="secondary" key={s.id} onClick={()=>void openReport(s.id)}>{tr("View")}</Button>])}/>:<p className="muted">{tr("No closed daily cash records yet.")}</p>}</Card>
    {report&&<DailyCashReportModal report={report} currency={currency} onClose={()=>setReport(null)}/>}
  </>
}

function DailyCashReportModal({report,currency,onClose}:{report:DailyCashReportData;currency:string;onClose:()=>void}){
  const s=report.summary
  function exportCsv(){const rows=[["CounterNest POS " + tr("Daily Cash Report")],[tr("Opened"),report.session.opened_at],[tr("Closed"),report.session.closed_at??tr('Open')],[],[tr("Opening Cash"),s.opening_cash],[tr("Cash Sales"),s.cash_sales],[tr("Cash Refunds"),-s.cash_refunds],[tr("Cash In"),s.cash_in],[tr("Cash Out"),-s.cash_out],[tr("Expected Cash"),s.expected_cash],[tr("Counted Cash"),report.session.counted_amount??''],[tr("Variance"),report.session.variance??''],[],[tr("Time"),tr("Type"),tr("Amount"),tr("Reason"),tr("Receipt"),tr("Staff")],...report.transactions.map(t=>[t.created_at,t.transaction_type,t.amount,t.reason,t.receipt_number??'',t.staff_name])];const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=`counternest-daily-cash-${report.session.opened_at.slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}
  return <div className="modal-backdrop receipt-backdrop"><div className="receipt-dialog"><div className="receipt-toolbar no-print"><div><strong>{tr("Daily Cash Report")}</strong><small>{report.session.business_date??new Date(report.session.opened_at).toLocaleDateString()} • {systemLabel(report.session.status)}</small></div><div className="receipt-actions"><Button type="submit" variant="secondary" onClick={exportCsv}><Download size={17}/>{' '+tr("CSV")}</Button><Button type="submit" variant="secondary" onClick={()=>window.print()}><Printer size={17}/>{' '+tr("Print / PDF")}</Button><Button type="submit" variant="primary" data-back-close="true" className="primary-btn" onClick={onClose}>{tr("Close")}</Button></div></div><article className="receipt-sheet daily-cash-report"><div className="receipt-brand"><h1>{tr("CounterNest POS")}</h1><p>{tr("Daily Cash Report")}</p><strong>{report.session.closure_reference??tr("OPEN / LEGACY RECORD")}</strong></div><div className="receipt-meta"><div><span>{tr("Business date")}</span><strong>{report.session.business_date??'—'}</strong></div><div><span>{tr("Opened")}</span><strong>{new Date(report.session.opened_at).toLocaleString()}</strong></div><div><span>{tr("Closed")}</span><strong>{report.session.closed_at?new Date(report.session.closed_at).toLocaleString():tr("Open")}</strong></div><div><span>{tr("Opened by")}</span><strong>{report.session.opened_by??tr("Staff")}</strong></div></div><div className="receipt-totals"><div><span>{tr("Opening Cash")}</span><b>{money(s.opening_cash,currency)}</b></div><div><span>{tr("Cash Sales")}</span><b>{money(s.cash_sales,currency)}</b></div><div><span>{tr("Cash Refunds")}</span><b>-{money(s.cash_refunds,currency)}</b></div><div><span>{tr("Cash In")}</span><b>{money(s.cash_in,currency)}</b></div><div><span>{tr("Cash Out")}</span><b>-{money(s.cash_out,currency)}</b></div><div className="receipt-grand"><span>{tr("Expected Cash")}</span><b>{money(s.expected_cash,currency)}</b></div>{report.session.counted_amount!=null&&<><div><span>{tr("Counted Cash")}</span><b>{money(report.session.counted_amount,currency)}</b></div><div className="receipt-grand"><span>{tr("Variance")}</span><b>{money(report.session.variance??0,currency)}</b></div>{report.session.variance_reason&&<div><span>{tr("Variance reason")}</span><b>{report.session.variance_reason}</b></div>}{report.session.closing_note&&<div><span>{tr("Closing note")}</span><b>{report.session.closing_note}</b></div>}</>}</div><div className="cash-report-lines"><strong>{tr("Audit Entries (")}{s.transaction_count})</strong>{report.transactions.map(t=><div key={t.id}><span>{new Date(t.created_at).toLocaleTimeString()} • {t.transaction_type.replace(/_/g,' ')}</span><b>{money(t.amount,currency)}</b><small>{t.reason}{t.receipt_number?` • Receipt ${receiptNo(t.receipt_number)}`:''} • {t.staff_name}</small></div>)}</div></article></div></div>
}

function ChangePasswordPanel({showToast}:{showToast:(m:string)=>void}){
  const[currentPassword,setCurrentPassword]=useState('');const[newPassword,setNewPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[busy,setBusy]=useState(false)
  async function save(e:FormEvent){e.preventDefault();if(newPassword!==confirmPassword)return showToast(trError(tr("New passwords do not match.")));if(newPassword.length<12||!/[a-z]/.test(newPassword)||!/[A-Z]/.test(newPassword)||!/[0-9]/.test(newPassword))return showToast(trError(tr("Use at least 12 characters with upper-case, lower-case, and a number.")));if(currentPassword===newPassword)return showToast(trError(tr("Choose a new password different from the current password.")));setBusy(true);if(!supabaseConfigured||!supabase){setCurrentPassword('');setNewPassword('');setConfirmPassword('');setBusy(false);return showToast(trError(tr("Demo password validation completed.")))}const{data,error}=await supabase.functions.invoke('change-password',{body:{current_password:currentPassword,new_password:newPassword,confirm_password:confirmPassword}});setBusy(false);if(error){let message=error.message;try{const payload=await (error as any).context?.json();if(payload?.error)message=payload.error}catch{}return showToast(trError(message))}if(!data?.complete)return showToast(trError(tr("Password change did not complete.")));setCurrentPassword('');setNewPassword('');setConfirmPassword('');showToast(trError(tr("Password changed successfully.")))}
  return <Card className="panel account-security-panel"><h2><ShieldCheck size={20}/>{' '+tr("Account Password")}</h2><p className="muted">{tr("Verify your current password, then enter and confirm the new password. Password values are never written to CounterNest audit logs.")}</p><form onSubmit={save}><div className="form-grid"><FormField>{tr("Current password")}<PasswordInput required autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></FormField><FormField>{tr("New password")}<PasswordInput required minLength={12} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></FormField><FormField>{tr("Confirm new password")}<PasswordInput required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></FormField></div><small className="muted">{tr("At least 12 characters with upper-case, lower-case, and a number.")}</small><div className="receipt-actions"><Button type="submit" variant="primary" className="primary-btn small" disabled={busy}>{busy?tr("Changing…"):tr("Change Password")}</Button></div></form></Card>
}

function SettingsPage({preferences,theme,setTheme,shopName,setShopName,logoUrl,setLogoUrl,taxRate,setTaxRate,shopAddress,setShopAddress,shopPhone,setShopPhone,businessNumber,setBusinessNumber,shopEmail,setShopEmail,currency,setCurrency,timezone,setTimezone,receiptFooter,setReceiptFooter,shopId,role,showToast,installApp,installAvailable,standalone,online,uiLanguage,setUiLanguage,autoLogoutEnabled,setAutoLogoutEnabled,autoLogoutMinutes,setAutoLogoutMinutes}:{preferences?:React.ReactNode;theme:ThemeConfig;setTheme:(t:ThemeConfig)=>void;shopName:string;setShopName:(s:string)=>void;logoUrl:string|null;setLogoUrl:(s:string|null)=>void;taxRate:number;setTaxRate:(n:number)=>void;shopAddress:string;setShopAddress:(s:string)=>void;shopPhone:string;setShopPhone:(s:string)=>void;businessNumber:string;setBusinessNumber:(s:string)=>void;shopEmail:string;setShopEmail:(s:string)=>void;currency:string;setCurrency:(s:string)=>void;timezone:string;setTimezone:(s:string)=>void;receiptFooter:string;setReceiptFooter:(s:string)=>void;shopId:string|null;role:Role;showToast:(m:string)=>void;installApp:()=>Promise<void>;installAvailable:boolean;standalone:boolean;online:boolean;uiLanguage:UiLanguage;setUiLanguage:(v:UiLanguage)=>void;autoLogoutEnabled:boolean;setAutoLogoutEnabled:(v:boolean)=>void;autoLogoutMinutes:number;setAutoLogoutMinutes:(v:number)=>void}){
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
  const savedSettings=useRef({theme,shopName,taxRate,shopAddress,shopPhone,businessNumber,shopEmail,currency,timezone,receiptFooter,autoLogoutEnabled,autoLogoutMinutes});
  useEffect(()=>{const discard=(event:Event)=>{if((event as CustomEvent).detail)return;const previous=savedSettings.current;setTheme(previous.theme);setShopName(previous.shopName);setTaxRate(previous.taxRate);setShopAddress(previous.shopAddress);setShopPhone(previous.shopPhone);setBusinessNumber(previous.businessNumber);setShopEmail(previous.shopEmail);setCurrency(previous.currency);setTimezone(previous.timezone);setReceiptFooter(previous.receiptFooter);setAutoLogoutEnabled(previous.autoLogoutEnabled);setAutoLogoutMinutes(previous.autoLogoutMinutes)};window.addEventListener('counternest:discard',discard);return()=>window.removeEventListener('counternest:discard',discard)},[]);
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
    if(shopPhone.trim()&&!isValidPhone(normalizePhone(shopPhone,getCompanyPhoneCountry())))return showToast(tr('Enter a valid international phone number.'))
    if(supabaseConfigured&&supabase&&shopId){
      const{error}=await supabase.from('shops').update({name:shopName,address:shopAddress||null,phone:normalizePhone(shopPhone,getCompanyPhoneCountry())||null,business_number:businessNumber||null,email:shopEmail||null,currency,timezone,receipt_footer:receiptFooter||null,tax_rate:taxRate,theme}).eq('id',shopId)
      if(error)return showToast(trError(error.message))
      const{error:sessionError}=await supabase.rpc('save_session_security_policy',{p_enabled:autoLogoutEnabled,p_minutes:autoLogoutMinutes})
      if(sessionError)return showToast(trError(sessionError.message))
    }else{
      localStorage.setItem('counternest.autoLogoutEnabled',String(autoLogoutEnabled))
      localStorage.setItem('counternest.autoLogoutMinutes',String(autoLogoutMinutes))
    }
    localStorage.setItem('counternest.autoLogoutEnabled',String(autoLogoutEnabled))
    localStorage.setItem('counternest.autoLogoutMinutes',String(autoLogoutMinutes))
    savedSettings.current={theme,shopName,taxRate,shopAddress,shopPhone,businessNumber,shopEmail,currency,timezone,receiptFooter,autoLogoutEnabled,autoLogoutMinutes};resetUnsaved();window.dispatchEvent(new Event('counternest:theme-saved'));showToast(trError(tr("Settings saved.")))
  }
  async function saveManagerPin(){
    if(role!=='admin')return
    if(!/^\d{4,8}$/.test(managerPin))return showToast(trError(tr("Manager PIN must contain 4 to 8 digits.")))
    if(managerPin!==managerPinConfirm)return showToast(trError(tr("Manager PIN confirmation does not match.")))
    if(supabaseConfigured&&supabase){
      const{error}=await supabase.rpc('set_my_manager_pin',{p_pin:managerPin})
      if(error)return showToast(trError(error.message))
    }
    setManagerPin('');setManagerPinConfirm('');showToast(trError(tr("Manager approval PIN saved.")))
  }
  function saveHardware(){
    localStorage.setItem('counternest.printerProfile',printerProfile)
    localStorage.setItem('counternest.paperWidth',paperWidth)
    localStorage.setItem('counternest.printerHost',printerHost.trim())
    localStorage.setItem('counternest.printerPort',printerPort)
    localStorage.setItem('counternest.bluetoothName',bluetoothName.trim())
    localStorage.setItem('counternest.usbVendorId',usbVendorId.trim())
    localStorage.setItem('counternest.usbProductId',usbProductId.trim())
    showToast(trError(tr("Hardware settings saved on this device.")))
  }
  function validateHardware(){
    if(printerProfile==='system')return showToast(trError(tr("System Print is ready. Select the installed printer in the print dialog.")))
    if(printerProfile==='escpos-wifi'&&(!printerHost.trim()||!Number(printerPort)))return showToast(trError(tr("Enter the printer IP address and port.")))
    if(printerProfile==='escpos-bluetooth'&&!bluetoothName.trim())return showToast(trError(tr("Enter a Bluetooth printer name or identifier.")))
    if(printerProfile==='escpos-usb'&&(!usbVendorId.trim()||!usbProductId.trim()))return showToast(trError(tr("Enter the USB vendor and product IDs after selecting a printer.")))
    showToast(trError(tr("Configuration is complete. Direct connection remains pending device selection and adapter testing.")))
  }
  function testPrinter(){
    const w=window.open('','_blank','width=420,height=720')
    if(!w)return showToast(trError(tr("Allow pop-ups to run the printer test.")))
    const width=paperWidth==='58'?'58mm':'80mm'
    const html=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!))
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${html(shopName||"CounterNest POS")} • ${html(tr("Printer Test"))}</title><style>@page{size:${width} auto;margin:3mm}body{font-family:monospace;width:${width};margin:0;padding:3mm;box-sizing:border-box;text-align:center}hr{border:0;border-top:1px dashed #000}.left{text-align:left}</style></head><body><h3>${html(shopName||'CounterNest POS')}</h3><b> ${html(tr("Printer Test"))}</b><hr><div class="left">${html(tr("Profile"))}: ${html(printerProfile)}<br>${html(tr("Paper"))}: ${paperWidth} mm<br>${html(tr("Date"))}: ${new Date().toLocaleString()}</div><hr><p>${html(tr("If this prints clearly, the system print path is ready."))}</p><script>setTimeout(()=>window.print(),250)<\/script></body></html>`)
    w.document.close()
  }
  async function copyInternalUrl(){
    try{await navigator.clipboard.writeText(currentOrigin);showToast(trError(tr("Internal CounterNest address copied.")))}catch{window.prompt('Copy this CounterNest internal address:',currentOrigin)}
  }
  function chooseLogo(file?:File){
    if(!file)return
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))return showToast(trError(tr("Please choose a PNG, JPG, or WebP image.")))
    if(file.size>8*1024*1024)return showToast(trError(tr("Logo file must be 8 MB or smaller.")))
    const reader=new FileReader()
    reader.onload=()=>setLogoEditorSrc(String(reader.result))
    reader.readAsDataURL(file)
  }
  async function uploadLogo(blob:Blob){
    if(role!=='admin')return
    if(!supabaseConfigured||!supabase||!shopId){
      setLogoUrl(URL.createObjectURL(blob));setLogoEditorSrc(null);showToast(trError(tr("Logo preview updated in demo mode.")));return
    }
    const path=`${shopId}/logo-${Date.now()}.png`
    const uploaded=await supabase.storage.from('shop-logos').upload(path,blob,{contentType:'image/png',cacheControl:'3600',upsert:false})
    if(uploaded.error)return showToast(trError(uploaded.error.message))
    const{data:urlData}=supabase.storage.from('shop-logos').getPublicUrl(path)
    const newUrl=urlData.publicUrl
    const{error}=await supabase.from('shops').update({logo_url:newUrl}).eq('id',shopId)
    if(error){await supabase.storage.from('shop-logos').remove([path]);return showToast(trError(error.message))}
    setLogoUrl(newUrl);setLogoEditorSrc(null);showToast(trError(tr("Logo updated. Historical receipt logo snapshots are retained.")))
  }
  async function removeLogo(){
    if(role!=='admin'||!confirm(tr("Remove the business logo? The business name will remain visible.")))return
    if(supabaseConfigured&&supabase&&shopId){
      const{error}=await supabase.from('shops').update({logo_url:null}).eq('id',shopId)
      if(error)return showToast(trError(error.message))
    }
    setLogoUrl(null);showToast(trError(tr("Logo removed from the current shop profile. Historical receipt snapshots are retained.")))
  }
  return <>
    <PageHeader title={tr("Settings")} timezone={timezone}><Button type="submit" variant="primary" className="primary-btn small" onClick={save} disabled={role!=='admin'}><Save size={18}/>{tr("Save Changes")}</Button></PageHeader>
    <div className="settings-grid cn-settings" data-unsaved-scope="settings">
      <Card className="panel">
        <SectionHeader title={tr("Business Information")} description={tr("Manage your business details and how they appear on receipts and communications.")} icon={<Store size={21}/>}/>
        <div className="form-grid"><FormField>{tr("Business name")}<InputField value={shopName} onChange={e=>setShopName(e.target.value)}/></FormField><FormField>{tr("Address")}<InputField value={shopAddress} onChange={e=>setShopAddress(e.target.value)} placeholder={tr("Street / city")}/></FormField><FormField>{tr("Phone")}<PhoneInput value={shopPhone} onChange={setShopPhone} placeholder={tr("Business phone")}/></FormField><FormField>{tr("Business number")}<InputField value={businessNumber} onChange={e=>setBusinessNumber(e.target.value)} placeholder={tr("Registration or business number")}/></FormField><FormField>{tr("Email")}<InputField type="email" value={shopEmail} onChange={e=>setShopEmail(e.target.value)} placeholder={tr("Business email")}/></FormField></div>
        <div className="logo-manager">
          <div className="logo-manager-heading"><div><strong>{tr("Business Logo")}</strong><p className="muted">{tr("Displayed as a circle with the business name below it.")}</p></div></div>
          <div className="logo-manager-body">
            <Brand shopName={shopName||'Business Name'} logoUrl={logoUrl} compact />
            <div className="logo-manager-actions">
              <FormField className={`upload-logo-btn ${role!=='admin'?'disabled':''}`}><Upload size={17}/>{logoUrl?tr("Change Logo"):tr("Upload Logo")}<InputField type="file" accept="image/png,image/jpeg,image/webp" disabled={role!=='admin'} onChange={e=>{chooseLogo(e.target.files?.[0]);e.currentTarget.value=''}}/></FormField>
              {logoUrl&&<Button type="submit" variant="danger" className="danger-outline" disabled={role!=='admin'} onClick={removeLogo}><Trash2 size={17}/>{' '+tr("Remove Logo")}</Button>}
            </div>
          </div>
          <small>{tr("PNG, JPG or WebP • up to 8 MB. You can resize the logo before it is uploaded.")}</small>
        </div>
      </Card>
      <Card className="panel store-preferences-panel"><SectionHeader title={tr("Store Preferences")} description={tr("Customize how CounterNest works for your business.")} icon={<Settings size={21}/>}/><div className="form-grid"><FormField>{tr("Tax rate (%)")}<InputField min="0" step="0.1" type="number" value={(taxRate*100).toFixed(1)} onChange={e=>setTaxRate(Number(e.target.value)/100)}/></FormField><FormField>{tr("Currency")}<SelectField value={currency} onChange={e=>setCurrency(e.target.value)}><option value="USD">{tr("USD — US Dollar")}</option><option value="BZD">{tr("BZD — Belize Dollar")}</option><option value="MXN">{tr("MXN — Mexican Peso")}</option><option value="GTQ">{tr("GTQ — Guatemalan Quetzal")}</option><option value="HNL">{tr("HNL — Honduran Lempira")}</option><option value="SVC">{tr("SVC — Salvadoran Colón")}</option></SelectField></FormField><FormField>{tr("Timezone")}<InputField value={timezone} onChange={e=>setTimezone(e.target.value)} placeholder={tr("America/Belize")}/></FormField></div></Card><Card className="panel receipt-settings-panel">
        <SectionHeader title={tr("Receipt Settings")} icon={<Printer size={21}/>}/>
        <p className="muted">{tr("These details appear on printed, PDF, and emailed receipt summaries. Each completed sale keeps a receipt snapshot for historical records.")}</p>
        
        <FormField>{tr("Receipt footer")}<TextAreaField rows={3} value={receiptFooter} onChange={e=>setReceiptFooter(e.target.value)} placeholder={tr("Thank you for your business!")}/></FormField>
        <div className="mini-receipt-preview"><strong>{shopName||tr("Business Name")}</strong><span>{tr("Receipt #000123")}</span><span>{shopAddress||tr("Business address")}</span><span>{tr("Salesperson: Staff Name")}</span><b>{tr("Total")+' '} {money(12.50,currency)}</b><small>{receiptFooter||tr("Thank you!")}</small></div>
      </Card>
      <NotificationSettings role={role}/><BusinessContactSettings role={role}/><CustomerContactSettings shopName={shopName} logoUrl={logoUrl} role={role} showToast={showToast}/><Card className="panel hardware-settings-panel">
        <SectionHeader title={tr("Hardware & Receipt Printer")} icon={<Printer size={21}/>}/>
        <p className="muted">{tr("Configure a generic ESC/POS connection now and keep System Print as the working fallback. Direct communication is activated only after a compatible printer is selected and tested.")}</p>
        <div className="form-grid"><FormField>{tr("Connection profile")}<SelectField value={printerProfile} onChange={e=>setPrinterProfile(e.target.value)}><option value="system">{tr("System Print (recommended fallback)")}</option><option value="escpos-usb">{tr("Generic ESC/POS — USB")}</option><option value="escpos-bluetooth">{tr("Generic ESC/POS — Bluetooth")}</option><option value="escpos-wifi">{tr("Generic ESC/POS — Wi-Fi / LAN")}</option></SelectField></FormField><FormField>{tr("Receipt paper width")}<SelectField value={paperWidth} onChange={e=>setPaperWidth(e.target.value)}><option value="58">{tr("58 mm")}</option><option value="80">{tr("80 mm")}</option></SelectField></FormField></div>
        {printerProfile==='escpos-wifi'&&<div className="form-grid hardware-detail-grid"><FormField>{tr("Printer IP address")}<InputField value={printerHost} onChange={e=>setPrinterHost(e.target.value)} placeholder="192.168.1.50"/></FormField><FormField>{tr("RAW print port")}<InputField type="number" min="1" max="65535" value={printerPort} onChange={e=>setPrinterPort(e.target.value)} placeholder="9100"/></FormField></div>}
        {printerProfile==='escpos-bluetooth'&&<div className="hardware-detail-grid"><FormField>{tr("Bluetooth printer name / identifier")}<InputField value={bluetoothName} onChange={e=>setBluetoothName(e.target.value)} placeholder={tr("Select after purchasing the printer")}/></FormField></div>}
        {printerProfile==='escpos-usb'&&<div className="form-grid hardware-detail-grid"><FormField>{tr("USB vendor ID")}<InputField value={usbVendorId} onChange={e=>setUsbVendorId(e.target.value)} placeholder={tr("Example: 0x04b8")}/></FormField><FormField>{tr("USB product ID")}<InputField value={usbProductId} onChange={e=>setUsbProductId(e.target.value)} placeholder={tr("From printer/device details")}/></FormField></div>}
        <div className="hardware-capabilities"><span className={'capability '+(('usb' in navigator)?'available':'pending')}><strong>{tr("USB")}</strong><small>{'usb' in navigator?tr("Browser API detected"):tr("Native adapter may be required")}</small></span><span className={'capability '+(('bluetooth' in navigator)?'available':'pending')}><strong>{tr("Bluetooth")}</strong><small>{'bluetooth' in navigator?tr("Browser API detected"):tr("Native adapter may be required")}</small></span><span className="capability available"><strong>{tr("Wi-Fi")}</strong><small>{tr("Network profile supported")}</small></span></div>
        <div className="receipt-actions"><Button variant="primary" className="primary-btn small" type="button" onClick={saveHardware}>{tr("Save Hardware Settings")}</Button><Button variant="secondary" type="button" onClick={validateHardware}>{tr("Validate Configuration")}</Button><Button variant="secondary" type="button" onClick={testPrinter}><Printer size={17}/>{' '+tr("System Test Print")}</Button></div>
        <div className="info-box"><strong>{tr("Status:")}</strong> {printerProfile==='system'?tr("System Print is available now."):tr("ESC/POS profile saved; direct connection is pending a compatible printer and on-device adapter test.")}{' '+tr("Physical cash-drawer verification and printer-driver opening tests are available under POS Hardware Setup.")}</div>
        <small className="muted">{tr("Hardware settings stay on this device and contain no Supabase credentials. System Print remains available if a direct connection fails.")}</small>
      </Card>
      <Card className="panel session-security-panel">
        <h2><ShieldCheck size={20}/> {tr('Session Security')}</h2>
        <p className="muted">{tr("Automatically sign out inactive staff on shared CounterNest devices. The policy applies across this business after it is saved by an Administrator.")}</p>
        {role==='admin'?<><Toggle label={tr('Automatic logoff')} checked={autoLogoutEnabled} onChange={e=>setAutoLogoutEnabled(e.target.checked)}/><FormField>{tr('Inactivity timeout')}<SelectField value={autoLogoutMinutes} disabled={!autoLogoutEnabled} onChange={e=>setAutoLogoutMinutes(Number(e.target.value))}><option value={5}>{tr("5 minutes")}</option><option value={10}>{tr("10 minutes")}</option><option value={15}>{tr("15 minutes")}</option><option value={30}>{tr("30 minutes")}</option><option value={60}>{tr("1 hour")}</option><option value={120}>{tr("2 hours")}</option><option value={240}>{tr("4 hours")}</option><option value={480}>{tr("8 hours")}</option></SelectField></FormField></>:<div className="info-box">{tr("Automatic logoff is")+' '} <strong>{autoLogoutEnabled?tr("enabled"):tr("disabled")}</strong>{autoLogoutEnabled?` after ${autoLogoutMinutes} minutes of inactivity`:''}{tr(". Only an Administrator can change this policy.")}</div>}
        <div className="info-box"><strong>{tr("How it works:")}</strong>{' '+tr("a warning appears before timeout. Pointer, keyboard, touch, or wheel activity resets the timer. If the device remains inactive, CounterNest signs out and clears unsaved cart data; Daily Cash and completed records remain unchanged.")}</div>
      </Card>
      <Card className="panel manager-security-panel">
        <h2><ShieldCheck size={20}/>{' '+tr("Manager Authorization")}</h2>
        <p className="muted">{tr("Refunds and voids require an active Admin's approval PIN. The PIN is stored as a secure hash in Supabase and is never shown again.")}</p>
        {role==='admin'?<><div className="form-grid"><FormField>{tr("New manager PIN")}<InputField type="password" inputMode="numeric" autoComplete="new-password" value={managerPin} onChange={e=>setManagerPin(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder={tr("4–8 digits")}/></FormField><FormField>{tr("Confirm PIN")}<InputField type="password" inputMode="numeric" autoComplete="new-password" value={managerPinConfirm} onChange={e=>setManagerPinConfirm(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder={tr("Repeat PIN")}/></FormField></div><Button variant="primary" className="primary-btn small" type="button" onClick={saveManagerPin}>{tr("Set / Change Manager PIN")}</Button></>:<div className="info-box">{tr("Only an Administrator can configure the manager approval PIN.")}</div>}
        <small className="muted">{tr("For production use, a 6-digit or longer PIN is recommended. Each refund or void records both the staff member who processed it and the manager who approved it.")}</small>
      </Card>
      <Card className="panel pwa-settings-panel">
        <h2><Download size={20}/>{' '+tr("App & Device")}</h2>
        <p className="muted">{tr("Install the POS on a phone, tablet or desktop so it opens in its own app window. The app shell is cached for startup, while live business data stays in Supabase.")}</p>
        <div className="pwa-status-row"><span className={`connection-dot ${online?'online':'offline'}`}></span><div><strong>{online?tr("Online"):tr("Offline")}</strong><small>{online?tr("Cloud sales and syncing are available."):tr("Checkout and cloud changes are paused until the connection returns.")}</small></div></div>
        {standalone?<div className="info-box">{tr("This POS is already running as an installed app on this device.")}</div>:installAvailable?<Button variant="primary" className="primary-btn small" type="button" onClick={installApp}><Download size={17}/>{' '+tr("Install POS App")}</Button>:<div className="info-box"><strong>{tr("Install from your browser.")}</strong><br/>{tr("On Chrome or Edge, use the browser Install app option when available. On iPhone/iPad Safari, use Share → Add to Home Screen.")}</div>}
        <small className="muted">{tr("For safety, v6 does not queue offline sales. Inventory, loyalty balances, refunds and new sales remain server-authoritative and require a connection.")}</small>
        <hr/><h2>{tr('Android Installation')}</h2><p className="muted">{tr("On Android Chrome, open the HTTPS CounterNest address, sign in, then select Install POS App or Chrome menu → Add to Home screen. Use the browser installation option on each device.")}</p>{!standalone&&<Button variant="primary" className="primary-btn small" type="button" onClick={installApp}><Download size={17}/>{tr('Install on this Android device')}</Button>}
      </Card>
      <Card className="panel network-commission-panel">
        <h2><Network size={20}/>{' '+tr("Web Deployment")}</h2>
        <p className="muted">{tr("Open the deployed CounterNest URL on each authorized device. Staff pages require sign-in; customer displays use protected share links.")}</p>
        <div className="network-commission-grid">
          <div className="network-details">
            <span><strong>{tr("Current address")}</strong><code>{currentOrigin}</code></span>
            <span><strong>{tr("Mode")}</strong><small>{deploymentMode}</small></span>
            <span><strong>{tr("Network")}</strong><small><Wifi size={15}/>{online?tr("Online — Supabase access available"):tr("Offline — cloud operations paused")}</small></span>
            <span><strong>{tr("Secure browser features")}</strong><small>{secureBrowser?tr("Ready"):tr("Use HTTPS for camera and clipboard access")}</small></span>
            <Button variant="secondary" type="button" onClick={copyInternalUrl}><Copy size={16}/>{' '+tr("Copy App Address")}</Button>
          </div>
          <div className="network-qr-card">{networkQr?<img src={networkQr} alt={tr("CounterNest app QR code")}/>:<QrCode size={88}/>}<strong>{tr("Connect approved device")}</strong><small>{tr("Scan to open this app on another device.")}</small></div>
        </div>
        <div className="info-box">{currentOrigin.startsWith('https://')?tr("Use this HTTPS address on authorized devices. Keep customer share links private and rotate them in Customer View Setup when necessary."):tr("This is a development address. Use the final HTTPS production URL when commissioning devices.")}</div>
      </Card>
      <ChangePasswordPanel showToast={showToast}/>
      <Card className="panel language-settings-panel"><h2>{tr('System Language')}</h2><p className="muted">{tr("Choose your system language. Business and product content stays as entered.")}</p><FormField>{tr('System Language')}<SelectField value={uiLanguage} onChange={e=>setUiLanguage(e.target.value as UiLanguage)}><option value="en">{tr('English')}</option><option value="es">{tr("Español")}</option><option value="zh-TW">繁體中文</option><option value="zh-CN">简体中文</option></SelectField></FormField></Card>

      {preferences}<Card className="panel">
        <h2><Palette size={20}/>{' '+tr("Appearance")}</h2>
        <p className="muted">{tr("Each future business can choose a preset or its own page colors.")}</p>
        <div className="theme-presets">{presets.map(p=><Button type="submit" variant="secondary" key={p.name} data-name={p.name} className={preset===p.name?'active':''} onClick={()=>{setPreset(p.name);setTheme(p.t)}}><span style={{background:p.t.primary}}></span><span style={{background:p.t.background}}></span>{p.name}</Button>)}</div>
        <div className="color-controls"><FormField>{tr("Primary Color")}<InputField type="color" value={theme.primary} onChange={e=>{setPreset('Custom');setTheme({...theme,primary:e.target.value})}}/><code>{theme.primary}</code></FormField><FormField>{tr("Page Background")}<InputField type="color" value={theme.background} onChange={e=>{setPreset('Custom');setTheme({...theme,background:e.target.value})}}/><code>{theme.background}</code></FormField><FormField>{tr("Text & Icon Color")}<InputField type="color" value={theme.text} onChange={e=>{setPreset('Custom');setTheme({...theme,text:e.target.value})}}/><code>{theme.text}</code></FormField></div>
        <Button type="submit" variant="danger" onClick={()=>{setPreset('Brand');setTheme(presets[0].t)}}>{tr("Reset to Brand Theme")}</Button>
      </Card>
    </div>
    {logoEditorSrc&&<LogoEditor src={logoEditorSrc} onCancel={()=>setLogoEditorSrc(null)} onUpload={uploadLogo}/>} 
  </>
}

function LogoEditor({src,onCancel,onUpload}:{src:string;onCancel:()=>void;onUpload:(blob:Blob)=>Promise<void>}){
  const[zoom,setZoom]=useState(100)
  const[panX,setPanX]=useState(0)
  const[panY,setPanY]=useState(0)
  const[trimBackground,setTrimBackground]=useState(false)
  const[busy,setBusy]=useState(false)
  const previewRef=useRef<HTMLCanvasElement|null>(null)
  function drawCrop(ctx:CanvasRenderingContext2D,img:HTMLImageElement,size:number){const bounds=trimBackground?detectLogoBounds(img):{x:0,y:0,width:img.naturalWidth,height:img.naturalHeight};const cover=Math.min(size/bounds.width,size/bounds.height);const factor=cover*(zoom/100);const w=bounds.width*factor,h=bounds.height*factor;const roomX=Math.max(0,(w-size)/2),roomY=Math.max(0,(h-size)/2);const x=(size-w)/2+(panX/100)*roomX,y=(size-h)/2+(panY/100)*roomY;ctx.clearRect(0,0,size,size);ctx.drawImage(img,bounds.x,bounds.y,bounds.width,bounds.height,x,y,w,h)}
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
    }catch(error){alert(error instanceof Error?error.message:tr("Could not prepare logo."))}
    finally{setBusy(false)}
  }
  return <div className="modal-backdrop"><div className="modal logo-editor-modal">
    <div className="panel-title"><div><h2>{tr("Fit Business Logo")}</h2><p className="muted">{tr("Your full logo is contained by default. Zoom only if you want to crop.")}</p></div><Button variant="secondary" type="button" onClick={onCancel}>×</Button></div>
    <div className="logo-editor-preview"><div className="logo-circle logo-crop-preview"><canvas ref={previewRef} width="512" height="512"/></div></div>
    <div className="logo-crop-controls"><FormField className="logo-trim-control"><InputField type="checkbox" checked={trimBackground} onChange={e=>setTrimBackground(e.target.checked)}/><span>{tr("Automatically trim empty space around the logo")}</span></FormField><FormField className="logo-scale-control"><span>{tr("Zoom")+' '} <strong>{zoom}%</strong></span><InputField type="range" min="100" max="250" step="1" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></FormField><FormField className="logo-scale-control"><span>{tr("Move left / right")}</span><InputField type="range" min="-100" max="100" step="1" value={panX} onChange={e=>setPanX(Number(e.target.value))}/></FormField><FormField className="logo-scale-control"><span>{tr("Move up / down")}</span><InputField type="range" min="-100" max="100" step="1" value={panY} onChange={e=>setPanY(Number(e.target.value))}/></FormField><Button variant="danger" type="button" onClick={()=>{setZoom(100);setPanX(0);setPanY(0);setTrimBackground(false)}}>{tr("Reset Crop")}</Button></div>
    <div className="logo-editor-notes"><ImagePlus size={18}/><span>{tr("Transparent padding preserves your logo colors and proportions across headers, receipts, cards and print.")}</span></div>
    <StickyActions className="modal-actions"><Button variant="secondary" type="button" onClick={onCancel}>{tr("Cancel")}</Button><Button type="submit" variant="primary" className="primary-btn" onClick={confirmLogo} disabled={busy}>{busy?tr("Uploading…"):tr("Use This Logo")}</Button></StickyActions>
  </div></div>
}

function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not read the selected image.'));img.src=src})}
function detectLogoBounds(img:HTMLImageElement){const max=512,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const width=Math.max(1,Math.round(img.naturalWidth*scale)),height=Math.max(1,Math.round(img.naturalHeight*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return{x:0,y:0,width:img.naturalWidth,height:img.naturalHeight};ctx.drawImage(img,0,0,width,height);const data=ctx.getImageData(0,0,width,height).data;const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1]];const background=corners.reduce((sum,[x,y])=>{const i=(y*width+x)*4;return[sum[0]+data[i],sum[1]+data[i+1],sum[2]+data[i+2]]},[0,0,0]).map(v=>v/4);let left=width,top=height,right=-1,bottom=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,alpha=data[i+3];const distance=Math.abs(data[i]-background[0])+Math.abs(data[i+1]-background[1])+Math.abs(data[i+2]-background[2]);if(alpha>20&&distance>54){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}if(right<left||bottom<top)return{x:0,y:0,width:img.naturalWidth,height:img.naturalHeight};const padding=Math.max(4,Math.round(Math.max(right-left,bottom-top)*.08));left=Math.max(0,left-padding);top=Math.max(0,top-padding);right=Math.min(width-1,right+padding);bottom=Math.min(height-1,bottom+padding);return{x:left/scale,y:top/scale,width:(right-left+1)/scale,height:(bottom-top+1)/scale}}
function blobToDataUrl(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not prepare the logo preview.'));reader.readAsDataURL(blob)})}

function Table(props:{headers:string[];rows:React.ReactNode[][]}){return <RecordTable {...props}/>}

export {ProductModal}


function PaymentConfirmation({method,total,currency,busy,onClose,onConfirm}:{method:'card'|'qr';total:number;currency:string;busy:boolean;onClose:()=>void;onConfirm:()=>Promise<void>}){const ref=useDialogFocus(onClose);return <div className="modal-backdrop"><section ref={ref} className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="payment-confirm-title"><h2 id="payment-confirm-title">{tr('Confirm payment')}</h2><p>{tr('Payment method')}: {tr(method==='card'?'Card':'QR')}</p><strong>{money(total,currency)}</strong><p>{tr('Confirm only after the external terminal or payment provider confirms payment.')}</p><StickyActions className="modal-actions"><Button type="submit" variant="secondary" data-back-close="true" onClick={onClose} disabled={busy}>{tr('Cancel')}</Button><Button type="submit" variant="primary" className="primary-btn" disabled={busy} onClick={()=>void onConfirm()}>{tr('Confirm and record sale')}</Button></StickyActions></section></div>}



