'use client'

import { MediaImage } from '@/components/common/MediaImage'
import Link from 'next/link'
import { toast } from 'sonner'
import { useVendorAnalytics, useVendorProducts, useRestoreVendorProduct } from '@/lib/stores/api'
import { formatCurrency } from '@/lib/utils/storage'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { unwrapItems } from '@/lib/utils/api'
import type { Product } from '@/lib/types'

export default function VendorInventoryPage() {
  const { data: analytics, loading, error, refetch: refetchAnalytics } = useVendorAnalytics()
  const { data: productsData, refetch: refetchProducts } = useVendorProducts()
  const { mutate: restoreProduct, loading: restoring } = useRestoreVendorProduct()

  const a = (analytics as Record<string, unknown>) || {}
  const lowStock = (a.lowStock ?? a.low_stock_products ?? []) as Product[]
  const outOfStock = (a.outOfStock ?? a.out_of_stock ?? []) as Product[]
  const products = unwrapItems<Product>(productsData)
  const restorable = products.filter((p) => p.status === 'hidden' && p.stock > 0)

  async function handleRestore(productId: string) {
    try {
      await restoreProduct(productId)
      toast.success('Product restored to your storefront')
      refetchProducts()
      refetchAnalytics()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to restore product.'))
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading inventory...</div>
  if (error) return <div className="text-center py-8 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load inventory data.')}</div>

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Track stock levels and restore hidden listings when inventory is back.</p>

      {restorable.length > 0 && (
        <div className="card p-4 sm:p-6 mb-6 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
          <h2 className="font-semibold text-green-800 dark:text-green-300 mb-4 text-sm sm:text-base">Ready to restore</h2>
          <p className="text-sm text-green-700 dark:text-green-400 mb-4">
            These products have stock again but are hidden from shoppers. Restore them to your storefront.
          </p>
          {restorable.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg mb-3 last:mb-0">
              <MediaImage src={p.images?.[0]} alt={p.name} width={48} height={56} transform={{ width: 96, aspect: '3:4' }} className="w-12 h-14 object-cover shrink-0 rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.stock} in stock · {formatCurrency(p.price)}</p>
              </div>
              <button
                type="button"
                className="btn-primary text-xs py-2 px-3 shrink-0"
                onClick={() => handleRestore(p.id)}
                disabled={restoring}
              >
                Restore listing
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <h2 className="font-semibold text-red-600 mb-4 text-sm sm:text-base">Low Stock (≤10)</h2>
          {lowStock.length ? lowStock.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-sm mb-3">
              <MediaImage src={p.images?.[0]} alt={p.name} width={48} height={56} transform={{ width: 96, aspect: '3:4' }} className="w-12 h-14 object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(p.price)}</p>
              </div>
              <span className="text-yellow-600 font-semibold text-sm shrink-0">{p.stock} left</span>
            </div>
          )) : <p className="text-gray-500 text-sm text-center py-8">All products well stocked.</p>}
        </div>
        <div className="card p-4 sm:p-6">
          <h2 className="font-semibold text-red-600 mb-4 text-sm sm:text-base">Out of Stock</h2>
          {outOfStock.length ? outOfStock.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-sm mb-3">
              <MediaImage src={p.images?.[0]} alt={p.name} width={48} height={56} transform={{ width: 96, aspect: '3:4' }} className="w-12 h-14 object-cover shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(p.price)}</p>
              </div>
              <Link href="/vendor/products" className="text-xs text-brand-teal dark:text-brand-orange underline shrink-0">
                Restock
              </Link>
            </div>
          )) : <p className="text-gray-500 text-sm text-center py-8">No out-of-stock products.</p>}
        </div>
      </div>
    </div>
  )
}
