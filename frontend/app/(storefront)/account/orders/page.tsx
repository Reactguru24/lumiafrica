'use client'

import { useState } from 'react'
import { useUserOrders } from '@/lib/stores/api'
import { formatDateTime } from '@/lib/utils/storage'
import { useFormatCurrency } from '@/lib/stores/currency'
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
  const formatPrice = useFormatCurrency()
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
            className={`px-4 py-2 text-sm capitalize whitespace-nowrap rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-teal dark:focus:ring-brand-orange ${filter === f ? 'bg-brand-teal text-white dark:bg-brand-orange' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            onClick={() => { setFilter(f); reset() }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading orders...</div>
      ) : !filtered.length ? (
        <EmptyState title="No orders yet" description="Your order history will appear here." />
      ) : (
        <>
          <div className="space-y-4">
            {paginated.map((order) => {
              const items = parseOrderItems(order.items)
              return (
                <div key={order.id} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">Order #{formatOrderShortId(order.id)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Placed: {order.createdAt ? formatDateTime(order.createdAt) : 'Not set'}
                        {order.updatedAt ? ` · Updated: ${formatDateTime(order.updatedAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{formatPrice(order.total || 0)}</span>
                      {(order.discount ?? 0) > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">−{formatPrice(order.discount ?? 0)}{order.couponCode ? ` ${order.couponCode}` : ''}</span>
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
