'use client'

import { useState } from 'react'
import { useAdminSubscriptions } from '@/lib/stores/api'
import { formatDate } from '@/lib/utils/storage'
import { useFormatCurrency } from '@/lib/stores/currency'
import { unwrapPaginated } from '@/lib/utils/api'
import { MediaImage } from '@/components/common/MediaImage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState } from '@/components/common/EmptyState'

type Filter = 'all' | 'active' | 'expired'

export default function AdminSubscriptionsPage() {
  const formatPrice = useFormatCurrency()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<Filter>('all')
  const limit = 20

  const activeParam = filter === 'active' ? true : filter === 'expired' ? false : undefined
  const { data: subsData, loading } = useAdminSubscriptions(page, limit, activeParam)

  const { items: subscriptions, total, limit: pageLimit } = unwrapPaginated<{
    id: string
    vendorName?: string
    vendorLogo?: string
    plan?: string
    planName?: string
    amount?: number
    startedAt?: string
    expiresAt?: string
    active?: boolean
  }>(subsData)

  const activeOnPage = subscriptions.filter((s) => s.active).length
  const pageRevenue = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0)
  const expiringSoon = subscriptions.filter((s) => {
    if (!s.active || !s.expiresAt) return false
    const days = (new Date(s.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 7
  }).length

  const totalPages = Math.max(1, Math.ceil(total / pageLimit))
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vendor Subscriptions"
        subtitle="Monitor featured listing subscriptions and renewal status."
      />

      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'expired'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`px-3 py-1.5 text-sm rounded-xl capitalize transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-teal dark:focus:ring-brand-orange ${
              filter === f
                ? 'bg-brand-teal text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            onClick={() => { setFilter(f); setPage(1) }}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Expired'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading subscriptions...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4 sm:p-6 animate-slide-up">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Total (filtered)</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white break-words leading-tight tabular-nums">{total}</p>
            </div>
            <div className="card p-4 sm:p-6 animate-slide-up">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Active on page</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400 break-words leading-tight tabular-nums">{activeOnPage}</p>
            </div>
            <div className="card p-4 sm:p-6 animate-slide-up">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Page revenue</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white break-words leading-tight tabular-nums">{formatPrice(pageRevenue)}</p>
            </div>
            <div className="card p-4 sm:p-6 animate-slide-up">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Expiring ≤7 days</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 break-words leading-tight tabular-nums">{expiringSoon}</p>
            </div>
          </div>

          {subscriptions.length === 0 ? (
            <EmptyState title="No subscriptions" description="No subscriptions match this filter." />
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const daysLeft = sub.expiresAt
                  ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : 0
                const isActive = Boolean(sub.active && daysLeft > 0)
                return (
                  <div
                    key={sub.id}
                    className={`card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all duration-200 ${
                      isActive ? 'border-l-4 border-l-brand-teal' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {sub.vendorLogo && (
                        <MediaImage src={sub.vendorLogo} alt={sub.vendorName || ''} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                      )}
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{sub.vendorName || 'Unknown vendor'}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{sub.planName || sub.plan}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{formatPrice(sub.amount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Started</p>
                        <p className="text-xs text-gray-900 dark:text-gray-300">{sub.startedAt ? formatDate(sub.startedAt) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Expires</p>
                        <p className="text-xs text-gray-900 dark:text-gray-300">{sub.expiresAt ? formatDate(sub.expiresAt) : '—'}</p>
                      </div>
                      <div>
                        <StatusBadge status={isActive ? 'active' : 'expired'} />
                        {isActive && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6">
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageLimit} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  )
}
