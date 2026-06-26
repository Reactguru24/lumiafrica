'use client'

import { useState } from 'react'
import { useUserOrders } from '@/lib/stores/api'
import { formatCurrency, formatDateTime } from '@/lib/utils/storage'
import { parseOrderItems } from '@/lib/utils/api'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { OrderFirstItemPreview } from '@/components/orders/OrderFirstItemPreview'
import { usePagination } from '@/lib/hooks/usePagination'
import { Pagination } from '@/components/common/Pagination'
import { formatOrderShortId } from '@/lib/utils/orders'
import type { Order } from '@/lib/types'

export default function AccountOrdersPage() {
  const { data: ordersData, loading } = useUserOrders()
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'delivered' | 'cancelled'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const orders = ((ordersData as { items?: Order[] })?.items || ordersData || []) as Order[]
  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)
  const { page, totalPages, paginated, total, goTo, reset, pageSize } = usePagination(filtered, 8)

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['all', 'pending', 'processing', 'delivered', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`px-4 py-2 text-sm capitalize whitespace-nowrap rounded-full transition-colors ${filter === f ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`}
            onClick={() => { setFilter(f); reset() }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading orders...</div>
      ) : !filtered.length ? (
        <EmptyState title="No orders yet" description="Your order history will appear here." />
      ) : (
        <>
          <div className="space-y-4">
            {paginated.map((order) => {
              const items = parseOrderItems(order.items)
              return (
                <div key={order.id} className="card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-sm">Order #{formatOrderShortId(order.id)}</p>
                      <p className="text-xs text-gray-500">
                        Placed: {order.createdAt ? formatDateTime(order.createdAt) : 'Not set'}
                        {order.updatedAt ? ` · Updated: ${formatDateTime(order.updatedAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-semibold text-sm">{formatCurrency(order.total || 0)}</span>
                      {(order.discount ?? 0) > 0 && (
                        <span className="text-xs text-green-600">−{formatCurrency(order.discount ?? 0)}{order.couponCode ? ` ${order.couponCode}` : ''}</span>
                      )}
                      <StatusBadge status={order.status} />
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1.5 px-3"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View details
                      </button>
                    </div>
                  </div>
                  <OrderFirstItemPreview items={items} />
                </div>
              )
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={goTo} />
        </>
      )}

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}
