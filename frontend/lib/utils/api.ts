import type { OrderItem } from '@/lib/types'
import { isCloudinaryUrl, optimizeCloudinaryUrl, type MediaTransform } from '@/lib/utils/cloudinary'

export function unwrapItems<T>(data: unknown): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data as T[]
  if (typeof data === 'object' && data !== null && 'items' in data) {
    const items = (data as { items?: T[] }).items
    return Array.isArray(items) ? items : []
  }
  return []
}

export function unwrapPaginated<T>(data: unknown): { items: T[]; total: number; page: number; limit: number } {
  if (!data || typeof data !== 'object') {
    return { items: [], total: 0, page: 1, limit: 10 }
  }
  const d = data as { items?: T[]; total?: number; page?: number; limit?: number }
  return {
    items: Array.isArray(d.items) ? d.items : [],
    total: d.total ?? 0,
    page: d.page ?? 1,
    limit: d.limit ?? 10,
  }
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

function isLocalDevApi(): boolean {
  return API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1')
}

/** Paths stored before Cloudinary — files only persist on local dev disk. */
export function isLegacyLocalUpload(url?: string | null): boolean {
  if (!url) return false
  const trimmed = url.trim()
  return trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')
}

/** Resolve relative upload paths from the API to absolute URLs for display. */
export function resolveMediaUrl(url?: string | null, transform?: MediaTransform): string {
  if (!url) return '/placeholder.png'
  if (isLegacyLocalUpload(url) && !isLocalDevApi()) {
    return '/placeholder.png'
  }
  const resolved = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`

  if (isCloudinaryUrl(resolved)) {
    return optimizeCloudinaryUrl(resolved, transform)
  }
  return resolved
}
