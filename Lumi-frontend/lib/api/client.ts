/**
 * API Client for communicating with Lumi Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
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

  const response = await fetch(url, {
    ...options,
    headers: headersObj,
  })

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
  if (json && typeof json === 'object' && 'items' in json && 'total' in json) {
    return json as T
  }
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T
  }
  return json as T
}

// ── Public Endpoints (No Auth) ─────────────────────────────────────────

export const publicAPI = {
  // Products
  listProducts(params?: Record<string, any>) {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/products${query ? `?${query}` : ''}`, { skipAuth: true })
  },

  getProductFilters() {
    return apiRequest('/products/filters', { skipAuth: true })
  },

  getProduct(productId: string) {
    return apiRequest(`/products/${productId}`, { skipAuth: true })
  },

  // Vendors
  listVendors() {
    return apiRequest('/vendors', { skipAuth: true })
  },

  getFeaturedVendors() {
    return apiRequest('/vendors/featured', { skipAuth: true })
  },

  getVendor(vendorId: string) {
    return apiRequest(`/vendors/${vendorId}`, { skipAuth: true })
  },

  // Reviews
  getProductReviews(productId: string) {
    return apiRequest(`/reviews/product/${productId}`, { skipAuth: true })
  },

  // Subscriptions
  getSubscriptionPlans() {
    return apiRequest('/subscriptions/plans', { skipAuth: true })
  },
}

// ── Auth Endpoints ────────────────────────────────────────────────────

export const authAPI = {
  login(email: string, password: string) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    })
  },

  register(data: {
    fullName: string
    email: string
    phone: string
    password: string
  }) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    })
  },

  getCurrentUser() {
    return apiRequest('/auth/me', { method: 'GET' })
  },

  forgotPassword(email: string) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    })
  },

  resetPassword(token: string, newPassword: string) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
      skipAuth: true,
    })
  },

  uploadImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest('/auth/upload', {
      method: 'POST',
      body: formData,
    })
  },

  updateProfile(data: { fullName?: string; phone?: string; avatar?: string }) {
    return apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  changePassword(currentPassword: string, newPassword: string) {
    return apiRequest('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },
}

// ── Customer Endpoints ────────────────────────────────────────────────

export const customerAPI = {
  // Orders
  createOrder(data: any) {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getUserOrders() {
    return apiRequest('/orders', { method: 'GET' })
  },

  getOrder(orderId: string) {
    return apiRequest(`/orders/${orderId}`, { method: 'GET' })
  },

  // Reviews
  createReview(data: any) {
    return apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  applyVendor(data: any) {
    return apiRequest('/vendors/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getMyVendorApplication() {
    return apiRequest('/vendors/applications/me', { method: 'GET' })
  },

  uploadImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest('/auth/upload', {
      method: 'POST',
      body: formData,
      skipAuth: false,
    })
  },

  // Addresses
  addAddress(data: any) {
    return apiRequest('/users/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getAddresses() {
    return apiRequest('/users/addresses', { method: 'GET' })
  },

  deleteAddress(addressId: string) {
    return apiRequest(`/users/addresses/${addressId}`, { method: 'DELETE' })
  },

  // Profile
  updateProfile(data: any) {
    return apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  changePassword(currentPassword: string, newPassword: string) {
    return apiRequest('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },
}

// ── Vendor Endpoints ──────────────────────────────────────────────────

export const vendorAPI = {
  // Profile
  getProfile() {
    return apiRequest('/vendor/profile', { method: 'GET' })
  },

  updateProfile(data: any) {
    return apiRequest('/vendor/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Products
  getProducts() {
    return apiRequest('/vendor/products', { method: 'GET' })
  },

  createProduct(data: any) {
    return apiRequest('/vendor/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateProduct(productId: string, data: any) {
    return apiRequest(`/vendor/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteProduct(productId: string) {
    return apiRequest(`/vendor/products/${productId}`, { method: 'DELETE' })
  },

  // Orders
  getOrders() {
    return apiRequest('/vendor/orders', { method: 'GET' })
  },

  updateOrderStatus(orderId: string, status: string) {
    return apiRequest(`/vendor/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },

  // Reviews
  getReviews() {
    return apiRequest('/vendor/reviews', { method: 'GET' })
  },

  replyToReview(reviewId: string, reply: string) {
    return apiRequest(`/vendor/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    })
  },

  // Subscriptions
  getActiveSubscription() {
    return apiRequest('/vendor/subscriptions/active', { method: 'GET' })
  },

  getSubscriptionHistory() {
    return apiRequest('/vendor/subscriptions/history', { method: 'GET' })
  },

  subscribe(plan: string, paymentMethod: string) {
    return apiRequest('/vendor/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ plan, paymentMethod }),
    })
  },

  cancelSubscription() {
    return apiRequest('/vendor/subscriptions/active', { method: 'DELETE' })
  },

  // Analytics
  getAnalytics() {
    return apiRequest('/vendor/analytics', { method: 'GET' })
  },
}

// ── Admin Endpoints ───────────────────────────────────────────────────

export const adminAPI = {
  // Users
  listUsers() {
    return apiRequest('/admin/users', { method: 'GET' })
  },

  disableUser(userId: string) {
    return apiRequest(`/admin/users/${userId}/disable`, { method: 'POST' })
  },

  // Products
  listProducts(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return apiRequest(`/admin/products${qs ? `?${qs}` : ''}`, { method: 'GET' })
  },

  listPendingProducts() {
    return apiRequest('/admin/products/pending', { method: 'GET' })
  },

  moderateProduct(productId: string, approved: boolean, reason?: string) {
    return apiRequest(`/admin/products/${productId}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ approved, reason }),
    })
  },

  // Vendor Applications
  listVendorApplications() {
    return apiRequest('/admin/vendors/applications', { method: 'GET' })
  },

  approveVendor(applicationId: string, reviewNote?: string) {
    return apiRequest(`/admin/vendor-applications/${applicationId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ review_note: reviewNote }),
    })
  },

  rejectVendor(applicationId: string, reviewNote: string) {
    return apiRequest(`/admin/vendor-applications/${applicationId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ review_note: reviewNote }),
    })
  },

  // Featured Vendors
  setVendorFeatured(vendorId: string, featured: boolean) {
    return apiRequest(`/admin/vendors/${vendorId}/featured`, {
      method: 'POST',
      body: JSON.stringify({ featured }),
    })
  },

  // Subscriptions
  listSubscriptions() {
    return apiRequest('/admin/subscriptions', { method: 'GET' })
  },

  // Analytics
  getAnalytics() {
    return apiRequest('/admin/analytics', { method: 'GET' })
  },

  // Orders
  getAllOrders() {
    return apiRequest('/admin/orders', { method: 'GET' })
  },
}