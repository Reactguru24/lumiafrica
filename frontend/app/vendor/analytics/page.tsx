'use client'

import { useState } from 'react'
import { useVendorProfile, useVendorAnalytics } from '@/lib/stores/api'
import { formatCurrency } from '@/lib/utils/storage'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { StatCard } from '@/components/common/StatCard'
import { VendorRatingInsight } from '@/components/vendor/VendorStoreHeader'
import {
  CurrencyDollarIcon, ShoppingCartIcon, CubeIcon, UsersIcon, StarIcon,
} from '@heroicons/react/24/outline'
import type { Vendor } from '@/lib/types'

const PERIODS = [
  { id: '7days', label: '7 days' },
  { id: '30days', label: '30 days' },
  { id: '90days', label: '90 days' },
  { id: 'all', label: 'All time' },
] as const

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

export default function VendorAnalyticsPage() {
  const [period, setPeriod] = useState<string>('30days')
  const { data: vendorProfile } = useVendorProfile()
  const { data: analytics, loading, error } = useVendorAnalytics(period)

  const vendor = vendorProfile as Vendor | null
  const a = (analytics as VendorAnalyticsData) || {}

  const revenue = a.revenue ?? a.total_revenue ?? 0
  const totalOrders = a.totalOrders ?? a.total_orders ?? 0
  const totalProducts = a.totalProducts ?? a.total_products ?? 0
  const customers = a.customers ?? a.total_customers ?? 0
  const salesTrend = a.salesTrend ?? a.sales_trend ?? []
  const topProducts = a.topProducts ?? a.top_products ?? []
  const averageRating = a.averageRating ?? a.average_rating ?? vendor?.rating ?? 0
  const totalReviews = a.totalReviews ?? a.total_reviews

  const ratingDisplay = averageRating > 0 ? `${averageRating.toFixed(1)} ★` : '—'

  if (loading && !analytics) {
    return <div className="text-center py-8 text-gray-500">Loading analytics...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{getFriendlyErrorMessage(error, 'Unable to load analytics.')}</div>
  }

  return (
    <div className="min-w-0 space-y-6">
      <p className="text-sm text-gray-500">Track sales, revenue, and product performance.</p>

      <div className="flex flex-wrap gap-2 overflow-x-auto">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap rounded-full transition-colors ${period === p.id ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {vendor && (
        <VendorRatingInsight
          vendor={{ ...vendor, rating: averageRating || vendor.rating }}
          totalReviews={totalReviews}
          className="mb-6"
        />
      )}

      <div className="space-y-4 sm:space-y-6">
        <div className="stat-grid lg:grid-cols-3 xl:grid-cols-5">
          <StatCard title="Revenue" value={formatCurrency(revenue)} icon={CurrencyDollarIcon} />
          <StatCard title="Orders" value={totalOrders} icon={ShoppingCartIcon} />
          <StatCard title="Products" value={totalProducts} icon={CubeIcon} />
          <StatCard title="Customers" value={customers} icon={UsersIcon} />
          <StatCard title="Store rating" value={ratingDisplay} icon={StarIcon} />
        </div>
        <div className="chart-card">
          <h3 className="font-semibold mb-4">Revenue Analytics</h3>
          {loading ? (
            <p className="text-sm text-gray-500">Updating...</p>
          ) : salesTrend.length > 0 ? (
            <LineChart
              labels={salesTrend.map((s) => s.month)}
              datasets={[{ label: 'Revenue', data: salesTrend.map((s) => s.revenue), color: '#a88b73' }]}
            />
          ) : (
            <p className="text-sm text-gray-500">No revenue data for this period yet.</p>
          )}
        </div>
        <div className="chart-card">
          <h3 className="font-semibold mb-4">Top Products by Sales</h3>
          {loading ? (
            <p className="text-sm text-gray-500">Updating...</p>
          ) : topProducts.length > 0 ? (
            <BarChart
              labels={topProducts.map((p) => (p.name || '').slice(0, 20))}
              data={topProducts.map((p) => p.sales)}
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
