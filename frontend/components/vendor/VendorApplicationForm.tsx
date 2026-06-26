'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { publicAPI } from '@/lib/api/client'
import { useApplyVendor, useProductFilters } from '@/lib/stores/api'
import { vendorApplicationSchema } from '@/lib/utils/validation'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { MediaImage } from '@/components/common/MediaImage'
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_UPLOAD_PRESETS,
  imageSizeHint,
  type ImageUploadPresetId,
} from '@/lib/constants/imageUpload'
import { useImageUploadWithCrop } from '@/lib/hooks/useImageUploadWithCrop'
import { ImageUploadCropHost } from '@/components/common/ImageUploadCropHost'
import type { ProductFilterOptions } from '@/lib/types/filters'

export function VendorApplicationForm() {
  const router = useRouter()
  const { data: filterOptionsData } = useProductFilters()
  const applyVendor = useApplyVendor().mutate
  const categories = (filterOptionsData as ProductFilterOptions)?.categories ?? []
  const [categoryToAdd, setCategoryToAdd] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    applicantName: '',
    storeName: '',
    businessDescription: '',
    businessCertificate: '',
    vendorPhoto: '',
    businessPhoto: '',
    contactPhone: '',
    businessEmail: '',
    country: '',
    city: '',
    registrationNumber: '',
    categories: [] as string[],
  })

  function addCategory(cat: string) {
    const next = cat.trim()
    if (!next) return
    setForm((f) => (f.categories.includes(next) ? f : { ...f, categories: [...f.categories, next] }))
    setCategoryToAdd('')
  }

  function removeCategory(cat: string) {
    setForm((f) => ({ ...f, categories: f.categories.filter((c) => c !== cat) }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    const result = vendorApplicationSchema().safeParse(form)
    if (!result.success) {
      const next: Record<string, string> = {}
      result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
      setErrors(next)
      return
    }
    try {
      await applyVendor({
        applicantName: form.applicantName,
        storeName: form.storeName,
        businessDescription: form.businessDescription,
        businessCertificate: form.businessCertificate,
        vendorPhoto: form.vendorPhoto,
        businessPhoto: form.businessPhoto,
        businessEmail: form.businessEmail,
        contactPhone: form.contactPhone,
        country: form.country,
        city: form.city,
        registrationNumber: form.registrationNumber,
        categories: form.categories,
      })
      toast.success('Application submitted!')
      router.push(`/application-submitted?email=${encodeURIComponent(form.businessEmail)}`)
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to submit your application. Please try again.'))
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
        <h2 className="font-semibold">Vendor Application</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Your Name</label>
              <input value={form.applicantName} onChange={(e) => setForm({ ...form, applicantName: e.target.value })} className="input-field mt-1" />
              {errors.applicantName && <p className="text-red-500 text-xs mt-1">{errors.applicantName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Store Name</label>
              <input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className="input-field mt-1" />
              {errors.storeName && <p className="text-red-500 text-xs mt-1">{errors.storeName}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Business Email</label>
            <input value={form.businessEmail} onChange={(e) => setForm({ ...form, businessEmail: e.target.value })} type="email" placeholder="store@yourbusiness.com" className="input-field mt-1" />
            {errors.businessEmail && <p className="text-red-500 text-xs mt-1">{errors.businessEmail}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Business Description</label>
            <textarea value={form.businessDescription} onChange={(e) => setForm({ ...form, businessDescription: e.target.value })} rows={3} className="input-field mt-1" />
            {errors.businessDescription && <p className="text-red-500 text-xs mt-1">{errors.businessDescription}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Contact Phone</label>
              <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="input-field mt-1" />
              {errors.contactPhone && <p className="text-red-500 text-xs mt-1">{errors.contactPhone}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Registration Number</label>
              <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} className="input-field mt-1" />
              {errors.registrationNumber && <p className="text-red-500 text-xs mt-1">{errors.registrationNumber}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Country</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-field mt-1" />
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field mt-1" />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>
          </div>
        </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Vendor photo (profile)</label>
            <PublicImageFieldUpload
              presetId="avatar"
              value={form.vendorPhoto}
              onChange={(url) => setForm((f) => ({ ...f, vendorPhoto: url }))}
              variant="round"
            />
            {errors.vendorPhoto && <p className="text-red-500 text-xs mt-1">{errors.vendorPhoto}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Business photo</label>
            <PublicImageFieldUpload
              presetId="banner"
              value={form.businessPhoto}
              onChange={(url) => setForm((f) => ({ ...f, businessPhoto: url }))}
              variant="banner"
            />
            {errors.businessPhoto && <p className="text-red-500 text-xs mt-1">{errors.businessPhoto}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Business certificate (PDF or image)</label>
            <PublicDocumentFieldUpload
              value={form.businessCertificate}
              onChange={(url) => setForm((f) => ({ ...f, businessCertificate: url }))}
            />
            {errors.businessCertificate && <p className="text-red-500 text-xs mt-1">{errors.businessCertificate}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Clothing Categories</label>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">Loading available categories...</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="input-field flex-1"
                    value={categoryToAdd}
                    onChange={(e) => setCategoryToAdd(e.target.value)}
                  >
                    <option value="">Select a category…</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} disabled={form.categories.includes(cat)}>
                        {cat}{form.categories.includes(cat) ? ' (added)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary whitespace-nowrap"
                    onClick={() => addCategory(categoryToAdd)}
                    disabled={!categoryToAdd}
                  >
                    Add
                  </button>
                </div>
                {form.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900"
                        onClick={() => removeCategory(cat)}
                        title="Remove"
                      >
                        {cat} <span className="ml-1 text-gray-400">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.categories && <p className="text-red-500 text-xs mt-1">{errors.categories}</p>}
          </div>
          <button type="submit" className="btn-primary w-full sm:w-auto">Submit Application</button>
    </form>
  )
}

function PublicImageFieldUpload({
  presetId,
  value,
  onChange,
  variant = 'square',
  disabled,
}: {
  presetId: ImageUploadPresetId
  value?: string
  onChange: (url: string) => void
  variant?: 'round' | 'banner' | 'square'
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { prepareImageFile, cropSession, confirmCrop, cancelCrop } = useImageUploadWithCrop()
  const preset = IMAGE_UPLOAD_PRESETS[presetId]

  async function processFile(file: File) {
    try {
      const prepared = await prepareImageFile(file, presetId)
      if (!prepared) return
      const result = await publicAPI.uploadImage(prepared as unknown as File) as { url?: string }
      if (!result.url) {
        toast.error('Upload succeeded but no URL was returned.')
        return
      }
      onChange(result.url)
      toast.success(`${preset.label} uploaded`)
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to upload image.'))
    }
  }

  const previewRound = variant === 'round'
  const previewBanner = variant === 'banner'

  return (
    <>
      <ImageUploadCropHost cropSession={cropSession} onConfirm={confirmCrop} onCancel={cancelCrop} />
      <div className="space-y-3">
        {value ? (
          previewBanner ? (
            <MediaImage src={value} alt={preset.label} width={1200} height={400} className="w-full h-40 object-cover rounded-lg" />
          ) : (
            <MediaImage
              src={value}
              alt={preset.label}
              width={previewRound ? 80 : 64}
              height={previewRound ? 80 : 64}
              className={`${previewRound ? 'w-20 h-20 rounded-full' : 'w-16 h-16 rounded-lg'} object-cover`}
            />
          )
        ) : (
          <div
            className={
              previewBanner
                ? 'w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 rounded-lg'
                : `${previewRound ? 'w-20 h-20 rounded-full' : 'w-16 h-16 rounded-lg'} bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 text-center px-1`
            }
          >
            {previewBanner ? `${preset.width}×${preset.height}px` : preset.label}
          </div>
        )}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="hidden"
            disabled={disabled}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) await processFile(file)
            }}
          />
          <button
            type="button"
            className="btn-secondary text-sm py-2"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Upload {preset.label}
          </button>
          <p className="text-xs text-gray-500 mt-1">{imageSizeHint(preset)}</p>
        </div>
      </div>
    </>
  )
}

function PublicDocumentFieldUpload({
  value,
  onChange,
  disabled,
}: {
  value?: string
  onChange: (url: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    try {
      const result = await publicAPI.uploadDocument(file) as { url?: string }
      if (!result.url) {
        toast.error('Upload succeeded but no URL was returned.')
        return
      }
      onChange(result.url)
      toast.success('Certificate uploaded')
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to upload document.'))
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {value ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-sm underline">
          View uploaded certificate
        </a>
      ) : (
        <p className="text-sm text-gray-500">No certificate uploaded yet.</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) await processFile(file)
        }}
      />
      <button type="button" className="btn-secondary text-sm py-2" disabled={disabled} onClick={() => inputRef.current?.click()}>
        Upload certificate
      </button>
    </div>
  )
}
