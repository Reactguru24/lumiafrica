/**
 * Zustand-backed data fetching hooks for API calls.
 */

'use client'

import { useEffect, useCallback, useRef, useId } from 'react'
import { publicAPI, vendorAPI, adminAPI, authAPI, customerAPI } from '@/lib/api/client'
import {
  useQueryStore,
  emptyQueryEntry,
  emptyMutationEntry,
  type QueryEntry,
  type MutationEntry,
} from '@/lib/stores/query'

interface UseQueryResult<T> {
  data: T | null
  loading: boolean
  isRefetching: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface UseMutationResult<T> {
  mutate: (data?: any) => Promise<T>
  loading: boolean
  error: Error | null
  data: T | null
}

function useQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options?: { enabled?: boolean; refetchInterval?: number },
): UseQueryResult<T> {
  const enabled = options?.enabled !== false
  const entry = useQueryStore((s) => s.queries[queryKey] ?? emptyQueryEntry) as QueryEntry<T>
  const fetchQuery = useQueryStore((s) => s.fetchQuery)
  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  const refetch = useCallback(async () => {
    await fetchQuery(queryKey, () => queryFnRef.current())
  }, [queryKey, fetchQuery])

  useEffect(() => {
    if (!enabled) return

    fetchQuery(queryKey, () => queryFnRef.current())

    if (options?.refetchInterval) {
      const interval = setInterval(
        () => fetchQuery(queryKey, () => queryFnRef.current()),
        options.refetchInterval,
      )
      return () => clearInterval(interval)
    }
  }, [queryKey, enabled, options?.refetchInterval, fetchQuery])

  if (!enabled) {
    return { data: null, loading: false, isRefetching: false, error: null, refetch }
  }

  const loading = entry.loading || (entry.data == null && entry.error == null && !entry.isRefetching)

  return {
    data: entry.data,
    loading,
    isRefetching: entry.isRefetching,
    error: entry.error,
    refetch,
  }
}

function useMutation<T>(
  mutationKey: string,
  mutationFn: (data?: any) => Promise<T>,
): UseMutationResult<T> {
  const instanceId = useId()
  const key = `${mutationKey}:${instanceId}`
  const entry = useQueryStore((s) => s.mutations[key] ?? emptyMutationEntry) as MutationEntry<T>
  const runMutation = useQueryStore((s) => s.runMutation)
  const mutationFnRef = useRef(mutationFn)
  mutationFnRef.current = mutationFn

  const mutate = useCallback(
    async (mutationData?: any) => runMutation(key, (d) => mutationFnRef.current(d), mutationData),
    [key, runMutation],
  )

  return { mutate, loading: entry.loading, error: entry.error, data: entry.data }
}

// ── Public Data ───────────────────────────────────────────────────────

export function useProducts(params?: Record<string, any>, options?: { enabled?: boolean }) {
  const queryKey = `products:${JSON.stringify(params ?? {})}`
  return useQuery(queryKey, () => publicAPI.listProducts(params), {
    enabled: options?.enabled !== false,
  })
}

export function useHomepageProducts() {
  return useQuery('homepage-products', () => publicAPI.getHomepageProducts())
}

export function useProductFilters() {
  return useQuery('product-filters', () => publicAPI.getProductFilters())
}

export function useProduct(productId: string) {
  return useQuery(`product:${productId}`, () => publicAPI.getProduct(productId, { relatedLimit: 8 }), {
    enabled: !!productId,
  })
}

export function useVendors() {
  return useQuery('vendors', () => publicAPI.listVendors())
}

export function useFeaturedVendors() {
  return useQuery('featured-vendors', () => publicAPI.getFeaturedVendors())
}

export function useDeliveryZones() {
  return useQuery('delivery-zones', () => publicAPI.getDeliveryZones())
}

export function useShippingEstimate(items: Record<string, unknown>[], deliveryZoneId: string) {
  const key = items.length && deliveryZoneId ? `shipping-${deliveryZoneId}-${JSON.stringify(items)}` : 'shipping-empty'
  return useQuery(
    key,
    () => publicAPI.estimateShipping(items, deliveryZoneId) as Promise<{
      shippingCost: number
      deliveryZoneId: string
      breakdown: { vendorId: string; storeName: string; subtotal: number; shippingCost: number }[]
    }>,
    { enabled: items.length > 0 && !!deliveryZoneId },
  )
}

export function usePromotions() {
  return useQuery('promotions', () => publicAPI.getPromotions())
}

export function useCollections() {
  return useQuery('collections', () => publicAPI.getCollections())
}

export function useCollection(slug: string) {
  return useQuery(`collection:${slug}`, () => publicAPI.getCollection(slug), { enabled: !!slug })
}

export function useVendor(vendorId: string) {
  return useQuery(`vendor:${vendorId}`, () => publicAPI.getVendor(vendorId), {
    enabled: !!vendorId,
  })
}

export function useProductReviews(productId: string) {
  return useQuery(`product-reviews:${productId}`, () => publicAPI.getProductReviews(productId), {
    enabled: !!productId,
  })
}

export function useSubscriptionPlans() {
  return useQuery('subscription-plans', () => publicAPI.getSubscriptionPlans())
}

// ── Admin ─────────────────────────────────────────────────────────────

export function useAdminOrders(page = 1, limit = 15) {
  return useQuery(`admin-orders-${page}-${limit}`, () => adminAPI.getAllOrders({ page, limit }))
}

export function useAdminUsers(page = 1, limit = 20) {
  return useQuery(`admin-users-${page}-${limit}`, () => adminAPI.listUsers({ page, limit }))
}

export function useDisableUser() {
  return useMutation('disable-user', (id: string) => adminAPI.disableUser(id))
}

export function useEnableUser() {
  return useMutation('enable-user', (id: string) => adminAPI.enableUser(id))
}

export function useAdminAnalytics() {
  return useQuery('admin-analytics', () => adminAPI.getAnalytics())
}

export function useAdminSubscriptions(page = 1, limit = 20, active?: boolean) {
  return useQuery(
    `admin-subs-${page}-${limit}-${active ?? 'all'}`,
    () => adminAPI.listSubscriptions({ page, limit, active }),
  )
}

export function useAdminVendorApplications(page = 1, limit = 20) {
  return useQuery(
    `admin-vendor-apps-${page}-${limit}`,
    () => adminAPI.listVendorApplications({ page, limit }),
  )
}

export function useAdminVendors(page = 1, limit = 20) {
  return useQuery(`admin-vendors-${page}-${limit}`, () => adminAPI.listVendors({ page, limit }))
}

export function useUpdateAdminOrderStatus() {
  return useMutation('update-admin-order-status', (data: { orderId: string; status: string }) =>
    adminAPI.updateOrderStatus(data.orderId, data.status),
  )
}

export function useApproveVendor() {
  return useMutation('approve-vendor', (data: { id: string; reviewNote?: string }) =>
    adminAPI.approveVendor(data.id, data.reviewNote),
  )
}

export function useRejectVendor() {
  return useMutation('reject-vendor', (data: { id: string; reviewNote: string }) =>
    adminAPI.rejectVendor(data.id, data.reviewNote),
  )
}

export function useResendVendorActivation() {
  return useMutation('resend-vendor-activation', (data: { applicationId?: string; vendorId?: string }) => {
    if (data.vendorId) return adminAPI.resendVendorActivationByVendor(data.vendorId)
    if (data.applicationId) return adminAPI.resendVendorActivationByApplication(data.applicationId)
    return Promise.reject(new Error('applicationId or vendorId is required'))
  })
}

export function useSetVendorFeatured() {
  return useMutation('set-vendor-featured', (data: { id: string; featured: boolean }) =>
    adminAPI.setVendorFeatured(data.id, data.featured),
  )
}

export function useAdminProducts(page = 1, limit = 50, search = '') {
  const q = search.trim()
  return useQuery(
    `admin-products-${page}-${limit}-${q}`,
    () => adminAPI.listProducts({ page, limit, q: q || undefined }),
  )
}

export function useAdminPendingProducts(page = 1, limit = 20, search = '') {
  const q = search.trim()
  return useQuery(
    `admin-pending-products-${page}-${limit}-${q}`,
    () => adminAPI.listPendingProducts({ page, limit, q: q || undefined }),
  )
}

export function useAdminPlatformSettings() {
  return useQuery('admin-platform-settings', () => adminAPI.getPlatformSettings())
}

export function useUpdateAdminPlatformSettings() {
  return useMutation(
    'update-admin-platform-settings',
    (data: { commissionRate: number; commissionEnabled: boolean }) =>
      adminAPI.updatePlatformSettings(data),
  )
}

export function useModerateProduct() {
  return useMutation(
    'moderate-product',
    (data: { id: string; approved: boolean; archive?: boolean; reason?: string }) =>
      adminAPI.moderateProduct(data.id, data.approved, data.reason, data.archive),
  )
}

export function useAdminFeaturedListings(page = 1, limit = 10) {
  return useQuery(
    `admin-featured-${page}-${limit}`,
    () => adminAPI.getFeaturedListings({ page, limit }),
  )
}

export function useSetAdminProductFeatured() {
  return useMutation('set-admin-product-featured', (data: { id: string; featured: boolean }) =>
    adminAPI.setProductFeatured(data.id, data.featured),
  )
}

export function useAdminCoupons(page = 1, limit = 20) {
  return useQuery(`admin-coupons-${page}`, () => adminAPI.listCoupons({ page, limit }))
}

export function useCreateAdminCoupon() {
  return useMutation('create-admin-coupon', (data) => adminAPI.createCoupon(data))
}

export function useUpdateAdminCoupon() {
  return useMutation('update-admin-coupon', (data: { id: string; payload: Record<string, unknown> }) =>
    adminAPI.updateCoupon(data.id, data.payload),
  )
}

export function useAdminPromotions(page = 1, limit = 20) {
  return useQuery(`admin-promotions-${page}`, () => adminAPI.listPromotions({ page, limit }))
}

export function useAdminCollections(page = 1, limit = 20) {
  return useQuery(`admin-collections-${page}`, () => adminAPI.listCollections({ page, limit }))
}

export function useCreateAdminPromotion() {
  return useMutation('create-admin-promotion', (data) => adminAPI.createPromotion(data))
}

export function useUpdateAdminPromotion() {
  return useMutation('update-admin-promotion', (data: { id: string; payload: Record<string, unknown> }) =>
    adminAPI.updatePromotion(data.id, data.payload),
  )
}

export function useSetAdminPromotionActive() {
  return useMutation('set-admin-promotion-active', (data: { id: string; active: boolean }) =>
    adminAPI.setPromotionActive(data.id, data.active),
  )
}

export function useCreateAdminCollection() {
  return useMutation('create-admin-collection', (data) => adminAPI.createCollection(data))
}

export function useUpdateAdminCollection() {
  return useMutation('update-admin-collection', (data: { id: string; payload: Record<string, unknown> }) =>
    adminAPI.updateCollection(data.id, data.payload),
  )
}

export function useSetAdminCollectionActive() {
  return useMutation('set-admin-collection-active', (data: { id: string; active: boolean }) =>
    adminAPI.setCollectionActive(data.id, data.active),
  )
}

export function useSetAdminCouponActive() {
  return useMutation('set-admin-coupon-active', (data: { id: string; active: boolean }) =>
    adminAPI.setCouponActive(data.id, data.active),
  )
}

export function useVerifyPayment(reference: string, enabled = true) {
  return useQuery(
    `payment-verify-${reference}`,
    () => customerAPI.verifyPayment(reference),
    { enabled: enabled && !!reference },
  )
}

// ── Customer ──────────────────────────────────────────────────────────

export function useUserOrders() {
  return useQuery('user-orders', () => customerAPI.getUserOrders())
}

export function useUserAddresses() {
  return useQuery('user-addresses', () => customerAPI.getAddresses())
}

export function useCreateOrder() {
  return useMutation(
    'create-order',
    (data: { payload: Record<string, unknown>; idempotencyKey?: string }) =>
      customerAPI.createOrder(data.payload, data.idempotencyKey),
  )
}

export function useValidateCoupon() {
  return useMutation('validate-coupon', (data: { code: string; subtotal: number }) =>
    customerAPI.validateCoupon(data.code, data.subtotal),
  )
}

export function useCreateReview() {
  return useMutation('create-review', (data) => customerAPI.createReview(data))
}

export function useApplyVendor() {
  return useMutation('apply-vendor', (data) => publicAPI.applyVendor(data))
}

export function useVendorApplicationStatus(email: string, options?: { enabled?: boolean }) {
  return useQuery(
    `vendor-application-status:${email}`,
    () => publicAPI.getVendorApplicationStatus(email),
    { enabled: (options?.enabled ?? true) && !!email },
  )
}

export function useAddAddress() {
  return useMutation('add-address', (data) => customerAPI.addAddress(data))
}

export function useDeleteAddress() {
  return useMutation('delete-address', (addressId) => customerAPI.deleteAddress(addressId))
}

// ── Vendor ────────────────────────────────────────────────────────────

export function useVendorProfile() {
  return useQuery('vendor-profile', () => vendorAPI.getProfile())
}

export function useVendorProducts() {
  return useQuery('vendor-products', () => vendorAPI.getProducts())
}

export function useVendorOrders() {
  return useQuery('vendor-orders', () => vendorAPI.getOrders())
}

export function useVendorReviews(page = 1, limit = 10) {
  return useQuery(`vendor-reviews-${page}-${limit}`, () => vendorAPI.getReviews({ page, limit }))
}

export function useVendorSubscription() {
  return useQuery('vendor-subscription', () => vendorAPI.getActiveSubscription())
}

export function useVendorAnalytics(period = '30days') {
  return useQuery(`vendor-analytics-${period}`, () => vendorAPI.getAnalytics(period))
}

export function useCreateVendorProduct() {
  return useMutation('create-vendor-product', (data) => vendorAPI.createProduct(data))
}

export function useUpdateVendorProduct() {
  return useMutation('update-vendor-product', (data) => vendorAPI.updateProduct(data.id, data.payload))
}

export function useUpdateVendorProductFeatured() {
  return useMutation('update-vendor-product-featured', (data: { id: string; featured: boolean }) =>
    vendorAPI.updateProductFeatured(data.id, data.featured),
  )
}

export function useDeleteVendorProduct() {
  return useMutation('delete-vendor-product', (productId) => vendorAPI.deleteProduct(productId))
}

export function useRestoreVendorProduct() {
  return useMutation('restore-vendor-product', (productId: string) => vendorAPI.restoreProduct(productId))
}

export function useUpdateVendorOrderStatus() {
  return useMutation('update-vendor-order-status', (data) =>
    vendorAPI.updateOrderStatus(data.orderId, data.status),
  )
}

export function useReplyToReview() {
  return useMutation('reply-to-review', (data) => vendorAPI.replyToReview(data.reviewId, data.reply))
}

export function useVendorSubscriptionHistory() {
  return useQuery('vendor-subscription-history', () => vendorAPI.getSubscriptionHistory())
}

export function useVendorSubscribe() {
  return useMutation(
    'vendor-subscribe',
    (data: { plan: string; paymentMethod?: string; productIds?: string[] }) =>
      vendorAPI.subscribe(data.plan, data.paymentMethod || 'Paystack', data.productIds),
  )
}

export function useCancelVendorSubscription() {
  return useMutation('cancel-vendor-subscription', () => vendorAPI.cancelSubscription())
}

export function useVendorShippingRates() {
  return useQuery('vendor-shipping-rates', () => vendorAPI.getShippingRates())
}

export function useUpdateVendorShippingRates() {
  return useMutation('update-vendor-shipping-rates', (data: { rates: { zoneId: string; fee: number }[]; freeShippingThreshold?: number | null }) =>
    vendorAPI.updateShippingRates(data),
  )
}

export function useUpdateVendorProfile() {
  return useMutation('update-vendor-profile', (data) => vendorAPI.updateProfile(data))
}
