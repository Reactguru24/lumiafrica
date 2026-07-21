'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  HomeIcon, UsersIcon, BuildingStorefrontIcon, CubeIcon, ShoppingCartIcon,
  Cog6ToothIcon, Bars3Icon, XMarkIcon, ArrowLeftOnRectangleIcon, SparklesIcon,
  TicketIcon, PhotoIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { AppearanceControls } from '@/components/common/AppearanceControls'
import { UserAvatar } from '@/components/account/UserAvatar'
import { useAuthStore } from '@/lib/stores/auth'
import { RouteGuard } from './RouteGuard'

const navItems = [
  { name: 'Dashboard', to: '/admin', icon: HomeIcon },
  { name: 'Users', to: '/admin/users', icon: UsersIcon },
  { name: 'Vendors', to: '/admin/vendors', icon: BuildingStorefrontIcon },
  { name: 'Subscriptions', to: '/admin/subscriptions', icon: SparklesIcon },
  { name: 'Products', to: '/admin/products', icon: CubeIcon },
  { name: 'Orders', to: '/admin/orders', icon: ShoppingCartIcon },
  { name: 'Shipping Lanes', to: '/admin/delivery-zones', icon: TruckIcon },
  { name: 'Commerce', to: '/admin/commerce', icon: TicketIcon },
  { name: 'Homepage', to: '/admin/homepage', icon: PhotoIcon },
  { name: 'Settings', to: '/admin/settings', icon: Cog6ToothIcon },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const auth = useAuthStore()
  // On mobile: controlled by sidebarOpen. On desktop: controlled by desktopCollapsed.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  async function logout() {
    await auth.logout()
    router.push('/')
  }

  const activeNav = navItems.find((item) => item.to === pathname)

  return (
    <RouteGuard requiresAuth roles={['ADMIN']}>
      <div className="dashboard-shell">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 h-dvh flex flex-col
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          text-gray-900 dark:text-white
          transform transition-all duration-200
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${desktopCollapsed ? 'lg:w-16' : 'lg:w-64'}
        `}>
          {/* Sidebar header */}
          <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            {!desktopCollapsed && (
              <span className="font-display text-lg font-bold tracking-tight truncate">Lumi Admin</span>
            )}
            {/* Mobile close */}
            <button
              className="lg:hidden p-1 ml-auto text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            {/* Desktop collapse toggle */}
            <button
              className="hidden lg:flex p-1 ml-auto text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setDesktopCollapsed((v) => !v)}
              aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {desktopCollapsed ? <Bars3Icon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.to || (item.to !== '/admin' && pathname.startsWith(item.to + '/'))
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  title={desktopCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors
                    ${active
                      ? 'bg-brand-teal text-white dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }
                    ${desktopCollapsed ? 'lg:justify-center' : ''}
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!desktopCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              )
            })}
            <Link
              href="/admin/account"
              title={desktopCollapsed ? 'My Account' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors
                ${pathname === '/admin/account'
                  ? 'bg-brand-teal text-white dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
                ${desktopCollapsed ? 'lg:justify-center' : ''}
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <UsersIcon className="w-5 h-5 shrink-0" />
              {!desktopCollapsed && <span>My Account</span>}
            </Link>
          </nav>

          {/* Sign out */}
          <div className="shrink-0 p-2 border-t border-gray-200 dark:border-gray-800">
            <button
              title={desktopCollapsed ? 'Sign Out' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg w-full transition-colors
                ${desktopCollapsed ? 'lg:justify-center' : ''}
              `}
              onClick={logout}
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 shrink-0" />
              {!desktopCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content — offset by sidebar width */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${desktopCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile open button */}
            <button
              className="lg:hidden p-2 shrink-0 -ml-1 text-gray-500 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h1 className="flex-1 text-sm sm:text-lg font-semibold truncate">
              {activeNav?.name ?? 'Platform Administration'}
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <AppearanceControls />
              <Link href="/admin/account" className="hidden sm:flex items-center gap-2">
                <UserAvatar fullName={auth.user?.fullName} avatar={auth.user?.avatar} size="sm" />
                <span className="text-xs sm:text-sm text-gray-500 max-w-[8rem] truncate">{auth.user?.fullName}</span>
              </Link>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden overscroll-contain">{children}</main>
        </div>
      </div>
    </RouteGuard>
  )
}
