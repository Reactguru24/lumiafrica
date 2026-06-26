'use client'

import { VendorLayout } from '@/components/layouts/VendorLayout'

export default function VendorRootLayout({ children }: { children: React.ReactNode }) {
  return <VendorLayout>{children}</VendorLayout>
}
