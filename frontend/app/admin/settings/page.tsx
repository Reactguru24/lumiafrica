'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAdminPlatformSettings, useUpdateAdminPlatformSettings } from '@/lib/stores/api'
import { formatCurrency } from '@/lib/utils/storage'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

export default function AdminSettingsPage() {
  const { data: settings, loading, error, refetch } = useAdminPlatformSettings()
  const updateSettings = useUpdateAdminPlatformSettings().mutate
  const [saving, setSaving] = useState(false)

  const s = settings as {
    filters?: {
      categories?: string[]
      brands?: string[]
      subcategories?: string[]
      genders?: string[]
    }
    shippingCost?: number
    taxRate?: number
    currency?: string
    commissionRate?: number
    commissionEnabled?: boolean
    subscriptionPlans?: Record<string, {
      label: string
      priceKes: number
      durationMonths: number
      featuredSlots: number
    }>
  } | null

  const [commissionRate, setCommissionRate] = useState<number | null>(null)
  const [commissionEnabled, setCommissionEnabled] = useState<boolean | null>(null)

  const displayRate = commissionRate ?? s?.commissionRate ?? 10
  const displayEnabled = commissionEnabled ?? s?.commissionEnabled ?? true

  if (loading) {
    return <div className="text-gray-500 py-12 text-center">Loading platform settings...</div>
  }

  if (error) {
    return (
      <div className="text-red-600 py-12 text-center">
        {getFriendlyErrorMessage(error, 'Unable to load platform settings.')}
      </div>
    )
  }

  async function saveCommission(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSettings({ commissionRate: displayRate, commissionEnabled: displayEnabled })
      await refetch()
      toast.success('Revenue settings updated')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to update revenue settings.'))
    } finally {
      setSaving(false)
    }
  }

  const categories = s?.filters?.categories ?? []
  const brands = s?.filters?.brands ?? []
  const plans = Object.entries(s?.subscriptionPlans ?? {}).map(([, plan]) => plan)

  return (
    <div>
      <AdminPageHeader
        title="Platform Settings"
        subtitle="Commerce defaults, vendor revenue share, and catalog metadata."
      />

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
        <form className="card p-6 md:col-span-2" onSubmit={saveCommission}>
          <h2 className="font-semibold mb-2">Vendor Revenue Share</h2>
          <p className="text-sm text-gray-500 mb-4">
            Platform commission deducted from each vendor&apos;s line items when an order is fulfilled.
            Disable to pass full sale amounts to vendors.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium mb-1.5">Commission rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="input-field"
                value={displayRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={displayEnabled}
                  onChange={(e) => setCommissionEnabled(e.target.checked)}
                />
                Commission active on vendor sales
              </label>
            </div>
          </div>
          <button type="submit" className="btn-primary mt-4" disabled={saving}>
            {saving ? 'Saving...' : 'Save revenue settings'}
          </button>
        </form>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Checkout — Tax</h2>
          <p className="text-2xl font-bold">{((s?.taxRate ?? 0) * 100).toFixed(0)}%</p>
          <p className="text-xs text-gray-500 mt-1">Applied at checkout (configured on server)</p>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Checkout — Shipping</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Each vendor sets zone fees (e.g. Nairobi Metro) and an optional free-shipping minimum in Store Profile.
          </p>
          <p className="text-xs text-gray-500 mt-2">Customers pick a delivery zone at checkout; multi-vendor carts combine one fee per seller.</p>
        </div>

        <div className="card p-6 md:col-span-2">
          <h2 className="font-semibold mb-2">Vendor Subscription Plans ({plans.length})</h2>
          <p className="text-sm text-gray-500 mb-4">Synced from Paystack. Set featured product slots in each plan&apos;s Paystack description.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.map((plan) => (
              <div key={plan.label} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="font-semibold">{plan.label}</p>
                <p className="text-lg font-bold mt-1">{formatCurrency(plan.priceKes)}</p>
                <p className="text-xs text-gray-500 mt-1">{plan.durationMonths} month{plan.durationMonths > 1 ? 's' : ''} · {plan.featuredSlots} featured slot{plan.featuredSlots > 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Categories ({categories.length})</h2>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {categories.length ? categories.map((cat) => (
              <span key={cat} className="badge bg-gray-100 dark:bg-gray-800">{cat}</span>
            )) : (
              <p className="text-sm text-gray-500">No categories in active products yet.</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-4">Brands ({brands.length})</h2>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {brands.length ? brands.map((brand) => (
              <span key={brand} className="badge bg-gray-100 dark:bg-gray-800">{brand}</span>
            )) : (
              <p className="text-sm text-gray-500">No brands in active products yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
