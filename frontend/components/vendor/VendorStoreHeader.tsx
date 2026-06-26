'use client'

import Link from 'next/link'
import { MediaImage } from '@/components/common/MediaImage'
import { VendorVerificationBadge } from '@/components/vendor/VendorVerificationBadge'
import { vendorTierStyle, resolveVendorBadge } from '@/lib/utils/vendorRating'
import { isFeaturedListingActive } from '@/lib/utils/subscriptions'
import type { Vendor, VendorSubscription } from '@/lib/types'
import { SparklesIcon, StarIcon } from '@heroicons/react/24/outline'

type VendorStoreHeaderProps = {
  vendor: Vendor | null
  subscription?: VendorSubscription | null
  title?: string
  subtitle?: string
  showLogo?: boolean
  showFeatured?: boolean
  showRating?: boolean
  className?: string
}

export function VendorStoreHeader({
  vendor,
  subscription,
  title,
  subtitle,
  showLogo = true,
  showFeatured = true,
  showRating = true,
  className = 'mb-6',
}: VendorStoreHeaderProps) {
  if (!vendor) return null

  const featured = showFeatured && isFeaturedListingActive(subscription)
  const tier = resolveVendorBadge(vendor.rating, vendor.verificationBadge)
  const tierStyle = vendorTierStyle(tier)

  return (
    <div className={`flex items-start gap-3 sm:gap-4 min-w-0 ${className}`}>
      {showLogo && vendor.logo && (
        <MediaImage
          src={vendor.logo}
          alt={vendor.storeName}
          width={56}
          height={56}
          transform={{ width: 112 }}
          className="w-14 h-14 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
        />
      )}
      <div className="min-w-0 flex-1">
        {title ? (
          <h1 className="text-xl sm:text-2xl font-semibold mb-1 break-words">{title}</h1>
        ) : (
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-semibold truncate">{vendor.storeName}</h1>
            <VendorVerificationBadge
              badge={vendor.verificationBadge}
              rating={vendor.rating}
              className="w-5 h-5"
            />
            {featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-orange/10 text-brand-orange">
                <SparklesIcon className="w-3 h-3" />
                Featured
              </span>
            )}
          </div>
        )}
        {showRating && vendor.rating > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-1">
              <StarIcon className="w-4 h-4 text-yellow-400" />
              {vendor.rating.toFixed(1)}
            </span>
            {tierStyle && (
              <span className={`text-xs ${tierStyle.className}`}>{tierStyle.label}</span>
            )}
          </div>
        )}
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

type VendorRatingInsightProps = {
  vendor: Vendor
  totalReviews?: number
  className?: string
}

export function VendorRatingInsight({ vendor, totalReviews, className = '' }: VendorRatingInsightProps) {
  const tier = resolveVendorBadge(vendor.rating, vendor.verificationBadge)
  const tierStyle = vendorTierStyle(tier)

  return (
    <div className={`card p-4 sm:p-5 min-w-0 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 mb-1">Store reputation</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold">{vendor.rating > 0 ? vendor.rating.toFixed(1) : '—'}</span>
            <VendorVerificationBadge
              badge={vendor.verificationBadge}
              rating={vendor.rating}
              className="w-6 h-6"
              showLabel
            />
          </div>
          {totalReviews != null && (
            <p className="text-xs text-gray-500 mt-1">{totalReviews} customer review{totalReviews === 1 ? '' : 's'}</p>
          )}
        </div>
        {tierStyle && (
          <p className={`text-xs sm:text-right sm:max-w-[12rem] shrink-0 ${tierStyle.className}`}>
            {tier === '4' || tier === '5'
              ? 'Verified seller badge shown on your replies and storefront.'
              : 'Earn 4★ for a blue verified badge, or 5★ for gold.'}
          </p>
        )}
      </div>
      <Link href="/vendor/reviews" className="text-xs text-brand-teal dark:text-brand-orange underline mt-3 inline-block">
        View customer reviews
      </Link>
    </div>
  )
}
