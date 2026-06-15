'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/stores/cart'
import { useAuthStore } from '@/lib/stores/auth'
import { useProducts, useCreateOrder } from '@/lib/api/hooks'
import { checkoutShippingSchema } from '@/lib/utils/validation'
import { formatCurrency } from '@/lib/utils/storage'
import { FREE_SHIPPING_KES, STANDARD_SHIPPING_KES, EXPRESS_SHIPPING_KES, TAX_RATE, PAYMENT_METHODS, SHIPPING_METHODS } from '@/lib/constants/commerce'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { RouteGuard } from '@/components/layouts/RouteGuard'
import type { Product, CartItem } from '@/lib/types'
import type { ProductListResponse } from '@/lib/types/filters'

export default function CheckoutPage() {
  const router = useRouter()
  const cart = useCartStore()
  const auth = useAuthStore()
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [orderId, setOrderId] = useState('')
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    street: '', city: '', state: '', country: '', zipCode: '',
    deliveryMethod: SHIPPING_METHODS[0].name, paymentMethod: PAYMENT_METHODS[0],
  })
  const { data: allProducts } = useProducts({ limit: 200 })
  const createOrder = useCreateOrder().mutate

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

  useEffect(() => {
    if (auth.user) {
      setForm((f) => ({ ...f, fullName: auth.user?.fullName || '', email: auth.user?.email || '', phone: auth.user?.phone || '' }))
    }
  }, [auth.user])

  const subtotal = useMemo(() => cartItems.reduce((s, i) => {
    const discountAmount = i.product.discount > 100 ? i.product.discount : i.product.price * (i.product.discount / 100)
    return s + Math.max(0, i.product.price - discountAmount) * i.quantity
  }, 0), [cartItems])

  const selectedShipping = SHIPPING_METHODS.find((m) => m.name === form.deliveryMethod) || SHIPPING_METHODS[0]
  const shippingCost = subtotal > FREE_SHIPPING_KES ? 0 : selectedShipping.price
  const tax = subtotal * TAX_RATE
  const total = subtotal + shippingCost + tax

  function nextStep() {
    setErrors({})
    if (step === 1) {
      const result = checkoutShippingSchema.safeParse(form)
      if (!result.success) {
        const next: Record<string, string> = {}
        result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
        setErrors(next)
        return
      }
    }
    setStep(step + 1)
  }

  async function placeOrder() {
    try {
      if (!cartItems.length) {
        toast.error('Your cart is empty')
        router.push('/cart')
        return
      }
      const payload = {
        items: cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.images?.[0] || '/placeholder.png',
          vendorId: item.product.vendorId,
          price: item.product.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })),
        paymentMethod: form.paymentMethod,
        deliveryAddress: [form.street, form.city, form.state, form.country, form.zipCode].filter(Boolean).join(', '),
        notes: `${form.fullName} · ${form.phone} · ${form.email}`,
      }
      const result = await createOrder(payload as any)
      setOrderId((result as any)?.id || '')
      setStep(4)
      cart.clearCart()
      toast.success('Order placed successfully!')
    } catch (e: unknown) {
      setStep(3)
      toast.error(getFriendlyErrorMessage(e, 'Unable to place your order. Please try again.'))
    }
  }

  return (
    <RouteGuard requiresAuth roles={['CUSTOMER']}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full min-w-0">
        <h1 className="section-title mb-6 sm:mb-8">Checkout</h1>
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 sm:mb-10 overflow-x-auto pb-1">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center shrink-0">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${step >= s ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>{s}</div>
              {s < 4 && <div className={`w-6 sm:w-12 h-0.5 ${step > s ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'}`} />}
            </div>
          ))}
        </div>
        {step === 1 && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="font-semibold text-lg mb-4">Shipping Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {(['fullName', 'email', 'phone', 'street', 'city', 'state', 'country', 'zipCode'] as const).map((field) => (
                <div key={field} className={field === 'street' ? 'md:col-span-2' : ''}>
                  <label className="text-sm font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                  <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} type={field === 'email' ? 'email' : 'text'} className="input-field mt-1" />
                  {errors[field] && <p className="text-red-500 text-xs">{errors[field]}</p>}
                </div>
              ))}
            </div>
            <button className="btn-primary w-full mt-6" onClick={nextStep}>Continue to Delivery</button>
          </div>
        )}
        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="font-semibold text-lg mb-4">Delivery Method</h2>
            <div className="space-y-3">
              {SHIPPING_METHODS.map((method) => (
                <label key={method.id} className={`card p-4 flex items-center justify-between cursor-pointer ${form.deliveryMethod === method.name ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={form.deliveryMethod === method.name} onChange={() => setForm({ ...form, deliveryMethod: method.name })} />
                    <div><p className="font-medium text-sm">{method.name}</p><p className="text-xs text-gray-500">{method.days}</p></div>
                  </div>
                  <span className="font-medium">{subtotal > FREE_SHIPPING_KES ? 'FREE' : formatCurrency(method.price)}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-4 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary flex-1" onClick={nextStep}>Continue to Payment</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="animate-slide-up">
            <h2 className="font-semibold text-lg mb-4">Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {PAYMENT_METHODS.map((pm) => (
                <button key={pm} className={`card p-4 text-center text-sm font-medium transition-all ${form.paymentMethod === pm ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`} onClick={() => setForm({ ...form, paymentMethod: pm })}>{pm}</button>
              ))}
            </div>
            <div className="card p-4 mb-6 text-sm space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shippingCost === 0 ? 'FREE' : formatCurrency(shippingCost)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
            <div className="flex gap-4">
              <button className="btn-secondary flex-1" onClick={() => setStep(2)}>Back</button>
              <button className="btn-primary flex-1" onClick={placeOrder}>Place Order</button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="text-center animate-slide-up py-12">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">✓</span></div>
            <h2 className="font-display text-2xl font-semibold mb-2">Order Confirmed!</h2>
            <p className="text-gray-500 mb-2">Thank you for your purchase.</p>
            <p className="text-sm text-gray-400 mb-8">Order ID: {orderId}</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link href="/account/orders" className="btn-primary">View Orders</Link>
              <Link href="/products" className="btn-secondary">Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
