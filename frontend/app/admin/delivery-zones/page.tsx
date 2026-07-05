'use client'

import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

/* Delivery zones disabled — admin UI commented out.
import { useState } from 'react'
import { toast } from 'sonner'
import { DeliveryZoneForm, type DeliveryZoneFormValues } from '@/components/admin/DeliveryZoneForm'
import {
  useAdminDeliveryZones,
  useCreateAdminDeliveryZone,
  useDeleteAdminDeliveryZone,
} from '@/lib/stores/api'
import { useFormatCurrency } from '@/lib/stores/currency'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { unwrapItems } from '@/lib/utils/api'
*/

export default function AdminDeliveryZonesPage() {
  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Delivery Zones"
        subtitle="Delivery zones and checkout shipping are currently disabled."
      />
      <div className="card p-6 text-sm text-gray-500">
        Zone management is turned off. Checkout uses subtotal and tax only — no shipping fees or delivery zone selection.
      </div>
    </div>
  )
}
