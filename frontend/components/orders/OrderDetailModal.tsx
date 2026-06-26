'use client'

import { MediaImage } from '@/components/common/MediaImage'
import { Modal } from '@/components/common/Modal'
import { StatusBadge } from '@/components/common/StatusBadge'
import { OrderStatusButtons } from '@/components/orders/OrderStatusButtons'
import { parseOrderItems } from '@/lib/utils/api'
import { formatCurrency, formatDateTime } from '@/lib/utils/storage'
import { formatOrderShortId, formatShippingAddress } from '@/lib/utils/orders'
import type { Order, OrderStatus } from '@/lib/types'

interface OrderDetailModalProps {
  order: Order | null
  open: boolean
  onClose: () => void
  showStatusControls?: boolean
  onStatusChange?: (status: OrderStatus) => void
  updating?: boolean
}

export function OrderDetailModal({
  order,
  open,
  onClose,
  showStatusControls,
  onStatusChange,
  updating,
}: OrderDetailModalProps) {
  const detailItems = order ? parseOrderItems(order.items) : []

  return (
    <Modal
      open={open}
      title={order ? `Order #${formatOrderShortId(order.id)}` : 'Order details'}
      onClose={onClose}
      size="lg"
    >
      {order && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-sm text-gray-500">{order.paymentMethod}</span>
            <span className="text-sm font-semibold ml-auto">{formatCurrency(order.total)}</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Placed</p>
              <p>{order.createdAt ? formatDateTime(order.createdAt) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last updated</p>
              <p>{order.updatedAt ? formatDateTime(order.updatedAt) : '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Items ({detailItems.length})</p>
            <div className="space-y-3">
              {detailItems.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <MediaImage
                    src={item.productImage}
                    alt={item.productName}
                    width={48}
                    height={56}
                    transform={{ width: 96, aspect: '3:4' }}
                    className="w-12 h-14 object-cover rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity} · {item.size}{item.color ? ` · ${item.color}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-medium shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Delivery address</p>
            <p className="text-sm">{formatShippingAddress(order.shippingAddress) || order.deliveryAddress || '—'}</p>
            {order.deliveryZoneName && (
              <p className="text-xs text-gray-500 mt-1">Zone: {order.deliveryZoneName}</p>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal ?? 0)}</span></div>
            {(order.discount ?? 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                <span>−{formatCurrency(order.discount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatCurrency(order.shipping ?? 0)}</span></div>
            {(order.tax ?? 0) > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatCurrency(order.tax ?? 0)}</span></div>
            )}
            <div className="flex justify-between font-semibold pt-1 border-t border-gray-100 dark:border-gray-800">
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {showStatusControls && onStatusChange && (
            <OrderStatusButtons
              current={order.status}
              onChange={onStatusChange}
              disabled={updating}
              prefix="Mark "
              className="pt-2 border-t border-gray-200 dark:border-gray-800"
            />
          )}
        </div>
      )}
    </Modal>
  )
}
