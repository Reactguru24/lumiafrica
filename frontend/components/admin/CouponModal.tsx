'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'

export type CouponFormValues = {
  code: string
  type: string
  value: number
  minOrderAmount: number
  maxDiscount: number | ''
  maxUses: number | ''
  perUserLimit: number
  startsAt: string
  expiresAt: string
}

export const emptyCouponForm = (): CouponFormValues => ({
  code: '',
  type: 'percentage',
  value: 10,
  minOrderAmount: 0,
  maxDiscount: '',
  maxUses: '',
  perUserLimit: 1,
  startsAt: '',
  expiresAt: '',
})

function fromISO(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toRFC3339(local: string) {
  if (!local) return undefined
  return new Date(local).toISOString()
}

export function couponToFormValues(coupon: any): CouponFormValues {
  return {
    code: coupon.code ?? '',
    type: coupon.type ?? 'percentage',
    value: Number(coupon.value ?? 0),
    minOrderAmount: Number(coupon.minOrderAmount ?? 0),
    maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : '',
    maxUses: coupon.maxUses != null ? Number(coupon.maxUses) : '',
    perUserLimit: Number(coupon.perUserLimit ?? 1),
    startsAt: fromISO(coupon.startsAt),
    expiresAt: fromISO(coupon.expiresAt),
  }
}

export function couponFormToPayload(form: CouponFormValues) {
  return {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: form.value,
    minOrderAmount: form.minOrderAmount,
    perUserLimit: form.perUserLimit,
    maxDiscount: form.maxDiscount === '' ? undefined : form.maxDiscount,
    maxUses: form.maxUses === '' ? undefined : form.maxUses,
    startsAt: toRFC3339(form.startsAt),
    expiresAt: toRFC3339(form.expiresAt),
  }
}

type CouponModalProps = {
  open: boolean
  editingCoupon?: { id: string } | null
  initialValues?: CouponFormValues
  saving?: boolean
  onClose: () => void
  onSubmit: (values: CouponFormValues) => Promise<void>
}

export function CouponModal({
  open,
  editingCoupon,
  initialValues,
  saving = false,
  onClose,
  onSubmit,
}: CouponModalProps) {
  const [form, setForm] = useState<CouponFormValues>(emptyCouponForm())

  useEffect(() => {
    if (open) {
      setForm(initialValues ?? emptyCouponForm())
    }
  }, [open, initialValues])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <Modal
      open={open}
      title={editingCoupon ? 'Edit coupon' : 'Create coupon'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="coupon-modal-form" className="btn-primary w-full sm:w-auto" disabled={saving}>
            {saving ? 'Saving...' : editingCoupon ? 'Update coupon' : 'Create coupon'}
          </button>
        </>
      }
    >
      <form id="coupon-modal-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Code</label>
            <input
              className="input-field"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="WELCOME10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Value</label>
            <input
              className="input-field"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.value}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Minimum order amount</label>
            <input
              className="input-field"
              type="number"
              min={0}
              step="0.01"
              value={form.minOrderAmount}
              onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Max discount (optional)</label>
            <input
              className="input-field"
              type="number"
              min={0}
              step="0.01"
              value={form.maxDiscount}
              onChange={(e) => setForm({ ...form, maxDiscount: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="For percentage coupons"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Max total uses (optional)</label>
            <input
              className="input-field"
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value === '' ? '' : Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Per-user limit</label>
            <input
              className="input-field"
              type="number"
              min={1}
              required
              value={form.perUserLimit}
              onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Starts at (optional)</label>
            <input
              className="input-field"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Expires at (optional)</label>
            <input
              className="input-field"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Coupons are validated at checkout against order subtotal, active dates, and usage limits.
        </p>
      </form>
    </Modal>
  )
}
