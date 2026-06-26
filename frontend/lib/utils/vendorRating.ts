/** Map vendor average rating to a display tier: 1–3.5 in half steps, 4 (blue), 5 (gold). */
export function vendorRatingTier(rating: number): string {
  if (!rating || rating <= 0) return ''

  if (rating >= 4.75) return '5'
  if (rating >= 4) return '4'

  let tier = Math.floor(rating * 2) / 2
  if (tier < 1) tier = 1
  if (tier > 3.5) tier = 3.5

  return Number.isInteger(tier) ? String(tier) : tier.toFixed(1)
}

export function resolveVendorBadge(rating?: number, badge?: string | null): string {
  if (badge) return badge
  if (rating == null || rating <= 0) return ''
  return vendorRatingTier(rating)
}

export type VendorTierStyle = {
  label: string
  className: string
  useCheck: boolean
}

export function vendorTierStyle(tier: string): VendorTierStyle | null {
  switch (tier) {
    case '5':
    case 'gold':
      return { label: '5★ vendor', className: 'text-amber-500', useCheck: true }
    case '4':
    case 'blue':
      return { label: '4★ vendor', className: 'text-blue-500', useCheck: true }
    case '3.5':
      return { label: '3.5★ vendor', className: 'text-yellow-600', useCheck: false }
    case '3':
      return { label: '3★ vendor', className: 'text-yellow-600', useCheck: false }
    case '2.5':
      return { label: '2.5★ vendor', className: 'text-orange-500', useCheck: false }
    case '2':
      return { label: '2★ vendor', className: 'text-orange-500', useCheck: false }
    case '1.5':
      return { label: '1.5★ vendor', className: 'text-red-500', useCheck: false }
    case '1':
      return { label: '1★ vendor', className: 'text-red-500', useCheck: false }
    default:
      return null
  }
}
