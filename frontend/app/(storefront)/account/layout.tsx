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
          <nav className="md:w-48 shrink-0">
            <div className="account-nav">
              {links.map((link) => (
                <Link
                  key={link.to}
                  href={link.to}
                  className={`account-nav-link ${pathname === link.to ? 'account-nav-link-active' : 'account-nav-link-inactive'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </RouteGuard>
  )
}
