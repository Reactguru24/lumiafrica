'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminVendorApplications, useAdminAnalytics, useAdminPlatformSettings, useUpdateAdminPlatformSettings } from '@/lib/stores/api'
import { useFormatCurrency } from '@/lib/stores/currency'
import { unwrapPaginated } from '@/lib/utils/api'
import { analyticsField } from '@/lib/utils/admin'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { StatCard } from '@/components/common/StatCard'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import {
  UsersIcon, BuildingStorefrontIcon, CubeIcon, ShoppingCartIcon,
  CurrencyDollarIcon, ExclamationTriangleIcon, PhotoIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useMemo } from 'react'

export default function AdminDashboardPage() {
  const formatPrice = useFormatCurrency()
  const { data: vendorApplicationsAPI } = useAdminVendorApplications(1, 50)
  const { data: analyticsData, loading } = useAdminAnalytics()
  const { data: platformSettings, refetch: refetchSettings } = useAdminPlatformSettings()
  const updateSettings = useUpdateAdminPlatformSettings().mutate
  const [commissionRate, setCommissionRate] = useState<number | null>(null)
  const [commissionEnabled, setCommissionEnabled] = useState<boolean | null>(null)
  const [savingCommission, setSavingCommission] = useState(false)

  const settings = platformSettings as { commissionRate?: number; commissionEnabled?: boolean } | null
  const displayRate = commissionRate ?? settings?.commissionRate ?? 10
  const displayEnabled = commissionEnabled ?? settings?.commissionEnabled ?? true

  const { items: applications } = unwrapPaginated<{
    id: string
    status?: string
    storeName?: string
    submittedAt?: string
  }>(vendorApplicationsAPI)
  const analytics = (analyticsData as Record<string, unknown>) || {}

  const pendingApplications = applications.filter((app) => app.status === 'pending')

  const verificationAlerts = useMemo(() => {
    return pendingApplications.slice(0, 3).map((app) => ({
      id: app.id,
      vendor: app.storeName || 'Unknown store',
      pendingDays: app.submittedAt
        ? Math.floor((Date.now() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }))
  }, [pendingApplications])

  const monthlySales = analyticsField<{ month: string; revenue: number; orders: number }[]>(
    analytics, 'monthlySales', 'monthly_sales'
  ) ?? []
  const vendorGrowth = analyticsField<{ month: string; count: number }[]>(
    analytics, 'vendorGrowth', 'vendor_growth'
  ) ?? []
  const orderTrends = analyticsField<{ date: string; count: number }[]>(
    analytics, 'orderTrends', 'order_trends'
  ) ?? []

  async function saveCommission(e: React.FormEvent) {
    e.preventDefault()
    setSavingCommission(true)
    try {
      await updateSettings({ commissionRate: displayRate, commissionEnabled: displayEnabled })
      await refetchSettings()
      toast.success('Commission settings updated')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to update commission settings.'))
    } finally {
      setSavingCommission(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Platform Dashboard"
        subtitle="Overview of marketplace performance and pending actions."
      />

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <form className="card p-5" onSubmit={saveCommission}>
          <h3 className="font-semibold mb-1">Platform commission</h3>
          <p className="text-sm text-gray-500 mb-4">
            Revenue share taken from vendor sales. Applies to all vendors.
          </p>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={displayEnabled}
              onChange={(e) => setCommissionEnabled(e.target.checked)}
            />
            Commission enabled
          </label>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={displayRate}
              disabled={!displayEnabled}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="input-field w-28"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
          <button type="submit" className="btn-primary text-sm" disabled={savingCommission}>
            {savingCommission ? 'Saving…' : 'Save commission'}
          </button>
        </form>

        <div className="card p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold mb-1">Homepage content</h3>
            <p className="text-sm text-gray-500 mb-4">
              Manage hero carousel slides and the feature showcase section. The promo strip stays fixed in the app.
            </p>
          </div>
          <Link
            href="/admin/homepage"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-teal dark:text-brand-orange hover:underline"
          >
            <PhotoIcon className="w-5 h-5" />
            Open homepage manager
          </Link>
        </div>
      </div>

      {pendingApplications.length > 0 && (
        <div className="card p-5 mb-8 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {pendingApplications.length} vendor application{pendingApplications.length > 1 ? 's' : ''} awaiting review
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                Review store details and verification checklist before approving vendors for the marketplace.
              </p>
              <div className="space-y-2">
                {verificationAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-900">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.vendor}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Pending for {alert.pendingDays} day{alert.pendingDays !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Link href="/admin/vendors" className="text-xs text-brand-teal dark:text-brand-orange hover:underline font-medium shrink-0">
                      Review
                    </Link>
                  </div>
                ))}
              </div>
              <Link href="/admin/vendors" className="inline-block mt-3 text-sm text-amber-700 dark:text-amber-300 hover:underline font-medium">
                Go to Vendor Management →
              </Link>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading analytics...</div>
      ) : (
        <>
          <div className="stat-grid-5 mb-6 sm:mb-8">
            <StatCard title="Total Users" value={analyticsField<number>(analytics, 'totalUsers', 'total_users') ?? 0} icon={UsersIcon} />
            <StatCard title="Total Vendors" value={analyticsField<number>(analytics, 'totalVendors', 'total_vendors') ?? 0} icon={BuildingStorefrontIcon} />
            <StatCard title="Total Products" value={analyticsField<number>(analytics, 'totalProducts', 'total_products') ?? 0} icon={CubeIcon} />
            <StatCard title="Total Orders" value={analyticsField<number>(analytics, 'totalOrders', 'total_orders') ?? 0} icon={ShoppingCartIcon} />
            <StatCard title="Total Revenue" value={formatPrice(analyticsField<number>(analytics, 'totalRevenue', 'total_revenue') ?? 0)} icon={CurrencyDollarIcon} />
          </div>

          {(monthlySales.length > 0 || vendorGrowth.length > 0 || orderTrends.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {monthlySales.length > 0 && (
                <div className="chart-card">
                  <h3 className="font-semibold mb-4">Monthly Sales</h3>
                  <LineChart
                    labels={monthlySales.map((m) => m.month)}
                    datasets={[
                      { label: 'Revenue', data: monthlySales.map((m) => m.revenue) },
                      { label: 'Orders', data: monthlySales.map((m) => m.orders) },
                    ]}
                  />
                </div>
              )}
              {vendorGrowth.length > 0 && (
                <div className="chart-card">
                  <h3 className="font-semibold mb-4">Vendor Growth</h3>
                  <BarChart
                    labels={vendorGrowth.map((v) => v.month)}
                    data={vendorGrowth.map((v) => v.count)}
                    label="Vendors"
                    color="#a88b73"
                  />
                </div>
              )}
              {orderTrends.length > 0 && (
                <div className="chart-card lg:col-span-2">
                  <h3 className="font-semibold mb-4">Order Trends (30 Days)</h3>
                  <LineChart
                    labels={orderTrends.map((o) => o.date)}
                    datasets={[{ label: 'Orders', data: orderTrends.map((o) => o.count), color: '#2563eb' }]}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
