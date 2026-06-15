'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore } from '@/lib/stores/cart'
import { useProducts } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { FREE_SHIPPING_KES, STANDARD_SHIPPING_KES, TAX_RATE } from '@/lib/constants/commerce'
import { EmptyState } from '@/components/common/EmptyState'
import type { Product, CartItem } from '@/lib/types'
import type { ProductListResponse } from '@/lib/types/filters'

export default function CartPage() {
  const router = useRouter()
  const cart = useCartStore()

  const { data: allProducts, loading } = useProducts({ limit: 200 })

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {}
    const response = allProducts as ProductListResponse | null
    const arr = response?.items ?? []
    for (const p of arr as Product[]) map[p.id] = p
    return map
  }, [allProducts])

  const cartItems = useMemo(() => {
    return cart.items.map((item) => {
      const product = productMap[item.productId]
      if (!product) return null
      return { ...item, product }
    }).filter(Boolean) as (CartItem & { product: Product })[]
  }, [cart.items, productMap])

  const subtotal = useMemo(() => cartItems.reduce((s, i) => {
    const discountAmount = i.product.discount > 100 ? i.product.discount : i.product.price * (i.product.discount / 100)
    return s + Math.max(0, i.product.price - discountAmount) * i.quantity
  }, 0), [cartItems])
  const shipping = subtotal > FREE_SHIPPING_KES ? 0 : STANDARD_SHIPPING_KES
  const tax = subtotal * TAX_RATE
  const total = subtotal + shipping + tax

  return (
    <div className="page-container">
      <h1 className="section-title mb-8">Shopping Cart</h1>
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading cart...</div>
      ) : !cartItems.length ? (
        <EmptyState title="Your cart is empty" description="Browse our collection and add items to your cart." actionLabel="Continue Shopping" onAction={() => router.push('/products')} />
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={`${item.productId}-${item.size}-${item.color}`} className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Image src={item.product.images?.[0] || '/placeholder.png'} alt={item.product.name} width={96} height={128} className="w-full sm:w-24 h-40 sm:h-32 object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm sm:text-base line-clamp-2">{item.product.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{item.product.brand} · {item.size} · {item.color}</p>
                  <p className="font-semibold mt-2">{formatCurrency(item.product.price * (1 - item.product.discount / 100))}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
                    <div className="flex items-center border border-gray-300 dark:border-gray-700 text-sm">
                      <button className="px-3 py-1" onClick={() => cart.updateQuantity(item.productId, item.size, item.color, item.quantity - 1)}>−</button>
                      <span className="px-3 py-1 border-x border-gray-300 dark:border-gray-700">{item.quantity}</span>
                      <button className="px-3 py-1" onClick={() => cart.updateQuantity(item.productId, item.size, item.color, item.quantity + 1)}>+</button>
                    </div>
                    <button className="text-sm text-gray-500 hover:underline" onClick={() => cart.toggleSaveForLater(item.productId, item.size, item.color)}>Save for Later</button>
                    <button className="text-sm text-red-600 hover:underline" onClick={() => cart.removeItem(item.productId, item.size, item.color)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="card p-4 sm:p-6 h-fit lg:sticky lg:top-24">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax ({(TAX_RATE * 100).toFixed(0)}%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex justify-between font-semibold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
            <button className="btn-primary w-full mt-6" onClick={() => router.push('/checkout')}>Proceed to Checkout</button>
          </div>
        </div>
      )}
    </div>
  )
}
