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
  useCreateAdminCollection,
  useUpdateAdminCollection,
  useSetAdminCollectionActive,
} from '@/lib/stores/api'
import { unwrapItems, unwrapPaginated } from '@/lib/utils/api'
import type { Product } from '@/lib/types'

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
  type: 'seasonal',
  discountType: 'percentage',
  discountValue: 10,
  productIds: [] as string[],
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
  const createCollection = useCreateAdminCollection().mutate
  const updateCollection = useUpdateAdminCollection().mutate
  const setCollectionActive = useSetAdminCollectionActive().mutate

  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null)
  const [couponModalValues, setCouponModalValues] = useState(emptyCouponForm())
  const [promoForm, setPromoForm] = useState(emptyPromoForm)
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)
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
      discountType: promoForm.discountType,
      discountValue: promoForm.discountValue,
      startsAt: toRFC3339(promoForm.startsAt),
      endsAt: toRFC3339(promoForm.endsAt),
      productIds: promoForm.productIds,
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
      await refetchPromos()
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to save promotion'))
    } finally {
      setSaving(false)
    }
  }

  function startEditPromo(p: any) {
    setEditingPromoId(p.id)
    setPromoForm({
      name: p.name,
      type: p.type,
      discountType: p.discountType,
      discountValue: p.discountValue,
      startsAt: fromISO(p.startsAt),
      endsAt: fromISO(p.endsAt),
      productIds: p.productIds ?? [],
    })
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
        subtitle="Manage coupons, promotions, and curated collections."
      />

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold">Coupons</h2>
          <button type="button" className="btn-primary text-sm py-2" onClick={openCreateCoupon}>
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
        <h2 className="font-semibold mb-4">{editingPromoId ? 'Edit promotion' : 'New promotion'}</h2>
        <form className="space-y-4 mb-6" onSubmit={handlePromoSubmit}>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input-field" placeholder="Name" required value={promoForm.name} onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })} />
            <select className="input-field" value={promoForm.type} onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value })}>
              <option value="flash_sale">Flash sale</option>
              <option value="seasonal">Seasonal</option>
              <option value="clearance">Clearance</option>
            </select>
            <select className="input-field" value={promoForm.discountType} onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value })}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
            <input className="input-field" type="number" required placeholder="Discount value" value={promoForm.discountValue} onChange={(e) => setPromoForm({ ...promoForm, discountValue: Number(e.target.value) })} />
            <input className="input-field" type="datetime-local" required value={promoForm.startsAt} onChange={(e) => setPromoForm({ ...promoForm, startsAt: e.target.value })} />
            <input className="input-field" type="datetime-local" required value={promoForm.endsAt} onChange={(e) => setPromoForm({ ...promoForm, endsAt: e.target.value })} />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Products ({promoForm.productIds.length} selected)</p>
            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoForm.productIds.includes(p.id)}
                    onChange={() => setPromoForm({ ...promoForm, productIds: toggleProductId(promoForm.productIds, p.id) })}
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
              {products.length === 0 && <p className="text-xs text-gray-500">No products available.</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingPromoId ? 'Update promotion' : 'Create promotion'}</button>
            {editingPromoId && (
              <button type="button" className="btn-secondary" onClick={() => { setEditingPromoId(null); setPromoForm(emptyPromoForm()) }}>Cancel</button>
            )}
          </div>
        </form>
        <ul className="space-y-3">
          {promotions.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-gray-500">{p.type} · {p.discountType} {p.discountValue} · {p.productIds?.length ?? 0} products</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{p.active ? 'Active' : 'Inactive'}</span>
                <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => startEditPromo(p)}>Edit</button>
                <button type="button" className="text-xs btn-secondary py-1 px-2" onClick={() => togglePromo(p.id, p.active)}>
                  {p.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </li>
          ))}
        </ul>
        {promotions.length === 0 && <p className="text-gray-500 text-sm">No promotions yet.</p>}
      </section>

      <section className="card p-6">
        <h2 className="font-semibold mb-4">{editingCollectionId ? 'Edit collection' : 'New collection'}</h2>
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
              <input
                className="input-field mt-2"
                placeholder="Or paste image URL"
                value={collectionForm.image}
                onChange={(e) => setCollectionForm({ ...collectionForm, image: e.target.value })}
              />
            </div>
            <textarea className="input-field md:col-span-2 min-h-[72px]" placeholder="Description" value={collectionForm.description} onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })} />
            <input className="input-field" type="number" placeholder="Sort order" value={collectionForm.sortOrder} onChange={(e) => setCollectionForm({ ...collectionForm, sortOrder: Number(e.target.value) })} />
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
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingCollectionId ? 'Update collection' : 'Create collection'}</button>
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
        {collections.length === 0 && <p className="text-gray-500 text-sm">No collections yet.</p>}
      </section>
    </div>
  )
}
