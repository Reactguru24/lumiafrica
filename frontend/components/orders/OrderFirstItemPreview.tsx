'use client'

import { MediaImage } from '@/components/common/MediaImage'
import { formatCurrency } from '@/lib/utils/storage'
import type { OrderItem } from '@/lib/types'

interface OrderFirstItemPreviewProps {
  items: OrderItem[]
  showPrice?: boolean
  showMoreHint?: boolean
  imageClassName?: string
}

export function OrderFirstItemPreview({
  items,
  showPrice = false,
  showMoreHint = true,
  imageClassName = 'w-12 h-16 object-cover shrink-0 rounded-sm',
}: OrderFirstItemPreviewProps) {
  if (!items.length) return null
  const item = items[0]

  return (
    <div className="flex items-center gap-3 text-sm">
      <MediaImage
        src={item.productImage}
        alt={item.productName}
        width={48}
        height={64}
        transform={{ width: 96, aspect: '3:4' }}
        className={imageClassName}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.productName}</p>
        <p className="text-xs text-gray-500">
          Qty: {item.quantity} · {item.size}{item.color ? ` · ${item.color}` : ''}
        </p>
        {showMoreHint && items.length > 1 && (
          <p className="text-xs text-gray-500 mt-0.5">
            +{items.length - 1} more item{items.length - 1 === 1 ? '' : 's'}
            {showPrice ? '' : ' — view details for full order'}
          </p>
        )}
      </div>
      {showPrice && <span className="font-medium shrink-0">{formatCurrency(item.price * item.quantity)}</span>}
    </div>
  )
}
