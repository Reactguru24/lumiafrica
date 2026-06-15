/**
 * Custom React hooks for data fetching
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { publicAPI, vendorAPI, adminAPI, authAPI, customerAPI } from './client'

interface UseQueryResult<T> {
  data: T | null
  loading: boolean
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
  queryFn: () => Promise<T>,
  options?: { enabled?: boolean; refetchInterval?: number; queryKey?: string }
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await queryFnRef.current()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const enabled = options?.enabled !== false
    if (!enabled) return

    refetch()

    if (options?.refetchInterval) {
      const interval = setInterval(refetch, options.refetchInterval)
      return () => clearInterval(interval)
    }
  }, [refetch, options?.enabled, options?.refetchInterval, options?.queryKey])

  return { data, loading, error, refetch }
}

function useMutation<T>(
  mutationFn: (data: any) => Promise<T>
): UseMutationResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(async (mutationData?: any) => {
    try {
      setLoading(true)
      setError(null)
      const result = await mutationFn(mutationData)
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [mutationFn])

  return { mutate, loading, error, data }
}

// ── Auth Hooks ────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation((creds) => authAPI.login(creds.email, creds.password))
}

export function useRegister() {
  return useMutation((data) => authAPI.register(data))
}

export function useForgotPassword() {
  return useMutation((email: string) => authAPI.forgotPassword(email))
}

export function useResetPassword() {
  return useMutation((data: { token: string; newPassword: string }) =>
    authAPI.resetPassword(data.token, data.newPassword)
  )
}

export function useChangePassword() {
  return useMutation((data: { currentPassword: string; newPassword: string }) =>
    authAPI.changePassword(data.currentPassword, data.newPassword),
  )
}

export function useCurrentUser() {
  return useQuery(() => authAPI.getCurrentUser())
}

export function useMyVendorApplication() {
  return useQuery(() => customerAPI.getMyVendorApplication())
}

// ── Public Data Hooks ─────────────────────────────────────────────────

export function useProducts(params?: Record<string, any>) {
  const queryKey = JSON.stringify(params ?? {})
  return useQuery(() => publicAPI.listProducts(params), { enabled: true, queryKey })
}

export function useProductFilters() {
  return useQuery(() => publicAPI.getProductFilters())
}

export function useProduct(productId: string) {
  return useQuery(() => publicAPI.getProduct(productId), {
    enabled: !!productId,
  })
}

export function useVendors() {
  return useQuery(() => publicAPI.listVendors())
}

export function useFeaturedVendors() {
  return useQuery(() => publicAPI.getFeaturedVendors())
}

export function useVendor(vendorId: string) {
  return useQuery(() => publicAPI.getVendor(vendorId), {
    enabled: !!vendorId,
  })
}

export function useProductReviews(productId: string) {
  return useQuery(() => publicAPI.getProductReviews(productId), {
    enabled: !!productId,
  })
}

export function useSubscriptionPlans() {
  return useQuery(() => publicAPI.getSubscriptionPlans())
}

// ── Admin Hooks ───────────────────────────────────────────────────────

export function useAdminOrders() {
  return useQuery(() => adminAPI.getAllOrders())
}

export function useAdminUsers() {
  return useQuery(() => adminAPI.listUsers())
}

export function useDisableUser() {
  return useMutation((id: string) => adminAPI.disableUser(id))
}

export function useAdminAnalytics() {
  return useQuery(() => adminAPI.getAnalytics())
}

export function useAdminSubscriptions() {
  return useQuery(() => adminAPI.listSubscriptions())
}

export function useAdminVendorApplications() {
  return useQuery(() => adminAPI.listVendorApplications())
}

export function useApproveVendor() {
  return useMutation((data: { id: string; reviewNote?: string }) => adminAPI.approveVendor(data.id, data.reviewNote))
}

export function useRejectVendor() {
  return useMutation((data: { id: string; reviewNote: string }) => adminAPI.rejectVendor(data.id, data.reviewNote))
}

export function useSetVendorFeatured() {
  return useMutation((data: { id: string; featured: boolean }) => adminAPI.setVendorFeatured(data.id, data.featured))
}

export function useAdminProducts() {
  return useQuery(() => adminAPI.listProducts({ limit: 200 }))
}

export function useAdminPendingProducts() {
  return useQuery(() => adminAPI.listPendingProducts())
}

export function useModerateProduct() {
  return useMutation((data: { id: string; approved: boolean; reason?: string }) => adminAPI.moderateProduct(data.id, data.approved, data.reason))
}

// ── Customer Data Hooks ───────────────────────────────────────────────

export function useUserOrders() {
  return useQuery(() => customerAPI.getUserOrders())
}

export function useUserAddresses() {
  return useQuery(() => customerAPI.getAddresses())
}

export function useCreateOrder() {
  return useMutation((data) => customerAPI.createOrder(data))
}

export function useCreateReview() {
  return useMutation((data) => customerAPI.createReview(data))
}

export function useApplyVendor() {
  return useMutation((data) => customerAPI.applyVendor(data))
}

export function useUploadImage() {
  return useMutation((file: File) => authAPI.uploadImage(file))
}

export function useUpdateProfile() {
  return useMutation((data: { fullName?: string; phone?: string; avatar?: string }) => authAPI.updateProfile(data))
}

export function useAddAddress() {
  return useMutation((data) => customerAPI.addAddress(data))
}

export function useDeleteAddress() {
  return useMutation((addressId) => customerAPI.deleteAddress(addressId))
}

// ── Vendor Data Hooks ─────────────────────────────────────────────────

export function useVendorProfile() {
  return useQuery(() => vendorAPI.getProfile())
}

export function useVendorProducts() {
  return useQuery(() => vendorAPI.getProducts())
}

export function useVendorOrders() {
  return useQuery(() => vendorAPI.getOrders())
}

export function useVendorReviews() {
  return useQuery(() => vendorAPI.getReviews())
}

export function useVendorSubscription() {
  return useQuery(() => vendorAPI.getActiveSubscription())
}

export function useVendorAnalytics() {
  return useQuery(() => vendorAPI.getAnalytics())
}

export function useCreateVendorProduct() {
  return useMutation((data) => vendorAPI.createProduct(data))
}

export function useUpdateVendorProduct() {
  return useMutation((data) => vendorAPI.updateProduct(data.id, data.payload))
}

export function useDeleteVendorProduct() {
  return useMutation((productId) => vendorAPI.deleteProduct(productId))
}

export function useUpdateVendorOrderStatus() {
  return useMutation((data) => vendorAPI.updateOrderStatus(data.orderId, data.status))
}

export function useReplyToReview() {
  return useMutation((data) => vendorAPI.replyToReview(data.reviewId, data.reply))
}

export function useVendorSubscriptionHistory() {
  return useQuery(() => vendorAPI.getSubscriptionHistory())
}

export function useVendorSubscribe() {
  return useMutation((data) => vendorAPI.subscribe(data.plan, data.paymentMethod))
}

export function useCancelVendorSubscription() {
  return useMutation(() => vendorAPI.cancelSubscription())
}

export function useUpdateVendorProfile() {
  return useMutation((data) => vendorAPI.updateProfile(data))
}