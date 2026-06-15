'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'

/** Redirect authenticated users away from guest-only pages (login, register). */
export function useGuestRedirect() {
  const router = useRouter()
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const getDashboardRoute = useAuthStore((s) => s.getDashboardRoute)

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace(getDashboardRoute())
    }
  }, [hasHydrated, isAuthenticated, router, getDashboardRoute])
}
