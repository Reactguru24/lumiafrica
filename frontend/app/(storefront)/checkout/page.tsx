'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCartStore } from '@/lib/stores/cart'
import { useAuthStore } from '@/lib/stores/auth'
import { useProducts, useCreateOrder, useValidateCoupon, useVendorProfile } from '@/lib/stores/api'
import { checkoutShippingSchema } from '@/lib/utils/validation'
import { useFormatCurrency } from '@/lib/stores/currency'
import { TAX_RATE, PAYMENT_METHODS } from '@/lib/constants/commerce'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { isAllowedPaystackUrl } from '@/lib/utils/safeRedirect'
import { RouteGuard } from '@/components/layouts/RouteGuard'
import { SHOPPER_ROLES } from '@/lib/constants/roles'
import { isOwnVendorProduct, VENDOR_SELF_PURCHASE_MSG } from '@/lib/utils/vendorPurchase'
import type { Product, CartItem } from '@/lib/types'
import type { ProductListResponse } from '@/lib/types/filters'

export default function CheckoutPage() {
  const formatPrice = useFormatCurrency()
  const router = useRouter()
  const cart = useCartStore()
  const auth = useAuthStore()
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [orderId, setOrderId] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    street: '', city: '', state: '', country: 'Kenya', zipCode: '',
    paymentMethod: PAYMENT_METHODS[0] as (typeof PAYMENT_METHODS)[number],
  })
  const { data: allProducts } = useProducts({ limit: 200 })
  const { data: vendorProfile } = useVendorProfile({ enabled: auth.isVendor })
  const myVendorId = auth.isVendor ? (vendorProfile as { id?: string } | null)?.id : null
  const createOrder = useCreateOrder().mutate
  const validateCoupon = useValidateCoupon().mutate
  const checkoutIdempotencyKey = useRef<string | null>(null)

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {}
    const response = allProducts as ProductListResponse | null
    for (const p of (response?.items ?? []) as Product[]) map[p.id] = p
    return map
  }, [allProducts])

  const cartItems = useMemo(() => {
    return cart.items.map((item) => {
      const product = productMap[item.productId]
      if (!product) return null
      return { ...item, product }
    }).filter(Boolean) as (CartItem & { product: Product })[]
  }, [cart.items, productMap])

  const ownProductItems = useMemo(
    () => cartItems.filter((item) => isOwnVendorProduct(item.product.vendorId, myVendorId)),
    [cartItems, myVendorId],
  )

  useEffect(() => {
    if (ownProductItems.length > 0) {
      toast.error(VENDOR_SELF_PURCHASE_MSG)
      router.replace('/cart')
    }
  }, [ownProductItems.length, router])

  useEffect(() => {
    if (auth.user) {
      setForm((f) => ({
        ...f,
        fullName: auth.user?.fullName || '',
        email: auth.user?.email || '',
        phone: auth.user?.phone || '',
      }))
    }
  }, [auth.user])

  const subtotal = useMemo(() => cartItems.reduce((s, i) => {
    const discountAmount = i.product.discount > 100 ? i.product.discount : i.product.price * (i.product.discount / 100)
    return s + Math.max(0, i.product.price - discountAmount) * i.quantity
  }, 0), [cartItems])

  const discount = appliedCoupon?.discount ?? 0
  const tax = subtotal * TAX_RATE
  const total = Math.max(0, subtotal - discount + tax)

  async function applyCoupon() {
    const code = couponInput.trim()
    if (!code) return
    try {
      const result = await validateCoupon({ code, subtotal }) as { valid: boolean; discountAmount?: number; message?: string; code?: string }
      if (!result?.valid) {
        toast.error(result?.message || 'Invalid coupon')
        setAppliedCoupon(null)
        return
      }
      setAppliedCoupon({ code: result.code || code, discount: result.discountAmount ?? 0 })
      toast.success('Coupon applied')
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Could not apply coupon'))
    }
  }

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
      const payload: Record<string, unknown> = {
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
        deliveryCity: form.city,
        notes: `${form.fullName} · ${form.phone} · ${form.email}`,
      }
      if (appliedCoupon?.code) payload.couponCode = appliedCoupon.code

      if (!checkoutIdempotencyKey.current) {
        checkoutIdempotencyKey.current = `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      }
      const result = await createOrder({
        payload,
        idempotencyKey: checkoutIdempotencyKey.current,
      }) as { authorizationUrl?: string; reference?: string }
      const payUrl = result?.authorizationUrl
      if (!payUrl || !isAllowedPaystackUrl(payUrl)) {
        toast.error('Unable to start payment. Please try again.')
        return
      }
      sessionStorage.setItem('lumi_checkout_pending', '1')
      window.location.href = payUrl
    } catch (e: unknown) {
      setStep(2)
      toast.error(getFriendlyErrorMessage(e, 'Unable to start payment. Please try again.'))
    }
  }

  return (
    <RouteGuard requiresAuth roles={SHOPPER_ROLES}>
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 w-full min-w-0">
        <h1 className="section-title mb-4 sm:mb-8 max-md:text-xl">Checkout</h1>
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-5 sm:mb-10 overflow-x-auto pb-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center shrink-0">
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-medium ${step >= s ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>{s}</div>
              {s < 3 && <div className={`w-4 sm:w-12 h-0.5 ${step > s ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'}`} />}
            </div>
          ))}
        </div>
        {step === 1 && (
          <div className="space-y-3 sm:space-y-4 animate-slide-up">
            <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Delivery Information</h2>
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
              {(['fullName', 'email', 'phone', 'street', 'city', 'state', 'country', 'zipCode'] as const).map((field) => (
                <div key={field} className={field === 'street' ? 'md:col-span-2' : ''}>
                  <label className="text-xs sm:text-sm font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                  <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} type={field === 'email' ? 'email' : 'text'} className="input-field input-compact mt-1" />
                  {errors[field] && <p className="text-red-500 text-xs">{errors[field]}</p>}
                </div>
              ))}
            </div>
            <button className="btn-primary btn-primary-compact w-full mt-4 sm:mt-6" onClick={nextStep}>Continue to Payment</button>
          </div>
        )}
        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Payment &amp; Promo</h2>
            <div className="card p-3 sm:p-4 mb-3 sm:mb-4">
              <label className="text-xs sm:text-sm font-medium">Coupon code</label>
              <div className="flex gap-2 mt-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME10"
                  className="input-field input-compact flex-1"
                />
                <button type="button" className="btn-secondary btn-secondary-compact shrink-0" onClick={applyCoupon}>Apply</button>
              </div>
              {appliedCoupon && (
                <p className="text-xs sm:text-sm text-green-600 mt-2">Applied {appliedCoupon.code} (−{formatPrice(appliedCoupon.discount)})</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
              {PAYMENT_METHODS.map((pm) => (
                <button key={pm} className={`card p-2.5 sm:p-4 text-center text-xs sm:text-sm font-medium transition-all ${form.paymentMethod === pm ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`} onClick={() => setForm({ ...form, paymentMethod: pm })}>{pm}</button>
              ))}
            </div>
            <div className="card p-3 sm:p-4 mb-4 sm:mb-6 text-xs sm:text-sm space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Coupon</span><span>−{formatPrice(discount)}</span></div>}
              {tax > 0 && <div className="flex justify-between"><span>Tax</span><span>{formatPrice(tax)}</span></div>}
              <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <button className="btn-secondary btn-secondary-compact flex-1" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary btn-primary-compact flex-1" onClick={placeOrder}>Pay with Paystack</button>
            </div>
          </div>
        )}
        {step === 3 && (
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
