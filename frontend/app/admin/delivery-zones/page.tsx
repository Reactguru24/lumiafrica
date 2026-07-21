'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ShippingLaneForm, type ShippingLaneFormValues } from '@/components/admin/ShippingLaneForm'
import {
  useAdminShippingLanes,
  useCreateAdminShippingLane,
  useDeleteAdminShippingLane,
  useUpdateAdminShippingLane,
} from '@/lib/stores/api'
import { useFormatCurrency } from '@/lib/stores/currency'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { confirmAction } from '@/lib/utils/swal'
import { unwrapItems } from '@/lib/utils/api'

type Lane = {
  id: string
  originCity: string
  destinationCity: string
  fee: number
  estimatedDays: string
  active?: boolean
}

export default function AdminDeliveryZonesPage() {
  const formatPrice = useFormatCurrency()
  const { data, loading, refetch } = useAdminShippingLanes()
  const createLane = useCreateAdminShippingLane().mutate
  const updateLane = useUpdateAdminShippingLane().mutate
  const deleteLane = useDeleteAdminShippingLane().mutate
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const lanes = unwrapItems<Lane>(data)

  async function handleCreate(values: ShippingLaneFormValues) {
    setSaving(true)
    try {
      await createLane(values)
      toast.success('Shipping lane added')
      await refetch()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Could not add lane'))
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(values: ShippingLaneFormValues) {
    if (!editingId) return
    setSaving(true)
    try {
      await updateLane({ id: editingId, payload: values })
      toast.success('Lane updated')
      setEditingId(null)
      await refetch()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Could not update lane'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const lane = lanes.find((l) => l.id === id)
    const confirmed = await confirmAction({
      title: 'Remove this shipping lane?',
      text: lane
        ? `${lane.originCity} → ${lane.destinationCity} will be deactivated and no longer used at checkout.`
        : 'This lane will be deactivated and no longer used at checkout.',
      confirmText: 'Yes, remove',
      icon: 'warning',
    })
    if (!confirmed) return
    try {
      await deleteLane({ id })
      toast.success('Lane removed')
      if (editingId === id) setEditingId(null)
      await refetch()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Could not remove lane'))
    }
  }

  const editingLane = lanes.find((l) => l.id === editingId)

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Shipping Lanes"
        subtitle="Set delivery fees from each vendor city to customer cities. Checkout sums one fee per vendor."
      />

      {editingLane ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Edit lane</h2>
            <button type="button" className="text-sm text-gray-500 hover:underline" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
          <ShippingLaneForm
            saving={saving}
            initial={{
              originCity: editingLane.originCity,
              destinationCity: editingLane.destinationCity,
              fee: editingLane.fee,
              estimatedDays: editingLane.estimatedDays,
            }}
            onSubmit={handleUpdate}
          />
        </div>
      ) : (
        <div className="mb-8">
          <h2 className="font-semibold mb-3">Add lane</h2>
          <ShippingLaneForm saving={saving} onSubmit={handleCreate} />
        </div>
      )}

      <h2 className="font-semibold mb-3">Active lanes</h2>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : lanes.length === 0 ? (
        <p className="text-sm text-gray-500">No lanes yet. Add routes like Mombasa → Nairobi.</p>
      ) : (
        <div className="card divide-y divide-gray-200 dark:divide-gray-800">
          {lanes.filter((l) => l.active !== false).map((lane) => (
            <div key={lane.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">
                  {lane.originCity} → {lane.destinationCity}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{lane.estimatedDays}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatPrice(lane.fee)}</span>
                <button type="button" className="text-brand-teal hover:underline" onClick={() => setEditingId(lane.id)}>
                  Edit
                </button>
                <button type="button" className="text-red-600 hover:underline" onClick={() => handleDelete(lane.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
