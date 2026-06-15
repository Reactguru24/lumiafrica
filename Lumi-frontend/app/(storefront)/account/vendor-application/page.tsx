'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { useApplyVendor, useMyVendorApplication, useProductFilters } from '@/lib/api/hooks'
import { vendorApplicationSchema } from '@/lib/utils/validation'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { ImageFieldUpload } from '@/components/common/ImageFieldUpload'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { VendorApplication } from '@/lib/types'
import type { ProductFilterOptions } from '@/lib/types/filters'

export default function VendorApplicationPage() {
  const router = useRouter()
  const auth = useAuthStore()
  const { data: applicationData, refetch: refetchApplication } = useMyVendorApplication()
  const { data: filterOptionsData } = useProductFilters()
  const applyVendor = useApplyVendor().mutate
  const categories = (filterOptionsData as ProductFilterOptions)?.categories ?? []
  const existing = (applicationData as VendorApplication | null) ?? auth.pendingVendorApplication
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    storeName: '',
    businessDescription: '',
    logo: '',
    contactPhone: auth.user?.phone || '',
    businessEmail: '',
    country: '',
    city: '',
    registrationNumber: '',
    categories: [] as string[],
  })

  useEffect(() => {
    if (auth.user) {
      setForm((f) => ({ ...f, contactPhone: auth.user?.phone || '' }))
    }
  }, [auth.user])

  useEffect(() => {
    if (existing?.status === 'pending') {
      router.replace('/application-submitted')
    }
  }, [existing?.status, router])

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter((c) => c !== cat) : [...f.categories, cat],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    const result = vendorApplicationSchema(auth.user?.email).safeParse(form)
    if (!result.success) {
      const next: Record<string, string> = {}
      result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
      setErrors(next)
      return
    }
    try {
      if (!form.logo) {
        toast.error('Please upload a store logo before submitting.')
        return
      }
      await applyVendor({
        storeName: form.storeName,
        businessDescription: form.businessDescription,
        logo: form.logo,
        businessEmail: form.businessEmail,
        contactPhone: form.contactPhone,
        country: form.country,
        city: form.city,
        registrationNumber: form.registrationNumber,
        categories: form.categories,
      })
      toast.success('Application submitted!')
      await auth.refreshUser()
      await refetchApplication()
      router.push('/application-submitted')
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to submit your application. Please try again.'))
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        Use a <strong>business email</strong> that is different from your account email ({auth.user?.email}).
        If approved, your current account will be upgraded to a vendor — you stay signed in with the same email.
      </p>

      {existing && existing.status !== 'rejected' && (
        <div className="card p-6 mb-8">
          <h2 className="font-semibold mb-4">Application Status</h2>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={existing.status} />
            <span className="text-sm text-gray-500">Submitted {new Date(existing.submittedAt).toLocaleDateString()}</span>
          </div>
          {existing.reviewNote && <p className="text-sm text-gray-500 mt-2">{existing.reviewNote}</p>}
          {existing.status === 'approved' && (
            <p className="text-sm text-green-600 mt-2">
              Your account has been upgraded to vendor. Visit your <a href="/vendor" className="underline font-medium">seller dashboard</a>.
            </p>
          )}
          {existing.status === 'pending' && (
            <p className="text-sm text-amber-600 mt-2">
              Your application is under review. Business email <strong>{existing.businessEmail}</strong> is reserved until a decision is made.
            </p>
          )}
        </div>
      )}
      {(!existing || existing.status === 'rejected') && (
        <form className="space-y-6" onSubmit={submit}>
          <h2 className="font-semibold">Vendor Application</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Store Name</label><input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="input-field mt-1" />{errors.storeName && <p className="text-red-500 text-xs mt-1">{errors.storeName}</p>}</div>
            <div>
              <label className="text-sm font-medium">Business Email</label>
              <input value={form.businessEmail} onChange={(e) => setForm({ ...form, businessEmail: e.target.value })} type="email" placeholder="store@yourbusiness.com" className="input-field mt-1" />
              {errors.businessEmail && <p className="text-red-500 text-xs mt-1">{errors.businessEmail}</p>}
              <p className="text-xs text-gray-500 mt-1">Must differ from your account email. Cannot be used to register or sign in while under review.</p>
            </div>
            <div className="md:col-span-2"><label className="text-sm font-medium">Business Description</label><textarea value={form.businessDescription} onChange={(e) => setForm({ ...form, businessDescription: e.target.value })} rows={3} className="input-field mt-1" />{errors.businessDescription && <p className="text-red-500 text-xs mt-1">{errors.businessDescription}</p>}</div>
            <div><label className="text-sm font-medium">Contact Phone</label><input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="input-field mt-1" /></div>
            <div><label className="text-sm font-medium">Registration Number</label><input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} className="input-field mt-1" /></div>
            <div><label className="text-sm font-medium">Country</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-field mt-1" /></div>
            <div><label className="text-sm font-medium">City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field mt-1" /></div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Store Logo</label>
            <ImageFieldUpload
              presetId="logo"
              value={form.logo}
              onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
              variant="round"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Clothing Categories</label>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">Loading available categories...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button key={cat} type="button" className={`px-3 py-1.5 text-sm border transition-colors ${form.categories.includes(cat) ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'border-gray-300 dark:border-gray-700'}`} onClick={() => toggleCategory(cat)}>{cat}</button>
                ))}
              </div>
            )}
            {errors.categories && <p className="text-red-500 text-xs mt-1">{errors.categories}</p>}
          </div>
          <button type="submit" className="btn-primary">Submit Application</button>
        </form>
      )}
    </div>
  )
}
