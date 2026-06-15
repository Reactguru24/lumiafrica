'use client'

import { useProductFilters } from '@/lib/api/hooks'
import { TAX_RATE, SHIPPING_METHODS } from '@/lib/constants/commerce'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

export default function AdminSettingsPage() {
  const { data: filterOptions, loading, error } = useProductFilters()

  const categories = filterOptions?.categories ?? []
  const brands = filterOptions?.brands ?? []

  if (loading) {
    return <div className="text-gray-500">Loading platform settings...</div>
  }

  if (error) {
    return (
      <div className="text-red-600">
        {getFriendlyErrorMessage(error, 'Unable to load platform settings. Please try again.')}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Platform Settings</h1>
      <p className="text-gray-500 text-sm mb-6">Categories and brands are sourced from active products in the database.</p>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Tax Settings</h2>
          <p className="text-2xl font-bold">{(TAX_RATE * 100).toFixed(0)}%</p>
          <p className="text-xs text-gray-500 mt-1">Applied at checkout on all orders</p>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Shipping Methods</h2>
          <div className="space-y-2 text-sm">
            {SHIPPING_METHODS.map((method) => (
              <div key={method.id} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800">
                <span>{method.name}</span>
                <span className="text-gray-500">KES {method.price.toLocaleString()} · {method.days}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Categories ({categories.length})</h2>
          <div className="flex flex-wrap gap-2">
            {categories.length ? categories.map((cat) => (
              <span key={cat} className="badge bg-gray-100 dark:bg-gray-800">{cat}</span>
            )) : (
              <p className="text-sm text-gray-500">No categories found in active products.</p>
            )}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Brands ({brands.length})</h2>
          <div className="flex flex-wrap gap-2">
            {brands.length ? brands.map((brand) => (
              <span key={brand} className="badge bg-gray-100 dark:bg-gray-800">{brand}</span>
            )) : (
              <p className="text-sm text-gray-500">No brands found in active products.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
