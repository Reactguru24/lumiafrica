'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ImageFieldUpload } from '@/components/common/ImageFieldUpload'
import { HOMEPAGE_HERO_CAROUSEL_GUIDE, HOMEPAGE_SHOWCASE_GUIDE } from '@/lib/constants/imageUpload'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { confirmAction } from '@/lib/utils/swal'
import {
  useAdminHomepageHeroSlides,
  useAdminHomepageShowcase,
  useUpsertAdminHomepageShowcase,
  useCreateAdminHomepageHeroSlide,
  useUpdateAdminHomepageHeroSlide,
  useSetAdminHomepageHeroSlideActive,
  useDeleteAdminHomepageHeroSlide,
  invalidateHomepageContentCache,
} from '@/lib/stores/api'
import { unwrapItems } from '@/lib/utils/api'

const emptySlideForm = () => ({
  label: '',
  title: '',
  subtitle: '',
  image: '',
  link: '/products',
  sortOrder: 0,
})

const emptyShowcaseForm = () => ({
  overline: 'Made for East Africa',
  headline: '',
  description: '',
  buttonText: 'Explore Trends',
  buttonLink: '/products?trending=true',
  backgroundColor: '#084c54',
  images: ['', '', '', ''] as string[],
  active: true,
})

type ShowcaseForm = ReturnType<typeof emptyShowcaseForm>

function showcaseToForm(data: Record<string, unknown> | null): ShowcaseForm {
  if (!data) return emptyShowcaseForm()
  const images = Array.isArray(data.images) ? (data.images as string[]) : []
  return {
    overline: String(data.overline ?? 'Made for East Africa'),
    headline: String(data.headline ?? ''),
    description: String(data.description ?? ''),
    buttonText: String(data.buttonText ?? 'Explore Trends'),
    buttonLink: String(data.buttonLink ?? '/products?trending=true'),
    backgroundColor: String(data.backgroundColor ?? '#084c54'),
    images: [0, 1, 2, 3].map((i) => images[i] ?? ''),
    active: data.active !== false,
  }
}

async function runAdminAction(action: () => Promise<unknown>, successMsg: string, errorMsg: string) {
  try {
    await action()
    toast.success(successMsg)
  } catch (err) {
    toast.error(getFriendlyErrorMessage(err, errorMsg))
  }
}

export default function AdminHomepagePage() {
  const { data: slidesData, refetch: refetchSlides } = useAdminHomepageHeroSlides()
  const { data: showcaseData, loading: showcaseLoading, refetch: refetchShowcase } = useAdminHomepageShowcase()

  const createSlide = useCreateAdminHomepageHeroSlide().mutate
  const updateSlide = useUpdateAdminHomepageHeroSlide().mutate
  const setSlideActive = useSetAdminHomepageHeroSlideActive().mutate
  const deleteSlide = useDeleteAdminHomepageHeroSlide().mutate
  const upsertShowcase = useUpsertAdminHomepageShowcase().mutate

  const slides = unwrapItems(slidesData) as any[]

  const [slideForm, setSlideForm] = useState(emptySlideForm)
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null)
  const [showcaseForm, setShowcaseForm] = useState(emptyShowcaseForm)
  const [saving, setSaving] = useState(false)
  const [savingShowcase, setSavingShowcase] = useState(false)

  useEffect(() => {
    if (!showcaseLoading) {
      setShowcaseForm(showcaseToForm(showcaseData as Record<string, unknown> | null))
    }
  }, [showcaseData, showcaseLoading])

  function setShowcaseImage(index: number, url: string) {
    setShowcaseForm((prev) => {
      const images = [...prev.images]
      images[index] = url
      return { ...prev, images }
    })
  }

  async function handleSlideSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingSlideId) {
        await updateSlide({ id: editingSlideId, payload: slideForm })
        toast.success('Hero slide updated')
      } else {
        await createSlide(slideForm)
        toast.success('Hero slide created')
      }
      setSlideForm(emptySlideForm())
      setEditingSlideId(null)
      refetchSlides()
      invalidateHomepageContentCache()
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save hero slide'))
    } finally {
      setSaving(false)
    }
  }

  async function handleShowcaseSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingShowcase(true)
    try {
      await upsertShowcase({
        overline: showcaseForm.overline,
        headline: showcaseForm.headline,
        description: showcaseForm.description,
        buttonText: showcaseForm.buttonText,
        buttonLink: showcaseForm.buttonLink,
        backgroundColor: showcaseForm.backgroundColor,
        images: showcaseForm.images.filter(Boolean),
        active: showcaseForm.active,
      })
      await refetchShowcase()
      invalidateHomepageContentCache()
      toast.success('Feature showcase saved')
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save showcase'))
    } finally {
      setSavingShowcase(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Homepage"
        subtitle="Manage the hero carousel and feature showcase on the storefront. The promo strip (shipping, M-Pesa, etc.) is fixed in the app."
      />

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold">Hero carousel</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Manage slides shown on the storefront hero carousel.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-white mb-1">{HOMEPAGE_HERO_CAROUSEL_GUIDE.title}</p>
          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
            <li><span className="font-medium">Size:</span> {HOMEPAGE_HERO_CAROUSEL_GUIDE.dimensions}</li>
            <li><span className="font-medium">Minimum:</span> {HOMEPAGE_HERO_CAROUSEL_GUIDE.minimum}</li>
            <li className="text-xs">{HOMEPAGE_HERO_CAROUSEL_GUIDE.note}</li>
          </ul>
        </div>

        <form onSubmit={handleSlideSubmit} className="grid md:grid-cols-2 gap-4 mb-6">
          <label className="block">
            <span className="text-sm font-medium">Label</span>
            <input className="input-field mt-1" value={slideForm.label} onChange={(e) => setSlideForm({ ...slideForm, label: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Title</span>
            <input required className="input-field mt-1" value={slideForm.title} onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })} />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium">Subtitle</span>
            <textarea className="input-field mt-1" rows={2} value={slideForm.subtitle} onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Link</span>
            <input className="input-field mt-1" value={slideForm.link} onChange={(e) => setSlideForm({ ...slideForm, link: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Sort order</span>
            <input type="number" className="input-field mt-1" value={slideForm.sortOrder} onChange={(e) => setSlideForm({ ...slideForm, sortOrder: Number(e.target.value) })} />
          </label>
          <div className="md:col-span-2">
            <span className="text-sm font-medium block mb-2">Slide image</span>
            <ImageFieldUpload presetId="heroCarousel" variant="banner" value={slideForm.image} onChange={(image) => setSlideForm({ ...slideForm, image })} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>{editingSlideId ? 'Update slide' : 'Add slide'}</button>
            {editingSlideId && (
              <button type="button" className="btn-secondary" onClick={() => { setEditingSlideId(null); setSlideForm(emptySlideForm()) }}>Cancel</button>
            )}
          </div>
        </form>

        <div className="card border border-gray-200 dark:border-gray-700 overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-4 font-medium">Label</th>
                  <th className="pb-2 pr-4 font-medium">Title</th>
                  <th className="pb-2 pr-4 font-medium">Link</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slides.map((slide) => (
                  <tr key={slide.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                    <td className="py-3 pr-4 text-xs text-gray-500">{slide.label || '—'}</td>
                    <td className="py-3 pr-4 font-medium">{slide.title}</td>
                    <td className="py-3 pr-4 text-xs text-gray-500 truncate max-w-[200px]">{slide.link}</td>
                    <td className="py-3 pr-4"><StatusBadge status={slide.active ? 'active' : 'hidden'} /></td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => { setEditingSlideId(slide.id); setSlideForm({ label: slide.label || '', title: slide.title, subtitle: slide.subtitle || '', image: slide.image, link: slide.link || '/products', sortOrder: slide.sortOrder || 0 }) }}>Edit</button>
                        <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => void runAdminAction(async () => { await setSlideActive({ id: slide.id, active: !slide.active }); await refetchSlides(); invalidateHomepageContentCache() }, slide.active ? 'Slide hidden' : 'Slide visible', 'Failed to update slide')}>{slide.active ? 'Hide' : 'Show'}</button>
                        <button type="button" className="text-xs text-red-600 hover:underline py-1 px-2" onClick={() => {
                          const confirmed = confirmAction({
                            title: 'Delete this slide?',
                            text: 'This slide will be removed from the hero carousel.',
                            confirmText: 'Delete',
                            icon: 'warning',
                          })
                          if (!confirmed) return
                          void runAdminAction(async () => { await deleteSlide({ id: slide.id }); await refetchSlides(); invalidateHomepageContentCache() }, 'Slide deleted', 'Failed to delete slide')
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {slides.length === 0 && (
              <div className="py-8">
                <EmptyState title="No hero slides" description="Add a slide to display on the storefront hero carousel." />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold">Feature showcase</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Full-width feature block below featured products — text on the left, four portrait images on the right.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-white mb-1">{HOMEPAGE_SHOWCASE_GUIDE.title}</p>
          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
            <li><span className="font-medium">Size:</span> {HOMEPAGE_SHOWCASE_GUIDE.dimensions}</li>
            <li><span className="font-medium">Minimum:</span> {HOMEPAGE_SHOWCASE_GUIDE.minimum}</li>
            <li className="text-xs">{HOMEPAGE_SHOWCASE_GUIDE.note}</li>
          </ul>
        </div>

        {showcaseLoading ? (
          <p className="text-sm text-gray-500">Loading showcase…</p>
        ) : (
          <form onSubmit={handleShowcaseSubmit} className="grid md:grid-cols-2 gap-4 mb-6">
            <label className="block">
              <span className="text-sm font-medium">Overline</span>
              <input className="input-field mt-1" value={showcaseForm.overline} onChange={(e) => setShowcaseForm({ ...showcaseForm, overline: e.target.value })} placeholder="Made for East Africa" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Background color</span>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={showcaseForm.backgroundColor} onChange={(e) => setShowcaseForm({ ...showcaseForm, backgroundColor: e.target.value })} className="h-10 w-14 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer" />
                <input className="input-field flex-1" value={showcaseForm.backgroundColor} onChange={(e) => setShowcaseForm({ ...showcaseForm, backgroundColor: e.target.value })} />
              </div>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Headline</span>
              <input required className="input-field mt-1" value={showcaseForm.headline} onChange={(e) => setShowcaseForm({ ...showcaseForm, headline: e.target.value })} placeholder="Fashion From Nairobi to Kampala" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Description</span>
              <textarea className="input-field mt-1" rows={3} value={showcaseForm.description} onChange={(e) => setShowcaseForm({ ...showcaseForm, description: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Button text</span>
              <input className="input-field mt-1" value={showcaseForm.buttonText} onChange={(e) => setShowcaseForm({ ...showcaseForm, buttonText: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Button link</span>
              <input className="input-field mt-1" value={showcaseForm.buttonLink} onChange={(e) => setShowcaseForm({ ...showcaseForm, buttonLink: e.target.value })} />
            </label>
            <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
              {(['Top left', 'Top right', 'Bottom left', 'Bottom right'] as const).map((label, index) => (
                <div key={label}>
                  <span className="text-sm font-medium block mb-2">Image — {label}</span>
                  <ImageFieldUpload
                    presetId="homepageShowcase"
                    variant="square"
                    value={showcaseForm.images[index]}
                    onChange={(image) => setShowcaseImage(index, image)}
                  />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={showcaseForm.active} onChange={(e) => setShowcaseForm({ ...showcaseForm, active: e.target.checked })} />
              <span className="text-sm">Visible on storefront</span>
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary" disabled={savingShowcase}>
                {savingShowcase ? 'Saving…' : 'Save showcase'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
