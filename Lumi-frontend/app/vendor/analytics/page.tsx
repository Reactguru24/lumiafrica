'use client'

import { useVendorAnalytics } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'

export default function VendorAnalyticsPage() {
  const { data: analytics, loading, error } = useVendorAnalytics()
  const a = (analytics as any) || {}

  const revenue = a.revenue ?? a.total_revenue ?? 0
  const totalOrders = a.totalOrders ?? a.total_orders ?? a.totalOrdersClient ?? 0
  const totalProducts = a.totalProducts ?? a.total_products ?? a.totalProductsClient ?? 0
  const customers = a.customers ?? a.total_customers ?? 0
  const salesTrend = a.salesTrend ?? a.sales_trend ?? []
  const topProducts = a.topProducts ?? a.top_products ?? []

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading analytics...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load analytics.')}</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Analytics</h1>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center"><p className="text-2xl font-bold">{formatCurrency(revenue)}</p><p className="text-xs text-gray-500">Revenue</p></div>
          <div className="card p-4 text-center"><p className="text-2xl font-bold">{totalOrders}</p><p className="text-xs text-gray-500">Orders</p></div>
          <div className="card p-4 text-center"><p className="text-2xl font-bold">{totalProducts}</p><p className="text-xs text-gray-500">Products</p></div>
          <div className="card p-4 text-center"><p className="text-2xl font-bold">{customers}</p><p className="text-xs text-gray-500">Customers</p></div>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Revenue Analytics</h3>
          {salesTrend.length > 0 ? (
            <LineChart
              labels={salesTrend.map((s: any) => s.month)}
              datasets={[{ label: 'Revenue', data: salesTrend.map((s: any) => s.revenue), color: '#a88b73' }]}
            />
          ) : (
            <p className="text-sm text-gray-500">No revenue data for this period yet.</p>
          )}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Top Products by Sales</h3>
          {topProducts.length > 0 ? (
            <BarChart
              labels={topProducts.map((p: any) => (p.name || '').slice(0, 20))}
              data={topProducts.map((p: any) => p.sales)}
              color="#1a1a1a"
            />
          ) : (
            <p className="text-sm text-gray-500">No product sales data yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
