'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useAdminProducts, useModerateProduct } from '@/lib/stores/api'
import { unwrapPaginated } from '@/lib/utils/api'
import { confirmAction } from '@/lib/utils/swal'
import { formatCurrency } from '@/lib/utils/storage'
import { MediaImage } from '@/components/common/MediaImage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ResponsiveDataTable } from '@/components/common/ResponsiveDataTable'
import { Pagination } from '@/components/common/Pagination'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminRowActions } from '@/components/admin/AdminRowActions'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import type { Product } from '@/lib/types'

export default function AdminProductsPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const limit = 50

  const { data: productsAPI, loading, refetch } = useAdminProducts(page, limit, search)
  const { mutate: moderateProduct, loading: moderating } = useModerateProduct()

  const { items: products, total, limit: pageLimit } = unwrapPaginated<Product>(productsAPI)

  const tableData = products.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.images?.[0] || '',
    brand: p.brand,
    price: p.price,
    status: p.status,
  }))

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  function clearSearch() {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  async function moderate(id: string, approved: boolean, reason?: string, archive?: boolean) {
    if (!archive && !approved) {
      const confirmed = await confirmAction({
        title: 'Disable this product?',
        text: 'The listing will be hidden from the marketplace.',
        confirmText: 'Disable',
      })
      if (!confirmed) return
    }
    if (archive) {
      const confirmed = await confirmAction({
        title: 'Remove this product?',
        text: 'The listing will be archived and hidden from the marketplace.',
        confirmText: 'Yes, remove',
      })
      if (!confirmed) return
    }
    try {
      await moderateProduct({ id, approved, archive, reason })
      toast.success(approved ? 'Product enabled' : archive ? 'Product removed' : 'Product disabled')
      refetch()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to update product'))
    }
  }

  function handleProductAction(row: { id: string; status: string }, actionId: string) {
    if (actionId === 'enable') moderate(row.id, true)
    else if (actionId === 'disable') moderate(row.id, false, 'Disabled by admin')
    else if (actionId === 'remove') moderate(row.id, false, 'Removed by admin', true)
  }

  function productActions(status: string) {
    const actions = []
    if (status === 'active' || status === 'pending') {
      actions.push({ id: 'disable', label: 'Disable' })
    }
    if (status === 'hidden' || status === 'pending') {
      actions.push({ id: 'enable', label: 'Enable' })
    }
    if (status !== 'archived') {
      actions.push({ id: 'remove', label: 'Remove', variant: 'danger' as const })
    }
    return actions
  }

  const totalPages = Math.max(1, Math.ceil(total / pageLimit))

  return (
    <div>
      <AdminPageHeader
        title="Product Management"
        subtitle="Search listings and manage product visibility."
      />

      <form
        className="flex gap-2 mb-6 w-full sm:max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          applySearch()
        }}
      >
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, brand, SKU..."
            className="input-field text-sm py-2 pl-9 w-full"
          />
        </div>
        <button type="submit" className="btn-primary text-sm py-2 px-4 shrink-0">
          Search
        </button>
        {search && (
          <button type="button" className="btn-secondary text-sm py-2 px-3 shrink-0" onClick={clearSearch}>
            Clear
          </button>
        )}
      </form>

      {search && (
        <p className="text-sm text-gray-500 mb-4">
          Showing results for &ldquo;{search}&rdquo;
        </p>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">
            {search ? 'No products match your search.' : 'No products found.'}
          </p>
        </div>
      ) : (
        <>
          <ResponsiveDataTable
            columns={[
              { key: 'name', label: 'Product', width: '40%' },
              { key: 'brand', label: 'Brand', width: '20%' },
              { key: 'price', label: 'Price', width: '20%', format: (v) => formatCurrency(v as number) },
              { key: 'status', label: 'Status', width: '20%' },
            ]}
            rows={tableData}
            renderCell={(key, row) => {
              if (key === 'name') {
                return (
                  <div className="flex items-center gap-3">
                    <MediaImage
                      src={(row.image as string) || '/placeholder.png'}
                      alt={row.name as string}
                      width={40}
                      height={48}
                      className="w-10 h-12 object-cover rounded shrink-0"
                    />
                    <span className="font-medium">{row.name as string}</span>
                  </div>
                )
              }
              if (key === 'status') return <StatusBadge status={row.status as string} />
              return undefined
            }}
            renderActions={(row) => (
              <AdminRowActions
                options={productActions(row.status as string)}
                onSelect={(actionId) => handleProductAction(row as { id: string; status: string }, actionId)}
                disabled={moderating}
                ariaLabel="Product actions"
              />
            )}
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageLimit} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
