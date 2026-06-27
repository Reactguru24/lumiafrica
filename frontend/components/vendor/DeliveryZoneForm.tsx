'use client'

import { useMemo, useState } from 'react'
import { MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'

const SUGGESTED_CITIES = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika',
  'Malindi',
  'Kampala',
  'Dar es Salaam',
  'Kigali',
]

const DELIVERY_PRESETS = [
  { id: '2-4', label: '2–4 business days', value: '2-4 days' },
  { id: '4-6', label: '4–6 business days', value: '4-6 days' },
  { id: '5-7', label: '5–7 business days', value: '5-7 days' },
] as const

export type DeliveryZoneFormValues = {
  name: string
  estimatedDays: string
  baseCost: number
  cityName: string
}

type Props = {
  saving?: boolean
  onSubmit: (values: DeliveryZoneFormValues) => Promise<void>
}

export function DeliveryZoneForm({ saving, onSubmit }: Props) {
  const [nameMode, setNameMode] = useState<'city' | 'other'>('city')
  const [cityName, setCityName] = useState('')
  const [customName, setCustomName] = useState('')
  const [daysMode, setDaysMode] = useState<'preset' | 'other'>('preset')
  const [daysPreset, setDaysPreset] = useState<string>(DELIVERY_PRESETS[0].value)
  const [customDays, setCustomDays] = useState('')
  const [baseCost, setBaseCost] = useState('500')

  const resolvedName = useMemo(() => {
    if (nameMode === 'city') {
      const city = cityName.trim()
      return city ? `${city} Metro` : ''
    }
    return customName.trim()
  }, [nameMode, cityName, customName])

  const resolvedDays = useMemo(() => {
    if (daysMode === 'preset') return daysPreset
    const custom = customDays.trim()
    return custom || ''
  }, [daysMode, daysPreset, customDays])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedName) return
    if (!resolvedDays) return
    const cost = baseCost.trim() === '' ? 0 : Number(baseCost)
    if (Number.isNaN(cost) || cost < 0) return
    await onSubmit({
      name: resolvedName,
      estimatedDays: resolvedDays,
      baseCost: cost,
      cityName: nameMode === 'city' ? cityName.trim() : customName.trim(),
    })
    setCityName('')
    setCustomName('')
    setCustomDays('')
    setBaseCost('500')
    setNameMode('city')
    setDaysMode('preset')
  }

  return (
    <form className="space-y-5 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5 bg-gray-50/60 dark:bg-gray-900/40" onSubmit={handleSubmit}>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPinIcon className="w-4 h-4 text-brand-teal" />
          <p className="text-sm font-medium">Zone name</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <label
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
              nameMode === 'city'
                ? 'border-brand-teal bg-brand-teal/5 dark:bg-brand-teal/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="nameMode"
              className="mt-1"
              checked={nameMode === 'city'}
              onChange={() => setNameMode('city')}
            />
            <span>
              <span className="text-sm font-medium block">City / metro</span>
              <span className="text-xs text-gray-500">Type a city — we append “Metro” for the label</span>
            </span>
          </label>
          <label
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
              nameMode === 'other'
                ? 'border-brand-teal bg-brand-teal/5 dark:bg-brand-teal/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="nameMode"
              className="mt-1"
              checked={nameMode === 'other'}
              onChange={() => setNameMode('other')}
            />
            <span>
              <span className="text-sm font-medium block">Other region</span>
              <span className="text-xs text-gray-500">Custom name for wider areas</span>
            </span>
          </label>
        </div>
        {nameMode === 'city' ? (
          <div>
            <input
              className="input-field"
              list="delivery-zone-cities"
              placeholder="e.g. Nairobi"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              required
            />
            <datalist id="delivery-zone-cities">
              {SUGGESTED_CITIES.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            {cityName.trim() && (
              <p className="text-xs text-gray-500 mt-1.5">
                Shown to customers as: <span className="font-medium text-gray-700 dark:text-gray-300">{resolvedName}</span>
              </p>
            )}
          </div>
        ) : (
          <input
            className="input-field"
            placeholder="e.g. Western Kenya, Upcountry, Rest of East Africa"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            required
          />
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon className="w-4 h-4 text-brand-teal" />
          <p className="text-sm font-medium">Estimated delivery</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <label
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors sm:col-span-1 ${
              daysMode === 'preset'
                ? 'border-brand-teal bg-brand-teal/5 dark:bg-brand-teal/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="daysMode"
              className="mt-1"
              checked={daysMode === 'preset'}
              onChange={() => setDaysMode('preset')}
            />
            <span>
              <span className="text-sm font-medium block">Standard window</span>
              <span className="text-xs text-gray-500">Pick a common range</span>
            </span>
          </label>
          <label
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
              daysMode === 'other'
                ? 'border-brand-teal bg-brand-teal/5 dark:bg-brand-teal/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="daysMode"
              className="mt-1"
              checked={daysMode === 'other'}
              onChange={() => setDaysMode('other')}
            />
            <span>
              <span className="text-sm font-medium block">Other</span>
              <span className="text-xs text-gray-500">Type your own estimate</span>
            </span>
          </label>
        </div>
        {daysMode === 'preset' ? (
          <select className="input-field" value={daysPreset} onChange={(e) => setDaysPreset(e.target.value)}>
            {DELIVERY_PRESETS.map((p) => (
              <option key={p.id} value={p.value}>{p.label}</option>
            ))}
          </select>
        ) : (
          <input
            className="input-field"
            placeholder="e.g. 7-10 days, Same day in Nairobi CBD"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            required
          />
        )}
      </div>

      <div className="max-w-xs">
        <label className="text-sm font-medium block mb-1.5">Shipping fee (KES)</label>
        <input
          type="number"
          min={0}
          step={50}
          className="input-field"
          value={baseCost}
          onChange={(e) => setBaseCost(e.target.value)}
          placeholder="500"
        />
        <p className="text-xs text-gray-500 mt-1">Charged once per order from your store for this zone.</p>
      </div>

      <button type="submit" className="btn-primary" disabled={saving || !resolvedName || !resolvedDays}>
        {saving ? 'Adding...' : 'Add delivery zone'}
      </button>
    </form>
  )
}
