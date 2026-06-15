'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layouts/MainLayout'
import { useAuthStore } from '@/lib/stores/auth'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isVendor = useAuthStore((s) => s.isVendor)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  useEffect(() => {
    if (!hasHydrated) refreshUser()
  }, [hasHydrated, refreshUser])

  useEffect(() => {
    if (hasHydrated && isVendor) {
      router.replace('/vendor')
    }
  }, [hasHydrated, isVendor, router])

  // Don't render storefront content while checking auth state or if vendor
  if (!hasHydrated || isVendor) {
    return null
  }

  return <MainLayout>{children}</MainLayout>
}
