'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { customerAPI } from '@/lib/api/client'
import { useCartStore } from '@/lib/stores/cart'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

function PaymentCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference') || searchParams.get('trxref') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending' | 'refunded'>('loading')
  const [orderId, setOrderId] = useState('')
  const [subscriptionId, setSubscriptionId] = useState('')
  const [paymentType, setPaymentType] = useState<'order' | 'subscription'>('order')
  const [refundMessage, setRefundMessage] = useState('')

  useEffect(() => {
    if (!reference) {
      setStatus('failed')
      return
    }

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function verify() {
      try {
        const result = await customerAPI.verifyPayment(reference) as {
          status?: string
          type?: string
          orderId?: string
          subscriptionId?: string
          message?: string
        }
        if (cancelled) return
        if (result.status === 'success') {
          setStatus('success')
          setPaymentType(result.type === 'subscription' ? 'subscription' : 'order')
          setOrderId(result.orderId || '')
          setSubscriptionId(result.subscriptionId || '')
          if (result.type !== 'subscription') {
            sessionStorage.removeItem('lumi_checkout_pending')
            void useCartStore.getState().clearCart()
          }
          toast.success(result.type === 'subscription' ? 'Subscription activated!' : 'Payment successful!')
          if (intervalId) clearInterval(intervalId)
        } else if (result.status === 'refunded') {
          setStatus('refunded')
          setRefundMessage(result.message || 'Your payment has been fully refunded.')
          toast.info(result.message || 'Your payment has been refunded.')
          if (intervalId) clearInterval(intervalId)
        } else {
          setStatus('pending')
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setStatus('failed')
          toast.error(getFriendlyErrorMessage(e, 'Payment verification failed'))
          if (intervalId) clearInterval(intervalId)
        }
      }
    }

    verify()
    intervalId = setInterval(verify, 4000)
    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [reference])

  if (status === 'loading' || status === 'pending') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">Confirming your payment...</h1>
        <p className="text-gray-500 text-sm">Please wait while we verify your Paystack transaction.</p>
      </div>
    )
  }

  if (status === 'refunded') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">↩</span>
        </div>
        <h1 className="text-xl font-semibold mb-2">Payment refunded</h1>
        <p className="text-gray-500 mb-8">{refundMessage}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/cart" className="btn-primary">Back to Cart</Link>
          <Link href="/products" className="btn-secondary">Continue Shopping</Link>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✕</span>
        </div>
        <h1 className="text-xl font-semibold mb-2">Payment not confirmed</h1>
        <p className="text-gray-500 mb-8">We could not verify this payment. You can try again or contact support.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/checkout" className="btn-primary">Back to Checkout</Link>
          <Link href="/vendor/subscription" className="btn-secondary">Vendor Subscription</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">✓</span>
      </div>
      <h1 className="text-xl font-semibold mb-2">
        {paymentType === 'subscription' ? 'Subscription Active!' : 'Order Confirmed!'}
      </h1>
      <p className="text-gray-500 mb-2">
        {paymentType === 'subscription'
          ? 'Your store is now featured and selected products will appear on the homepage.'
          : 'Thank you for your purchase.'}
      </p>
      {orderId && <p className="text-sm text-gray-400 mb-8">Order ID: {orderId}</p>}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {paymentType === 'subscription' ? (
          <>
            <Link href="/vendor/subscription" className="btn-primary">View Subscription</Link>
            <Link href="/vendor/products" className="btn-secondary">Manage Featured Products</Link>
          </>
        ) : (
          <>
            <Link href="/account/orders" className="btn-primary">View Orders</Link>
            <button type="button" className="btn-secondary" onClick={() => router.push('/products')}>Continue Shopping</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <PaymentCallbackContent />
    </Suspense>
  )
}
