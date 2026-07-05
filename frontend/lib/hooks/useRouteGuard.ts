'use client'

import { useEffect, useMemo } from 'react'
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
  const requiredRoles = useMemo(
    () => (rolesKey ? rolesKey.split(',') as UserRole[] : []),
    [rolesKey],
  )

  useEffect(() => {
    if (!hasHydrated) refreshUser()
  }, [hasHydrated, refreshUser])

  useEffect(() => {
    if (!hasHydrated) return

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

    if (requiredRoles.length > 0 && isAuthenticated && !canAccessRoute(requiredRoles)) {
      router.replace(getDashboardRoute())
    }
  }, [hasHydrated, user, isAuthenticated, guest, requiresAuth, requiredRoles, role, router, logout, getDashboardRoute, canAccessRoute])

  const ready = useMemo(() => {
    if (!hasHydrated) return false
    if (user?.disabled) return false
    if (guest && isAuthenticated) return false
    if (requiresAuth && !isAuthenticated) return false
    if (requiredRoles.length > 0 && (!isAuthenticated || !canAccessRoute(requiredRoles))) return false
    return true
  }, [hasHydrated, user, guest, isAuthenticated, requiresAuth, requiredRoles, canAccessRoute])

  return ready
}
