'use client'

import { useCurrencyStore, type CurrencyCode, CURRENCIES } from '@/lib/stores/currency'

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrencyStore()

  return (
    <select
      value={currency}
      className="control-select"
      aria-label="Select currency"
      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code}
        </option>
      ))}
    </select>
  )
}
