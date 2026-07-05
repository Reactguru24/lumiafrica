'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ImageFieldUpload } from '@/components/common/ImageFieldUpload'
import { HOMEPAGE_HERO_CAROUSEL_GUIDE, HOMEPAGE_MIDDLE_BANNER_GUIDE } from '@/lib/constants/imageUpload'
import { StatusBadge } from '@/components/common/StatusBadge'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import {
  useAdminHomepageHeroSlides,
  useAdminHomepagePromoItems,
  useAdminHomepageBanners,
  useCreateAdminHomepageHeroSlide,
  useUpdateAdminHomepageHeroSlide,
  useSetAdminHomepageHeroSlideActive,
  useDeleteAdminHomepageHeroSlide,
  useCreateAdminHomepagePromoItem,
  useUpdateAdminHomepagePromoItem,
  useSetAdminHomepagePromoItemActive,
  useDeleteAdminHomepagePromoItem,
  useCreateAdminHomepageBanner,
  useUpdateAdminHomepageBanner,
  useSetAdminHomepageBannerActive,
  useDeleteAdminHomepageBanner,
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

const emptyPromoForm = () => ({
  title: '',
  description: '',
  icon: '✓',
  sortOrder: 0,
})

const emptyBannerForm = () => ({
  title: '',
  subtitle: '',
  image: '',
  link: '',
  sortOrder: 0,
  active: true,
})

export default function AdminHomepagePage() {
  const { data: slidesData, refetch: refetchSlides } = useAdminHomepageHeroSlides()
  const { data: promosData, refetch: refetchPromos } = useAdminHomepagePromoItems()
  const { data: bannersData, refetch: refetchBanners } = useAdminHomepageBanners()

  const createSlide = useCreateAdminHomepageHeroSlide().mutate
  const updateSlide = useUpdateAdminHomepageHeroSlide().mutate
  const setSlideActive = useSetAdminHomepageHeroSlideActive().mutate
  const deleteSlide = useDeleteAdminHomepageHeroSlide().mutate
  const createPromo = useCreateAdminHomepagePromoItem().mutate
  const updatePromo = useUpdateAdminHomepagePromoItem().mutate
  const setPromoActive = useSetAdminHomepagePromoItemActive().mutate
  const deletePromo = useDeleteAdminHomepagePromoItem().mutate
  const createBanner = useCreateAdminHomepageBanner().mutate
  const updateBanner = useUpdateAdminHomepageBanner().mutate
  const setBannerActive = useSetAdminHomepageBannerActive().mutate
  const deleteBanner = useDeleteAdminHomepageBanner().mutate

  const slides = unwrapItems(slidesData) as any[]
  const promos = unwrapItems(promosData) as any[]
  const banners = unwrapItems(bannersData) as any[]

  const [slideForm, setSlideForm] = useState(emptySlideForm)
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null)
  const [promoForm, setPromoForm] = useState(emptyPromoForm)
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)
  const [bannerForm, setBannerForm] = useState(emptyBannerForm)
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  async function handlePromoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingPromoId) {
        await updatePromo({ id: editingPromoId, payload: promoForm })
        toast.success('Promo item updated')
      } else {
        await createPromo(promoForm)
        toast.success('Promo item created')
      }
      setPromoForm(emptyPromoForm())
      setEditingPromoId(null)
      refetchPromos()
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save promo item'))
    } finally {
      setSaving(false)
    }
  }

  async function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingBannerId) {
        await updateBanner({ id: editingBannerId, payload: bannerForm })
        toast.success('Banner updated')
      } else {
        await createBanner(bannerForm)
        toast.success('Banner created')
      }
      setBannerForm(emptyBannerForm())
      setEditingBannerId(null)
      refetchBanners()
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save banner'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Homepage"
        subtitle="Manage the hero carousel, promo strip, and middle banner shown on the storefront."
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
                <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={async () => { await setSlideActive({ id: slide.id, active: !slide.active }); refetchSlides() }}>{slide.active ? 'Hide' : 'Show'}</button>
                <button type="button" className="text-xs text-red-600" onClick={async () => { if (!confirm('Delete this slide?')) return; await deleteSlide({ id: slide.id }); refetchSlides() }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 border border-gray-200 dark:border-gray-700 space-y-4">
        <h2 className="font-semibold text-lg">Promo strip</h2>
        <form onSubmit={handlePromoSubmit} className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Title</span>
            <input required className="input-field mt-1" value={promoForm.title} onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Icon (emoji)</span>
            <input className="input-field mt-1" value={promoForm.icon} onChange={(e) => setPromoForm({ ...promoForm, icon: e.target.value })} />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <input className="input-field mt-1" value={promoForm.description} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Sort order</span>
            <input type="number" className="input-field mt-1" value={promoForm.sortOrder} onChange={(e) => setPromoForm({ ...promoForm, sortOrder: Number(e.target.value) })} />
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>{editingPromoId ? 'Update item' : 'Add item'}</button>
            {editingPromoId && <button type="button" className="btn-secondary" onClick={() => { setEditingPromoId(null); setPromoForm(emptyPromoForm()) }}>Cancel</button>}
          </div>
        </form>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {promos.map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={item.active ? 'active' : 'hidden'} />
                <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => { setEditingPromoId(item.id); setPromoForm({ title: item.title, description: item.description || '', icon: item.icon || '✓', sortOrder: item.sortOrder || 0 }) }}>Edit</button>
                <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={async () => { await setPromoActive({ id: item.id, active: !item.active }); refetchPromos() }}>{item.active ? 'Hide' : 'Show'}</button>
                <button type="button" className="text-xs text-red-600" onClick={async () => { if (!confirm('Delete this promo item?')) return; await deletePromo({ id: item.id }); refetchPromos() }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5 border border-gray-200 dark:border-gray-700 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Middle banner</h2>
          <p className="text-sm text-gray-500 mt-1">Only one banner can be active at a time. It appears below the promo strip on the homepage.</p>
          <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p className="font-medium text-gray-800 dark:text-gray-200">{HOMEPAGE_MIDDLE_BANNER_GUIDE.title}</p>
            <p><span className="font-medium">Size:</span> {HOMEPAGE_MIDDLE_BANNER_GUIDE.dimensions}</p>
            <p><span className="font-medium">Minimum:</span> {HOMEPAGE_MIDDLE_BANNER_GUIDE.minimum}</p>
            <p className="text-xs">{HOMEPAGE_MIDDLE_BANNER_GUIDE.note}</p>
          </div>
        </div>
        <form onSubmit={handleBannerSubmit} className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Title</span>
            <input className="input-field mt-1" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Link (optional)</span>
            <input className="input-field mt-1" value={bannerForm.link} onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })} />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium">Subtitle</span>
            <textarea className="input-field mt-1" rows={2} value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} />
          </label>
          <div className="md:col-span-2">
            <span className="text-sm font-medium block mb-2">Banner image</span>
            <ImageFieldUpload presetId="homepageBanner" variant="banner" value={bannerForm.image} onChange={(image) => setBannerForm({ ...bannerForm, image })} />
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={bannerForm.active} onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })} />
            <span className="text-sm">Active on storefront</span>
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>{editingBannerId ? 'Update banner' : 'Add banner'}</button>
            {editingBannerId && <button type="button" className="btn-secondary" onClick={() => { setEditingBannerId(null); setBannerForm(emptyBannerForm()) }}>Cancel</button>}
          </div>
        </form>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {banners.map((banner) => (
            <div key={banner.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{banner.title || 'Untitled banner'}</p>
                <p className="text-xs text-gray-500 truncate">{banner.subtitle || banner.link || banner.image}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={banner.active ? 'active' : 'hidden'} />
                <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={() => { setEditingBannerId(banner.id); setBannerForm({ title: banner.title || '', subtitle: banner.subtitle || '', image: banner.image, link: banner.link || '', sortOrder: banner.sortOrder || 0, active: !!banner.active }) }}>Edit</button>
                <button type="button" className="btn-secondary text-xs py-1 px-2" onClick={async () => { await setBannerActive({ id: banner.id, active: !banner.active }); refetchBanners() }}>{banner.active ? 'Deactivate' : 'Activate'}</button>
                <button type="button" className="text-xs text-red-600" onClick={async () => { if (!confirm('Delete this banner?')) return; await deleteBanner({ id: banner.id }); refetchBanners() }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
