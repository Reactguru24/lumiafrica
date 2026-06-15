'use client'

import type { ProductFilters, Vendor } from '@/lib/types'
import type { ProductFilterOptions } from '@/lib/types/filters'

interface ProductFiltersPanelProps {
  filters: ProductFilters
  onChange: (filters: ProductFilters) => void
  filterOptions?: ProductFilterOptions | null
  vendors?: Vendor[]
  onClear?: () => void
}

export function ProductFiltersPanel({ filters, onChange, filterOptions, vendors, onClear }: ProductFiltersPanelProps) {
  const update = (patch: Partial<ProductFilters>) => onChange({ ...filters, ...patch })

  const categories = filterOptions?.categories ?? []
  const subcategories = filterOptions?.subcategories ?? []
  const brands = filterOptions?.brands ?? []
  const genders = filterOptions?.genders ?? []
  const sizes = filterOptions?.sizes ?? []
  const colors = filterOptions?.colors ?? []
  const priceMin = filterOptions?.priceRange?.min ?? 0
  const priceMax = filterOptions?.priceRange?.max ?? 0

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-medium text-sm mb-2">Sort By</h3>
        <select value={filters.sort || 'newest'} className="input-field text-sm py-2.5" onChange={(e) => update({ sort: e.target.value as ProductFilters['sort'] })}>
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
          <option value="rating">Best Rated</option>
          <option value="trending">Trending</option>
          <option value="bestsellers">Best Sellers</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Search</h3>
        <input
          type="search"
          placeholder="Search products..."
          className="input-field text-sm py-2.5"
          value={filters.search || filters.q || ''}
          onChange={(e) => update({ search: e.target.value, q: e.target.value })}
        />
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Category</h3>
        <select value={filters.category || ''} className="input-field text-sm py-2.5" onChange={(e) => update({ category: e.target.value || undefined })}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {subcategories.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-2">Subcategory</h3>
          <select value={filters.subcategory || ''} className="input-field text-sm py-2.5" onChange={(e) => update({ subcategory: e.target.value || undefined })}>
            <option value="">All Subcategories</option>
            {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div>
        <h3 className="font-medium text-sm mb-2">Gender</h3>
        <select value={filters.gender || ''} className="input-field text-sm py-2.5" onChange={(e) => update({ gender: (e.target.value || undefined) as ProductFilters['gender'] })}>
          <option value="">All</option>
          {genders.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
        </select>
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-2">Brand</h3>
          <select value={filters.brand || ''} className="input-field text-sm py-2.5" onChange={(e) => update({ brand: e.target.value || undefined })}>
            <option value="">All Brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-2">Size</h3>
          <select value={filters.size || ''} className="input-field text-sm py-2.5" onChange={(e) => update({ size: e.target.value || undefined })}>
            <option value="">All Sizes</option>
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-2">Color</h3>
          <select value={filters.color || ''} className="input-field text-sm py-2.5" onChange={(e) => update({ color: e.target.value || undefined })}>
            <option value="">All Colors</option>
            {colors.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {vendors && vendors.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-2">Vendor</h3>
          <select value={filters.vendorId || ''} className="input-field text-sm py-2.5" onChange={(e) => update({ vendorId: e.target.value || undefined })}>
            <option value="">All Vendors</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.storeName}</option>)}
          </select>
        </div>
      )}

      <div>
        <h3 className="font-medium text-sm mb-2">Price Range (KES)</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder={priceMin ? String(Math.floor(priceMin)) : 'Min'}
            min={0}
            className="input-field text-sm py-2.5"
            value={filters.minPrice ?? ''}
            onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
          />
          <input
            type="number"
            placeholder={priceMax ? String(Math.ceil(priceMax)) : 'Max'}
            min={0}
            className="input-field text-sm py-2.5"
            value={filters.maxPrice ?? ''}
            onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Min Rating</h3>
        <select value={filters.minRating ?? ''} className="input-field text-sm py-2.5" onChange={(e) => update({ minRating: e.target.value ? Number(e.target.value) : undefined })}>
          <option value="">Any</option>
          <option value="4">4+ Stars</option>
          <option value="3">3+ Stars</option>
          <option value="2">2+ Stars</option>
        </select>
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Special</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.featured} onChange={(e) => update({ featured: e.target.checked || undefined })} className="rounded" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.trending} onChange={(e) => update({ trending: e.target.checked || undefined })} className="rounded" />
            Trending
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.onSale} onChange={(e) => update({ onSale: e.target.checked || undefined })} className="rounded" />
            On Sale
          </label>
        </div>
      </div>

      {onClear && (
        <button type="button" className="btn-ghost text-sm w-full md:hidden" onClick={onClear}>Clear All Filters</button>
      )}
    </div>
  )
}
