'use client'

import Image from 'next/image'
import { toast } from 'sonner'
import { useVendorOrders, useUpdateVendorOrderStatus } from '@/lib/api/hooks'
import { formatCurrency, formatDate } from '@/lib/utils/storage'
import { unwrapItems, parseOrderItems } from '@/lib/utils/api'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import type { Order, OrderStatus } from '@/lib/types'

const statuses: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function VendorOrdersPage() {
  const { data: ordersAPI, loading, error, refetch } = useVendorOrders()
  const { mutate: updateOrderStatus, loading: updating } = useUpdateVendorOrderStatus()

  const orders = unwrapItems<Order>(ordersAPI)
  const { page, totalPages, paginated, total, goTo, pageSize } = usePagination(orders, 8)

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    if (status === 'cancelled' && !confirm('Cancel this order?')) return
    try {
      await updateOrderStatus({ orderId, status })
      toast.success(`Order marked as ${status}`)
      refetch()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to update order status.'))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Orders</h1>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading orders...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load orders.')}</div>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No orders yet. Orders containing your products will appear here.</p>
      ) : (
        <>
          <div className="space-y-4">
            {paginated.map((order) => {
              const items = parseOrderItems(order.items)
              return (
                <div key={order.id} className="card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-sm">Order #{order.id.slice(-8)}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)} · {order.paymentMethod}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-sm">{formatCurrency(order.total)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={`${item.productId}-${idx}`} className="flex items-center gap-3 text-sm">
                        <Image src={item.productImage || '/placeholder.png'} alt={item.productName} width={40} height={48} className="w-10 h-12 object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{item.productName}</p>
                          <p className="text-gray-500">Qty: {item.quantity} · {item.size} · {item.color}</p>
                        </div>
                        <span className="font-medium shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 truncate">Deliver to: {order.deliveryAddress}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-gray-500 w-full sm:w-auto sm:mr-auto">Update status:</span>
                    {statuses.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`px-2 py-1 text-xs border capitalize shrink-0 ${order.status === s ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : ''}`}
                        onClick={() => handleStatusChange(order.id, s)}
                        disabled={updating || order.status === s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {total > pageSize && <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={goTo} />}
        </>
      )}
    </div>
  )
}
