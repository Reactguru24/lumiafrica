'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useVendorProfile, useUpdateVendorProfile, useVendorShippingRates, useUpdateVendorShippingRates } from '@/lib/stores/api'
import { ImageFieldUpload } from '@/components/common/ImageFieldUpload'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { formatCurrency } from '@/lib/utils/storage'
import type { Vendor } from '@/lib/types'

type ZoneRate = { zoneId: string; zoneName: string; estimatedDays: string; fee: string }

export default function VendorProfilePage() {
  const { data: vendor, refetch } = useVendorProfile()
  const { data: shippingData, refetch: refetchShipping } = useVendorShippingRates()
  const updateProfile = useUpdateVendorProfile().mutate
  const updateShipping = useUpdateVendorShippingRates().mutate
  const { loading: updateLoading } = useUpdateVendorProfile()
  const { loading: shippingLoading } = useUpdateVendorShippingRates()

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
  const [zoneRates, setZoneRates] = useState<ZoneRate[]>([])
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('')

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
    const payload = shippingData as { rates?: { zoneId: string; zoneName: string; estimatedDays: string; fee: number }[]; freeShippingThreshold?: number | null } | null
    if (!payload?.rates) return
    setZoneRates(payload.rates.map((r) => ({
      zoneId: r.zoneId,
      zoneName: r.zoneName,
      estimatedDays: r.estimatedDays,
      fee: r.fee > 0 ? String(r.fee) : '',
    })))
    setFreeShippingThreshold(
      payload.freeShippingThreshold != null && payload.freeShippingThreshold > 0
        ? String(payload.freeShippingThreshold)
        : '',
    )
  }, [shippingData])

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

  async function saveShipping(e: React.FormEvent) {
    e.preventDefault()
    const rates = zoneRates.map((z) => ({
      zoneId: z.zoneId,
      fee: z.fee.trim() === '' ? 0 : Number(z.fee),
    }))
    const threshold = freeShippingThreshold.trim() === '' ? 0 : Number(freeShippingThreshold)
    if (rates.some((r) => Number.isNaN(r.fee) || r.fee < 0)) {
      toast.error('Enter valid shipping fees (0 or more) for each zone.')
      return
    }
    if (Number.isNaN(threshold) || threshold < 0) {
      toast.error('Enter a valid free-shipping minimum, or leave it blank.')
      return
    }
    try {
      await updateShipping({ rates, freeShippingThreshold: threshold })
      toast.success('Shipping rates updated')
      refetchShipping()
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to update shipping rates.'))
    }
  }

  if (!vendor) {
    return <div className="text-center py-8">Loading profile...</div>
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Update how customers see your store on Lumi.</p>
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

      <form className="card p-6 space-y-6 max-w-2xl" onSubmit={saveShipping}>
        <div>
          <h3 className="font-medium">Shipping by zone</h3>
          <p className="text-sm text-gray-500 mt-1">
            Set a flat fee for each delivery zone (e.g. {formatCurrency(500)} for Nairobi Metro). Applied once per order from your store.
          </p>
        </div>
        <div className="space-y-3">
          {zoneRates.map((zone, index) => (
            <div key={zone.zoneId} className="grid sm:grid-cols-[1fr_140px] gap-3 items-end border border-gray-100 dark:border-gray-800 rounded-lg p-3">
              <div>
                <p className="font-medium text-sm">{zone.zoneName}</p>
                <p className="text-xs text-gray-500">{zone.estimatedDays}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Fee (KES)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={zone.fee}
                  onChange={(e) => {
                    const next = [...zoneRates]
                    next[index] = { ...zone, fee: e.target.value }
                    setZoneRates(next)
                  }}
                  className="input-field mt-1"
                  placeholder="e.g. 500"
                />
              </div>
            </div>
          ))}
          {zoneRates.length === 0 && (
            <p className="text-sm text-gray-500">No delivery zones configured yet. Contact support to add regions.</p>
          )}
        </div>
        <div className="max-w-xs">
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
        </div>
        <button type="submit" className="btn-primary" disabled={shippingLoading}>Save Shipping Rates</button>
      </form>
    </div>
  )
}
