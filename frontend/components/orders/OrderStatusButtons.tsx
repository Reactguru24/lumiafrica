'use client'

import { orderStatusActionOptions } from '@/lib/utils/orders'
import type { OrderStatus } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'

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
  const actions = orderStatusActionOptions(current)

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Current</span>
        <StatusBadge status={current} />
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map(({ id, label, variant }) => (
            <button
              key={id}
              type="button"
              className={`px-3 py-1.5 text-xs border rounded capitalize ${variant === 'danger' ? 'border-red-300 text-red-700 hover:bg-red-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              onClick={() => onChange(id)}
              disabled={disabled}
            >
              {prefix}{label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
