import type { OrderStatus } from '@/lib/types'
import type { Address } from '@/lib/types'

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export function formatOrderShortId(id: string): string {
  return id.slice(-8).toUpperCase()
}

export function formatShippingAddress(shipping?: Partial<Address> | null): string {
  if (!shipping) return '—'
  const parts = [shipping.street, shipping.city, shipping.state, shipping.country, shipping.zipCode].filter(Boolean)
  const line = parts.join(', ')
  if (!line) return '—'
  return shipping.label ? `${shipping.label} · ${line}` : line
}

export function orderStatusActionOptions(current: OrderStatus) {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  }
  return (transitions[current] || [])
    .map((s) => ({
      id: s,
      label: s.charAt(0).toUpperCase() + s.slice(1),
      variant: s === 'cancelled' ? ('danger' as const) : ('default' as const),
    }))
}
