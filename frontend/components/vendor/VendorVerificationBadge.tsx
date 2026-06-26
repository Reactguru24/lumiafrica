import { CheckBadgeIcon, StarIcon } from '@heroicons/react/24/solid'
import { resolveVendorBadge, vendorTierStyle } from '@/lib/utils/vendorRating'

type VendorVerificationBadgeProps = {
  badge?: string | null
  rating?: number
  className?: string
  showLabel?: boolean
}

export function VendorVerificationBadge({
  badge,
  rating,
  className = 'w-4 h-4',
  showLabel = false,
}: VendorVerificationBadgeProps) {
  const tier = resolveVendorBadge(rating, badge)
  const style = vendorTierStyle(tier)
  if (!style) return null

  if (style.useCheck) {
    return (
      <span className="inline-flex items-center gap-1 shrink-0">
        <CheckBadgeIcon
          className={`${className} ${style.className}`}
          title={style.label}
          aria-label={style.label}
        />
        {showLabel && <span className={`text-xs font-medium ${style.className}`}>{tier}★</span>}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 shrink-0 ${style.className}`}
      title={style.label}
      aria-label={style.label}
    >
      <StarIcon className="w-3 h-3" />
      {tier}
    </span>
  )
}
