'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  useVendorProfile,
  useUpdateVendorProfile,
  useVendorDeliveryZones,
  useCreateVendorDeliveryZone,
  useDeleteVendorDeliveryZone,
  useUpdateVendorFreeShipping,
} from '@/lib/stores/api'
import { ImageFieldUpload } from '@/components/common/ImageFieldUpload'
import { DeliveryZoneForm, type DeliveryZoneFormValues } from '@/components/vendor/DeliveryZoneForm'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { formatCurrency } from '@/lib/utils/storage'
import type { Vendor } from '@/lib/types'

type VendorZone = {
  id: string
  name: string
  estimatedDays: string
  fee: number
}

export default function VendorProfilePage() {
  const { data: vendor, refetch } = useVendorProfile()
  const { data: zonesData, refetch: refetchZones } = useVendorDeliveryZones()
  const updateProfile = useUpdateVendorProfile().mutate
  const createZone = useCreateVendorDeliveryZone().mutate
  const deleteZone = useDeleteVendorDeliveryZone().mutate
  const updateFreeShipping = useUpdateVendorFreeShipping().mutate
  const { loading: updateLoading } = useUpdateVendorProfile()
  const { loading: zoneSaving } = useCreateVendorDeliveryZone()

  const [form, setForm] = useState({
    storeName: '',
    description: '',
    contactPhone: '',
    businessEmail: '',
    country: '',
    city: '',
    socialLinks: { instagram: '', twitter: '' },
    logo: '',
    banner: '',
  })
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('')
  const [savingThreshold, setSavingThreshold] = useState(false)

  const payload = zonesData as { zones?: VendorZone[]; freeShippingThreshold?: number | null } | null
  const zones = payload?.zones ?? []

  useEffect(() => {
    const v = vendor as Vendor | null
    if (!v) return
    setForm({
      storeName: v.storeName || '',
      description: v.description || '',
      contactPhone: v.contactPhone || '',
      businessEmail: v.businessEmail || '',
      country: v.country || '',
      city: v.city || '',
      socialLinks: {
        instagram: v.socialLinks?.instagram || '',
        twitter: v.socialLinks?.twitter || '',
      },
      logo: v.logo || '',
      banner: v.banner || '',
    })
  }, [vendor])

  useEffect(() => {
    if (payload?.freeShippingThreshold != null && payload.freeShippingThreshold > 0) {
      setFreeShippingThreshold(String(payload.freeShippingThreshold))
    } else {
      setFreeShippingThreshold('')
    }
  }, [payload?.freeShippingThreshold])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      await updateProfile({
        storeName: form.storeName,
        description: form.description,
        contactPhone: form.contactPhone,
        businessEmail: form.businessEmail,
        country: form.country,
        city: form.city,
        socialLinks: form.socialLinks,
        logo: form.logo,
        banner: form.banner,
      })
      toast.success('Store profile updated')
      refetch()
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to update profile.'))
    }
  }

  async function handleAddZone(values: DeliveryZoneFormValues) {
    try {
      await createZone(values)
      await refetchZones()
      toast.success(`Added ${values.name}`)
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to add delivery zone.'))
    }
  }

  async function handleRemoveZone(zone: VendorZone) {
    if (!window.confirm(`Remove "${zone.name}"? Customers will no longer see this option at checkout.`)) return
    try {
      await deleteZone({ id: zone.id })
      await refetchZones()
      toast.success('Delivery zone removed')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to remove delivery zone.'))
    }
  }

  async function saveFreeShipping(e: React.FormEvent) {
    e.preventDefault()
    const threshold = freeShippingThreshold.trim() === '' ? 0 : Number(freeShippingThreshold)
    if (Number.isNaN(threshold) || threshold < 0) {
      toast.error('Enter a valid free-shipping minimum, or leave it blank.')
      return
    }
    setSavingThreshold(true)
    try {
      await updateFreeShipping({ freeShippingThreshold: threshold })
      await refetchZones()
      toast.success('Free shipping threshold updated')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to update free shipping threshold.'))
    } finally {
      setSavingThreshold(false)
    }
  }

  if (!vendor) {
    return <div className="text-center py-8">Loading profile...</div>
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Update how customers see your store and where you deliver.</p>
      <form className="card p-6 space-y-6 max-w-2xl" onSubmit={saveProfile}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Logo</label>
          <ImageFieldUpload presetId="logo" value={form.logo} onChange={(url) => setForm((f) => ({ ...f, logo: url }))} variant="round" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Banner</label>
          <ImageFieldUpload presetId="banner" value={form.banner} onChange={(url) => setForm((f) => ({ ...f, banner: url }))} variant="banner" />
        </div>
        <div><label className="text-sm font-medium">Store Name</label><input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="input-field mt-1" required /></div>
        <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="input-field mt-1" /></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Phone</label><input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="input-field mt-1" /></div>
          <div><label className="text-sm font-medium">Email</label><input type="email" value={form.businessEmail} onChange={(e) => setForm({ ...form, businessEmail: e.target.value })} className="input-field mt-1" /></div>
          <div><label className="text-sm font-medium">Country</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-field mt-1" /></div>
          <div><label className="text-sm font-medium">City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field mt-1" /></div>
          <div><label className="text-sm font-medium">Instagram</label><input value={form.socialLinks.instagram} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })} className="input-field mt-1" placeholder="https://instagram.com/..." /></div>
          <div><label className="text-sm font-medium">Twitter / X</label><input value={form.socialLinks.twitter} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })} className="input-field mt-1" placeholder="https://x.com/..." /></div>
        </div>
        <button type="submit" className="btn-primary" disabled={updateLoading}>Save Profile</button>
      </form>

      <div className="card p-6 space-y-6 max-w-2xl">
        <div>
          <h3 className="font-medium">Delivery zones &amp; shipping</h3>
          <p className="text-sm text-gray-500 mt-1">
            Define where you deliver and what you charge. Customers pick a region at checkout; your fee applies once per order from your store.
          </p>
        </div>

        <DeliveryZoneForm saving={zoneSaving} onSubmit={handleAddZone} />

        <div>
          <p className="text-sm font-medium mb-3">Your zones ({zones.length})</p>
          {zones.length === 0 ? (
            <p className="text-sm text-gray-500">No delivery zones yet. Add one above so customers can check out from your store.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {zones.map((zone) => (
                <li key={zone.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-900/50">
                  <div>
                    <p className="font-medium text-sm">{zone.name}</p>
                    <p className="text-xs text-gray-500">{zone.estimatedDays} · {formatCurrency(zone.fee)}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => handleRemoveZone(zone)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="max-w-xs pt-2 border-t border-gray-100 dark:border-gray-800" onSubmit={saveFreeShipping}>
          <label className="text-sm font-medium">Free shipping above (KES)</label>
          <input
            type="number"
            min={0}
            step={1}
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(e.target.value)}
            className="input-field mt-1"
            placeholder="Optional"
          />
          <button type="submit" className="btn-secondary mt-3" disabled={savingThreshold}>
            {savingThreshold ? 'Saving...' : 'Save free shipping rule'}
          </button>
        </form>
      </div>
    </div>
  )
}
