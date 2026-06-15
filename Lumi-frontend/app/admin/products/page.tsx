'use client'

import { toast } from 'sonner'
import { useAdminProducts, useModerateProduct } from '@/lib/api/hooks'
import { unwrapItems } from '@/lib/utils/api'
import { formatCurrency } from '@/lib/utils/storage'
import { MediaImage } from '@/components/common/MediaImage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ResponsiveDataTable } from '@/components/common/ResponsiveDataTable'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import type { Product } from '@/lib/types'

export default function AdminProductsPage() {
  const { data: productsAPI, loading, refetch } = useAdminProducts()
  const { mutate: moderateProduct, loading: moderating } = useModerateProduct()

  const products = unwrapItems<Product>(productsAPI)
  const { page, totalPages, paginated, total, goTo, pageSize } = usePagination(products, 15)
  const tableData = paginated.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.images?.[0] || '',
    brand: p.brand,
    price: p.price,
    status: p.status,
  }))

  async function moderate(id: string, approved: boolean, reason?: string) {
    try {
      await moderateProduct({ id, approved, reason })
      toast.success(`Product ${approved ? 'approved' : 'rejected'}`)
      refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to moderate product')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Product Moderation</h1>
      <p className="text-sm text-gray-500 mb-6">Review vendor listings and manage product status.</p>
      {loading ? (
        <div className="text-center py-8">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No products found.</p>
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
              <>
                {row.status === 'pending' && (
                  <button
                    type="button"
                    className="text-xs text-green-600 hover:text-green-700"
                    onClick={() => moderate(row.id, true)}
                    disabled={moderating}
                  >
                    Approve
                  </button>
                )}
                {row.status === 'active' && (
                  <button
                    type="button"
                    className="text-xs text-yellow-600 hover:text-yellow-700"
                    onClick={() => moderate(row.id, false, 'Policy violation')}
                    disabled={moderating}
                  >
                    Reject
                  </button>
                )}
                {row.status !== 'archived' && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:text-red-700"
                    onClick={() => { if (confirm('Remove this product?')) moderate(row.id, false, 'Removed by admin') }}
                    disabled={moderating}
                  >
                    Remove
                  </button>
                )}
              </>
            )}
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={goTo} />
        </>
      )}
    </div>
  )
}
