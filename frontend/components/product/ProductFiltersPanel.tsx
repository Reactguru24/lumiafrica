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
        <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Sort By</h3>
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
        <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Search</h3>
        <input
          type="search"
          placeholder="Search products..."
          className="filter-input"
          value={filters.search || filters.q || ''}
          onChange={(e) => update({ search: e.target.value, q: e.target.value })}
        />
      </div>

      <div>
        <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Category</h3>
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
          <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Subcategory</h3>
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
        <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Gender</h3>
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
          <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Brand</h3>
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
          <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Size</h3>
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
          <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Color</h3>
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
          <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Vendor</h3>
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
        <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Price Range (KES)</h3>
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
        <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Min Rating</h3>
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
        <h3 className="font-medium text-sm mb-1 text-gray-900 dark:text-white">Special</h3>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.featured} onChange={(e) => update({ featured: e.target.checked || undefined })} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-teal dark:text-brand-orange focus:ring-brand-teal dark:focus:ring-brand-orange" />
            <span className="text-gray-700 dark:text-gray-300">Featured</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.trending} onChange={(e) => update({ trending: e.target.checked || undefined })} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-teal dark:text-brand-orange focus:ring-brand-teal dark:focus:ring-brand-orange" />
            <span className="text-gray-700 dark:text-gray-300">Trending</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.bestseller} onChange={(e) => update({ bestseller: e.target.checked || undefined })} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-teal dark:text-brand-orange focus:ring-brand-teal dark:focus:ring-brand-orange" />
            <span className="text-gray-700 dark:text-gray-300">Bestsellers</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.newArrival} onChange={(e) => update({ newArrival: e.target.checked || undefined })} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-teal dark:text-brand-orange focus:ring-brand-teal dark:focus:ring-brand-orange" />
            <span className="text-gray-700 dark:text-gray-300">New Arrivals</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!filters.onSale} onChange={(e) => update({ onSale: e.target.checked || undefined })} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-teal dark:text-brand-orange focus:ring-brand-teal dark:focus:ring-brand-orange" />
            <span className="text-gray-700 dark:text-gray-300">On Sale</span>
          </label>
        </div>
      </div>

      {onClear && (
        <button type="button" className="btn-ghost text-sm w-full md:hidden rounded-xl py-2" onClick={onClear}>Clear All Filters</button>
      )}
    </div>
  )
}
