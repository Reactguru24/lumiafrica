'use client'

import { AdminLayout } from '@/components/layouts/AdminLayout'
import { RouteGuard } from '@/components/layouts/RouteGuard'

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requiresAuth roles={['ADMIN']}>
      <AdminLayout>{children}</AdminLayout>
    </RouteGuard>
  )
}
