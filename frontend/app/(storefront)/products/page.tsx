'use client'

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react'
import { MediaImage } from '@/components/common/MediaImage'
import { useRouter, useSearchParams } from 'next/navigation'
import { useProducts, useProductFilters, useVendors, useVendor } from '@/lib/stores/api'
import type { ProductFilters } from '@/lib/types'
import type { ProductFilterOptions, ProductListResponse } from '@/lib/types/filters'
import { filtersFromQuery, filtersEqual, queryFromFilters, pageTitleFromFilters, filtersToAPIParams, countActiveFilters, mergeFilterPatch, clearFilterPatch } from '@/lib/utils/productFilters'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductFiltersPanel } from '@/components/product/ProductFiltersPanel'
import { ActiveFilterChips } from '@/components/product/ActiveFilterChips'
import { Pagination } from '@/components/common/Pagination'
import { MobileDrawer } from '@/components/common/MobileDrawer'
import { Squares2X2Icon, ListBulletIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

function productsHref(filters: ProductFilters, page: number): string {
  const nextQuery = new URLSearchParams(queryFromFilters(filters, page)).toString()
  return nextQuery ? `/products?${nextQuery}` : '/products'
}

function ProductsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const queryString = searchParams.toString()
  const queryObj = useMemo(() => Object.fromEntries(searchParams.entries()), [queryString])
  const [filters, setFilters] = useState<ProductFilters>(() => filtersFromQuery(queryObj))
  const [listView, setListView] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const queryParams = useMemo(
    () => filtersToAPIParams(filters, {
      page: queryObj.page ? Number(queryObj.page) : 1,
      limit: 12,
    }),
    [filters, queryObj.page],
  )

  const { data: productsData, loading, isRefetching, error } = useProducts(queryParams)
  const { data: filterOptionsData } = useProductFilters()
  const { data: vendorsData } = useVendors()
  const { data: activeVendorData } = useVendor(filters.vendorId || '')

  const activeVendor = filters.vendorId ? (activeVendorData as { storeName?: string; description?: string; logo?: string; banner?: string } | null) : null

  const pageSize = 12
  const productsResponse = (productsData as ProductListResponse | null) ?? { items: [], total: 0, page: 1, limit: pageSize }
  const products = Array.isArray(productsResponse.items) ? productsResponse.items : []
  const total = Number(productsResponse.total || 0)
  const apiPage = Number(productsResponse.page || queryObj.page || 1) || 1
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const filterOptions = (productsResponse.filters || filterOptionsData) as ProductFilterOptions | null
  const vendors = Array.isArray(vendorsData) ? vendorsData : ((vendorsData as any)?.items ?? [])

  const pageTitle = useMemo(() => {
    if (activeVendor?.storeName) return activeVendor.storeName
    return pageTitleFromFilters(filters)
  }, [activeVendor, filters])

  const syncRoute = useCallback((nextFilters: ProductFilters, nextPage: number) => {
    router.replace(productsHref(nextFilters, nextPage), { scroll: false })
  }, [router])

  const goTo = useCallback((nextPage: number) => {
    const clampedPage = Math.min(Math.max(1, nextPage), totalPages)
    if (clampedPage !== apiPage) syncRoute(filters, clampedPage)
  }, [apiPage, filters, syncRoute, totalPages])

  const reset = useCallback(() => {
    if (apiPage !== 1) syncRoute(filters, 1)
  }, [apiPage, filters, syncRoute])

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  useEffect(() => {
    const nextFilters = filtersFromQuery(queryObj)
    setFilters((prev) => (filtersEqual(prev, nextFilters) ? prev : nextFilters))
  }, [queryString, queryObj])

  function updateFilters(next: ProductFilters) {
    setFilters(next)
    reset()
    syncRoute(next, 1)
  }

  function handlePageChange(nextPage: number) {
    goTo(nextPage)
  }

  function clearFilters() {
    updateFilters({ sort: filters.sort || 'newest' })
    setShowFilters(false)
  }

  function clearSingleFilter(key: Parameters<typeof clearFilterPatch>[0]) {
    updateFilters(mergeFilterPatch(filters, clearFilterPatch(key)))
  }

  function clearVendorFilter() {
    clearSingleFilter('vendorId')
  }

  return (
    <div className="page-container">
      {filters.vendorId && (
        <div className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 border-brand-teal/30 dark:border-brand-orange/30 bg-brand-teal/5 dark:bg-brand-orange/5">
          {activeVendor?.logo && (
            <MediaImage
              src={activeVendor.logo}
              alt={activeVendor.storeName || 'Vendor'}
              width={56}
              height={56}
              transform={{ width: 112 }}
              className="w-14 h-14 rounded-full object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Shopping this vendor</p>
            <h2 className="font-semibold text-lg truncate">{activeVendor?.storeName || 'Vendor products'}</h2>
            {activeVendor?.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{activeVendor.description}</p>
            )}
          </div>
          <button type="button" className="btn-secondary text-sm py-2 inline-flex items-center gap-1 shrink-0" onClick={clearVendorFilter}>
            <XMarkIcon className="w-4 h-4" /> Clear vendor filter
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="section-title truncate">{pageTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading && !products.length
              ? 'Loading products...'
              : `${total} products${isRefetching ? ' · updating…' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className="md:hidden relative inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium" onClick={() => setShowFilters(true)}>
            <FunnelIcon className="w-4 h-4" />Filters
            {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-orange text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          <button type="button" className={`p-2 border border-gray-300 dark:border-gray-700 ${!listView ? 'bg-brand-teal text-white dark:bg-brand-orange' : ''}`} onClick={() => setListView(false)}><Squares2X2Icon className="w-5 h-5" /></button>
          <button type="button" className={`p-2 border border-gray-300 dark:border-gray-700 ${listView ? 'bg-brand-teal text-white dark:bg-brand-orange' : ''}`} onClick={() => setListView(true)}><ListBulletIcon className="w-5 h-5" /></button>
        </div>
      </div>
      <ActiveFilterChips
        filters={filters}
        vendors={vendors}
        onClear={clearSingleFilter}
        onClearAll={clearFilters}
      />
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <aside className="hidden md:block w-64 lg:w-72 shrink-0">
          <div className="sticky top-24 space-y-6 card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Filters</h2>
              <button type="button" className="text-xs text-gray-500 hover:underline" onClick={clearFilters}>Clear</button>
            </div>
            <ProductFiltersPanel filters={filters} onChange={updateFilters} filterOptions={filterOptions} vendors={vendors} onClear={clearFilters} />
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          {loading && !products.length ? (
            <div className="text-center py-8 text-gray-500">Loading products...</div>
          ) : error ? (
            <div className="text-center py-16 text-red-600 dark:text-red-400 px-4">
              {getFriendlyErrorMessage(error, 'Unable to load products. Please try again.')}
            </div>
          ) : products.length ? (
            <div className={`relative ${isRefetching ? 'opacity-70 pointer-events-none' : ''}`}>
            <div className={listView ? 'space-y-4' : 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6'}>
              {products.map((p: any) => <ProductCard key={p.id} product={p} listView={listView} />)}
            </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 px-4">No products match your filters. Try adjusting your search or clearing some filters.</div>
          )}
          {total > 0 && <Pagination page={apiPage} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={handlePageChange} />}
        </div>
      </div>
      <MobileDrawer open={showFilters} onOpenChange={setShowFilters} title="Filter Products" footer={
        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1 text-sm py-3" onClick={clearFilters}>Clear</button>
          <button type="button" className="btn-primary flex-1 text-sm py-3" onClick={() => setShowFilters(false)}>Show {total} Results</button>
        </div>
      }>
        <ProductFiltersPanel filters={filters} onChange={updateFilters} filterOptions={filterOptions} vendors={vendors} onClear={clearFilters} />
      </MobileDrawer>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageContent />
    </Suspense>
  )
}
