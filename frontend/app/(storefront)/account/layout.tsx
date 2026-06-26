'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RouteGuard } from '@/components/layouts/RouteGuard'
import { CUSTOMER_ROLES } from '@/lib/constants/roles'

const links = [
  { to: '/account', label: 'Profile' },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/wishlist', label: 'Wishlist' },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <RouteGuard requiresAuth roles={CUSTOMER_ROLES}>
      <div className="page-container">
        <h1 className="section-title mb-6 sm:mb-8">My Account</h1>
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <nav className="md:w-48 shrink-0 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
            {links.map((link) => (
              <Link
                key={link.to}
                href={link.to}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium whitespace-nowrap rounded-lg transition-colors shrink-0 ${
                  pathname === link.to ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </RouteGuard>
  )
}
