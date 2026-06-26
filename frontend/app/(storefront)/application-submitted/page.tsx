'use client'

import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useVendorApplicationStatus } from '@/lib/stores/api'
import type { VendorApplication } from '@/lib/types'

function ApplicationSubmittedContent() {
  const searchParams = useSearchParams()
  const email = useMemo(() => (searchParams.get('email') || '').trim(), [searchParams])
  const { data, loading } = useVendorApplicationStatus(email, { enabled: !!email })
  const application = data as VendorApplication | null

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

        {!email && (
          <div className="text-left rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Missing <strong>email</strong> in the URL. After submitting an application, you should be redirected here automatically.
            </p>
          </div>
        )}

        {loading && email && (
          <div className="text-left rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6 text-sm text-gray-500">
            Loading application status…
          </div>
        )}

        {application && (
          <div className="text-left rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={application.status} />
              <span className="text-sm text-gray-500">
                Submitted {new Date(application.submittedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-medium">{application.storeName}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <EnvelopeIcon className="h-4 w-4 shrink-0" />
              {application.businessEmail}
            </p>
            <p className="text-xs text-gray-500 pt-1">
              This business email cannot be used to register, sign in, or reset a password until your application is decided.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">Continue Shopping</Link>
          <Link href="/auth/login" className="btn-secondary">Sign in</Link>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationSubmittedPage() {
  return (
    <Suspense fallback={<div className="page-container py-12 text-center text-sm text-gray-500">Loading…</div>}>
      <ApplicationSubmittedContent />
    </Suspense>
  )
}
