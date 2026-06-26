import { create } from 'zustand'
import type { CartItem, Product } from '@/lib/types'
import { cartAPI, setGuestSessionId, clearGuestSessionId, getGuestSessionId } from '@/lib/api/client'
import { getStorage, setStorage } from '@/lib/utils/storage'

const CART_KEY = 'lumi_cart'
const WISHLIST_KEY = 'lumi_wishlist'
const SAVED_KEY = 'lumi_cart_saved'

interface CartApiPayload {
  items?: CartItem[]
  wishlist?: string[]
  guestSessionId?: string
}

interface CartState {
  items: CartItem[]
  wishlist: string[]
  couponCode: string
  couponDiscount: number
  activeItems: CartItem[]
  savedItems: CartItem[]
  itemCount: number
  syncing: boolean
  addItem: (productId: string, size: string, color: string, quantity?: number) => Promise<void>
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => Promise<void>
  removeItem: (productId: string, size: string, color: string) => Promise<void>
  toggleSaveForLater: (productId: string, size: string, color: string) => Promise<void>
  moveToCart: (productId: string, size: string, color: string) => Promise<void>
  clearCart: () => Promise<void>
  getCartProducts: () => (CartItem & { product: Product })[]
  toggleWishlist: (productId: string) => Promise<void>
  isInWishlist: (productId: string) => boolean
  applyCoupon: (code: string, discount: number) => void
  hydrate: () => Promise<void>
  pushLocalToGuestCart: () => Promise<void>
  mergeGuestCart: () => Promise<void>
  applyRemoteCart: (payload: CartApiPayload) => void
}

function itemKey(productId: string, size: string, color: string) {
  return `${productId}|${size}|${color}`
}

function loadSavedKeys(): Set<string> {
  return new Set(getStorage<string[]>(SAVED_KEY, []))
}

function persistSavedKeys(items: CartItem[]) {
  const keys = items.filter((i) => i.savedForLater).map((i) => itemKey(i.productId, i.size, i.color))
  setStorage(SAVED_KEY, keys)
}

function mapApiItems(items: CartApiPayload['items'], savedKeys: Set<string>): CartItem[] {
  return (items ?? []).map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
    savedForLater: savedKeys.has(itemKey(item.productId, item.size, item.color)),
  }))
}

function persist(items: CartItem[], wishlist: string[]) {
  setStorage(CART_KEY, items)
  setStorage(WISHLIST_KEY, wishlist)
  persistSavedKeys(items)
}

function buildState(items: CartItem[], wishlist: string[]) {
  const activeItems = items.filter((i) => !i.savedForLater)
  return {
    items,
    wishlist,
    activeItems,
    savedItems: items.filter((i) => i.savedForLater),
    itemCount: activeItems.reduce((s, i) => s + i.quantity, 0),
  }
}

function removeLocalItem(items: CartItem[], productId: string, size: string, color: string) {
  return items.filter((i) => !(i.productId === productId && i.size === size && i.color === color))
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  wishlist: [],
  couponCode: '',
  couponDiscount: 0,
  activeItems: [],
  savedItems: [],
  itemCount: 0,
  syncing: false,

  applyRemoteCart: (payload) => {
    if (payload.guestSessionId) setGuestSessionId(payload.guestSessionId)
    const savedKeys = loadSavedKeys()
    const items = mapApiItems(payload.items, savedKeys)
    const wishlist = payload.wishlist ?? []
    persist(items, wishlist)
    set(buildState(items, wishlist))
  },

  hydrate: async () => {
    const localItems = getStorage<CartItem[]>(CART_KEY, [])
    const localWishlist = getStorage<string[]>(WISHLIST_KEY, [])
    const savedKeys = loadSavedKeys()
    const items = localItems.map((item) => ({
      ...item,
      savedForLater: savedKeys.has(itemKey(item.productId, item.size, item.color)),
    }))
    set(buildState(items, localWishlist))
    try {
      set({ syncing: true })
      const remote = await cartAPI.getCart() as CartApiPayload
      get().applyRemoteCart(remote)
    } catch {
      // keep local cache when offline
    } finally {
      set({ syncing: false })
    }
  },

  mergeGuestCart: async () => {
    if (!getGuestSessionId()) return
    try {
      set({ syncing: true })
      const remote = await cartAPI.mergeGuestCart() as CartApiPayload
      get().applyRemoteCart(remote)
      clearGuestSessionId()
    } catch {
      // keep guest session so a later merge can retry
    } finally {
      set({ syncing: false })
    }
  },

  pushLocalToGuestCart: async () => {
    const localItems = getStorage<CartItem[]>(CART_KEY, []).filter((i) => !i.savedForLater)
    if (!localItems.length) return
    try {
      set({ syncing: true })
      for (const item of localItems) {
        await cartAPI.upsertItem({
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        })
      }
      const remote = await cartAPI.getCart() as CartApiPayload
      get().applyRemoteCart(remote)
    } catch {
      // local cache remains if sync fails
    } finally {
      set({ syncing: false })
    }
  },

  addItem: async (productId, size, color, quantity = 1) => {
    const remote = await cartAPI.upsertItem({ productId, size, color, quantity }) as CartApiPayload
    get().applyRemoteCart(remote)
  },

  updateQuantity: async (productId, size, color, quantity) => {
    const remote = await cartAPI.upsertItem({
      productId, size, color, quantity: Math.max(1, quantity),
    }) as CartApiPayload
    get().applyRemoteCart(remote)
  },

  removeItem: async (productId, size, color) => {
    try {
      const remote = await cartAPI.removeItem(productId, size, color) as CartApiPayload
      get().applyRemoteCart(remote)
    } catch {
      const items = removeLocalItem(get().items, productId, size, color)
      const wishlist = get().wishlist
      persist(items, wishlist)
      set(buildState(items, wishlist))
    }
  },

  toggleSaveForLater: async (productId, size, color) => {
    const items = get().items.map((i) =>
      i.productId === productId && i.size === size && i.color === color
        ? { ...i, savedForLater: !i.savedForLater }
        : i,
    )
    const wishlist = get().wishlist
    persist(items, wishlist)
    set(buildState(items, wishlist))
  },

  moveToCart: async (productId, size, color) => {
    const items = get().items.map((i) =>
      i.productId === productId && i.size === size && i.color === color
        ? { ...i, savedForLater: false }
        : i,
    )
    const wishlist = get().wishlist
    persist(items, wishlist)
    set(buildState(items, wishlist))
  },

  clearCart: async () => {
    const remote = await cartAPI.clearActive() as CartApiPayload
    get().applyRemoteCart(remote)
    set({ couponCode: '', couponDiscount: 0 })
  },

  getCartProducts: () => {
    return get().activeItems.map((item) => ({ ...item, product: null as unknown as Product }))
  },

  toggleWishlist: async (productId) => {
    const nextActive = !get().wishlist.includes(productId)
    const remote = await cartAPI.setWishlist(productId, nextActive) as CartApiPayload
    get().applyRemoteCart(remote)
  },

  isInWishlist: (productId) => get().wishlist.includes(productId),

  applyCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),
}))
