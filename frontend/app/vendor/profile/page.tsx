'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useVendorProfile, useUpdateVendorProfile } from '@/lib/stores/api'
import { ImageFieldUpload } from '@/components/common/ImageFieldUpload'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import type { Vendor } from '@/lib/types'

export default function VendorProfilePage() {
  const { data: vendor, refetch } = useVendorProfile()
  const updateProfile = useUpdateVendorProfile().mutate
  const { loading: updateLoading } = useUpdateVendorProfile()

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

  async function save(e: React.FormEvent) {
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

  if (!vendor) {
    return <div className="text-center py-8">Loading profile...</div>
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Update how customers see your store on Lumi.</p>
      <form className="card p-6 space-y-6 max-w-2xl" onSubmit={save}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Logo</label>
          <ImageFieldUpload
            presetId="logo"
            value={form.logo}
            onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
            variant="round"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Banner</label>
          <ImageFieldUpload
            presetId="banner"
            value={form.banner}
            onChange={(url) => setForm((f) => ({ ...f, banner: url }))}
            variant="banner"
          />
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
        <button type="submit" className="btn-primary" disabled={updateLoading}>Save Settings</button>
      </form>
    </div>
  )
}
