import type { Product } from '@/lib/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidProductId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id !== 'undefined' && UUID_RE.test(id)
}

export function sanitizeWishlistIds(ids: string[]): string[] {
  return [...new Set(ids.filter(isValidProductId))]
}

/** Unwrap a product from GET /products/:id (nested) or a flat list item. */
export function parseProductDetail(data: unknown): Product | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const nested = record.product
  if (nested && typeof nested === 'object' && isValidProductId((nested as Product).id)) {
    return nested as Product
  }
  if (isValidProductId(record.id as string)) {
    return record as unknown as Product
  }
  return null
}
