'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  HomeIcon, UsersIcon, BuildingStorefrontIcon, CubeIcon, ShoppingCartIcon,
  Cog6ToothIcon, Bars3Icon, XMarkIcon, ArrowLeftOnRectangleIcon, SparklesIcon,
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
  { name: 'Settings', to: '/admin/settings', icon: Cog6ToothIcon },
  { name: 'My Account', to: '/admin/account', icon: UsersIcon },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const auth = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function logout() {
    await auth.logout()
    router.push('/')
  }

  return (
    <RouteGuard requiresAuth roles={['ADMIN']}>
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-gray-900 text-white transform transition-transform lg:translate-x-0 lg:static lg:sticky lg:top-0 lg:h-screen overflow-y-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
            <span className="font-display text-xl font-bold tracking-tight text-white">LumiAfrica Admin</span>
            <button className="lg:hidden text-white" onClick={() => setSidebarOpen(false)}><XMarkIcon className="w-5 h-5" /></button>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                href={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${pathname === item.to ? 'bg-white text-gray-900' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />{item.name}
              </Link>
            ))}
          </nav>
          <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900">
            <button className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 w-full" onClick={logout}>
              <ArrowLeftOnRectangleIcon className="w-5 h-5" /> Sign Out
            </button>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button className="lg:hidden p-2 shrink-0" onClick={() => setSidebarOpen(true)}><Bars3Icon className="w-6 h-6" /></button>
            <h1 className="text-sm sm:text-lg font-semibold truncate hidden sm:block">Platform Administration</h1>
            <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
              <AppearanceControls />
              <Link href="/admin/account" className="hidden sm:flex items-center gap-2">
                <UserAvatar fullName={auth.user?.fullName} avatar={auth.user?.avatar} size="sm" />
                <span className="text-xs sm:text-sm text-gray-500 max-w-[8rem] truncate">{auth.user?.fullName}</span>
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </RouteGuard>
  )
}
