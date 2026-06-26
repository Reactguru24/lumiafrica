'use client'

import Link from 'next/link'
import { useVendorProfile, useVendorSubscription, useVendorAnalytics } from '@/lib/stores/api'
import { formatCurrency } from '@/lib/utils/storage'
import { isFeaturedListingActive, subscriptionDaysRemaining } from '@/lib/utils/subscriptions'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { StatCard } from '@/components/common/StatCard'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { VendorRatingInsight } from '@/components/vendor/VendorStoreHeader'
import { CurrencyDollarIcon, ShoppingCartIcon, CubeIcon, UsersIcon, SparklesIcon, StarIcon } from '@heroicons/react/24/outline'
import type { Vendor, VendorSubscription } from '@/lib/types'

type VendorAnalyticsData = {
  revenue?: number
  total_revenue?: number
  totalOrders?: number
  total_orders?: number
  totalProducts?: number
  total_products?: number
  customers?: number
  total_customers?: number
  salesTrend?: { month: string; sales: number; revenue: number }[]
  sales_trend?: { month: string; sales: number; revenue: number }[]
  topProducts?: { name: string; sales: number }[]
  top_products?: { name: string; sales: number }[]
  averageRating?: number
  average_rating?: number
  totalReviews?: number
  total_reviews?: number
}

export default function VendorDashboardPage() {
  const { data: vendorProfile, loading: profileLoading } = useVendorProfile()
  const { data: subscriptionData } = useVendorSubscription()
  const { data: vendorAnalytics, loading: analyticsLoading, error: analyticsError } = useVendorAnalytics()

  const vendor = vendorProfile as Vendor | null
  const subscription = subscriptionData as VendorSubscription | null
  const analytics = (vendorAnalytics as VendorAnalyticsData) || {}
  const isFeatured = isFeaturedListingActive(subscription)

  const revenue = analytics.revenue ?? analytics.total_revenue ?? 0
  const totalOrders = analytics.totalOrders ?? analytics.total_orders ?? 0
  const totalProducts = analytics.totalProducts ?? analytics.total_products ?? 0
  const customers = analytics.customers ?? analytics.total_customers ?? 0
  const salesTrend = analytics.salesTrend ?? analytics.sales_trend ?? []
  const topProducts = analytics.topProducts ?? analytics.top_products ?? []
  const totalReviews = analytics.totalReviews ?? analytics.total_reviews

  if (profileLoading) {
    return <div className="text-center py-16 text-gray-500">Loading dashboard...</div>
  }

  return (
    <div className="space-y-8">
      {vendor && (
        <div className="card p-6">
          <p className="micro-label mb-1">Overview</p>
          <h2 className="font-semibold text-lg">Welcome back, {vendor.storeName}</h2>
          <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening with your store today.</p>
          <VendorRatingInsight vendor={vendor} totalReviews={totalReviews} className="mt-4" />
        </div>
      )}

      {analyticsLoading ? (
        <div className="text-center py-8 text-gray-500 mb-8">Loading analytics...</div>
      ) : analyticsError ? (
        <div className="text-center py-8 text-red-600 mb-8">{getFriendlyErrorMessage(analyticsError, 'Unable to load analytics.')}</div>
      ) : (
        <>
          <div className="stat-grid mb-6 sm:mb-8">
            <StatCard title="Revenue" value={formatCurrency(revenue)} icon={CurrencyDollarIcon} />
            <StatCard title="Orders" value={totalOrders} icon={ShoppingCartIcon} />
            <StatCard title="Products" value={totalProducts} icon={CubeIcon} />
            <StatCard title="Customers" value={customers} icon={UsersIcon} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="chart-card">
              <h3 className="font-semibold mb-4">Sales Trend</h3>
              {salesTrend.length > 0 ? (
                <LineChart
                  labels={salesTrend.map((s) => s.month)}
                  datasets={[
                    { label: 'Sales', data: salesTrend.map((s) => s.sales) },
                    { label: 'Revenue', data: salesTrend.map((s) => s.revenue) },
                  ]}
                />
              ) : (
                <p className="text-sm text-gray-500">No sales data for this period yet.</p>
              )}
            </div>
            <div className="chart-card">
              <h3 className="font-semibold mb-4">Top Products</h3>
              {topProducts.length > 0 ? (
                <BarChart
                  labels={topProducts.map((p) => (p.name || '').slice(0, 15))}
                  data={topProducts.map((p) => p.sales)}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link href="/vendor/products" className="card p-4 hover:shadow-md transition-shadow">
          <p className="font-semibold text-sm">Products</p>
          <p className="text-xs text-gray-500 mt-1">Manage your catalog</p>
        </Link>
        <Link href="/vendor/orders" className="card p-4 hover:shadow-md transition-shadow">
          <p className="font-semibold text-sm">Orders</p>
          <p className="text-xs text-gray-500 mt-1">Fulfill customer orders</p>
        </Link>
        <Link href="/vendor/reviews" className="card p-4 hover:shadow-md transition-shadow">
          <p className="font-semibold text-sm flex items-center gap-1">Reviews <StarIcon className="w-3.5 h-3.5 text-yellow-400" /></p>
          <p className="text-xs text-gray-500 mt-1">Reply to customers</p>
        </Link>
        <Link href="/vendor/profile" className="card p-4 hover:shadow-md transition-shadow">
          <p className="font-semibold text-sm">Store Profile</p>
          <p className="text-xs text-gray-500 mt-1">Update your storefront</p>
        </Link>
      </div>
    </div>
  )
}
