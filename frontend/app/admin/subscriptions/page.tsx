'use client'

import { useState } from 'react'
import { useAdminSubscriptions } from '@/lib/stores/api'
import { formatCurrency, formatDate } from '@/lib/utils/storage'
import { unwrapPaginated } from '@/lib/utils/api'
import { MediaImage } from '@/components/common/MediaImage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

type Filter = 'all' | 'active' | 'expired'

export default function AdminSubscriptionsPage() {
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
  const filterClass = (f: Filter) =>
    `px-3 py-1.5 text-sm rounded-lg ${filter === f ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`

  return (
    <div>
      <AdminPageHeader
        title="Vendor Subscriptions"
        subtitle="Monitor featured listing subscriptions and renewal status."
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        <button type="button" className={filterClass('all')} onClick={() => { setFilter('all'); setPage(1) }}>All</button>
        <button type="button" className={filterClass('active')} onClick={() => { setFilter('active'); setPage(1) }}>Active</button>
        <button type="button" className={filterClass('expired')} onClick={() => { setFilter('expired'); setPage(1) }}>Expired</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading subscriptions...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Total (filtered)</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Active on page</p>
              <p className="text-2xl font-bold text-green-600">{activeOnPage}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Page revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(pageRevenue)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Expiring ≤7 days</p>
              <p className="text-2xl font-bold text-yellow-600">{expiringSoon}</p>
            </div>
          </div>

          {subscriptions.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">No subscriptions match this filter.</div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const daysLeft = sub.expiresAt
                  ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : 0
                const isActive = Boolean(sub.active && daysLeft > 0)
                return (
                  <div key={sub.id} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {sub.vendorLogo && (
                        <MediaImage src={sub.vendorLogo} alt={sub.vendorName || ''} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                      )}
                      <div>
                        <h3 className="font-semibold text-sm">{sub.vendorName || 'Unknown vendor'}</h3>
                        <p className="text-xs text-gray-500 capitalize">{sub.planName || sub.plan}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="font-semibold">{formatCurrency(sub.amount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Started</p>
                        <p className="text-xs">{sub.startedAt ? formatDate(sub.startedAt) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expires</p>
                        <p className="text-xs">{sub.expiresAt ? formatDate(sub.expiresAt) : '—'}</p>
                      </div>
                      <div>
                        <StatusBadge status={isActive ? 'active' : 'expired'} />
                        {isActive && <p className="text-xs text-gray-500 mt-1">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageLimit} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
