export type Role = 'admin' | 'employee' | 'cashier' | 'production' | 'inventory' | 'manager' | 'accounting'
export type PageKey = 'dashboard' | 'sale' | 'products' | 'catalogue' | 'commercial' | 'scheduled-orders' | 'preparation' | 'forecast-shortages' | 'inventory' | 'recipes' | 'production' | 'production-studio' | 'planning' | 'receiving' | 'purchasing' | 'supply' | 'customers' | 'loyalty' | 'cards' | 'sales' | 'reports' | 'profit' | 'cash-drawer' | 'hardware' | 'customer-display' | 'expenses' | 'staff' | 'audit' | 'backup' | 'readiness' | 'acceptance' | 'go-live' | 'report-issue' | 'handover' | 'tasks' | 'checklists' | 'alerts' | 'schedule' | 'analytics' | 'security-recovery' | 'release-candidate' | 'operations' | 'settings'

export type CashDrawerSession = {
  stationLabel?: string
  id: string
  status: 'open' | 'closed'
  openingAmount: number
  expectedAmount: number
  countedAmount?: number | null
  variance?: number | null
  openedAt: string
  closedAt?: string | null
  openedByName: string
  closedByName?: string | null
  openingNote?: string | null
  closingNote?: string | null
  businessDate?: string | null
  varianceReason?: string | null
  closureReference?: string | null
  closeConfirmed?: boolean
}

export type CashDrawerTransaction = {
  id: string
  type: 'opening_float' | 'cash_sale' | 'cash_refund' | 'cash_in' | 'cash_out'
  amount: number
  reason: string
  createdAt: string
  staffName: string
  receiptNumber?: number | null
}
export type SaleStatus = 'completed' | 'partially_refunded' | 'refunded' | 'voided'

export type Product = {
  id: string
  name: string
  category: string
  price: number
  cost?: number
  stock: number
  lowAt: number
  active: boolean
  image?: string
  barcode?: string
  iconEmoji?: string
  cartKey?: string
  catalogOption?: string
  variantId?: string
  comboId?: string
  comboChoices?: {product_id:string;variant_id?:string|null}[]
  selectionRequestId?: string
  regularPrice?: number
  catalogueVisible?: boolean
  catalogueSoldOut?: boolean
}


export type CartLine = Product & { qty: number }

export type Customer = {
  id: string
  name: string
  email: string
  phone?: string
  notes?: string
  loyaltyStatus: 'guest' | 'not_enrolled' | 'invited' | 'member'
  points: number
  stamps: number
  visits: number
  totalSpent: number
  cardIds?: string[]
}

export type Reward = {
  id: string
  name: string
  type: 'free_product' | 'percent_discount' | 'fixed_discount' | 'bonus_points'
  costPoints?: number
  requiredStamps?: number
  value: number
  productId?: string
  active: boolean
}

export type ThemeConfig = {
  appearance?: 'light'|'dark'|'system'
  primary: string
  background: string
  text: string
}

export type ReceiptLine = {
  saleItemId?: string | null
  productId?: string | null
  name: string
  qty: number
  unitPrice: number
  lineTotal: number
  refundedQty?: number
}

export type RefundRecord = {
  id: string
  refundNumber?: number
  type: 'partial' | 'full' | 'void'
  total: number
  reason: string
  restocked: boolean
  paymentNote?: string | null
  createdAt: string
  pointsReversed?: number
  pointsRestored?: number
  stampsReversed?: number
  stampsRestored?: number
}

export type ReceiptData = {
  saleId: string
  receiptNumber: number
  createdAt: string
  shopName: string
  logoUrl?: string | null
  address?: string | null
  phone?: string | null
  shopEmail?: string | null
  currency: string
  timezone: string
  footer?: string | null
  staffName: string
  customerName?: string | null
  customerEmail?: string | null
  items: ReceiptLine[]
  subtotal: number
  discount: number
  tax: number
  total: number
  payment: string
  depositApplied?: number
  balancePaid?: number | null
  cashReceived?: number | null
  changeDue?: number | null
  rewardName?: string | null
  pointsEarned: number
  pointsRedeemed: number
  stampsEarned: number
  stampsRedeemed: number
  pointsBalance?: number | null
  stampsBalance?: number | null
  status: SaleStatus
  refundedTotal: number
  reprintCount: number
  refunds: RefundRecord[]
}

export type SaleSummary = {
  id: string
  receiptNumber?: number
  time: string
  createdAt?: string
  items: string
  total: number
  payment: string
  customerName?: string | null
  status: SaleStatus
  refundedTotal: number
  receipt?: ReceiptData
}
