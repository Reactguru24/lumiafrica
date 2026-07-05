'use client'

import { type ReactNode } from 'react'
import { useRouteGuard } from '@/lib/hooks/useRouteGuard'
import type { UserRole } from '@/lib/types'

interface RouteGuardProps {
  children: ReactNode
  requiresAuth?: boolean
  guest?: boolean
  roles?: UserRole[]
}

export function RouteGuard({ children, requiresAuth, guest, roles }: RouteGuardProps) {
  const ready = useRouteGuard({ requiresAuth, guest, roles })

  if (!ready) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>
  }

  return <>{children}</>
}
