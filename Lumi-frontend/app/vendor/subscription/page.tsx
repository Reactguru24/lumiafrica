'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  useVendorProfile,
  useVendorSubscription,
  useVendorSubscriptionHistory,
  useSubscriptionPlans,
  useVendorSubscribe,
} from '@/lib/api/hooks'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { formatDate, formatCurrency } from '@/lib/utils/storage'
import Link from 'next/link'

type SubscriptionPlan = {
  id: string
  label: string
  description?: string
  priceKes: number
  durationMonths: number
  benefits?: string[]
}

const PAYMENT_METHODS = ['M-Pesa', 'Card', 'Bank Transfer']

export default function VendorSubscriptionPage() {
  const { data: vendor, loading: vendorLoading } = useVendorProfile()
  const { data: activeSubscription, refetch: refetchActive } = useVendorSubscription()
  const { data: historyData } = useVendorSubscriptionHistory()
  const { data: plansData } = useSubscriptionPlans()
  const subscribe = useVendorSubscribe().mutate

  const [selectedPlan, setSelectedPlan] = useState('biannual')
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa')
  const [submitting, setSubmitting] = useState(false)

  const plansMap = (plansData as Record<string, SubscriptionPlan>) || {}
  const plansList = Object.values(plansMap) as SubscriptionPlan[]
  const subscription = activeSubscription as any
  const isFeatured = subscription?.active && new Date(subscription.expiresAt) > new Date()
  const history = ((historyData as any)?.items || []) as any[]

  async function handleSubscribe() {
    setSubmitting(true)
    try {
      await subscribe({ plan: selectedPlan, paymentMethod })
      toast.success('Featured listing activated! Your store can now appear in Top Vendors.')
      refetchActive()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to complete subscription. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (vendorLoading) {
    return <div className="text-gray-500">Loading subscription details...</div>
  }

  if (!vendor) {
    return <div className="text-red-600">Unable to load your store profile. Please try again later.</div>
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start gap-3 mb-2">
        <SparklesIcon className="w-8 h-8 text-brand-orange shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold">Featured Listing</h1>
          <p className="text-gray-500 text-sm mt-1">
            Subscribe to appear in the <strong>Top Vendors</strong> section on the homepage.
          </p>
        </div>
      </div>

      {isFeatured && subscription && (
        <div className="card p-5 mb-8 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">Your store is featured</p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Active until {formatDate(subscription.expiresAt)} ({subscription.daysLeft ?? 0} days left)
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                Plan: {subscription.planName || subscription.plan} · Paid via {subscription.paymentMethod}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isFeatured && (
        <div className="card p-5 mb-8 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>{(vendor as any).storeName}</strong> is not currently in Top Vendors. Choose a plan below to get featured placement.
          </p>
        </div>
      )}

      <h2 className="font-semibold mb-4">Choose a plan</h2>
      {plansList.length === 0 ? (
        <p className="text-gray-500 text-sm">Loading available plans...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {plansList.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`card p-5 text-left transition-all ${selectedPlan === plan.id ? 'ring-2 ring-brand-teal dark:ring-brand-orange' : 'hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{plan.label}</span>
              </div>
              <p className="text-2xl font-bold text-brand-teal dark:text-brand-orange">{formatCurrency(plan.priceKes)}</p>
              <p className="text-xs text-gray-500 mt-2">
                {plan.durationMonths === 1 ? 'Billed monthly' : `${plan.durationMonths} months of homepage visibility`}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="card p-5 mb-8">
        <h3 className="font-semibold mb-3">Payment method</h3>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`px-4 py-2 text-sm border rounded-lg ${paymentMethod === method ? 'bg-brand-teal text-white border-brand-teal dark:bg-brand-orange dark:border-brand-orange' : 'border-gray-300 dark:border-gray-700'}`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="btn-primary w-full sm:w-auto px-8" onClick={handleSubscribe} disabled={submitting || plansList.length === 0}>
        {submitting ? 'Processing...' : isFeatured ? 'Extend Featured Listing' : 'Subscribe & Get Featured'}
      </button>

      {history.length > 0 && (
        <div className="mt-10">
          <h3 className="font-semibold mb-4">Billing history</h3>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Payment</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {history.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-4 py-3 capitalize">{sub.planName || sub.plan}</td>
                    <td className="px-4 py-3">{formatCurrency(sub.amountPaid)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{sub.paymentMethod}</td>
                    <td className="px-4 py-3">{formatDate(sub.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <span className={sub.active ? 'text-green-600' : 'text-gray-500'}>
                        {sub.active ? 'Active' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-8">
        Questions? <Link href="/vendor/profile" className="underline">Update your store profile</Link> or contact support.
      </p>
    </div>
  )
}
