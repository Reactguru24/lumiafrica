'use client'

import { MainLayout } from '@/components/layouts/MainLayout'
import { RouteGuard } from '@/components/layouts/RouteGuard'
import { VendorSellerShell } from '@/components/layouts/VendorSellerShell'

export function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requiresAuth roles={['VENDOR']}>
      <MainLayout>
        <VendorSellerShell>{children}</VendorSellerShell>
      </MainLayout>
    </RouteGuard>
  )
}
