import { useAuthStore } from '@/lib/stores/auth'
import type { UserRole } from '@/lib/types'

export function usePermissions() {
  const auth = useAuthStore()

  const can = (role: UserRole | UserRole[]) => auth.hasRole(role)
  const canAccess = (...roles: UserRole[]) => auth.canAccessRoute(roles)
  const hasAnyRole = (roles: UserRole[]) => roles.some((role) => auth.hasRole(role))
  const hasAllRoles = (roles: UserRole[]) => roles.every((role) => auth.hasRole(role))

  return {
    isAuthenticated: auth.isAuthenticated,
    isAdmin: auth.isAdmin,
    isVendor: auth.isVendor,
    isCustomer: auth.isCustomer,
    isDisabled: auth.isDisabled,
    currentRole: auth.role,
    shouldShowAdminFeatures: auth.isAdmin && auth.isAuthenticated,
    shouldShowVendorFeatures: auth.isVendor && auth.isAuthenticated,
    shouldShowCustomerFeatures: auth.isCustomer && auth.isAuthenticated,
    can,
    canAccess,
    hasAnyRole,
    hasAllRoles,
    getAccessibleRoutes: () => auth.getAccessibleRoutes(),
    getDashboardRoute: () => auth.getDashboardRoute(),
  }
}
