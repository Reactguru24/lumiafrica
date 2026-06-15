'use client'

import { useSubscriptionPlans } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

type SubscriptionPlan = {
  id: string
  label: string
  priceKes: number
  durationMonths: number
  benefits?: string[]
}

export default function SubscriptionPage() {
  const { data: plans, loading, error } = useSubscriptionPlans()
  const plansMap = (plans as Record<string, SubscriptionPlan>) || {}
  const plansList = Object.values(plansMap)

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center text-gray-500">
        Loading subscription plans...
      </div>
    )
  }

  if (error || plansList.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
        <p className="text-red-600 dark:text-red-400">
          {error ? getFriendlyErrorMessage(error, 'Unable to load subscription plans.') : 'No subscription plans are available at this time.'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="text-center mb-10">
        <SparklesIcon className="w-12 h-12 text-brand-orange mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-3">Featured Listing Plans</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Subscribe to appear in the <strong>Top Vendors</strong> section on the homepage.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plansList.map((plan) => (
          <div key={plan.id} className="card p-6 text-center hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold mb-2">{plan.label}</h3>
            <p className="text-3xl font-bold text-brand-teal dark:text-brand-orange mb-1">
              {formatCurrency(plan.priceKes)}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {plan.durationMonths === 1 ? '1 month' : `${plan.durationMonths} months`} of visibility
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
              {(plan.benefits || []).map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-brand-teal shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href="/auth/login?redirect=/vendor/subscription" className="btn-primary w-full inline-block">
              Choose {plan.label}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
