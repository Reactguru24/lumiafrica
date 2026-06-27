'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { CouponModal, couponFormToPayload, couponToFormValues, emptyCouponForm } from '@/components/admin/CouponModal'
import { ImageFieldUpload } from '@/components/common/ImageFieldUpload'
import { formatCurrency } from '@/lib/utils/storage'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import {
  useAdminCoupons,
  useAdminPromotions,
  useAdminCollections,
  useAdminProducts,
  useCreateAdminCoupon,
  useUpdateAdminCoupon,
  useSetAdminCouponActive,
  useCreateAdminPromotion,
  useUpdateAdminPromotion,
  useSetAdminPromotionActive,
  useDeleteAdminPromotion,
  useCreateAdminCollection,
  useUpdateAdminCollection,
  useSetAdminCollectionActive,
} from '@/lib/stores/api'
import { unwrapItems, unwrapPaginated } from '@/lib/utils/api'
import { formatDateTime } from '@/lib/utils/storage'
import type { Product } from '@/lib/types'
import { StatusBadge } from '@/components/common/StatusBadge'
import { isStorefrontPromotionVisible, promotionStatus, PROMO_TYPE_LABELS } from '@/lib/utils/promotions'

function toRFC3339(local: string) {
  if (!local) return new Date().toISOString()
  return new Date(local).toISOString()
}

function fromISO(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultPromoWindow() {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 30)
  return { startsAt: fromISO(start.toISOString()), endsAt: fromISO(end.toISOString()) }
}

const emptyPromoForm = () => ({
  name: '',
  type: 'flash_sale',
  ...defaultPromoWindow(),
})

const emptyCollectionForm = () => ({
  name: '',
  slug: '',
  description: '',
  image: '',
  sortOrder: 0,
  startsAt: '',
  endsAt: '',
  productIds: [] as string[],
})

export default function AdminCommercePage() {
  const { data: couponsData, refetch: refetchCoupons } = useAdminCoupons()
  const { data: promosData, refetch: refetchPromos } = useAdminPromotions()
  const { data: collectionsData, refetch: refetchCollections } = useAdminCollections()
  const { data: productsData } = useAdminProducts(1, 100)

  const createCoupon = useCreateAdminCoupon().mutate
  const updateCoupon = useUpdateAdminCoupon().mutate
  const setCouponActive = useSetAdminCouponActive().mutate
  const createPromotion = useCreateAdminPromotion().mutate
  const updatePromotion = useUpdateAdminPromotion().mutate
  const setPromotionActive = useSetAdminPromotionActive().mutate
  const deletePromotion = useDeleteAdminPromotion().mutate
  const createCollection = useCreateAdminCollection().mutate
  const updateCollection = useUpdateAdminCollection().mutate
  const setCollectionActive = useSetAdminCollectionActive().mutate

  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null)
  const [couponModalValues, setCouponModalValues] = useState(emptyCouponForm())
  const [promoForm, setPromoForm] = useState(emptyPromoForm)
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)
  const [promoFormOpen, setPromoFormOpen] = useState(false)
  const [collectionForm, setCollectionForm] = useState(emptyCollectionForm)
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const coupons = unwrapItems(couponsData) as any[]
  const promotions = unwrapItems(promosData) as any[]
  const collections = unwrapItems(collectionsData) as any[]
  const { items: products } = unwrapPaginated<Product>(productsData)

  function openCreateCoupon() {
    setEditingCoupon(null)
    setCouponModalValues(emptyCouponForm())
    setCouponModalOpen(true)
  }

  function openEditCoupon(coupon: any) {
    setEditingCoupon(coupon)
    setCouponModalValues(couponToFormValues(coupon))
    setCouponModalOpen(true)
  }

  async function handleCouponSubmit(values: ReturnType<typeof emptyCouponForm>) {
    setSaving(true)
    const payload = couponFormToPayload(values)
    try {
      if (editingCoupon) {
        await updateCoupon({ id: editingCoupon.id, payload })
        toast.success('Coupon updated')
      } else {
        await createCoupon(payload)
        toast.success('Coupon created')
      }
      setCouponModalOpen(false)
      setEditingCoupon(null)
      await refetchCoupons()
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, editingCoupon ? 'Failed to update coupon' : 'Failed to create coupon'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleCoupon(id: string, active: boolean) {
    try {
      await setCouponActive({ id, active: !active })
      await refetchCoupons()
      toast.success('Coupon updated')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update coupon'))
    }
  }

  function toggleProductId(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }

  async function handlePromoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: promoForm.name,
      type: promoForm.type,
      startsAt: toRFC3339(promoForm.startsAt),
      endsAt: toRFC3339(promoForm.endsAt),
    }
    try {
      if (editingPromoId) {
        await updatePromotion({ id: editingPromoId, payload })
        toast.success('Promotion updated')
      } else {
        await createPromotion(payload)
        toast.success('Promotion created')
      }
      setPromoForm(emptyPromoForm())
      setEditingPromoId(null)
      setPromoFormOpen(false)
      await refetchPromos()
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save promotion'))
    } finally {
      setSaving(false)
    }
  }

  function startEditPromo(p: any) {
    setEditingPromoId(p.id)
    setPromoFormOpen(true)
    setPromoForm({
      name: p.name,
      type: p.type,
      startsAt: fromISO(p.startsAt),
      endsAt: fromISO(p.endsAt),
    })
  }

  function openCreatePromo() {
    setEditingPromoId(null)
    setPromoForm(emptyPromoForm())
    setPromoFormOpen(true)
  }

  function closePromoForm() {
    setEditingPromoId(null)
    setPromoFormOpen(false)
    setPromoForm(emptyPromoForm())
  }

  async function togglePromo(id: string, active: boolean) {
    try {
      await setPromotionActive({ id, active: !active })
      await refetchPromos()
      toast.success('Promotion updated')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update promotion'))
    }
  }

  async function removePromo(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This removes the campaign from admin and the storefront.`)) return
    try {
      await deletePromotion({ id })
      if (editingPromoId === id) closePromoForm()
      await refetchPromos()
      toast.success('Promotion deleted')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to delete promotion'))
    }
  }

  async function handleCollectionSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: collectionForm.name,
      slug: collectionForm.slug,
      description: collectionForm.description,
      image: collectionForm.image,
      sortOrder: collectionForm.sortOrder,
      startsAt: collectionForm.startsAt ? toRFC3339(collectionForm.startsAt) : undefined,
      endsAt: collectionForm.endsAt ? toRFC3339(collectionForm.endsAt) : undefined,
      productIds: collectionForm.productIds,
    }
    try {
      if (editingCollectionId) {
        await updateCollection({ id: editingCollectionId, payload })
        toast.success('Collection updated')
      } else {
        await createCollection(payload)
        toast.success('Collection created')
      }
      setCollectionForm(emptyCollectionForm())
      setEditingCollectionId(null)
      await refetchCollections()
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save collection'))
    } finally {
      setSaving(false)
    }
  }

  function startEditCollection(c: any) {
    setEditingCollectionId(c.id)
    setCollectionForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? '',
      image: c.image ?? '',
      sortOrder: c.sortOrder ?? 0,
      startsAt: fromISO(c.startsAt),
      endsAt: fromISO(c.endsAt),
      productIds: c.productIds ?? [],
    })
  }

  async function toggleCollection(id: string, active: boolean) {
    try {
      await setCollectionActive({ id, active: !active })
      await refetchCollections()
      toast.success('Collection updated')
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update collection'))
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <AdminPageHeader
        title="Commerce"
        subtitle="Run sale campaigns, curated collections, and checkout coupons."
      />

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold">Promotions</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Create a time-boxed sale campaign. Products are picked automatically — any active listing with a vendor discount is included.
            </p>
          </div>
          {!promoFormOpen && (
            <button type="button" className="btn-primary text-sm py-2 shrink-0" onClick={openCreatePromo}>
              New promotion
            </button>
          )}
        </div>

        <div className="mb-6 rounded-lg border border-brand-teal/30 bg-brand-teal/5 dark:bg-brand-teal/10 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-white mb-1">How it works</p>
          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
            <li>Vendors set discounts on their product variants (vendor → Products).</li>
            <li>You only set the campaign name, type, and start/end dates here.</li>
            <li>While live, the homepage shows a promotion card linking to all discounted items.</li>
            <li>Deactivate or wait for the end date to remove it from the storefront.</li>
          </ul>
        </div>

        {promoFormOpen && (
          <form className="space-y-4 mb-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/40" onSubmit={handlePromoSubmit}>
            <h3 className="font-medium text-sm">{editingPromoId ? 'Edit promotion' : 'Create promotion'}</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Campaign name</label>
                <input
                  className="input-field"
                  placeholder="e.g. Summer flash sale"
                  required
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Type</label>
                <select className="input-field" value={promoForm.type} onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })}>
                  <option value="flash_sale">Flash sale</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="clearance">Clearance</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Starts</label>
                <input
                  className="input-field"
                  type="datetime-local"
                  required
                  value={promoForm.startsAt}
                  onChange={(e) => setPromoForm({ ...promoForm, startsAt: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ends</label>
                <input
                  className="input-field"
                  type="datetime-local"
                  required
                  value={promoForm.endsAt}
                  onChange={(e) => setPromoForm({ ...promoForm, endsAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingPromoId ? 'Save changes' : 'Create promotion'}
              </button>
              <button type="button" className="btn-secondary" onClick={closePromoForm}>Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Schedule</th>
                <th className="pb-2 pr-4 font-medium">Products</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => {
                const { label, status } = promotionStatus(p)
                const visible = isStorefrontPromotionVisible(p)
                return (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.name}</p>
                      {visible && (
                        <a
                          href={`/promotions/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-teal hover:underline mt-0.5 inline-block"
                        >
                          View on storefront
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-4 capitalize">{PROMO_TYPE_LABELS[p.type] ?? p.type?.replace('_', ' ')}</td>
                    <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                      {p.startsAt ? formatDateTime(p.startsAt) : '—'}
                      <br />
                      <span className="text-gray-400">to</span>{' '}
                      {p.endsAt ? formatDateTime(p.endsAt) : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">{p.productIds?.length ?? 0}</span>
                      <p className="text-xs text-gray-500">discounted</p>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={status} />
                      <p className="text-xs text-gray-500 mt-1">{label}</p>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => startEditPromo(p)}>
                          Edit
                        </button>
                        <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => togglePromo(p.id, p.active)}>
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" className="text-xs text-red-600 hover:underline py-1 px-2" onClick={() => removePromo(p.id, p.name)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {promotions.length === 0 && (
            <p className="text-gray-500 text-sm py-6 text-center">No promotions yet. Create one to highlight discounted products on the homepage.</p>
          )}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold">Checkout coupons</h2>
            <p className="text-sm text-gray-500 mt-1">Discount codes shoppers enter at checkout — separate from homepage promotions.</p>
          </div>
          <button type="button" className="btn-primary text-sm py-2 shrink-0" onClick={openCreateCoupon}>
            New coupon
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Code</th><th>Type</th><th>Value</th><th>Uses</th><th>Status</th><th /></tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 font-medium">{c.code}</td>
                  <td>{c.type}</td>
                  <td>{c.type === 'percentage' ? `${c.value}%` : formatCurrency(c.value)}</td>
                  <td>{c.usesCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                  <td>{c.active ? 'Active' : 'Inactive'}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => openEditCoupon(c)}>
                        Edit
                      </button>
                      <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => toggleCoupon(c.id, c.active)}>
                        {c.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coupons.length === 0 && <p className="text-gray-500 text-sm py-4">No coupons yet.</p>}
        </div>
      </section>

      <CouponModal
        open={couponModalOpen}
        editingCoupon={editingCoupon}
        initialValues={couponModalValues}
        saving={saving}
        onClose={() => {
          setCouponModalOpen(false)
          setEditingCoupon(null)
        }}
        onSubmit={handleCouponSubmit}
      />

      <section className="card p-6">
        <h2 className="font-semibold mb-1">{editingCollectionId ? 'Edit curated collection' : 'Curated collection'}</h2>
        <p className="text-sm text-gray-500 mb-4">Hand-picked product groups shown on the homepage under Curated Collections.</p>
        <form className="space-y-4 mb-6" onSubmit={handleCollectionSubmit}>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input-field" placeholder="Name" required value={collectionForm.name} onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })} />
            <input className="input-field" placeholder="Slug" required value={collectionForm.slug} onChange={(e) => setCollectionForm({ ...collectionForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
            <div className="md:col-span-2">
              <p className="text-sm font-medium mb-2">Cover image</p>
              <ImageFieldUpload
                presetId="banner"
                variant="banner"
                value={collectionForm.image}
                onChange={(url) => setCollectionForm({ ...collectionForm, image: url })}
              />
              <p className="text-xs text-gray-500 mt-2">Upload a banner from your device. Images are stored on Cloudinary after upload.</p>
            </div>
            <textarea className="input-field md:col-span-2 min-h-[72px]" placeholder="Description" value={collectionForm.description} onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })} />
            <div>
              <label className="text-xs text-gray-500 block mb-1">Homepage order</label>
              <input
                className="input-field"
                type="number"
                min={0}
                placeholder="1"
                value={collectionForm.sortOrder}
                onChange={(e) => setCollectionForm({ ...collectionForm, sortOrder: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first on the homepage (max 4 collections shown).</p>
            </div>
            <div className="md:col-span-2 grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Visible from (optional)</label>
                <input className="input-field" type="datetime-local" value={collectionForm.startsAt} onChange={(e) => setCollectionForm({ ...collectionForm, startsAt: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Visible until (optional)</label>
                <input className="input-field" type="datetime-local" value={collectionForm.endsAt} onChange={(e) => setCollectionForm({ ...collectionForm, endsAt: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Products ({collectionForm.productIds.length} selected)</p>
            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={collectionForm.productIds.includes(p.id)}
                    onChange={() => setCollectionForm({ ...collectionForm, productIds: toggleProductId(collectionForm.productIds, p.id) })}
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingCollectionId ? 'Update curated collection' : 'Create curated collection'}</button>
            {editingCollectionId && (
              <button type="button" className="btn-secondary" onClick={() => { setEditingCollectionId(null); setCollectionForm(emptyCollectionForm()) }}>Cancel</button>
            )}
          </div>
        </form>
        <ul className="space-y-3">
          {collections.map((c) => (
            <li key={c.id} className="flex flex-wrap justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-gray-500">
                  /{c.slug} · {c.productIds?.length ?? 0} products
                  {(c.startsAt || c.endsAt) && (
                    <> · {c.startsAt ? new Date(c.startsAt).toLocaleDateString() : 'always'} – {c.endsAt ? new Date(c.endsAt).toLocaleDateString() : 'open'}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{c.active ? 'Active' : 'Inactive'}</span>
                <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => startEditCollection(c)}>Edit</button>
                <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => toggleCollection(c.id, c.active)}>
                  {c.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {collections.length === 0 && <p className="text-gray-500 text-sm">No curated collections yet.</p>}
      </section>
    </div>
  )
}
