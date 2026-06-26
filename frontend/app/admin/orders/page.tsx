'use client'

import { useState, useMemo } from 'react'
import { MediaImage } from '@/components/common/MediaImage'
import { useAdminOrders, useAdminAnalytics } from '@/lib/stores/api'
import { formatCurrency, formatDate } from '@/lib/utils/storage'
import { unwrapPaginated, parseOrderItems } from '@/lib/utils/api'
import { analyticsField } from '@/lib/utils/admin'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { formatOrderShortId, ORDER_STATUSES } from '@/lib/utils/orders'
import type { Order, OrderStatus } from '@/lib/types'

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const limit = 15

  const { data: ordersData, loading } = useAdminOrders(page, limit)
  const { data: analyticsData } = useAdminAnalytics()

  const { items: orders, total, limit: pageLimit } = unwrapPaginated<Order>(ordersData)
  const analytics = (analyticsData as Record<string, unknown>) || {}

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = !searchQuery.trim() || order.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
      return matchesSearch && matchesStatus
    })
  }, [orders, searchQuery, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(total / pageLimit))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        subtitle="Monitor marketplace orders. Vendors update fulfillment status from their dashboard."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Orders</p>
          <p className="text-2xl font-bold">{analyticsField<number>(analytics, 'totalOrders', 'total_orders') ?? total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">On This Page</p>
          <p className="text-2xl font-bold text-yellow-600">{orders.filter((o) => o.status === 'pending').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Processing</p>
          <p className="text-2xl font-bold text-blue-600">{orders.filter((o) => o.status === 'processing' || o.status === 'shipped').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Platform Revenue</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(analyticsField<number>(analytics, 'totalRevenue', 'total_revenue') ?? 0)}</p>
        </div>
      </div>

      <div className="card p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by order ID on this page..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedStatus === 'all' ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'}`}
            >
              All
            </button>
            {ORDER_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${selectedStatus === status ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No orders match your filters on this page.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Order</th>
                    <th className="px-4 py-3 text-left font-semibold">Items</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => {
                    const items = parseOrderItems(order.items)
                    return (
                      <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold">#{formatOrderShortId(order.id)}</p>
                          <p className="text-xs text-gray-500">{order.paymentMethod}</p>
                        </td>
                        <td className="px-4 py-3">
                          {items.length > 0 ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="relative w-10 h-12 rounded border overflow-hidden shrink-0">
                                <MediaImage src={items[0].productImage} alt={items[0].productName} width={40} height={48} className="object-cover" />
                                {items[0].quantity > 1 && (
                                  <span className="absolute bottom-0 right-0 bg-gray-900 text-white text-xs px-1 rounded-tl">×{items[0].quantity}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate max-w-[10rem]">{items[0].productName}</p>
                                {items.length > 1 && (
                                  <p className="text-xs text-gray-500">+{items.length - 1} more item{items.length - 1 === 1 ? '' : 's'}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{order.createdAt ? formatDate(order.createdAt) : '—'}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(order.total)}</td>
                        <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                        <td className="px-4 py-3">
                          <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => setSelectedOrder(order)}>
                            View details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageLimit} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}
