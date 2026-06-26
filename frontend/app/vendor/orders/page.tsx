'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useVendorOrders, useUpdateVendorOrderStatus } from '@/lib/stores/api'
import { formatCurrency, formatDateTime } from '@/lib/utils/storage'
import { unwrapItems, parseOrderItems } from '@/lib/utils/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { OrderFirstItemPreview } from '@/components/orders/OrderFirstItemPreview'
import { OrderStatusButtons } from '@/components/orders/OrderStatusButtons'
import { usePagination } from '@/lib/hooks/usePagination'
import { formatOrderShortId } from '@/lib/utils/orders'
import type { Order, OrderStatus } from '@/lib/types'

export default function VendorOrdersPage() {
  const { data: ordersAPI, loading, error, refetch } = useVendorOrders()
  const { mutate: updateOrderStatus, loading: updating } = useUpdateVendorOrderStatus()
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const orders = unwrapItems<Order>(ordersAPI)
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = filter === 'all' || order.status === filter
    const query = searchQuery.trim().toLowerCase()
    if (!query) return matchesStatus
    const items = parseOrderItems(order.items)
    const matchesSearch = [
      order.id,
      order.status,
      order.paymentMethod,
      ...items.map((item) => item.productName),
    ].some((value) => String(value).toLowerCase().includes(query))
    return matchesStatus && matchesSearch
  })
  const { page, totalPages, paginated, total, goTo, reset, pageSize } = usePagination(filteredOrders, 8)

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    if (status === 'cancelled' && !confirm('Cancel this order?')) return
    try {
      await updateOrderStatus({ orderId, status })
      toast.success(`Order marked as ${status}`)
      refetch()
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status } : null))
      }
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to update order status.'))
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <p className="text-sm text-gray-500">Manage customer orders containing your products.</p>
        <input
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); reset() }}
          placeholder="Search orders or products..."
          className="input-field w-full sm:w-72"
        />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((f) => (
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
      ) : error ? (
        <div className="text-center py-8 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load orders.')}</div>
      ) : !orders.length ? (
        <EmptyState title="No orders yet" description="Orders containing your products will appear here." />
      ) : !filteredOrders.length ? (
        <EmptyState title="No matching orders" description="Try a different filter or search term." />
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
                        {order.paymentMethod ? ` · ${order.paymentMethod}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-semibold text-sm">{formatCurrency(order.total || 0)}</span>
                      {(order.discount ?? 0) > 0 && (
                        <span className="text-xs text-green-600">−{formatCurrency(order.discount ?? 0)}</span>
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
                  <OrderFirstItemPreview items={items} showPrice showMoreHint imageClassName="w-10 h-12 object-cover shrink-0" />
                  <OrderStatusButtons
                    current={order.status}
                    onChange={(status) => handleStatusChange(order.id, status)}
                    disabled={updating}
                    className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800"
                  />
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
        showStatusControls
        onStatusChange={(status) => selectedOrder && handleStatusChange(selectedOrder.id, status)}
        updating={updating}
      />
    </div>
  )
}
