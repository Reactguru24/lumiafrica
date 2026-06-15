'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
import { StatusBadge } from '@/components/common/StatusBadge'

export default function ApplicationSubmittedPage() {
  const router = useRouter()
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isApplicant = useAuthStore((s) => s.isApplicant)
  const role = useAuthStore((s) => s.role)
  const pendingApplication = useAuthStore((s) => s.pendingVendorApplication)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  useEffect(() => {
    if (hasHydrated) refreshUser()
  }, [hasHydrated, refreshUser])

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/application-submitted')
      return
    }
    if (isAuthenticated && !isApplicant) {
      router.replace(role === 'VENDOR' ? '/vendor' : '/account')
    }
  }, [hasHydrated, isAuthenticated, isApplicant, role, router])

  if (!hasHydrated || !isAuthenticated || !isApplicant) {
    return (
      <div className="page-container py-16 text-center text-gray-500">
        Loading application status…
      </div>
    )
  }

  return (
    <div className="page-container py-12 max-w-lg mx-auto">
      <div className="card p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          <ClockIcon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Application Under Review</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your vendor application has been submitted. We will review it and notify you at your business email.
          You can keep browsing and shopping while you wait.
        </p>

        {pendingApplication && (
          <div className="text-left rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={pendingApplication.status} />
              <span className="text-sm text-gray-500">
                Submitted {new Date(pendingApplication.submittedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-medium">{pendingApplication.storeName}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <EnvelopeIcon className="h-4 w-4 shrink-0" />
              {pendingApplication.businessEmail}
            </p>
            <p className="text-xs text-gray-500 pt-1">
              This business email cannot be used to register, sign in, or reset a password until your application is decided.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">Continue Shopping</Link>
          <Link href="/account" className="btn-secondary">My Account</Link>
        </div>
      </div>
    </div>
  )
}
