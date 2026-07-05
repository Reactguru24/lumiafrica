'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MediaImage } from '@/components/common/MediaImage'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/stores/cart'
import { useProducts, useVendorProfile, useShippingEstimate } from '@/lib/stores/api'
import { useAuthStore } from '@/lib/stores/auth'
import { isOwnVendorProduct, VENDOR_SELF_PURCHASE_MSG } from '@/lib/utils/vendorPurchase'
import { useFormatCurrency } from '@/lib/stores/currency'
import { TAX_RATE } from '@/lib/constants/commerce'
import { toShippingEstimateItems } from '@/lib/utils/shipping'
import { EmptyState } from '@/components/common/EmptyState'
import { getVariantStock } from '@/lib/utils/productVariants'
import type { Product, CartItem } from '@/lib/types'
import type { ProductListResponse } from '@/lib/types/filters'

export default function CartPage() {
  const formatPrice = useFormatCurrency()
  const router = useRouter()
  const cart = useCartStore()
  const auth = useAuthStore()
  const [deliveryCity, setDeliveryCity] = useState('Nairobi')
  const { data: vendorProfile } = useVendorProfile({ enabled: auth.isVendor })
  const myVendorId = auth.isVendor ? (vendorProfile as { id?: string } | null)?.id : null

  const { data: allProducts, loading } = useProducts({ limit: 200 })

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

  const ownProductItems = useMemo(
    () => cartItems.filter((item) => isOwnVendorProduct(item.product.vendorId, myVendorId)),
    [cartItems, myVendorId],
  )

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
  const { data: shippingEstimate, loading: shippingLoading } = useShippingEstimate(
    estimateItems as unknown as Record<string, unknown>[],
    deliveryCity.trim(),
  )
  const shippingCost = shippingEstimate?.shippingCost ?? 0
  const shippingBreakdown = shippingEstimate?.breakdown ?? []

  const tax = subtotal * TAX_RATE
  const total = subtotal + shippingCost + tax

  const checkoutBlocked = useMemo(() => {
    if (ownProductItems.length > 0) return VENDOR_SELF_PURCHASE_MSG
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
  }, [cart.activeItems, cartItems, loading, productMap, ownProductItems])

  function handleCheckout() {
    if (ownProductItems.length > 0) {
      toast.error(VENDOR_SELF_PURCHASE_MSG)
      return
    }
    if (checkoutBlocked) {
      toast.error(checkoutBlocked)
      return
    }
    router.push('/checkout')
  }

  return (
    <div className="page-container max-md:px-3 max-md:py-4">
      <h1 className="section-title mb-4 sm:mb-8 max-md:text-xl">Shopping Cart</h1>
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading cart...</div>
      ) : !cartItems.length && !savedItems.length ? (
        <EmptyState title="Your cart is empty" description="Browse our collection and add items to your cart." actionLabel="Continue Shopping" onAction={() => router.push('/products')} />
      ) : (
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 space-y-3 sm:space-y-6">
            {cartItems.length > 0 && (
              <div className="space-y-2 sm:space-y-4">
                {ownProductItems.length > 0 && (
                  <div className="p-3 sm:p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                    {VENDOR_SELF_PURCHASE_MSG} Remove your own listings to continue.
                  </div>
                )}
                {cartItems.map((item) => {
              const stock = variantStockFor(item)
              const key = `${item.productId}|${item.size}|${item.color}`
              const totalForVariant = qtyByVariant[key] || 0
              const atStockLimit = totalForVariant >= stock
              return (
              <div key={`${item.productId}-${item.size}-${item.color}`} className="card p-2.5 sm:p-4 flex flex-row gap-2.5 sm:gap-4">
                <MediaImage src={item.product.images?.[0]} alt={item.product.name} width={80} height={100} transform={{ width: 200, aspect: '3:4' }} className="w-20 sm:w-24 h-24 sm:h-32 object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-xs sm:text-base line-clamp-2">{item.product.name}</h3>
                  <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5">{item.product.brand} · {item.size} · {item.color}</p>
                  <p className={`text-[10px] sm:text-xs mt-0.5 ${stock > 10 ? 'text-green-600' : stock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                  </p>
                  <p className="font-semibold text-sm mt-1">{formatPrice(item.product.price * (1 - item.product.discount / 100))}</p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-4 mt-2">
                    <div className="flex items-center border border-gray-300 dark:border-gray-700 text-xs">
                      <button type="button" className="px-2 py-0.5 sm:px-3 sm:py-1" onClick={() => updateCartQuantity(item, item.quantity - 1)}>−</button>
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1 border-x border-gray-300 dark:border-gray-700 min-w-[1.5rem] text-center">{item.quantity}</span>
                      <button type="button" className="px-2 py-0.5 sm:px-3 sm:py-1 disabled:opacity-40" disabled={atStockLimit} onClick={() => updateCartQuantity(item, item.quantity + 1)}>+</button>
                    </div>
                    <button type="button" className="text-[10px] sm:text-sm text-gray-500 hover:underline" onClick={() => void cart.toggleSaveForLater(item.productId, item.size, item.color)}>Save</button>
                    <button type="button" className="text-[10px] sm:text-sm text-red-600 hover:underline" onClick={() => void cart.removeItem(item.productId, item.size, item.color)}>Remove</button>
                  </div>
                </div>
              </div>
            )})}
              </div>
            )}

            {savedItems.length > 0 && (
              <div>
                <h2 className="font-semibold text-sm sm:text-base mb-2 sm:mb-4">Saved for later</h2>
                <div className="space-y-2 sm:space-y-4">
                  {savedItems.map((item) => (
                    <div key={`saved-${item.productId}-${item.size}-${item.color}`} className="card p-2.5 sm:p-4 flex flex-row gap-2.5 sm:gap-4 opacity-90">
                      <MediaImage src={item.product.images?.[0]} alt={item.product.name} width={80} height={100} transform={{ width: 200, aspect: '3:4' }} className="w-20 sm:w-24 h-24 sm:h-32 object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xs sm:text-base line-clamp-2">{item.product.name}</h3>
                        <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5">{item.product.brand} · {item.size} · {item.color}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <button type="button" className="text-[10px] sm:text-sm text-brand-teal hover:underline" onClick={() => void cart.moveToCart(item.productId, item.size, item.color)}>Move to cart</button>
                          <button type="button" className="text-[10px] sm:text-sm text-red-600 hover:underline" onClick={() => void cart.removeItem(item.productId, item.size, item.color)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {cartItems.length > 0 ? (
            <div className="card p-3 sm:p-6 h-fit lg:sticky lg:top-24">
              <h2 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Order Summary</h2>
              <div className="mb-3">
                <label className="text-xs text-gray-500">Estimate shipping to</label>
                <input
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  placeholder="City"
                  className="input-field input-compact mt-1"
                />
              </div>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {shippingLoading ? (
                  <div className="text-gray-400 text-xs">Calculating shipping…</div>
                ) : shippingBreakdown.length > 0 ? (
                  <div className="space-y-1 border-t border-gray-200 dark:border-gray-800 pt-2">
                    {shippingBreakdown.map((line) => (
                      <div key={line.vendorId} className="flex justify-between gap-2">
                        <span className="text-gray-500 truncate text-[10px] sm:text-xs">
                          {line.storeName}
                        </span>
                        <span className="shrink-0">{formatPrice(line.shippingCost)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-500">Shipping</span>
                      <span>{formatPrice(shippingCost)}</span>
                    </div>
                  </div>
                ) : deliveryCity.trim() ? (
                  <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatPrice(shippingCost)}</span></div>
                ) : null}
                <div className="flex justify-between"><span className="text-gray-500">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span><span>{formatPrice(tax)}</span></div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-2 sm:pt-3 flex justify-between font-semibold text-sm sm:text-base"><span>Total</span><span>{formatPrice(total)}</span></div>
              </div>
              <button
                className="btn-primary btn-primary-compact w-full mt-4 sm:mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!!checkoutBlocked}
                onClick={handleCheckout}
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
