import type { OrderItem } from '@/lib/types'

export function unwrapItems<T>(data: unknown): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data as T[]
  if (typeof data === 'object' && data !== null && 'items' in data) {
    const items = (data as { items?: T[] }).items
    return Array.isArray(items) ? items : []
  }
  return []
}

export function parseOrderItems(items: unknown): OrderItem[] {
  if (!items) return []
  if (Array.isArray(items)) {
    if (items.length > 0 && typeof items[0] === 'string') {
      try {
        const parsed = JSON.parse(items[0] as string)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return items as OrderItem[]
  }
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/** Resolve relative upload paths from the API to absolute URLs for display. */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '/placeholder.png'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`
}
