'use client'

import Link from 'next/link'
import { useVendorProfile, useVendorSubscription, useVendorAnalytics } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { isFeaturedListingActive, subscriptionDaysRemaining } from '@/lib/utils/subscriptions'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { StatCard } from '@/components/common/StatCard'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { CurrencyDollarIcon, ShoppingCartIcon, CubeIcon, UsersIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function VendorDashboardPage() {
  const { data: vendorProfile, loading: profileLoading } = useVendorProfile()
  const { data: subscriptionData } = useVendorSubscription()
  const { data: vendorAnalytics, loading: analyticsLoading, error: analyticsError } = useVendorAnalytics()

  const vendor = vendorProfile as any
  const subscription = subscriptionData as any
  const analytics = (vendorAnalytics as any) || {}
  const isFeatured = isFeaturedListingActive(subscription)

  const revenue = analytics.revenue ?? analytics.total_revenue ?? 0
  const totalOrders = analytics.totalOrders ?? analytics.total_orders ?? analytics.totalOrdersClient ?? 0
  const totalProducts = analytics.totalProducts ?? analytics.total_products ?? analytics.totalProductsClient ?? 0
  const customers = analytics.customers ?? analytics.total_customers ?? 0
  const salesTrend = analytics.salesTrend ?? analytics.sales_trend ?? []
  const topProducts = analytics.topProducts ?? analytics.top_products ?? []

  if (profileLoading) {
    return <div className="text-center py-16 text-gray-500">Loading dashboard...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Welcome back{vendor ? `, ${vendor.storeName}` : ''}</h1>
      <p className="text-gray-500 text-sm mb-8">Here&apos;s what&apos;s happening with your store today.</p>

      {analyticsLoading ? (
        <div className="text-center py-8 text-gray-500 mb-8">Loading analytics...</div>
      ) : analyticsError ? (
        <div className="text-center py-8 text-red-600 mb-8">{getFriendlyErrorMessage(analyticsError, 'Unable to load analytics.')}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Revenue" value={formatCurrency(revenue)} icon={CurrencyDollarIcon} />
            <StatCard title="Orders" value={totalOrders} icon={ShoppingCartIcon} />
            <StatCard title="Products" value={totalProducts} icon={CubeIcon} />
            <StatCard title="Customers" value={customers} icon={UsersIcon} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Sales Trend</h3>
              {salesTrend.length > 0 ? (
                <LineChart
                  labels={salesTrend.map((s: any) => s.month)}
                  datasets={[
                    { label: 'Sales', data: salesTrend.map((s: any) => s.sales) },
                    { label: 'Revenue', data: salesTrend.map((s: any) => s.revenue) },
                  ]}
                />
              ) : (
                <p className="text-sm text-gray-500">No sales data for this period yet.</p>
              )}
            </div>
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Top Products</h3>
              {topProducts.length > 0 ? (
                <BarChart
                  labels={topProducts.map((p: any) => (p.name || '').slice(0, 15))}
                  data={topProducts.map((p: any) => p.sales)}
                  label="Sales"
                />
              ) : (
                <p className="text-sm text-gray-500">No product sales data yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      {vendor && !isFeatured && (
        <div className="card p-5 mb-6 border-brand-orange/30 bg-brand-orange/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-6 h-6 text-brand-orange shrink-0" />
            <div>
              <p className="font-semibold">Get featured on the homepage</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Subscribe to appear in the Top Vendors section and reach more shoppers.</p>
            </div>
          </div>
          <Link href="/vendor/subscription" className="btn-primary bg-brand-orange border-brand-orange shrink-0 text-center">View Plans</Link>
        </div>
      )}

      {vendor && isFeatured && subscription && (
        <div className="card p-4 mb-6 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
          Featured listing active · {subscriptionDaysRemaining(subscription.expiresAt)} days remaining ·{' '}
          <Link href="/vendor/subscription" className="underline font-medium">Manage subscription</Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/vendor/products" className="card p-4 hover:shadow-md transition-shadow">
          <p className="font-semibold text-sm">Products</p>
          <p className="text-xs text-gray-500 mt-1">Manage your catalog</p>
        </Link>
        <Link href="/vendor/orders" className="card p-4 hover:shadow-md transition-shadow">
          <p className="font-semibold text-sm">Orders</p>
          <p className="text-xs text-gray-500 mt-1">Fulfill customer orders</p>
        </Link>
        <Link href="/vendor/inventory" className="card p-4 hover:shadow-md transition-shadow">
          <p className="font-semibold text-sm">Inventory</p>
          <p className="text-xs text-gray-500 mt-1">Track stock levels</p>
        </Link>
        <Link href="/vendor/profile" className="card p-4 hover:shadow-md transition-shadow">
          <p className="font-semibold text-sm">Store Profile</p>
          <p className="text-xs text-gray-500 mt-1">Update your storefront</p>
        </Link>
      </div>
    </div>
  )
}
