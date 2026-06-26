'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MediaImage } from '@/components/common/MediaImage'
import {
  useVendorProfile,
  useVendorSubscription,
  useVendorSubscriptionHistory,
  useSubscriptionPlans,
  useVendorSubscribe,
  useCancelVendorSubscription,
  useVendorProducts,
} from '@/lib/stores/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { confirmAction } from '@/lib/utils/swal'
import { unwrapItems } from '@/lib/utils/api'
import { isFeaturedListingActive, subscriptionDaysRemaining } from '@/lib/utils/subscriptions'
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { formatDate, formatCurrency } from '@/lib/utils/storage'
import Link from 'next/link'
import type { Product, Vendor, VendorSubscription } from '@/lib/types'

type SubscriptionPlan = {
  id: string
  label: string
  description?: string
  priceKes: number
  durationMonths: number
  featuredSlots?: number
  benefits?: string[]
}

export default function VendorSubscriptionPage() {
  const { data: vendor, loading: vendorLoading } = useVendorProfile()
  const { data: activeSubscription, refetch: refetchActive } = useVendorSubscription()
  const { data: historyData } = useVendorSubscriptionHistory()
  const { data: plansData, loading: plansLoading } = useSubscriptionPlans()
  const { data: productsData } = useVendorProducts()
  const subscribe = useVendorSubscribe().mutate
  const cancelSubscription = useCancelVendorSubscription().mutate
  const { loading: cancelling } = useCancelVendorSubscription()

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const plansMap = (plansData as Record<string, SubscriptionPlan>) || {}
  const plansList = Object.values(plansMap) as SubscriptionPlan[]
  const products = unwrapItems<Product>(productsData).filter((p) => p.status === 'active' || p.status === 'pending')
  const subscription = activeSubscription as VendorSubscription | null
  const isFeatured = isFeaturedListingActive(subscription)
  const history = unwrapItems<VendorSubscription & { planName?: string }>(historyData).slice(0, 3)

  const activePlanId = selectedPlan ?? plansList[0]?.id ?? ''
  const activePlan = plansMap[activePlanId]
  const maxSlots = activePlan?.featuredSlots || 1

  useEffect(() => {
    if (selectedPlan) return
    if (subscription?.plan && plansMap[subscription.plan]) {
      setSelectedPlan(subscription.plan)
      return
    }
    if (plansList.length > 0) {
      setSelectedPlan(plansList[0].id)
    }
  }, [selectedPlan, subscription, plansMap, plansList])

  useEffect(() => {
    const featuredIds = products.filter((p) => p.featured).map((p) => p.id)
    if (featuredIds.length === 0) return
    setSelectedProducts((prev) => {
      if (prev.length > 0) return prev
      return featuredIds.slice(0, maxSlots)
    })
  }, [products, maxSlots])

  const selectedPlanConfig = useMemo(() => plansMap[activePlanId], [plansMap, activePlanId])

  function toggleProduct(productId: string) {
    setSelectedProducts((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId)
      if (prev.length >= maxSlots) {
        toast.error(`You can select up to ${maxSlots} products on this plan`)
        return prev
      }
      return [...prev, productId]
    })
  }

  async function handleSubscribe() {
    if (!activePlanId) {
      toast.error('Select a subscription plan')
      return
    }
    if (!selectedProducts.length) {
      toast.error('Select at least one product to feature on the homepage')
      return
    }
    setSubmitting(true)
    try {
      const result = await subscribe({
        plan: activePlanId,
        paymentMethod: 'Paystack',
        productIds: selectedProducts,
      }) as { authorizationUrl?: string }
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl
        return
      }
      toast.error('Unable to start payment. Please try again.')
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to start subscription payment. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    const confirmed = await confirmAction({
      title: 'Cancel featured listing?',
      text: 'Your store will be removed from Top Vendors immediately.',
      confirmText: 'Yes, cancel',
      cancelText: 'Keep subscription',
      icon: 'warning',
    })
    if (!confirmed) return
    try {
      await cancelSubscription()
      toast.success('Featured listing cancelled')
      refetchActive()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to cancel subscription.'))
    }
  }

  if (vendorLoading) {
    return <div className="text-gray-500">Loading subscription details...</div>
  }

  if (!vendor) {
    return <div className="text-red-600">Unable to load your store profile. Please try again later.</div>
  }

  const v = vendor as Vendor

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm text-gray-500">Subscribe via Paystack to appear in Top Vendors and feature products on the homepage.</p>

      {isFeatured && subscription && (
        <div className="card p-5 mb-8 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Your store is featured</p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Active until {formatDate(subscription.expiresAt)} ({subscriptionDaysRemaining(subscription.expiresAt)} days left)
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                  Plan: {(subscription as VendorSubscription & { planName?: string }).planName || subscription.plan} · Paid via {subscription.paymentMethod}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Manage featured products from <Link href="/vendor/products" className="underline">Products</Link>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="text-sm text-red-600 hover:underline shrink-0"
            >
              {cancelling ? 'Cancelling...' : 'Cancel subscription'}
            </button>
          </div>
        </div>
      )}

      {!isFeatured && (
        <div className="card p-5 mb-8 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>{v.storeName}</strong> is not currently in Top Vendors. Choose a plan, select products, then pay with Paystack.
          </p>
        </div>
      )}

      <h2 className="font-semibold mb-4">Choose a plan</h2>
      {plansLoading || plansList.length === 0 ? (
        <p className="text-gray-500 text-sm mb-8">{plansLoading ? 'Loading available plans...' : 'No subscription plans are available right now.'}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {plansList.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                setSelectedPlan(plan.id)
                setSelectedProducts((prev) => prev.slice(0, plan.featuredSlots || 1))
              }}
              className={`card p-5 text-left transition-all ${activePlanId === plan.id ? 'ring-2 ring-brand-teal dark:ring-brand-orange' : 'hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{plan.label}</span>
                <span className="text-xs text-gray-500">{plan.featuredSlots || 1} product slots</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-brand-teal dark:text-brand-orange break-words">{formatCurrency(plan.priceKes)}</p>
              <p className="text-xs text-gray-500 mt-2">
                {plan.durationMonths === 1 ? 'Billed monthly' : `${plan.durationMonths} months of homepage visibility`}
              </p>
              {plan.description && (
                <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
              )}
              {(plan.benefits?.length ?? 0) > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {plan.benefits!.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="card p-5 mb-8">
        <h3 className="font-semibold mb-1">Select products to feature</h3>
        <p className="text-sm text-gray-500 mb-4">
          Choose up to {maxSlots} active products. Uncheck any product to free a slot and pick another.
          {selectedPlanConfig ? ` (${selectedProducts.length}/${maxSlots} selected)` : ''}
        </p>
        {products.length === 0 ? (
          <p className="text-sm text-gray-500">
            No active products yet. <Link href="/vendor/products" className="underline">Add products</Link> before subscribing.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {products.map((product) => {
              const selected = selectedProducts.includes(product.id)
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-all ${selected ? 'border-brand-teal dark:border-brand-orange bg-brand-teal/5 dark:bg-brand-orange/5' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <MediaImage
                    src={product.images?.[0]}
                    alt={product.name}
                    width={48}
                    height={48}
                    transform={{ width: 96, aspect: '3:4' }}
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(product.price)}</p>
                  </div>
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${selected ? 'bg-brand-teal text-white border-brand-teal dark:bg-brand-orange dark:border-brand-orange' : 'border-gray-300'}`}>
                    {selected ? '✓' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-primary w-full sm:w-auto px-8"
        onClick={handleSubscribe}
        disabled={submitting || plansList.length === 0 || products.length === 0 || !activePlanId}
      >
        {submitting ? 'Redirecting to Paystack...' : isFeatured ? 'Extend with Paystack' : 'Pay with Paystack & Get Featured'}
      </button>

      {history.length > 0 && (
        <div className="mt-10">
          <h3 className="font-semibold mb-4">Recent billing (last 3)</h3>
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
