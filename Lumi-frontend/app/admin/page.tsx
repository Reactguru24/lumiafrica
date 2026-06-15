'use client'

import { useAdminVendorApplications, useAdminAnalytics, useAdminUsers } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { StatCard } from '@/components/common/StatCard'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { UsersIcon, BuildingStorefrontIcon, CubeIcon, ShoppingCartIcon, CurrencyDollarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useMemo } from 'react'

export default function AdminDashboardPage() {
  const { data: vendorApplicationsAPI } = useAdminVendorApplications()
  const { data: analyticsData } = useAdminAnalytics()
  const { data: usersData } = useAdminUsers()

  const applications = ((vendorApplicationsAPI as any)?.items || vendorApplicationsAPI || []) as any[]
  const analytics = (analyticsData as any) || {}
  const users = ((usersData as any)?.items || usersData || []) as any[]

  const pendingApplications = applications.filter((app: any) => app.status === 'pending')

  const verificationAlerts = useMemo(() => {
    return pendingApplications.slice(0, 3).map((app: any) => ({
      id: app.id,
      vendor: app.storeName,
      pendingDays: Math.floor((new Date().getTime() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60 * 24)),
    }))
  }, [pendingApplications])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Platform Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">Enterprise overview of marketplace performance.</p>

      {/* Pending Vendor Verification Alert */}
      {pendingApplications.length > 0 && (
        <div className="card p-5 mb-8 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {pendingApplications.length} Vendor{pendingApplications.length > 1 ? 's' : ''} Pending Verification
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                Review and verify vendor details before releasing to clients. Check critical items including business documents, contact information, and payment details.
              </p>
              <div className="space-y-2">
                {verificationAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-900">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.vendor}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Pending for {alert.pendingDays} day{alert.pendingDays > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Link href="/admin/vendors" className="text-xs text-brand-teal dark:text-brand-orange hover:underline whitespace-nowrap shrink-0 font-medium">
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
      {analytics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard title="Total Users" value={(analytics as any)?.totalUsers || users.length} icon={UsersIcon} />
            <StatCard title="Total Vendors" value={(analytics as any)?.totalVendors || 0} icon={BuildingStorefrontIcon} />
            <StatCard title="Total Products" value={(analytics as any)?.totalProducts || 0} icon={CubeIcon} />
            <StatCard title="Total Orders" value={(analytics as any)?.totalOrders || 0} icon={ShoppingCartIcon} />
            <StatCard title="Total Revenue" value={formatCurrency((analytics as any)?.totalRevenue || 0)} icon={CurrencyDollarIcon} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Monthly Sales</h3>
              <LineChart labels={((analytics as any)?.monthlySales || []).map((m: any) => m.month)} datasets={[{ label: 'Revenue', data: ((analytics as any)?.monthlySales || []).map((m: any) => m.revenue) }, { label: 'Orders', data: ((analytics as any)?.monthlySales || []).map((m: any) => m.orders) }]} />
            </div>
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Vendor Growth</h3>
              <BarChart labels={((analytics as any)?.vendorGrowth || []).map((v: any) => v.month)} data={((analytics as any)?.vendorGrowth || []).map((v: any) => v.count)} label="Vendors" color="#a88b73" />
            </div>
            <div className="card p-6 lg:col-span-2">
              <h3 className="font-semibold mb-4">Order Trends (30 Days)</h3>
              <LineChart labels={((analytics as any)?.orderTrends || []).map((o: any) => o.date)} datasets={[{ label: 'Orders', data: ((analytics as any)?.orderTrends || []).map((o: any) => o.count), color: '#2563eb' }]} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
