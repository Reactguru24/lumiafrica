'use client'

import { usePathname } from 'next/navigation'
import { AuthLayout } from '@/components/layouts/AuthLayout'

export default function AuthRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isVendorApplication = pathname === '/auth/apply-vendor'

  return <AuthLayout wide={isVendorApplication}>{children}</AuthLayout>
}
