import type { CommercialVariant } from './CommercialCatalogue'
type PricedProduct = { price: number; regular_price: number; stock: number; catalogue_sold_out: boolean; variants?: CommercialVariant[] }
export const catalogueAvailable = (p: PricedProduct) => p.variants?.length ? p.variants.some(v => v.available) : p.stock > 0 && !p.catalogue_sold_out
export const cataloguePromotion = (p: PricedProduct) => p.variants?.length ? p.variants.some(v => Number(v.price) < Number(v.regular_price)) : Number(p.price) < Number(p.regular_price)
export function cataloguePriceRows(p: PricedProduct) {
  return p.variants?.length ? p.variants.map(v => ({name: v.name, price: Number(v.price), regular: Number(v.regular_price), available: v.available})) : [{name: '', price: Number(p.price), regular: Number(p.regular_price), available: catalogueAvailable(p)}]
}
