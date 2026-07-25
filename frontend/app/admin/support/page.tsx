'use client'

import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useAuthStore } from '@/lib/stores/auth'
import Link from 'next/link'

export default function AdminSupportPage() {
  const auth = useAuthStore()

  return (
    <div className="page-width py-8 sm:py-12">
      <div className="max-w-5xl mx-auto space-y-6">
        <AdminPageHeader title="Support" subtitle="Manage support requests and platform help conversations." />

        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This area is reserved for administrators to review support tickets, escalate issues, and keep track of user requests.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/admin/support?status=open" className="rounded-2xl border border-gray-200 dark:border-gray-800 px-5 py-4 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800">
                Open requests
              </Link>
              <Link href="/admin/support?status=resolved" className="rounded-2xl border border-gray-200 dark:border-gray-800 px-5 py-4 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800">
                Resolved requests
              </Link>
            </div>
            <div className="rounded-3xl bg-gray-50 dark:bg-gray-950 p-5 border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Note: support ticket routing is not implemented here yet. Use this page as a placeholder for your admin support workflow and wire it to your ticketing or chat backend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
