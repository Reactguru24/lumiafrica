'use client'

import { useMemo, useState } from 'react'
import { MapPinIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

const SUGGESTED_CITIES = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika',
  'Malindi',
]

const DELIVERY_PRESETS = [
  { id: 'same', label: 'Same day', value: 'Same day' },
  { id: '2-4', label: '2–4 business days', value: '2-4 days' },
  { id: '4-6', label: '4–6 business days', value: '4-6 days' },
  { id: '5-7', label: '5–7 business days', value: '5-7 days' },
] as const

export type ShippingLaneFormValues = {
  originCity: string
  destinationCity: string
  fee: number
  estimatedDays: string
}

type Props = {
  saving?: boolean
  initial?: Partial<ShippingLaneFormValues>
  onSubmit: (values: ShippingLaneFormValues) => Promise<void>
}

export function ShippingLaneForm({ saving, initial, onSubmit }: Props) {
  const [originCity, setOriginCity] = useState(initial?.originCity ?? '')
  const [destinationCity, setDestinationCity] = useState(initial?.destinationCity ?? '')
  const [daysMode, setDaysMode] = useState<'preset' | 'other'>('preset')
  const [daysPreset, setDaysPreset] = useState<string>(DELIVERY_PRESETS[1].value)
  const [customDays, setCustomDays] = useState('')
  const [fee, setFee] = useState(String(initial?.fee ?? '350'))

  const resolvedDays = useMemo(() => {
    if (daysMode === 'preset') return daysPreset
    const custom = customDays.trim()
    return custom || ''
  }, [daysMode, daysPreset, customDays])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const origin = originCity.trim()
    const dest = destinationCity.trim()
    if (!origin || !dest) return
    if (!resolvedDays) return
    const cost = fee.trim() === '' ? 0 : Number(fee)
    if (Number.isNaN(cost) || cost < 0) return
    await onSubmit({
      originCity: origin,
      destinationCity: dest,
      fee: cost,
      estimatedDays: resolvedDays,
    })
    if (!initial) {
      setOriginCity('')
      setDestinationCity('')
      setCustomDays('')
      setFee('350')
      setDaysMode('preset')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 sm:p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5">
            <MapPinIcon className="w-4 h-4" /> Origin city (vendor shop)
          </label>
          <input
            list="lane-cities"
            value={originCity}
            onChange={(e) => setOriginCity(e.target.value)}
            placeholder="e.g. Mombasa"
            className="input-field mt-1"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5">
            <ArrowRightIcon className="w-4 h-4" /> Destination city (customer)
          </label>
          <input
            list="lane-cities"
            value={destinationCity}
            onChange={(e) => setDestinationCity(e.target.value)}
            placeholder="e.g. Nairobi"
            className="input-field mt-1"
            required
          />
        </div>
      </div>
      <datalist id="lane-cities">
        {SUGGESTED_CITIES.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Delivery fee (KES)</label>
          <input
            type="number"
            min={0}
            step={1}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="input-field mt-1"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4" /> Estimated delivery
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DELIVERY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`text-xs px-2.5 py-1 rounded-full border ${daysMode === 'preset' && daysPreset === p.value ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900' : 'border-gray-300 dark:border-gray-700'}`}
                onClick={() => { setDaysMode('preset'); setDaysPreset(p.value) }}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className={`text-xs px-2.5 py-1 rounded-full border ${daysMode === 'other' ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900' : 'border-gray-300 dark:border-gray-700'}`}
              onClick={() => setDaysMode('other')}
            >
              Custom
            </button>
          </div>
          {daysMode === 'other' && (
            <input
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              placeholder="e.g. 3-7 business days"
              className="input-field mt-2"
            />
          )}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Saving…' : initial ? 'Update lane' : 'Add lane'}
      </button>
    </form>
  )
}
