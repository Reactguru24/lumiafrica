import { create } from 'zustand'
import type { CartItem, Product } from '@/lib/types'
import { getStorage, setStorage } from '@/lib/utils/storage'

const CART_KEY = 'lumi_cart'
const WISHLIST_KEY = 'lumi_wishlist'

interface CartState {
  items: CartItem[]
  wishlist: string[]
  couponCode: string
  couponDiscount: number
  activeItems: CartItem[]
  savedItems: CartItem[]
  itemCount: number
  addItem: (productId: string, size: string, color: string, quantity?: number) => void
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void
  removeItem: (productId: string, size: string, color: string) => void
  toggleSaveForLater: (productId: string, size: string, color: string) => void
  moveToCart: (productId: string, size: string, color: string) => void
  clearCart: () => void
  getCartProducts: () => (CartItem & { product: Product })[]
  toggleWishlist: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  applyCoupon: (code: string, discount: number) => void
  hydrate: () => void
}

function persist(items: CartItem[], wishlist: string[]) {
  setStorage(CART_KEY, items)
  setStorage(WISHLIST_KEY, wishlist)
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  wishlist: [],
  couponCode: '',
  couponDiscount: 0,
  activeItems: [],
  savedItems: [],
  itemCount: 0,

  hydrate: () => {
    const items = getStorage<CartItem[]>(CART_KEY, [])
    const wishlist = getStorage<string[]>(WISHLIST_KEY, [])
    const activeItems = items.filter((i) => !i.savedForLater)
    set({
      items,
      wishlist,
      activeItems,
      savedItems: items.filter((i) => i.savedForLater),
      itemCount: activeItems.reduce((s, i) => s + i.quantity, 0),
    })
  },

  addItem: (productId, size, color, quantity = 1) => {
    const items = [...get().items]
    const existing = items.find(
      (i) => i.productId === productId && i.size === size && i.color === color && !i.savedForLater
    )
    if (existing) existing.quantity += quantity
    else items.push({ productId, quantity, size, color, savedForLater: false })
    const activeItems = items.filter((i) => !i.savedForLater)
    set({
      items,
      activeItems,
      savedItems: items.filter((i) => i.savedForLater),
      itemCount: activeItems.reduce((s, i) => s + i.quantity, 0),
    })
    persist(items, get().wishlist)
  },

  updateQuantity: (productId, size, color, quantity) => {
    const items = get().items.map((i) =>
      i.productId === productId && i.size === size && i.color === color
        ? { ...i, quantity: Math.max(1, quantity) }
        : i
    )
    const activeItems = items.filter((i) => !i.savedForLater)
    set({
      items,
      activeItems,
      itemCount: activeItems.reduce((s, i) => s + i.quantity, 0),
    })
    persist(items, get().wishlist)
  },

  removeItem: (productId, size, color) => {
    const items = get().items.filter(
      (i) => !(i.productId === productId && i.size === size && i.color === color)
    )
    const activeItems = items.filter((i) => !i.savedForLater)
    set({
      items,
      activeItems,
      savedItems: items.filter((i) => i.savedForLater),
      itemCount: activeItems.reduce((s, i) => s + i.quantity, 0),
    })
    persist(items, get().wishlist)
  },

  toggleSaveForLater: (productId, size, color) => {
    const items = get().items.map((i) =>
      i.productId === productId && i.size === size && i.color === color
        ? { ...i, savedForLater: !i.savedForLater }
        : i
    )
    const activeItems = items.filter((i) => !i.savedForLater)
    set({
      items,
      activeItems,
      savedItems: items.filter((i) => i.savedForLater),
      itemCount: activeItems.reduce((s, i) => s + i.quantity, 0),
    })
    persist(items, get().wishlist)
  },

  moveToCart: (productId, size, color) => {
    const items = get().items.map((i) =>
      i.productId === productId && i.size === size && i.color === color
        ? { ...i, savedForLater: false }
        : i
    )
    const activeItems = items.filter((i) => !i.savedForLater)
    set({
      items,
      activeItems,
      savedItems: items.filter((i) => i.savedForLater),
      itemCount: activeItems.reduce((s, i) => s + i.quantity, 0),
    })
    persist(items, get().wishlist)
  },

  clearCart: () => {
    const items = get().items.filter((i) => i.savedForLater)
    set({ items, couponCode: '', couponDiscount: 0, activeItems: [], itemCount: 0, savedItems: items })
    persist(items, get().wishlist)
  },

  getCartProducts: () => {
    return get().activeItems.map((item) => ({ ...item, product: null as unknown as Product }))
  },

  toggleWishlist: (productId) => {
    const wishlist = [...get().wishlist]
    const idx = wishlist.indexOf(productId)
    if (idx >= 0) wishlist.splice(idx, 1)
    else wishlist.push(productId)
    set({ wishlist })
    persist(get().items, wishlist)
  },

  isInWishlist: (productId) => get().wishlist.includes(productId),

  applyCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),
}))
