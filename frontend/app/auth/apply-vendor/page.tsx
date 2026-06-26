'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { VendorApplicationForm } from '@/components/vendor/VendorApplicationForm'

export default function ApplyVendorPage() {
  const router = useRouter()
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isVendor = useAuthStore((s) => s.isVendor)
  const isAdmin = useAuthStore((s) => s.isAdmin)

  useEffect(() => {
    if (!hasHydrated) return
    if (isVendor) router.replace('/vendor')
    if (isAdmin) router.replace('/admin')
  }, [hasHydrated, isVendor, isAdmin, router])

  if (!hasHydrated) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  if (isVendor || isAdmin) {
    return null
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-2">Apply to Sell on Lumi</h1>
      <p className="text-gray-500 mb-8">
        Submit your application. After review, you will receive an email with a link to set your password and log in as a vendor.
      </p>
      <VendorApplicationForm />
      <p className="text-center text-sm text-gray-500 mt-8">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-gray-900 dark:text-white font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
