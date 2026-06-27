export type PromotionLike = {
  active?: boolean
  startsAt?: string
  endsAt?: string
  productIds?: string[]
  type?: string
}

export const PROMO_TYPE_LABELS: Record<string, string> = {
  flash_sale: 'Flash sale',
  seasonal: 'Seasonal',
  clearance: 'Clearance',
}

/** True when a promotion should appear on the storefront homepage and detail pages. */
export function isStorefrontPromotionVisible(promo: PromotionLike): boolean {
  if (!promo.active) return false

  const now = Date.now()
  const start = promo.startsAt ? new Date(promo.startsAt).getTime() : NaN
  const end = promo.endsAt ? new Date(promo.endsAt).getTime() : NaN
  if (Number.isNaN(start) || Number.isNaN(end)) return false
  if (now < start || now > end) return false

  return (promo.productIds?.length ?? 0) > 0
}

export function filterStorefrontPromotions<T extends PromotionLike>(promotions: T[]): T[] {
  return promotions.filter(isStorefrontPromotionVisible)
}

export function promotionStatus(promo: PromotionLike) {
  if (!promo.active) return { label: 'Deactivated', status: 'cancelled' as const }
  const now = Date.now()
  const start = promo.startsAt ? new Date(promo.startsAt).getTime() : 0
  const end = promo.endsAt ? new Date(promo.endsAt).getTime() : Number.POSITIVE_INFINITY
  if (end < now) return { label: 'Expired', status: 'archived' as const }
  if (start > now) return { label: 'Scheduled', status: 'pending' as const }
  return { label: 'Live on storefront', status: 'active' as const }
}
