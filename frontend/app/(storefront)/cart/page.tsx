'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MediaImage } from '@/components/common/MediaImage'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/stores/cart'
import { useProducts, useShippingEstimate, useDeliveryZones } from '@/lib/stores/api'
import { formatCurrency } from '@/lib/utils/storage'
import { TAX_RATE } from '@/lib/constants/commerce'
import { toShippingEstimateItems } from '@/lib/utils/shipping'
import { EmptyState } from '@/components/common/EmptyState'
import { getVariantStock } from '@/lib/utils/productVariants'
import type { Product, CartItem } from '@/lib/types'
import type { ProductListResponse } from '@/lib/types/filters'

export default function CartPage() {
  const router = useRouter()
  const cart = useCartStore()
  const [deliveryZoneId, setDeliveryZoneId] = useState('')

  const { data: allProducts, loading } = useProducts({ limit: 200 })
  const { data: zonesData } = useDeliveryZones()
  const deliveryZones = (zonesData as { id: string; name: string }[] | null) ?? []

  useEffect(() => {
    if (deliveryZones.length > 0 && !deliveryZoneId) {
      setDeliveryZoneId(deliveryZones[0].id)
    }
  }, [deliveryZones, deliveryZoneId])

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {}
    const response = allProducts as ProductListResponse | null
    const arr = response?.items ?? []
    for (const p of arr as Product[]) map[p.id] = p
    return map
  }, [allProducts])

  const cartItems = useMemo(() => {
    return cart.activeItems.map((item) => {
      const product = productMap[item.productId]
      if (!product) return null
      return { ...item, product }
    }).filter(Boolean) as (CartItem & { product: Product })[]
  }, [cart.activeItems, productMap])

  const savedItems = useMemo(() => {
    return cart.savedItems.map((item) => {
      const product = productMap[item.productId]
      if (!product) return null
      return { ...item, product }
    }).filter(Boolean) as (CartItem & { product: Product })[]
  }, [cart.savedItems, productMap])

  const qtyByVariant = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of cartItems) {
      if (item.savedForLater) continue
      const key = `${item.productId}|${item.size}|${item.color}`
      map[key] = (map[key] || 0) + item.quantity
    }
    return map
  }, [cartItems])

  function variantStockFor(item: CartItem & { product: Product }) {
    if (item.product.variantStock?.length) {
      return getVariantStock(item.product.variantStock, item.size, item.color)
    }
    return item.product.stock || 0
  }

  async function updateCartQuantity(item: CartItem & { product: Product }, nextQty: number) {
    const stock = variantStockFor(item)
    const key = `${item.productId}|${item.size}|${item.color}`
    const totalForVariant = qtyByVariant[key] || 0
    const otherLinesQty = totalForVariant - item.quantity
    const maxForLine = Math.max(0, stock - otherLinesQty)
    const clamped = Math.max(1, Math.min(nextQty, maxForLine))
    if (nextQty > maxForLine) {
      toast.error(`Only ${stock} left in stock for "${item.product.name}" (${item.size}, ${item.color})`)
    }
    try {
      await cart.updateQuantity(item.productId, item.size, item.color, clamped)
    } catch {
      // keep UI stable on failure
    }
  }

  const subtotal = useMemo(() => cartItems.reduce((s, i) => {
    const discountAmount = i.product.discount > 100 ? i.product.discount : i.product.price * (i.product.discount / 100)
    return s + Math.max(0, i.product.price - discountAmount) * i.quantity
  }, 0), [cartItems])

  const estimateItems = useMemo(() => toShippingEstimateItems(cartItems), [cartItems])
  const { data: shippingData } = useShippingEstimate(estimateItems, deliveryZoneId)
  const shipping = shippingData?.shippingCost ?? 0
  const tax = subtotal * TAX_RATE
  const total = subtotal + shipping + tax

  const checkoutBlocked = useMemo(() => {
    if (cart.activeItems.length === 0) return 'Your cart is empty'
    if (loading) return 'Loading product details…'
    if (cart.activeItems.some((item) => !productMap[item.productId])) {
      return 'Some cart items could not be loaded — refresh and try again'
    }
    for (const item of cartItems) {
      const stock = variantStockFor(item)
      if (stock <= 0) return 'Remove out-of-stock items before checkout'
      if (item.quantity > stock) return 'Reduce quantities to match available stock'
    }
    return null
  }, [cart.activeItems, cartItems, loading, productMap])

  return (
    <div className="page-container">
      <h1 className="section-title mb-8">Shopping Cart</h1>
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading cart...</div>
      ) : !cartItems.length && !savedItems.length ? (
        <EmptyState title="Your cart is empty" description="Browse our collection and add items to your cart." actionLabel="Continue Shopping" onAction={() => router.push('/products')} />
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {cartItems.length > 0 && (
              <div className="space-y-4">
                {cartItems.map((item) => {
              const stock = variantStockFor(item)
              const key = `${item.productId}|${item.size}|${item.color}`
              const totalForVariant = qtyByVariant[key] || 0
              const atStockLimit = totalForVariant >= stock
              return (
              <div key={`${item.productId}-${item.size}-${item.color}`} className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <MediaImage src={item.product.images?.[0]} alt={item.product.name} width={96} height={128} transform={{ width: 200, aspect: '3:4' }} className="w-full sm:w-24 h-40 sm:h-32 object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm sm:text-base line-clamp-2">{item.product.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{item.product.brand} · {item.size} · {item.color}</p>
                  <p className={`text-xs mt-1 ${stock > 10 ? 'text-green-600' : stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {stock > 0 ? `${stock} in stock for ${item.size} / ${item.color}` : 'Out of stock'}
                  </p>
                  <p className="font-semibold mt-2">{formatCurrency(item.product.price * (1 - item.product.discount / 100))}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
                    <div className="flex items-center border border-gray-300 dark:border-gray-700 text-sm">
                      <button className="px-3 py-1" onClick={() => updateCartQuantity(item, item.quantity - 1)}>−</button>
                      <span className="px-3 py-1 border-x border-gray-300 dark:border-gray-700">{item.quantity}</span>
                      <button className="px-3 py-1 disabled:opacity-40" disabled={atStockLimit} onClick={() => updateCartQuantity(item, item.quantity + 1)}>+</button>
                    </div>
                    <button className="text-sm text-gray-500 hover:underline" onClick={() => void cart.toggleSaveForLater(item.productId, item.size, item.color)}>Save for Later</button>
                    <button className="text-sm text-red-600 hover:underline" onClick={() => void cart.removeItem(item.productId, item.size, item.color)}>Remove</button>
                  </div>
                </div>
              </div>
            )})}
              </div>
            )}

            {savedItems.length > 0 && (
              <div>
                <h2 className="font-semibold mb-4">Saved for later</h2>
                <div className="space-y-4">
                  {savedItems.map((item) => (
                    <div key={`saved-${item.productId}-${item.size}-${item.color}`} className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 opacity-90">
                      <MediaImage src={item.product.images?.[0]} alt={item.product.name} width={96} height={128} transform={{ width: 200, aspect: '3:4' }} className="w-full sm:w-24 h-40 sm:h-32 object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm sm:text-base line-clamp-2">{item.product.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">{item.product.brand} · {item.size} · {item.color}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <button type="button" className="text-sm text-brand-teal hover:underline" onClick={() => void cart.moveToCart(item.productId, item.size, item.color)}>Move to cart</button>
                          <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => void cart.removeItem(item.productId, item.size, item.color)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {cartItems.length > 0 ? (
            <div className="card p-4 sm:p-6 h-fit lg:sticky lg:top-24">
              <h2 className="font-semibold mb-4">Order Summary</h2>
              {deliveryZones.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-500">Delivery zone</label>
                  <select
                    value={deliveryZoneId}
                    onChange={(e) => setDeliveryZoneId(e.target.value)}
                    className="input-field mt-1 text-sm"
                  >
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span><span>{formatCurrency(tax)}</span></div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex justify-between font-semibold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
              <button
                className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!!checkoutBlocked}
                onClick={() => router.push('/checkout')}
              >
                Proceed to Checkout
              </button>
              {checkoutBlocked && (
                <p className="text-xs text-amber-600 mt-2">{checkoutBlocked}</p>
              )}
            </div>
          ) : (
            <div className="card p-4 sm:p-6 h-fit text-sm text-gray-500">
              Move items back to your cart to check out.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
