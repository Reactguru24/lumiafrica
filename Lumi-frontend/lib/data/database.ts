import type { AppData, VendorSubscription } from '@/lib/types'
import { generateSeedData } from '@/lib/data/seed'
import { getFeaturedListingPlan } from '@/lib/constants/subscriptions'
import { notifyLocalDataChange } from '@/lib/data/events'
import { getAppDataKey, getStorage, setStorage } from '@/lib/utils/storage'
import { categoryClothingImage, storeLogoImage, storeBannerImage } from '@/lib/utils/images'

const DATA_VERSION = 3
const VERSION_KEY = 'lumi_data_version'

let cache: AppData | null = null

function needsImageMigration(url: string): boolean {
  return url.includes('picsum.photos')
}

function migrateImages(data: AppData): AppData {
  data.vendors.forEach((v, i) => {
    if (needsImageMigration(v.logo)) v.logo = storeLogoImage(i)
    if (needsImageMigration(v.banner)) v.banner = storeBannerImage(i)
  })
  data.products.forEach((p, i) => {
    p.images = p.images.map((img, j) =>
      needsImageMigration(img) ? categoryClothingImage(p.category, i * 5 + j) : img
    )
  })
  data.vendorApplications.forEach((a, i) => {
    if (needsImageMigration(a.logo)) a.logo = storeLogoImage(i + 10)
  })
  return data
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function migrateVendorSubscriptions(data: AppData): AppData {
  if (data.vendorSubscriptions?.length) return data

  const demoVendorId = data.vendors.find((v) => v.userId === 'vendor-demo')?.id
  const subscriptions: VendorSubscription[] = data.vendors
    .filter((v) => v.id !== demoVendorId && !v.suspended)
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 6)
    .map((vendor, i) => {
      const planIds = ['monthly', 'quarterly', 'biannual', 'yearly', 'biannual', 'quarterly'] as const
      const plan = getFeaturedListingPlan(planIds[i % planIds.length])
      const startedAt = new Date()
      startedAt.setDate(startedAt.getDate() - 15)
      return {
        id: `sub-migrated-${vendor.id}`,
        vendorId: vendor.id,
        plan: plan.id,
        amountPaid: plan.priceKes,
        startedAt: startedAt.toISOString(),
        expiresAt: addMonths(startedAt, plan.durationMonths).toISOString(),
        active: true,
        paymentMethod: 'M-Pesa',
      }
    })

  data.vendorSubscriptions = subscriptions
  return data
}

export function getDatabase(): AppData {
  if (cache) return cache

  const version = getStorage<number>(VERSION_KEY, 0)
  let stored = getStorage<AppData | null>(getAppDataKey(), null)
  if (!stored) {
    stored = getStorage<AppData | null>('luxe_marketplace_data', null)
  }

  if (stored) {
    if (version < DATA_VERSION) {
      if (version < 2) stored = migrateImages(stored)
      if (version < 3) stored = migrateVendorSubscriptions(stored)
      setStorage(VERSION_KEY, DATA_VERSION)
      cache = stored
      persist()
      return cache
    }
    cache = stored
    if (!cache.vendorSubscriptions) {
      cache = migrateVendorSubscriptions(cache)
      persist()
    }
    return cache
  }

  cache = generateSeedData()
  setStorage(VERSION_KEY, DATA_VERSION)
  persist()
  return cache
}

export function persist(): void {
  if (cache) {
    setStorage(getAppDataKey(), cache)
    notifyLocalDataChange()
  }
}

export function resetDatabase(): void {
  cache = generateSeedData()
  setStorage(VERSION_KEY, DATA_VERSION)
  persist()
}
