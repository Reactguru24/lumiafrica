'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import type { UserRole } from '@/lib/types'

interface RouteGuardOptions {
  requiresAuth?: boolean
  guest?: boolean
  roles?: UserRole[]
}

export function useRouteGuard({ requiresAuth, guest, roles }: RouteGuardOptions) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const logout = useAuthStore((s) => s.logout)
  const getDashboardRoute = useAuthStore((s) => s.getDashboardRoute)
  const canAccessRoute = useAuthStore((s) => s.canAccessRoute)
  const role = useAuthStore((s) => s.role)
  const rolesKey = roles?.join(',') ?? ''

  useEffect(() => {
    if (!hasHydrated) refreshUser()
  }, [hasHydrated, refreshUser])

  useEffect(() => {
    if (user?.disabled) {
      logout()
      router.replace('/auth/login?disabled=true')
      return
    }

    if (guest && isAuthenticated) {
      router.replace(getDashboardRoute())
      return
    }

    if (requiresAuth && !isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    if (rolesKey && isAuthenticated && !canAccessRoute(rolesKey.split(',') as UserRole[])) {
      // Redirect to user's dashboard instead of unauthorized page
      // This ensures vendors trying to access customer pages go to /vendor, etc.
      router.replace(getDashboardRoute())
    }
  }, [user, isAuthenticated, guest, requiresAuth, rolesKey, role, router, logout, getDashboardRoute, canAccessRoute])
}
