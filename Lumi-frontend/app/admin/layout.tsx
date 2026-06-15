'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { useAuthStore } from '@/lib/stores/auth'

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  useEffect(() => {
    if (!hasHydrated) refreshUser()
  }, [hasHydrated, refreshUser])

  useEffect(() => {
    if (hasHydrated && !isAdmin) {
      router.replace(useAuthStore.getState().getDashboardRoute())

    }
  }, [hasHydrated, isAdmin, router])

  // Don't render admin content while checking auth state or if not admin
  if (!hasHydrated || !isAdmin) {
    return null
  }

  return <AdminLayout>{children}</AdminLayout>
}

