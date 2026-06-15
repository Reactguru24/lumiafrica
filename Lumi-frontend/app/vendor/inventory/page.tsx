'use client'

import Image from 'next/image'
import { useVendorAnalytics } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

export default function VendorInventoryPage() {
  const { data: analytics, loading, error } = useVendorAnalytics()
  const a = (analytics as any) || {}
  const lowStock = a.lowStock ?? a.low_stock_products ?? []
  const outOfStock = a.outOfStock ?? a.out_of_stock ?? []

  if (loading) return <div className="text-center py-8 text-gray-500">Loading inventory...</div>
  if (error) return <div className="text-center py-8 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load inventory data.')}</div>

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold mb-6">Inventory Management</h1>
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <h2 className="font-semibold text-red-600 mb-4 text-sm sm:text-base">Low Stock (≤10)</h2>
          {lowStock.length ? lowStock.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-sm mb-3">
              <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} width={48} height={56} className="w-12 h-14 object-cover shrink-0" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-gray-500 mt-0.5">{formatCurrency(p.price)}</p></div>
              <span className="text-yellow-600 font-semibold text-sm shrink-0">{p.stock} left</span>
            </div>
          )) : <p className="text-gray-500 text-sm text-center py-4">All products well stocked.</p>}
        </div>
        <div className="card p-4 sm:p-6">
          <h2 className="font-semibold text-red-600 mb-4 text-sm sm:text-base">Out of Stock</h2>
          {outOfStock.length ? outOfStock.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-sm mb-3">
              <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} width={48} height={56} className="w-12 h-14 object-cover shrink-0 opacity-60" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-gray-500 mt-0.5">{formatCurrency(p.price)}</p></div>
              <span className="text-red-600 font-semibold text-sm shrink-0">0</span>
            </div>
          )) : <p className="text-gray-500 text-sm text-center py-4">No out-of-stock products.</p>}
        </div>
      </div>
    </div>
  )
}

