'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type VendorModeToggleProps = {
  className?: string
  compact?: boolean
}

/** Switch between storefront browsing and seller dashboard without changing role. */
export function VendorModeToggle({ className = '', compact = false }: VendorModeToggleProps) {
  const pathname = usePathname()
  const sellerMode = pathname.startsWith('/vendor')

  const shopClass = (active: boolean) =>
    `px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
      active
        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
    }`

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-0.5 ${className}`}
      role="group"
      aria-label="Switch between shop and seller dashboard"
    >
      <Link href="/products" className={shopClass(!sellerMode)}>
        {compact ? 'Shop' : 'Browse Shop'}
      </Link>
      <Link href="/vendor" className={shopClass(sellerMode)}>
        {compact ? 'Sell' : 'Seller Dashboard'}
      </Link>
    </div>
  )
}
