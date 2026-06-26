'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { useAuthStore } from '@/lib/stores/auth'

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const getDashboardRoute = useAuthStore((s) => s.getDashboardRoute)

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    if (!isAdmin) {
      router.replace(getDashboardRoute())
    }
  }, [hasHydrated, isAuthenticated, isAdmin, router, pathname, getDashboardRoute])

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-500">
        Loading...
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return null
  }

  return <AdminLayout>{children}</AdminLayout>
}
