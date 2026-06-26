'use client'

import { MainLayout } from '@/components/layouts/MainLayout'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>
}
