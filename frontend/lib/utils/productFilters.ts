import type { ProductFilters, Gender, Vendor } from '@/lib/types'

type SearchParams = Record<string, string | string[] | undefined>

const CATEGORY_LABELS: Record<string, string> = {
  men: 'Men',
  women: 'Women',
  kids: 'Kids',
  accessories: 'Accessories',
  footwear: 'Footwear',
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  't-shirts': 'T-Shirts',
  shirts: 'Shirts',
  hoodies: 'Hoodies',
  jackets: 'Jackets',
  jeans: 'Jeans',
  trousers: 'Trousers',
  suits: 'Suits',
  dresses: 'Dresses',
  tops: 'Tops',
  blouses: 'Blouses',
  skirts: 'Skirts',
  boys: 'Boys',
  girls: 'Girls',
  'baby-wear': 'Baby Wear',
  bags: 'Bags',
  belts: 'Belts',
  caps: 'Caps',
  watches: 'Watches',
  sunglasses: 'Sunglasses',
  sneakers: 'Sneakers',
  boots: 'Boots',
  sandals: 'Sandals',
  heels: 'Heels',
}

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
}

export function subcategoryLabel(slug: string): string {
  return SUBCATEGORY_LABELS[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
}

function getParam(query: SearchParams, key: string): string | undefined {
  const v = query[key]
  if (Array.isArray(v)) return v[0]
  return v
}

export function filtersEqual(a: ProductFilters, b: ProductFilters): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof ProductFilters>
  for (const key of keys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

export function filtersFromQuery(query: SearchParams): ProductFilters {
  const bool = (key: string) => getParam(query, key) === 'true'
  const num = (key: string) => {
    const v = getParam(query, key)
    return v ? Number(v) : undefined
  }
  const str = (key: string) => getParam(query, key) || undefined

  return {
    search: str('search') || '',
    category: str('category') || '',
    subcategory: str('subcategory') || '',
    gender: str('gender') as Gender | undefined,
    brand: str('brand') || '',
    vendorId: str('vendorId') || '',
    size: str('size') || '',
    color: str('color') || '',
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    minRating: num('minRating'),
    featured: bool('featured') || undefined,
    trending: bool('trending') || undefined,
    bestseller: bool('bestseller') || undefined,
    newArrival: bool('newArrival') || undefined,
    onSale: bool('onSale') || undefined,
    sort: (str('sort') as ProductFilters['sort']) || 'newest',
  }
}

function applyFilterFields(filters: ProductFilters, target: Record<string, string>, options?: { forAPI?: boolean }) {
  const search = filters.q || filters.search
  if (search) {
    if (options?.forAPI) {
      target.q = search
      target.search = search
    } else {
      target.search = search
    }
  }
  if (filters.category) target.category = filters.category
  if (filters.subcategory) target.subcategory = filters.subcategory
  if (filters.gender) target.gender = filters.gender
  if (filters.brand) target.brand = filters.brand
  if (filters.vendorId) target.vendorId = filters.vendorId
  if (filters.size) target.size = filters.size
  if (filters.color) target.color = filters.color
  if (filters.minPrice !== undefined) target.minPrice = String(filters.minPrice)
  if (filters.maxPrice !== undefined) target.maxPrice = String(filters.maxPrice)
  if (filters.minRating !== undefined) target.minRating = String(filters.minRating)
  if (filters.featured) target.featured = 'true'
  if (filters.trending) target.trending = 'true'
  if (filters.bestseller) target.bestseller = 'true'
  if (filters.newArrival) {
    target.newArrival = 'true'
    target.sort = 'newest'
  }
  if (filters.onSale) target.onSale = 'true'
  if (!filters.newArrival && filters.sort && filters.sort !== 'newest') target.sort = filters.sort
}

export function queryFromFilters(filters: ProductFilters, page?: number): Record<string, string> {
  const query: Record<string, string> = {}
  applyFilterFields(filters, query)
  if (page && page > 1) query.page = String(page)
  return query
}

/** Maps storefront filter state to GET /products query params. */
export function filtersToAPIParams(
  filters: ProductFilters,
  options?: { page?: number; limit?: number },
): Record<string, string> {
  const params: Record<string, string> = {}
  applyFilterFields(filters, params, { forAPI: true })
  params.page = String(options?.page ?? filters.page ?? 1)
  params.limit = String(options?.limit ?? filters.limit ?? 12)
  return params
}

export function mergeFilterPatch(base: ProductFilters, patch: Partial<ProductFilters>): ProductFilters {
  const next: ProductFilters = { ...base, ...patch }
  for (const key of Object.keys(patch) as (keyof ProductFilters)[]) {
    const value = patch[key]
    if (value === undefined || value === '' || value === false) {
      delete next[key]
    }
  }
  return next
}

export type ActiveFilterTag = { key: keyof ProductFilters; label: string }

export function activeFilterTags(filters: ProductFilters, vendors: Vendor[] = []): ActiveFilterTag[] {
  const tags: ActiveFilterTag[] = []
  if (filters.category) tags.push({ key: 'category', label: categoryLabel(filters.category) })
  if (filters.subcategory) tags.push({ key: 'subcategory', label: subcategoryLabel(filters.subcategory) })
  if (filters.gender) tags.push({ key: 'gender', label: filters.gender.charAt(0).toUpperCase() + filters.gender.slice(1) })
  if (filters.brand) tags.push({ key: 'brand', label: filters.brand })
  if (filters.size) tags.push({ key: 'size', label: `Size: ${filters.size}` })
  if (filters.color) tags.push({ key: 'color', label: filters.color })
  if (filters.vendorId) {
    const vendor = vendors.find((v) => v.id === filters.vendorId)
    tags.push({ key: 'vendorId', label: vendor?.storeName || 'Vendor' })
  }
  if (filters.search || filters.q) tags.push({ key: 'search', label: `Search: ${filters.search || filters.q}` })
  if (filters.minPrice) tags.push({ key: 'minPrice', label: `Min KES ${filters.minPrice}` })
  if (filters.maxPrice) tags.push({ key: 'maxPrice', label: `Max KES ${filters.maxPrice}` })
  if (filters.minRating) tags.push({ key: 'minRating', label: `${filters.minRating}+ stars` })
  if (filters.featured) tags.push({ key: 'featured', label: 'Featured' })
  if (filters.trending) tags.push({ key: 'trending', label: 'Trending' })
  if (filters.bestseller) tags.push({ key: 'bestseller', label: 'Bestsellers' })
  if (filters.newArrival) tags.push({ key: 'newArrival', label: 'New Arrivals' })
  if (filters.onSale) tags.push({ key: 'onSale', label: 'On Sale' })
  return tags
}

export function clearFilterPatch(key: keyof ProductFilters): Partial<ProductFilters> {
  const patch: Partial<ProductFilters> = { [key]: undefined }
  if (key === 'category') patch.subcategory = undefined
  if (key === 'search') patch.q = undefined
  return patch
}

export function countActiveFilters(filters: ProductFilters): number {
  let count = 0
  if (filters.category) count++
  if (filters.subcategory) count++
  if (filters.gender) count++
  if (filters.brand) count++
  if (filters.size) count++
  if (filters.color) count++
  if (filters.vendorId) count++
  if (filters.minPrice) count++
  if (filters.maxPrice) count++
  if (filters.minRating) count++
  if (filters.featured) count++
  if (filters.trending) count++
  if (filters.bestseller) count++
  if (filters.newArrival) count++
  if (filters.onSale) count++
  if (filters.search || filters.q) count++
  return count
}

export function pageTitleFromFilters(filters: ProductFilters): string {
  if (filters.onSale) return 'Sale'
  if (filters.trending) return 'Trending'
  if (filters.bestseller) return 'Bestsellers'
  if (filters.newArrival) return 'New Arrivals'
  if (filters.featured) return 'Featured'
  if (filters.subcategory) return subcategoryLabel(filters.subcategory)
  if (filters.category) {
    return categoryLabel(filters.category)
  }
  if (filters.search) return `Search: ${filters.search}`
  return 'All Products'
}
