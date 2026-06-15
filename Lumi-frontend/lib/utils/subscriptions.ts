import type { VendorSubscription } from '@/lib/types'

export function isFeaturedListingActive(subscription: VendorSubscription | null | undefined): boolean {
  if (!subscription?.active) return false
  return new Date(subscription.expiresAt) > new Date()
}

export function subscriptionDaysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
