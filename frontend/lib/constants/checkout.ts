export const DELIVERY_ZONE_STORAGE_KEY = 'lumi_delivery_zone_id'

export function readStoredDeliveryZoneId(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(DELIVERY_ZONE_STORAGE_KEY) || ''
}

export function storeDeliveryZoneId(zoneId: string) {
  if (typeof window === 'undefined' || !zoneId) return
  sessionStorage.setItem(DELIVERY_ZONE_STORAGE_KEY, zoneId)
}
