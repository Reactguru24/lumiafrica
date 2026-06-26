/**
 * API Client for communicating with Lumi Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
  headers?: Record<string, string>
}

const GUEST_SESSION_KEY = 'lumi_guest_session'

export function getGuestSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(GUEST_SESSION_KEY) || ''
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      localStorage.setItem(GUEST_SESSION_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

export function setGuestSessionId(id: string) {
  if (typeof window === 'undefined' || !id) return
  try {
    localStorage.setItem(GUEST_SESSION_KEY, id)
  } catch {
    // ignore
  }
}

export function clearGuestSessionId() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(GUEST_SESSION_KEY)
  } catch {
    // ignore
  }
}

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const session = localStorage.getItem('session')
  if (!session) return null
  try {
    return JSON.parse(session).token
  } catch {
    return null
  }
}

function parseErrorBody(body: unknown, statusText: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    if (typeof record.error === 'string') return record.error
    if (typeof record.message === 'string') return record.message
  }
  return statusText || 'An error occurred'
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const headersObj: Record<string, string> = {}

  const isFormData = options.body instanceof FormData

  if (!isFormData) {
    headersObj['Content-Type'] = 'application/json'
  }

  if (!options.skipAuth) {
    const token = await getAuthToken()
    if (token) {
      headersObj.Authorization = `Bearer ${token}`
    }
  }

  const guestSessionId = getGuestSessionId()
  if (guestSessionId) {
    headersObj['X-Guest-Session'] = guestSessionId
  }

  if (options.headers) {
    Object.assign(headersObj, options.headers)
  }

  let body = options.body

  const response = await fetch(url, {
    ...options,
    body,
    headers: headersObj,
  })

  const responseGuestSession = response.headers.get('X-Guest-Session')
  if (responseGuestSession) {
    setGuestSessionId(responseGuestSession)
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new APIError(
      response.status,
      parseErrorBody(errorBody, response.statusText),
      errorBody
    )
  }

  if (response.status === 204) {
    return {} as T
  }

  const json = await response.json()
  const data: unknown = json

  if (data && typeof data === 'object' && 'items' in data && 'total' in data) {
    return data as T
  }
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data
  }
  return data as T
}

type QueryParams = Record<string, string | number | boolean | undefined | null>

function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

function get<T>(path: string, options?: RequestOptions) {
  return apiRequest<T>(path, { method: 'GET', ...options })
}

function post<T>(path: string, body?: unknown, options?: RequestOptions) {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
    ...options,
  })
}

function put<T>(path: string, body?: unknown, options?: RequestOptions) {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
    ...options,
  })
}

function del<T>(path: string, options?: RequestOptions) {
  return apiRequest<T>(path, { method: 'DELETE', ...options })
}

function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest('/auth/upload', { method: 'POST', body: formData })
}

function uploadPublicFile(path: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest(path, { method: 'POST', body: formData, skipAuth: true })
}

// ── Public Endpoints (No Auth) ─────────────────────────────────────────

export const publicAPI = {
  listProducts(params?: Record<string, any>) {
    return get(`/products${buildQuery(params)}`, { skipAuth: true })
  },

  getProductFilters() {
    return get('/products/filters', { skipAuth: true })
  },

  getHomepageProducts(params?: { limit?: number; collection?: string }) {
    return get(`/products/homepage${buildQuery(params)}`, { skipAuth: true })
  },

  getProduct(productId: string, params?: { relatedLimit?: number }) {
    return get(`/products/${productId}${buildQuery(params)}`, { skipAuth: true })
  },

  listVendors() {
    return get('/vendors', { skipAuth: true })
  },

  getFeaturedVendors() {
    return get('/vendors/featured', { skipAuth: true })
  },

  getVendor(vendorId: string) {
    return get(`/vendors/${vendorId}`, { skipAuth: true })
  },

  getProductReviews(productId: string, params?: { limit?: number }) {
    return get(`/reviews/product/${productId}${buildQuery({ limit: params?.limit ?? 6 })}`, { skipAuth: true })
  },

  getSubscriptionPlans() {
    return get('/subscriptions/plans', { skipAuth: true })
  },

  getDeliveryZones() {
    return get('/delivery-zones', { skipAuth: true })
  },

  getPromotions() {
    return get('/promotions', { skipAuth: true })
  },

  getCollections() {
    return get('/collections', { skipAuth: true })
  },

  getCollection(slug: string) {
    return get(`/collections/${slug}`, { skipAuth: true })
  },

  applyVendor(data: any) {
    return post('/vendors/applications', data, { skipAuth: true })
  },

  getVendorApplicationStatus(email: string) {
    return get(`/vendors/applications/status${buildQuery({ email })}`, { skipAuth: true })
  },

  uploadImage(file: File) {
    return uploadPublicFile('/uploads/images', file)
  },

  uploadDocument(file: File) {
    return uploadPublicFile('/uploads/documents', file)
  },
}

// ── Cart (guest session or authenticated user) ─────────────────────────

export const cartAPI = {
  getCart() {
    return get('/cart', { skipAuth: true })
  },

  upsertItem(data: { productId: string; size: string; color: string; quantity?: number }) {
    return post('/cart/items', data, { skipAuth: true })
  },

  removeItem(productId: string, size: string, color: string) {
    return del(`/cart/items/${productId}${buildQuery({ size, color })}`, { skipAuth: true })
  },

  toggleSaved(productId: string, size: string, color: string, savedForLater?: boolean) {
    return put(
      `/cart/items/${productId}/saved${buildQuery({ size, color })}`,
      savedForLater === undefined ? {} : { savedForLater },
      { skipAuth: true },
    )
  },

  clearActive() {
    return del('/cart/active', { skipAuth: true })
  },

  toggleWishlist(productId: string) {
    return post(`/cart/wishlist/${productId}`, undefined, { skipAuth: true })
  },

  setWishlist(productId: string, active: boolean) {
    return put(`/cart/wishlist/${productId}`, { active }, { skipAuth: true })
  },

  mergeGuestCart() {
    return post('/cart/merge')
  },
}

// ── Auth Endpoints ────────────────────────────────────────────────────

export const authAPI = {
  login(email: string, password: string) {
    return post('/auth/login', { email, password }, { skipAuth: true })
  },

  register(data: {
    fullName: string
    email: string
    phone: string
    password: string
  }) {
    return post('/auth/register', data, { skipAuth: true })
  },

  getCurrentUser() {
    return get('/auth/me')
  },

  forgotPassword(email: string) {
    return post('/auth/forgot-password', { email }, { skipAuth: true })
  },

  resetPassword(token: string, newPassword: string) {
    return post('/auth/reset-password', { token, newPassword }, { skipAuth: true })
  },

  uploadImage: uploadFile,

  updateProfile(data: { fullName?: string; phone?: string; avatar?: string }) {
    return put('/users/profile', data)
  },

  changePassword(currentPassword: string, newPassword: string) {
    return put('/users/password', { currentPassword, newPassword })
  },
}

// ── Customer Endpoints ────────────────────────────────────────────────

export const customerAPI = {
  createOrder(data: any, idempotencyKey?: string) {
    const headers: Record<string, string> = {}
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    return post('/payments/orders/initialize', data, { headers })
  },

  verifyPayment(reference: string) {
    return get(`/payments/verify${buildQuery({ reference })}`, { skipAuth: true })
  },

  getUserOrders() {
    return get('/orders')
  },

  getOrder(orderId: string) {
    return get(`/orders/${orderId}`)
  },

  createReview(data: any) {
    return post('/reviews', data)
  },

  applyVendor(data: any) {
    return post('/vendors/applications', data)
  },

  getMyVendorApplication() {
    return get('/vendors/applications/me')
  },

  addAddress(data: any) {
    return post('/users/addresses', data)
  },

  getAddresses() {
    return get('/users/addresses')
  },

  deleteAddress(addressId: string) {
    return del(`/users/addresses/${addressId}`)
  },

  validateCoupon(code: string, subtotal: number) {
    return post('/coupons/validate', { code, subtotal })
  },
}

// ── Vendor Endpoints ──────────────────────────────────────────────────

export const vendorAPI = {
  getProfile() {
    return get('/vendor/profile')
  },

  updateProfile(data: any) {
    return put('/vendor/profile', data)
  },

  getProducts() {
    return get(`/vendor/products${buildQuery({ limit: 1000 })}`)
  },

  createProduct(data: any) {
    return post('/vendor/products', data)
  },

  updateProduct(productId: string, data: any) {
    return put(`/vendor/products/${productId}`, data)
  },

  updateProductFeatured(productId: string, featured: boolean) {
    return put(`/vendor/products/${productId}/featured`, { featured })
  },

  deleteProduct(productId: string) {
    return del(`/vendor/products/${productId}`)
  },

  restoreProduct(productId: string) {
    return post(`/vendor/products/${productId}/restore`)
  },

  getOrders() {
    return get('/vendor/orders')
  },

  updateOrderStatus(orderId: string, status: string) {
    return put(`/vendor/orders/${orderId}/status`, { status })
  },

  getReviews(params?: { page?: number; limit?: number }) {
    return get(`/vendor/reviews${buildQuery(params)}`)
  },

  replyToReview(reviewId: string, reply: string) {
    return post(`/vendor/reviews/${reviewId}/reply`, { reply })
  },

  getActiveSubscription() {
    return get('/vendor/subscriptions/active')
  },

  getSubscriptionHistory() {
    return get('/vendor/subscriptions/history')
  },

  subscribe(plan: string, paymentMethod: string, productIds?: string[]) {
    return post('/vendor/subscriptions', { plan, paymentMethod, productIds })
  },

  cancelSubscription() {
    return del('/vendor/subscriptions/active')
  },

  getAnalytics(period = '30days') {
    return get(`/vendor/analytics${buildQuery({ period })}`)
  },
}

// ── Admin Endpoints ───────────────────────────────────────────────────

export const adminAPI = {
  listUsers(params?: { page?: number; limit?: number }) {
    return get(`/admin/users${buildQuery(params)}`)
  },

  disableUser(userId: string) {
    return post(`/admin/users/${userId}/disable`)
  },

  enableUser(userId: string) {
    return post(`/admin/users/${userId}/enable`)
  },

  listVendors(params?: { page?: number; limit?: number }) {
    return get(`/admin/vendors${buildQuery(params)}`)
  },

  listProducts(params?: { page?: number; limit?: number; q?: string; search?: string }) {
    const query = {
      page: params?.page,
      limit: params?.limit,
      q: params?.q ?? params?.search,
    }
    return get(`/admin/products${buildQuery(query)}`)
  },

  listPendingProducts(params?: { page?: number; limit?: number; q?: string; search?: string }) {
    const query = {
      page: params?.page,
      limit: params?.limit,
      q: params?.q ?? params?.search,
    }
    return get(`/admin/products/pending${buildQuery(query)}`)
  },

  moderateProduct(productId: string, approved: boolean, reason?: string, archive?: boolean) {
    return post(`/admin/products/${productId}/moderate`, { approved, archive, reason })
  },

  listVendorApplications(params?: { page?: number; limit?: number }) {
    return get(`/admin/vendors/applications${buildQuery(params)}`)
  },

  approveVendor(applicationId: string, reviewNote?: string) {
    return post(`/admin/vendor-applications/${applicationId}/approve`, { review_note: reviewNote })
  },

  rejectVendor(applicationId: string, reviewNote: string) {
    return post(`/admin/vendor-applications/${applicationId}/reject`, { review_note: reviewNote })
  },

  resendVendorActivationByApplication(applicationId: string) {
    return post(`/admin/vendor-applications/${applicationId}/resend-activation`)
  },

  resendVendorActivationByVendor(vendorId: string) {
    return post(`/admin/vendors/${vendorId}/resend-activation`)
  },

  setVendorFeatured(vendorId: string, featured: boolean) {
    return post(`/admin/vendors/${vendorId}/featured`, { featured })
  },

  listSubscriptions(params?: { page?: number; limit?: number; active?: boolean }) {
    return get(`/admin/subscriptions${buildQuery(params)}`)
  },

  getFeaturedListings(params?: { page?: number; limit?: number }) {
    return get(`/admin/featured-listings${buildQuery(params)}`)
  },

  setProductFeatured(productId: string, featured: boolean) {
    return put(`/admin/products/${productId}/featured`, { featured })
  },

  getAnalytics() {
    return get('/admin/analytics')
  },

  getAllOrders(params?: { page?: number; limit?: number }) {
    return get(`/admin/orders${buildQuery(params)}`)
  },

  updateOrderStatus(orderId: string, status: string) {
    return put(`/admin/orders/${orderId}/status`, { status })
  },

  getPlatformSettings() {
    return get('/admin/platform-settings')
  },

  updatePlatformSettings(data: { commissionRate: number; commissionEnabled: boolean }) {
    return put('/admin/platform-settings', data)
  },

  listCoupons(params?: { page?: number; limit?: number }) {
    return get(`/admin/coupons${buildQuery(params)}`)
  },

  createCoupon(data: Record<string, unknown>) {
    return post('/admin/coupons', data)
  },

  updateCoupon(couponId: string, data: Record<string, unknown>) {
    return put(`/admin/coupons/${couponId}`, data)
  },

  setCouponActive(couponId: string, active: boolean) {
    return put(`/admin/coupons/${couponId}/active`, { active })
  },

  listPromotions(params?: { page?: number; limit?: number }) {
    return get(`/admin/promotions${buildQuery(params)}`)
  },

  createPromotion(data: Record<string, unknown>) {
    return post('/admin/promotions', data)
  },

  updatePromotion(promotionId: string, data: Record<string, unknown>) {
    return put(`/admin/promotions/${promotionId}`, data)
  },

  setPromotionActive(promotionId: string, active: boolean) {
    return put(`/admin/promotions/${promotionId}/active`, { active })
  },

  listCollections(params?: { page?: number; limit?: number }) {
    return get(`/admin/collections${buildQuery(params)}`)
  },

  createCollection(data: Record<string, unknown>) {
    return post('/admin/collections', data)
  },

  updateCollection(collectionId: string, data: Record<string, unknown>) {
    return put(`/admin/collections/${collectionId}`, data)
  },

  setCollectionActive(collectionId: string, active: boolean) {
    return put(`/admin/collections/${collectionId}/active`, { active })
  },
}