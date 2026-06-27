import type { CartItem, Product } from '@/lib/types'

export type ShippingEstimateItem = {
  productId: string
  productName: string
  productImage: string
  vendorId: string
  price: number
  quantity: number
  size: string
  color: string
}

export type ShippingBreakdown = {
  vendorId: string
  storeName: string
  subtotal: number
  shippingCost: number
}

export type ShippingEstimate = {
  shippingCost: number
  breakdown: ShippingBreakdown[]
}

export function toShippingEstimateItems(items: (CartItem & { product: Product })[]): ShippingEstimateItem[] {
  return items.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    productImage: item.product.images?.[0] || '/placeholder.png',
    vendorId: item.product.vendorId,
    price: item.product.price,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
  }))
}
