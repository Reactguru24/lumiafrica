'use client'

import { ORDER_STATUSES } from '@/lib/utils/orders'
import type { OrderStatus } from '@/lib/types'

interface OrderStatusButtonsProps {
  current: OrderStatus
  onChange: (status: OrderStatus) => void
  disabled?: boolean
  prefix?: string
  className?: string
}

export function OrderStatusButtons({
  current,
  onChange,
  disabled,
  prefix = '',
  className = '',
}: OrderStatusButtonsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {ORDER_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          className={`px-3 py-1.5 text-xs border rounded capitalize ${current === status ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : ''}`}
          onClick={() => onChange(status)}
          disabled={disabled || current === status}
        >
          {prefix}{status}
        </button>
      ))}
    </div>
  )
}
