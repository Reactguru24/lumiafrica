'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VendorLayout } from '@/components/layouts/VendorLayout'
import { useAuthStore } from '@/lib/stores/auth'

export default function VendorRootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isVendor = useAuthStore((s) => s.isVendor)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  useEffect(() => {
    if (!hasHydrated) refreshUser()
  }, [hasHydrated, refreshUser])

  useEffect(() => {
    if (hasHydrated && !isVendor) {
      router.replace(useAuthStore.getState().getDashboardRoute())
    }
  }, [hasHydrated, isVendor, router])

  // Don't render vendor content while checking auth state or if not vendor
  if (!hasHydrated || !isVendor) {
    return null
  }

  return <VendorLayout>{children}</VendorLayout>
}

