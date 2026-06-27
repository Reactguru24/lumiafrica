'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MediaImage } from '@/components/common/MediaImage'
import { VendorModeToggle } from '@/components/vendor/VendorModeToggle'
import { VendorVerificationBadge } from '@/components/vendor/VendorVerificationBadge'
import { useVendorProfile, useVendorSubscription } from '@/lib/stores/api'
import { isFeaturedListingActive } from '@/lib/utils/subscriptions'
import type { Vendor } from '@/lib/types'

const sellerNavItems = [
  { name: 'Dashboard', to: '/vendor' },
  { name: 'My Account', to: '/vendor/account' },
  { name: 'Products', to: '/vendor/products' },
  { name: 'Orders', to: '/vendor/orders' },
  { name: 'Inventory', to: '/vendor/inventory' },
  { name: 'Analytics', to: '/vendor/analytics' },
  { name: 'Reviews', to: '/vendor/reviews' },
  { name: 'Store Profile', to: '/vendor/profile' },
  { name: 'Featured Listing', to: '/vendor/subscription' },
]

function SidebarStoreCard({ vendor, featured }: { vendor: Vendor | null; featured: boolean }) {
  if (!vendor) {
    return (
      <div className="mb-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 animate-pulse">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  return (
    <Link
      href="/vendor/profile"
      className="mb-4 flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
    >
      <MediaImage
        src={vendor.logo}
        alt={vendor.storeName}
        width={40}
        height={40}
        transform={{ width: 80 }}
        className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium truncate">{vendor.storeName}</p>
          <VendorVerificationBadge badge={vendor.verificationBadge} rating={vendor.rating} className="w-3.5 h-3.5" />
        </div>
        <p className="text-xs text-gray-500 truncate">
          {featured ? 'Featured listing active' : vendor.rating > 0 ? `${vendor.rating.toFixed(1)}★ store rating` : 'Manage your store'}
        </p>
      </div>
    </Link>
  )
}

export function VendorSellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { data: vendorProfile } = useVendorProfile()
  const { data: subscriptionData } = useVendorSubscription()

  const vendor = vendorProfile as Vendor | null
  const featured = isFeaturedListingActive(subscriptionData as Parameters<typeof isFeaturedListingActive>[0])

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <p className="micro-label mb-1">Seller Center</p>
          <h1 className="section-title">Manage your store</h1>
        </div>
        <VendorModeToggle />
      </div>
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <aside className="md:w-52 shrink-0 md:sticky md:top-20 md:self-start md:max-h-[calc(100dvh-5.5rem)] flex flex-col overflow-hidden">
          <SidebarStoreCard vendor={vendor} featured={featured} />
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0 hide-scrollbar md:hide-scrollbar">
            {sellerNavItems.map((item) => (
              <Link
                key={item.to}
                href={item.to}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium whitespace-nowrap rounded-lg transition-colors shrink-0 ${
                  pathname === item.to
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
