import type { Product } from '@/lib/types'
import type { ProductCategoryValue } from '@/lib/constants/productCategories'

const CLOTHING_CATEGORIES = new Set<ProductCategoryValue>(['men', 'women', 'kids'])

const NON_CLOTHING_SUBCATEGORIES = new Set([
  'bags',
  'belts',
  'caps',
  'watches',
  'sunglasses',
  'sneakers',
  'boots',
  'sandals',
  'heels',
])

function normalizeToken(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase()
}

/** AI body-size fitting applies to apparel only (not footwear, belts, bags, etc.). */
export function supportsAISizeFitting(product: Pick<Product, 'category' | 'subcategory'> | null | undefined): boolean {
  if (!product) return false

  const category = normalizeToken(product.category)
  const subcategory = normalizeToken(product.subcategory)

  if (!CLOTHING_CATEGORIES.has(category as ProductCategoryValue)) {
    return false
  }

  if (subcategory && NON_CLOTHING_SUBCATEGORIES.has(subcategory)) {
    return false
  }

  return true
}
