'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { DeliveryZoneForm, type DeliveryZoneFormValues } from '@/components/admin/DeliveryZoneForm'
import {
  useAdminDeliveryZones,
  useCreateAdminDeliveryZone,
  useDeleteAdminDeliveryZone,
} from '@/lib/stores/api'
import { useFormatCurrency } from '@/lib/stores/currency'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { unwrapItems } from '@/lib/utils/api'

type DeliveryZone = {
  id: string
  name: string
  estimatedDays: string
  baseCost: number
  active?: boolean
}

export default function AdminDeliveryZonesPage() {
  const formatPrice = useFormatCurrency()
  const { data, loading, refetch } = useAdminDeliveryZones()
  const createZone = useCreateAdminDeliveryZone().mutate
  const deleteZone = useDeleteAdminDeliveryZone().mutate
  const { loading: saving } = useCreateAdminDeliveryZone()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const zones = (unwrapItems(data) as DeliveryZone[]).filter((z) => z.active !== false)

  async function handleAddZone(values: DeliveryZoneFormValues) {
    try {
      await createZone(values)
      await refetch()
      toast.success(`Added ${values.name}`)
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to add delivery zone.'))
    }
  }

  async function handleRemoveZone(zone: DeliveryZone) {
    if (!window.confirm(`Remove "${zone.name}"? Customers will no longer see this option at checkout.`)) return
    setRemovingId(zone.id)
    try {
      await deleteZone({ id: zone.id })
      await refetch()
      toast.success('Delivery zone removed')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to remove delivery zone.'))
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return <div className="text-gray-500 py-12 text-center">Loading delivery zones...</div>
  }

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Delivery Zones"
        subtitle="Platform-wide regions and shipping fees shown at checkout. Each seller in a cart is charged once per zone."
      />

      <div className="card p-6 space-y-6">
        <DeliveryZoneForm saving={saving} onSubmit={handleAddZone} />

        <div>
          <p className="text-sm font-medium mb-3">Active zones ({zones.length})</p>
          {zones.length === 0 ? (
            <p className="text-sm text-gray-500">No delivery zones yet. Add one above so customers can check out.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {zones.map((zone) => (
                <li key={zone.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-900/50">
                  <div>
                    <p className="font-medium text-sm">{zone.name}</p>
                    <p className="text-xs text-gray-500">{zone.estimatedDays} · {formatPrice(zone.baseCost)}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    disabled={removingId === zone.id}
                    onClick={() => handleRemoveZone(zone)}
                  >
                    {removingId === zone.id ? 'Removing...' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
