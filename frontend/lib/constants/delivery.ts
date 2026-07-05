/** Fallback cities when the API is unavailable (matches seeded shipping lanes). */
export const DEFAULT_DELIVERY_CITIES = [
  'Eldoret',
  'Kisumu',
  'Mombasa',
  'Nairobi',
  'Nakuru',
] as const

export const DELIVERY_CITY_STORAGE_KEY = 'lumi_delivery_city'

export function readStoredDeliveryCity(): string {
  if (typeof window === 'undefined') return 'Nairobi'
  return sessionStorage.getItem(DELIVERY_CITY_STORAGE_KEY) || 'Nairobi'
}

export function storeDeliveryCity(city: string) {
  if (typeof window === 'undefined' || !city) return
  sessionStorage.setItem(DELIVERY_CITY_STORAGE_KEY, city)
}
