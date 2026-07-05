'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ImageFieldUpload } from '@/components/common/ImageFieldUpload'
import { HOMEPAGE_HERO_CAROUSEL_GUIDE, HOMEPAGE_SHOWCASE_GUIDE } from '@/lib/constants/imageUpload'
import { StatusBadge } from '@/components/common/StatusBadge'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import {
  useAdminHomepageHeroSlides,
  useAdminHomepageShowcase,
  useUpsertAdminHomepageShowcase,
  useCreateAdminHomepageHeroSlide,
  useUpdateAdminHomepageHeroSlide,
  useSetAdminHomepageHeroSlideActive,
  useDeleteAdminHomepageHeroSlide,
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
  const [showcaseLoaded, setShowcaseLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingShowcase, setSavingShowcase] = useState(false)

  useEffect(() => {
    if (!showcaseLoading && !showcaseLoaded) {
      setShowcaseForm(showcaseToForm(showcaseData as Record<string, unknown> | null))
      setShowcaseLoaded(true)
    }
  }, [showcaseData, showcaseLoading, showcaseLoaded])

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
      toast.success('Feature showcase saved')
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save showcase'))
    } finally {
      setSavingShowcase(false)
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Homepage"
        subtitle="Manage the hero carousel and feature showcase on the storefront. The promo strip (shipping, M-Pesa, etc.) is fixed in the app."
      />

      <section className="card p-5 border border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Hero carousel</h2>
          <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p className="font-medium text-gray-800 dark:text-gray-200">{HOMEPAGE_HERO_CAROUSEL_GUIDE.title}</p>
            <p><span className="font-medium">Size:</span> {HOMEPAGE_HERO_CAROUSEL_GUIDE.dimensions}</p>
            <p><span className="font-medium">Minimum:</span> {HOMEPAGE_HERO_CAROUSEL_GUIDE.minimum}</p>
            <p className="text-xs">{HOMEPAGE_HERO_CAROUSEL_GUIDE.note}</p>
          </div>
        </div>
        <form onSubmit={handleSlideSubmit} className="grid md:grid-cols-2 gap-4">
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
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {slides.map((slide) => (
            <div key={slide.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{slide.title}</p>
                <p className="text-xs text-gray-500 truncate">{slide.link}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={slide.active ? 'active' : 'hidden'} />
                <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => { setEditingSlideId(slide.id); setSlideForm({ label: slide.label || '', title: slide.title, subtitle: slide.subtitle || '', image: slide.image, link: slide.link || '/products', sortOrder: slide.sortOrder || 0 }) }}>Edit</button>
                <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => void runAdminAction(async () => { await setSlideActive({ id: slide.id, active: !slide.active }); await refetchSlides() }, slide.active ? 'Slide hidden' : 'Slide visible', 'Failed to update slide')}>{slide.active ? 'Hide' : 'Show'}</button>
                <button type="button" className="text-xs text-red-600" onClick={() => { if (!confirm('Delete this slide?')) return; void runAdminAction(async () => { await deleteSlide({ id: slide.id }); await refetchSlides() }, 'Slide deleted', 'Failed to delete slide') }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 border border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Feature showcase</h2>
          <p className="text-sm text-gray-500 mt-1">
            Full-width feature block below featured products — text on the left, four portrait images on the right.
          </p>
          <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p className="font-medium text-gray-800 dark:text-gray-200">{HOMEPAGE_SHOWCASE_GUIDE.title}</p>
            <p><span className="font-medium">Size:</span> {HOMEPAGE_SHOWCASE_GUIDE.dimensions}</p>
            <p><span className="font-medium">Minimum:</span> {HOMEPAGE_SHOWCASE_GUIDE.minimum}</p>
            <p className="text-xs">{HOMEPAGE_SHOWCASE_GUIDE.note}</p>
          </div>
        </div>
        {showcaseLoading ? (
          <p className="text-sm text-gray-500">Loading showcase…</p>
        ) : (
          <form onSubmit={handleShowcaseSubmit} className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">Overline</span>
              <input className="input-field mt-1" value={showcaseForm.overline} onChange={(e) => setShowcaseForm({ ...showcaseForm, overline: e.target.value })} placeholder="Made for East Africa" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Background color</span>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={showcaseForm.backgroundColor} onChange={(e) => setShowcaseForm({ ...showcaseForm, backgroundColor: e.target.value })} className="h-10 w-14 rounded border border-gray-200 dark:border-gray-700 cursor-pointer" />
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
