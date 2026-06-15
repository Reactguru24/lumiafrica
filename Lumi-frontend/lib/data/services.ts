/** Local hardcoded data layer — reads/writes in-memory seed + localStorage. No HTTP requests. */
import type {
  AppData, User, Product, ProductFilters, Vendor, VendorApplication,
  Order, Review, OrderStatus, ProductStatus, CartItem, PlatformSettings,
  FeaturedListingPlan, VendorSubscription,
} from '@/lib/types'
import { getDatabase, persist } from './database'
import { getFeaturedListingPlan } from '@/lib/constants/subscriptions'
import { isFeaturedListingActive } from '@/lib/utils/subscriptions'
import { generateId, getSessionKey, setStorage, slugify } from '@/lib/utils/storage'
import { FREE_SHIPPING_KES, STANDARD_SHIPPING_KES } from '@/lib/constants/commerce'
import { clothingImage, storeBannerImage } from '@/lib/utils/images'

function db(): AppData {
  return getDatabase()
}

function save(): void {
  persist()
}

export const authData = {
  login(email: string, password: string) {
    const user = db().users.find((u) => u.email === email && u.password === password && !u.disabled)
    if (!user) throw new Error('Invalid email or password')
    const session = { userId: user.id, token: generateId(), expiresAt: new Date(Date.now() + 86400000).toISOString() }
    db().sessions.push(session)
    setStorage(getSessionKey(), session)
    save()
    const { password: _, ...safeUser } = user
    return { user: safeUser, session }
  },

  register(data: { fullName: string; email: string; phone: string; password: string }) {
    if (db().users.some((u) => u.email === data.email)) throw new Error('Email already registered')
    const user: User = {
      id: generateId(),
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: 'CUSTOMER',
      disabled: false,
      createdAt: new Date().toISOString(),
      addresses: [],
    }
    db().users.push(user)
    save()
    const session = { userId: user.id, token: generateId(), expiresAt: new Date(Date.now() + 86400000).toISOString() }
    setStorage(getSessionKey(), session)
    const { password: _, ...safeUser } = user
    return { user: safeUser, session }
  },

  logout() {
    localStorage.removeItem(getSessionKey())
  },

  getCurrentUser(): Omit<User, 'password'> | null {
    const session = JSON.parse(localStorage.getItem(getSessionKey()) || 'null')
    if (!session) return null
    const user = db().users.find((u) => u.id === session.userId)
    if (!user || user.disabled) return null
    const { password: _, ...safeUser } = user
    return safeUser
  },
}

export const productData = {
  getAll(filters: ProductFilters = {}) {
    let products = [...db().products]

    if (filters.status) {
      products = products.filter((p) => p.status === filters.status)
    } else if (!filters.vendorId) {
      products = products.filter((p) => p.status === 'active')
    }
    if (filters.category) products = products.filter((p) => p.category === filters.category)
    if (filters.subcategory) products = products.filter((p) => p.subcategory === filters.subcategory)
    if (filters.gender) products = products.filter((p) => p.gender === filters.gender)
    if (filters.featured) products = products.filter((p) => p.featured)
    if (filters.trending) products = products.filter((p) => p.trending)
    if (filters.onSale) products = products.filter((p) => p.discount > 0)
    if (filters.brand) products = products.filter((p) => p.brand === filters.brand)
    if (filters.vendorId) products = products.filter((p) => p.vendorId === filters.vendorId)
    if (filters.size) products = products.filter((p) => p.sizes.includes(filters.size!))
    if (filters.color) products = products.filter((p) => p.colors.some((c) => c.name === filters.color))
    if (filters.minPrice) products = products.filter((p) => p.price >= filters.minPrice!)
    if (filters.maxPrice) products = products.filter((p) => p.price <= filters.maxPrice!)
    if (filters.minRating) products = products.filter((p) => p.rating >= filters.minRating!)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      products = products.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      )
    }

    switch (filters.sort) {
      case 'newest': products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'popular': products.sort((a, b) => b.reviewCount - a.reviewCount); break
      case 'rating': products.sort((a, b) => b.rating - a.rating); break
      case 'price-asc': products.sort((a, b) => a.price - b.price); break
      case 'price-desc': products.sort((a, b) => b.price - a.price); break
    }

    return products
  },

  getById(id: string) {
    const product = db().products.find((p) => p.id === id)
    if (!product) throw new Error('Product not found')
    return product
  },

  getFeatured() {
    return db().products.filter((p) => p.status === 'active' && p.featured).slice(0, 8)
  },

  getTrending() {
    return db().products.filter((p) => p.status === 'active' && p.trending).slice(0, 8)
  },

  getBestsellers() {
    return db().products.filter((p) => p.status === 'active' && p.bestseller).slice(0, 8)
  },

  getNewArrivals() {
    return db().products.filter((p) => p.status === 'active' && p.newArrival).slice(0, 8)
  },

  create(vendorId: string, data: Partial<Product>) {
    const product: Product = {
      id: generateId(),
      vendorId,
      name: data.name!,
      slug: slugify(data.name!),
      description: data.description!,
      sku: data.sku!,
      category: data.category!,
      subcategory: data.subcategory!,
      brand: data.brand!,
      gender: data.gender!,
      sizes: data.sizes!,
      colors: data.colors || [{ name: 'Black', hex: '#1a1a1a' }],
      price: data.price!,
      discount: data.discount || 0,
      stock: data.stock!,
      images: data.images || [clothingImage(Date.now())],
      rating: 0,
      reviewCount: 0,
      status: 'active',
      featured: false,
      trending: false,
      bestseller: false,
      newArrival: true,
      createdAt: new Date().toISOString(),
    }
    db().products.push(product)
    const vendor = db().vendors.find((v) => v.id === vendorId)
    if (vendor) vendor.productCount++
    save()
    return product
  },

  update(id: string, data: Partial<Product>) {
    const idx = db().products.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Product not found')
    db().products[idx] = { ...db().products[idx], ...data }
    save()
    return db().products[idx]
  },

  delete(id: string) {
    const idx = db().products.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Product not found')
    db().products.splice(idx, 1)
    save()
  },

  moderate(id: string, status: ProductStatus) {
    return productData.update(id, { status })
  },
}

export const vendorData = {
  getAll() {
    return db().vendors.filter((v) => !v.suspended)
  },

  getTop(limit = 6) {
    // Show vendors marked as featured (admin-controlled) on homepage
    const featured = db().vendors.filter((v) => !v.suspended && v.isFeatured)
    if (featured.length > 0) {
      return [...featured].sort((a, b) => b.totalSales - a.totalSales).slice(0, limit)
    }
    // Fallback: show top vendors by sales
    return [...db().vendors]
      .filter((v) => !v.suspended)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit)
  },

  getById(id: string) {
    const vendor = db().vendors.find((v) => v.id === id)
    if (!vendor) throw new Error('Vendor not found')
    return vendor
  },

  getByUserId(userId: string) {
    return db().vendors.find((v) => v.userId === userId) || null
  },

  update(id: string, data: Partial<Vendor>) {
    const idx = db().vendors.findIndex((v) => v.id === id)
    if (idx === -1) throw new Error('Vendor not found')
    db().vendors[idx] = { ...db().vendors[idx], ...data }
    save()
    return db().vendors[idx]
  },

  suspend(id: string) {
    const vendor = db().vendors.find((v) => v.id === id)
    if (vendor) { vendor.suspended = true; save() }
  },
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export const vendorSubscriptionData = {
  getAll() {
    return db().vendorSubscriptions
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  },

  getByVendorId(vendorId: string) {
    return db().vendorSubscriptions
      .filter((s) => s.vendorId === vendorId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  },

  getActive(vendorId: string) {
    return db().vendorSubscriptions.find((s) => s.vendorId === vendorId && isFeaturedListingActive(s)) ?? null
  },

  subscribe(vendorId: string, planId: FeaturedListingPlan, paymentMethod: string) {
    const vendor = db().vendors.find((v) => v.id === vendorId)
    if (!vendor) throw new Error('Vendor not found')
    if (vendor.suspended) throw new Error('Suspended vendors cannot subscribe')

    const plan = getFeaturedListingPlan(planId)
    const existing = vendorSubscriptionData.getActive(vendorId)
    const now = new Date()
    const startDate = existing && new Date(existing.expiresAt) > now
      ? new Date(existing.expiresAt)
      : now

    if (existing) {
      existing.active = false
    }

    const subscription: VendorSubscription = {
      id: generateId(),
      vendorId,
      plan: plan.id,
      amountPaid: plan.priceKes,
      startedAt: now.toISOString(),
      expiresAt: addMonths(startDate, plan.durationMonths).toISOString(),
      active: true,
      paymentMethod,
    }

    db().vendorSubscriptions.push(subscription)
    save()
    return subscription
  },
}

export const vendorApplicationData = {
  submit(userId: string, data: Omit<VendorApplication, 'id' | 'userId' | 'status' | 'riskStatus' | 'submittedAt'>) {
    const applicant = db().users.find((u) => u.id === userId)
    const businessEmail = data.businessEmail.trim().toLowerCase()
    if (applicant && applicant.email.toLowerCase() === businessEmail) {
      throw new Error('Business email must be different from your customer account email')
    }
    if (db().users.some((u) => u.email.toLowerCase() === businessEmail)) {
      throw new Error('This business email is already registered')
    }
    const existing = db().vendorApplications.find((a) => a.userId === userId && a.status === 'pending')
    if (existing) throw new Error('You already have a pending application')
    const app: VendorApplication = {
      id: generateId(),
      userId,
      ...data,
      status: 'pending',
      riskStatus: 'low',
      submittedAt: new Date().toISOString(),
    }
    db().vendorApplications.push(app)
    save()
    return app
  },

  getByUserId(userId: string) {
    return db().vendorApplications.find((a) => a.userId === userId) || null
  },

  getAll() {
    return db().vendorApplications
  },

  approve(id: string) {
    const app = db().vendorApplications.find((a) => a.id === id)
    if (!app) throw new Error('Application not found')
    const businessEmail = app.businessEmail.trim().toLowerCase()
    const applicant = db().users.find((u) => u.id === app.userId)
    if (applicant && applicant.email.toLowerCase() === businessEmail) {
      throw new Error('Business email must differ from the customer account email')
    }
    if (db().users.some((u) => u.email.toLowerCase() === businessEmail)) {
      throw new Error('Business email is already registered')
    }

    const vendorUser: User = {
      id: generateId(),
      fullName: app.storeName,
      email: app.businessEmail,
      phone: app.contactPhone,
      password: 'vendor123',
      role: 'VENDOR',
      disabled: false,
      createdAt: new Date().toISOString(),
      addresses: [],
    }
    db().users.push(vendorUser)

    app.status = 'approved'
    app.reviewedAt = new Date().toISOString()
    app.reviewNote = `Vendor account created. Sign out of your customer account, then sign in with ${app.businessEmail} (demo password: vendor123).`
    const vendor: Vendor = {
      id: generateId(),
      userId: vendorUser.id,
      storeName: app.storeName,
      slug: slugify(app.storeName),
      description: app.businessDescription,
      logo: app.logo,
      banner: storeBannerImage(Date.now()),
      contactPhone: app.contactPhone,
      businessEmail: app.businessEmail,
      country: app.country,
      city: app.city,
      socialLinks: app.socialLinks,
      categories: app.categories,
      rating: 0,
      totalSales: 0,
      productCount: 0,
      suspended: false,
      createdAt: new Date().toISOString(),
    }
    db().vendors.push(vendor)
    save()
    return app
  },

  reject(id: string, note?: string) {
    const app = db().vendorApplications.find((a) => a.id === id)
    if (!app) throw new Error('Application not found')
    app.status = 'rejected'
    app.reviewedAt = new Date().toISOString()
    app.reviewNote = note
    save()
    return app
  },
}

export const orderData = {
  getByUser(userId: string) {
    return db().orders.filter((o) => o.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  getByVendor(vendorId: string) {
    return db().orders.filter((o) => o.items.some((i) => i.vendorId === vendorId))
  },

  getAll() {
    return db().orders
  },

  create(userId: string, data: { items: CartItem[]; shippingAddress: Order['shippingAddress']; deliveryMethod: string; paymentMethod: string; couponCode?: string }) {
    const orderItems = data.items.map((item) => {
      const product = db().products.find((p) => p.id === item.productId)!
      return {
        productId: product.id,
        productName: product.name,
        productImage: product.images[0],
        vendorId: product.vendorId,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: product.price * (1 - product.discount / 100),
      }
    })
    const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
    let discount = 0
    if (data.couponCode) {
      const coupon = db().settings.coupons.find((c) => c.code === data.couponCode && c.active)
      if (coupon && subtotal >= coupon.minOrder) {
        discount = coupon.type === 'percentage' ? subtotal * (coupon.discount / 100) : coupon.discount
      }
    }
    const shippingMethod = db().settings.shippingMethods.find((s) => s.name === data.deliveryMethod)
    const shipping = subtotal > FREE_SHIPPING_KES ? 0 : (shippingMethod?.price || STANDARD_SHIPPING_KES)
    const tax = (subtotal - discount) * db().settings.taxRate
    const order: Order = {
      id: generateId(),
      userId,
      items: orderItems,
      status: 'pending',
      subtotal,
      shipping,
      tax,
      discount,
      total: subtotal - discount + shipping + tax,
      couponCode: data.couponCode,
      shippingAddress: data.shippingAddress,
      deliveryMethod: data.deliveryMethod,
      paymentMethod: data.paymentMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db().orders.push(order)
    save()
    return order
  },

  updateStatus(id: string, status: OrderStatus) {
    const order = db().orders.find((o) => o.id === id)
    if (!order) throw new Error('Order not found')
    order.status = status
    order.updatedAt = new Date().toISOString()
    save()
    return order
  },
}

export const reviewData = {
  getByProduct(productId: string) {
    return db().reviews.filter((r) => r.productId === productId)
  },

  getByVendor(vendorId: string) {
    const productIds = db().products.filter((p) => p.vendorId === vendorId).map((p) => p.id)
    return db().reviews.filter((r) => productIds.includes(r.productId))
  },

  reply(reviewId: string, reply: string) {
    const review = db().reviews.find((r) => r.id === reviewId)
    if (!review) throw new Error('Review not found')
    review.vendorReply = reply
    save()
    return review
  },

  create(data: { productId: string; userId: string; userName: string; rating: number; comment: string }) {
    const review: Review = { id: generateId(), ...data, createdAt: new Date().toISOString() }
    db().reviews.push(review)
    const product = db().products.find((p) => p.id === data.productId)
    if (product) {
      product.reviewCount++
      const allReviews = db().reviews.filter((r) => r.productId === data.productId)
      product.rating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    }
    save()
    return review
  },
}

export const userData = {
  getAll() {
    return db().users.map(({ password, ...u }) => u)
  },

  update(id: string, data: Partial<User>) {
    const idx = db().users.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error('User not found')
    db().users[idx] = { ...db().users[idx], ...data }
    save()
    const { password: _, ...safe } = db().users[idx]
    return safe
  },

  disable(id: string) {
    return userData.update(id, { disabled: true })
  },
}

export const settingsData = {
  get() {
    return db().settings
  },

  update(data: Partial<PlatformSettings>) {
    db().settings = { ...db().settings, ...data }
    save()
    return db().settings
  },
}

export const analyticsData = {
  getAdminAnalytics() {
    const orders = db().orders.filter((o) => o.status !== 'cancelled')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return {
      totalUsers: db().users.length,
      totalVendors: db().vendors.length,
      totalProducts: db().products.length,
      totalOrders: db().orders.length,
      totalRevenue: orders.reduce((s, o) => s + o.total, 0),
      monthlySales: months.map((month, i) => ({
        month,
        revenue: orders.filter((_, j) => j % 12 === i).reduce((s, o) => s + o.total, 0) || random(i * 1000, i * 2000 + 5000),
        orders: orders.filter((_, j) => j % 12 === i).length || random(5, 20),
      })),
      vendorGrowth: months.map((month, i) => ({
        month,
        count: Math.min(db().vendors.length, Math.floor(db().vendors.length * (i + 1) / 12)),
      })),
      orderTrends: Array.from({ length: 30 }, (_, i) => ({
        date: `Day ${i + 1}`,
        count: random(2, 15),
      })),
    }
  },

  getVendorAnalytics(vendorId: string) {
    const orders = db().orders.filter((o) => o.items.some((i) => i.vendorId === vendorId) && o.status !== 'cancelled')
    const products = db().products.filter((p) => p.vendorId === vendorId)
    const revenue = orders.reduce((s, o) => {
      const vendorItems = o.items.filter((i) => i.vendorId === vendorId)
      return s + vendorItems.reduce((vs, i) => vs + i.price * i.quantity, 0)
    }, 0)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    return {
      totalSales: orders.length,
      totalOrders: orders.length,
      revenue,
      totalProducts: products.length,
      customers: new Set(orders.map((o) => o.userId)).size,
      salesTrend: months.map((month, i) => ({
        month,
        sales: orders.filter((_, j) => j % 6 === i).length || random(2, 12),
        revenue: random(500, 5000),
      })),
      topProducts: products.slice(0, 5).map((p) => ({
        name: p.name,
        sales: random(10, 100),
      })),
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 10),
      outOfStock: products.filter((p) => p.stock === 0),
    }
  },
}

function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
