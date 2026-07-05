import { useMemo } from 'react'
import { create } from 'zustand'
import { setStorage } from '@/lib/utils/storage'
import { FREE_SHIPPING_KES } from '@/lib/constants/commerce'

export type CurrencyCode = 'KES' | 'USD' | 'UGX' | 'TZS' | 'RWF' | 'ETB'

export interface CurrencyOption {
  code: CurrencyCode
  name: string
  locale: string
  rateFromKes: number
  fractionDigits: number
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'KES', name: 'Kenyan Shilling', locale: 'en-KE', rateFromKes: 1, fractionDigits: 0 },
  { code: 'USD', name: 'US Dollar', locale: 'en-US', rateFromKes: 1 / 130, fractionDigits: 2 },
  { code: 'UGX', name: 'Ugandan Shilling', locale: 'en-UG', rateFromKes: 29, fractionDigits: 0 },
  { code: 'TZS', name: 'Tanzanian Shilling', locale: 'en-TZ', rateFromKes: 19, fractionDigits: 0 },
  { code: 'RWF', name: 'Rwandan Franc', locale: 'en-RW', rateFromKes: 10, fractionDigits: 0 },
  { code: 'ETB', name: 'Ethiopian Birr', locale: 'en-ET', rateFromKes: 0.45, fractionDigits: 2 },
]

const CURRENCY_KEY = 'lumi_currency'

interface CurrencyState {
  currency: CurrencyCode
  current: CurrencyOption
  freeShippingThreshold: number
  freeShippingThresholdKes: number
  setCurrency: (code: CurrencyCode) => void
  convertFromKes: (amountKes: number) => number
  format: (amountKes: number) => string
  hydrate: () => void
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: 'KES',
  current: CURRENCIES[0],
  freeShippingThresholdKes: FREE_SHIPPING_KES,
  freeShippingThreshold: FREE_SHIPPING_KES,

  hydrate: () => {
    // Platform prices are stored in KES; keep display currency fixed to KES.
    const currency: CurrencyCode = 'KES'
    const current = CURRENCIES[0]
    setStorage(CURRENCY_KEY, currency)
    set({
      currency,
      current,
      freeShippingThreshold: FREE_SHIPPING_KES,
    })
  },

  setCurrency: (_code) => {
    // Ignore user changes — storefront uses KES only.
    const currency: CurrencyCode = 'KES'
    const current = CURRENCIES[0]
    setStorage(CURRENCY_KEY, currency)
    set({
      currency,
      current,
      freeShippingThreshold: FREE_SHIPPING_KES,
    })
  },

  convertFromKes: (amountKes) => amountKes * get().current.rateFromKes,

  format: (amountKes) => {
    const { currency, current } = get()
    const converted = amountKes * current.rateFromKes
    return new Intl.NumberFormat(current.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: current.fractionDigits,
      maximumFractionDigits: current.fractionDigits,
    }).format(converted)
  },
}))

/** Reactive formatter hook — re-renders when currency changes. */
export function useFormatCurrency() {
  const currency = useCurrencyStore((s) => s.currency)
  const format = useCurrencyStore((s) => s.format)
  return useMemo(() => (amountKes: number) => format(amountKes), [currency, format])
}

/** Reactive single price string. */
export function useFormattedPrice(amountKes: number): string {
  const formatPrice = useFormatCurrency()
  return useMemo(() => formatPrice(amountKes), [formatPrice, amountKes])
}
