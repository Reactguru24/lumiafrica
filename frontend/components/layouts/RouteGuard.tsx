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
  useRouteGuard({ requiresAuth, guest, roles })
  return <>{children}</>
}
