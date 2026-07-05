'use client'

import { useEffect, useMemo } from 'react'
import { useDeliveryCities } from '@/lib/stores/api'
import { DEFAULT_DELIVERY_CITIES, storeDeliveryCity } from '@/lib/constants/delivery'

type Props = {
  value: string
  onChange: (city: string) => void
  label?: string
  compact?: boolean
  className?: string
  id?: string
  error?: string
  persist?: boolean
}

export function DeliveryCitySelect({
  value,
  onChange,
  label = 'Delivery zone',
  compact,
  className = '',
  id = 'delivery-city',
  error,
  persist = true,
}: Props) {
  const { data, loading } = useDeliveryCities()
  const cities = useMemo(() => {
    const fromApi = Array.isArray(data) ? (data as string[]).filter(Boolean) : []
    if (fromApi.length > 0) return fromApi
    return [...DEFAULT_DELIVERY_CITIES]
  }, [data])

  useEffect(() => {
    if (!cities.length) return
    if (!value || !cities.includes(value)) {
      const next = cities[0]
      onChange(next)
      if (persist) storeDeliveryCity(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync invalid/missing selection once cities load
  }, [cities])

  function handleChange(next: string) {
    onChange(next)
    if (persist) storeDeliveryCity(next)
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={`block font-medium ${compact ? 'text-xs sm:text-sm' : 'text-sm'} mb-1`}>
          {label}
        </label>
      )}
      <select
        id={id}
        value={value || cities[0] || ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading && cities.length === 0}
        className={`input-field w-full ${compact ? 'input-compact' : ''}`}
      >
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
