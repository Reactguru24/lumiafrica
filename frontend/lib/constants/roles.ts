import type { UserRole } from '@/lib/types'

/** Roles that can checkout and use the customer account area. */
export const CUSTOMER_ROLES: UserRole[] = ['CUSTOMER']

/** Roles allowed to shop and complete checkout (includes vendors buying from others). */
export const SHOPPER_ROLES: UserRole[] = ['CUSTOMER', 'VENDOR']

export function roleSatisfies(userRole: UserRole | null, required: UserRole): boolean {
  if (!userRole) return false
  return userRole === required
}

export function canAccessRoles(userRole: UserRole | null, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false
  return requiredRoles.some((required) => roleSatisfies(userRole, required))
}
