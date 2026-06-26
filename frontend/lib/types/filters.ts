export interface ProductFilterOptions {
  categories: string[]
  subcategories: string[]
  subcategoriesByCategory?: Record<string, string[]>
  brands: string[]
  genders: string[]
  colors: string[]
  sizes: string[]
  priceRange: { min: number; max: number }
}

export interface ProductListResponse {
  items: unknown[]
  total: number
  page: number
  limit: number
  filters?: ProductFilterOptions
  appliedFilters?: Record<string, unknown>
}
