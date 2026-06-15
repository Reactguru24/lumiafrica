import type { FeaturedListingPlan } from '@/lib/types'

export interface FeaturedListingPlanOption {
  id: FeaturedListingPlan
  label: string
  durationMonths: number
  priceKes: number
  savings?: string
  popular?: boolean
}

export const FEATURED_LISTING_PLANS: FeaturedListingPlanOption[] = [
  { id: 'monthly', label: 'Monthly', durationMonths: 1, priceKes: 2500 },
  { id: 'quarterly', label: '3 Months', durationMonths: 3, priceKes: 6500, savings: 'Save 13%' },
  { id: 'biannual', label: '6 Months', durationMonths: 6, priceKes: 12000, savings: 'Save 20%', popular: true },
  { id: 'yearly', label: '1 Year', durationMonths: 12, priceKes: 20000, savings: 'Save 33%' },
]

export function getFeaturedListingPlan(plan: FeaturedListingPlan): FeaturedListingPlanOption {
  const found = FEATURED_LISTING_PLANS.find((p) => p.id === plan)
  if (!found) throw new Error('Invalid subscription plan')
  return found
}
