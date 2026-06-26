'use client'

import type { ProductFilters, Vendor } from '@/lib/types'
import type { ProductFilterOptions } from '@/lib/types/filters'
import { FilterSelect } from '@/components/product/FilterSelect'
import { categoryLabel, subcategoryLabel, mergeFilterPatch } from '@/lib/utils/productFilters'

interface ProductFiltersPanelProps {
  filters: ProductFilters
  onChange: (filters: ProductFilters) => void
  filterOptions?: ProductFilterOptions | null
  vendors?: Vendor[]
  onClear?: () => void
}

export function ProductFiltersPanel({ filters, onChange, filterOptions, vendors, onClear }: ProductFiltersPanelProps) {
  const update = (patch: Partial<ProductFilters>) => onChange(mergeFilterPatch(filters, patch))

  const categories = filterOptions?.categories ?? []
  const subcategories = filters.category
    ? (filterOptions?.subcategoriesByCategory?.[filters.category] ?? [])
    : (filterOptions?.subcategories ?? [])
  const brands = filterOptions?.brands ?? []
  const genders = filterOptions?.genders ?? []
  const sizes = filterOptions?.sizes ?? []
  const colors = filterOptions?.colors ?? []
  const priceMin = filterOptions?.priceRange?.min ?? 0
  const priceMax = filterOptions?.priceRange?.max ?? 0

  return (
    <div className="space-y-3.5">
      <div>
        <h3 className="font-medium text-sm mb-1">Sort By</h3>
        <FilterSelect
          value={filters.sort || 'newest'}
          allowEmpty={false}
          emptyLabel="Newest"
          ariaLabel="Sort products"
          onChange={(sort) => update({ sort: sort as ProductFilters['sort'] })}
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'popular', label: 'Popular' },
            { value: 'rating', label: 'Best Rated' },
            { value: 'trending', label: 'Trending' },
            { value: 'bestsellers', label: 'Best Sellers' },
            { value: 'price-asc', label: 'Price: Low to High' },
            { value: 'price-desc', label: 'Price: High to Low' },
          ]}
        />
      </div>

      <div>
        <h3 className="font-medium text-sm mb-1">Search</h3>
        <input
          type="search"
          placeholder="Search products..."
          className="filter-input"
          value={filters.search || filters.q || ''}
          onChange={(e) => update({ search: e.target.value, q: e.target.value })}
        />
      </div>

      <div>
        <h3 className="font-medium text-sm mb-1">Category</h3>
        <FilterSelect
          value={filters.category || ''}
          emptyLabel="All Categories"
          ariaLabel="Filter by category"
          onChange={(category) => update(category ? { category, subcategory: undefined } : { category: undefined, subcategory: undefined })}
          options={categories.map((c) => ({ value: c, label: categoryLabel(c) }))}
        />
      </div>

      {subcategories.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-1">Subcategory</h3>
          <FilterSelect
            value={filters.subcategory || ''}
            emptyLabel="All Subcategories"
            ariaLabel="Filter by subcategory"
            onChange={(subcategory) => update({ subcategory: subcategory || undefined })}
            options={subcategories.map((s) => ({ value: s, label: subcategoryLabel(s) }))}
          />
        </div>
      )}

      <div>
        <h3 className="font-medium text-sm mb-1">Gender</h3>
        <FilterSelect
          value={filters.gender || ''}
          emptyLabel="All"
          ariaLabel="Filter by gender"
          onChange={(gender) => update({ gender: (gender || undefined) as ProductFilters['gender'] })}
          options={genders.map((g) => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))}
        />
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-1">Brand</h3>
          <FilterSelect
            value={filters.brand || ''}
            emptyLabel="All Brands"
            ariaLabel="Filter by brand"
            onChange={(brand) => update({ brand: brand || undefined })}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-1">Size</h3>
          <FilterSelect
            value={filters.size || ''}
            emptyLabel="All Sizes"
            ariaLabel="Filter by size"
            onChange={(size) => update({ size: size || undefined })}
            options={sizes.map((s) => ({ value: s, label: s }))}
          />
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-1">Color</h3>
          <FilterSelect
            value={filters.color || ''}
            emptyLabel="All Colors"
            ariaLabel="Filter by color"
            onChange={(color) => update({ color: color || undefined })}
            options={colors.map((c) => ({ value: c, label: c }))}
          />
        </div>
      )}

      {vendors && vendors.length > 0 && (
        <div>
          <h3 className="font-medium text-sm mb-1">Vendor</h3>
          <FilterSelect
            value={filters.vendorId || ''}
            emptyLabel="All Vendors"
            ariaLabel="Filter by vendor"
            onChange={(vendorId) => update({ vendorId: vendorId || undefined })}
            options={vendors.map((v) => ({ value: v.id, label: v.storeName }))}
          />
        </div>
      )}

      <div>
        <h3 className="font-medium text-sm mb-1">Price Range (KES)</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder={priceMin ? String(Math.floor(priceMin)) : 'Min'}
            min={0}
            className="filter-input"
            value={filters.minPrice ?? ''}
            onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
          />
          <input
            type="number"
            placeholder={priceMax ? String(Math.ceil(priceMax)) : 'Max'}
            min={0}
            className="filter-input"
            value={filters.maxPrice ?? ''}
            onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm mb-1">Min Rating</h3>
        <FilterSelect
          value={filters.minRating != null ? String(filters.minRating) : ''}
          emptyLabel="Any"
          ariaLabel="Filter by minimum rating"
          onChange={(minRating) => update({ minRating: minRating ? Number(minRating) : undefined })}
          options={[
            { value: '4', label: '4+ Stars' },
            { value: '3', label: '3+ Stars' },
            { value: '2', label: '2+ Stars' },
          ]}
        />
      </div>

      <div>
        <h3 className="font-medium text-sm mb-1">Special</h3>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.featured} onChange={(e) => update({ featured: e.target.checked || undefined })} className="rounded" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.trending} onChange={(e) => update({ trending: e.target.checked || undefined })} className="rounded" />
            Trending
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.bestseller} onChange={(e) => update({ bestseller: e.target.checked || undefined })} className="rounded" />
            Bestsellers
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.newArrival} onChange={(e) => update({ newArrival: e.target.checked || undefined })} className="rounded" />
            New Arrivals
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
