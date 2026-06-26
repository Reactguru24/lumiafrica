import { create } from 'zustand'
import type { User, UserRole, VendorApplication } from '@/lib/types'
import { canAccessRoles, roleSatisfies } from '@/lib/constants/roles'
import { authAPI, APIError, getGuestSessionId, clearGuestSessionId } from '@/lib/api/client'
import { useCartStore } from '@/lib/stores/cart'

interface AuthState {
  user: Omit<User, 'password'> | null
  pendingVendorApplication: VendorApplication | null
  loading: boolean
  hasHydrated: boolean
  isAuthenticated: boolean
  role: UserRole | null
  isCustomer: boolean
  isVendor: boolean
  isAdmin: boolean
  canShop: boolean
  isApplicant: boolean
  isDisabled: boolean
  login: (email: string, password: string) => Promise<Omit<User, 'password'>>
  register: (data: { fullName: string; email: string; phone: string; password: string }) => Promise<Omit<User, 'password'>>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (data: { fullName?: string; phone?: string; avatar?: string }) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ message?: string }>
  forgotPassword: (email: string) => Promise<{ message?: string; resetToken?: string }>
  resetPassword: (token: string, newPassword: string) => Promise<{ message?: string }>
  uploadImage: (file: File) => Promise<{ url: string }>
  setHasHydrated: (value: boolean) => void
  clearSession: () => void
  hasRole: (requiredRole: UserRole | UserRole[]) => boolean
  getDashboardRoute: () => string
  getAccessibleRoutes: () => string[]
  canAccessRoute: (requiredRoles: UserRole[]) => boolean
}

function deriveRole(user: Omit<User, 'password'> | null): UserRole | null {
  if (!user || user.disabled) return null
  const role = user.role ?? null
  if (role && !['CUSTOMER', 'VENDOR', 'ADMIN'].includes(role)) {
    return null
  }
  return role
}

function removePassword(user: any): Omit<User, 'password'> {
  if (!user) return user
  const { password: _, ...safe } = user
  return safe
}

interface MeResponse {
  user?: Omit<User, 'password'>
  pendingVendorApplication?: VendorApplication | null
}

function parseMeResponse(raw: unknown): { user: Omit<User, 'password'> | null; pendingVendorApplication: VendorApplication | null } {
  if (!raw || typeof raw !== 'object') {
    return { user: null, pendingVendorApplication: null }
  }
  const record = raw as MeResponse & Omit<User, 'password'>
  if ('user' in record && record.user) {
    return {
      user: removePassword(record.user),
      pendingVendorApplication: record.pendingVendorApplication ?? null,
    }
  }
  return {
    user: removePassword(record),
    pendingVendorApplication: null,
  }
}

function applyAuthState(
  user: Omit<User, 'password'> | null,
  pendingVendorApplication: VendorApplication | null = null,
) {
  const role = deriveRole(user)
  const isApplicant = pendingVendorApplication?.status === 'pending'
  return {
    user,
    pendingVendorApplication,
    isAuthenticated: !!user,
    role,
    isCustomer: role === 'CUSTOMER',
    isVendor: role === 'VENDOR',
    isAdmin: role === 'ADMIN',
    canShop: role === 'CUSTOMER',
    isApplicant,
    isDisabled: user?.disabled ?? false,
  }
}

const SESSION_KEY = 'session'

function getStoredSession(): { token: string; userId: string } | null {
  if (typeof window === 'undefined') return null
  const session = localStorage.getItem(SESSION_KEY)
  if (!session) return null
  try {
    const parsed = JSON.parse(session) as { token?: string; userId?: string }
    if (!parsed?.token) return null
    return { token: parsed.token, userId: parsed.userId ?? '' }
  } catch {
    return null
  }
}

function clearAuthState() {
  return {
    user: null,
    pendingVendorApplication: null,
    isAuthenticated: false,
    role: null,
    isCustomer: false,
    isVendor: false,
    isAdmin: false,
    canShop: false,
    isApplicant: false,
    isDisabled: false,
  }
}

function storeSession(token: string, userId: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, userId, expiresAt: new Date(Date.now() + 86400000).toISOString() }))
}

interface AuthResponse {
  user?: any
  token?: string
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  pendingVendorApplication: null,
  loading: false,
  hasHydrated: false,
  isAuthenticated: false,
  role: null,
  isCustomer: false,
  isVendor: false,
  isAdmin: false,
  canShop: false,
  isApplicant: false,
  isDisabled: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      if (!email?.trim() || !password?.trim()) {
        throw new Error('Email and password are required')
      }
      const response = await authAPI.login(email, password) as AuthResponse
      const safeUser = removePassword(response?.user)
      if (!safeUser) throw new Error('Login failed - no user data')
      if (safeUser.disabled) throw new Error('Account has been disabled')
      storeSession(response.token || '', safeUser.id)
      const me = await authAPI.getCurrentUser().catch(() => null)
      const parsed = parseMeResponse(me)
      set(applyAuthState(parsed.user ?? safeUser, parsed.pendingVendorApplication))
      if (get().isCustomer) {
        await useCartStore.getState().mergeGuestCart()
      }
      return parsed.user ?? safeUser
    } catch (error) {
      set({
        user: null,
        pendingVendorApplication: null,
        isAuthenticated: false,
        role: null,
        isCustomer: false,
        isVendor: false,
        isAdmin: false,
        canShop: false,
        isApplicant: false,
      })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  register: async (data) => {
    set({ loading: true })
    try {
      if (!data?.fullName?.trim() || !data?.email?.trim() || !data?.password?.trim()) {
        throw new Error('All fields are required')
      }
      const response = await authAPI.register(data) as AuthResponse
      const safeUser = removePassword(response?.user)
      if (!safeUser) throw new Error('Registration failed - no user data')
      storeSession(response.token || '', safeUser.id)
      set(applyAuthState(safeUser, null))
      if (get().isCustomer) {
        await useCartStore.getState().mergeGuestCart()
      }
      return safeUser
    } catch (error) {
      set({
        user: null,
        pendingVendorApplication: null,
        isAuthenticated: false,
        role: null,
        isCustomer: false,
        isVendor: false,
        isAdmin: false,
        canShop: false,
        isApplicant: false,
      })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    set({ loading: true })
    try {
      localStorage.removeItem(SESSION_KEY)
      clearGuestSessionId()
      getGuestSessionId()
      await useCartStore.getState().hydrate()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      set({
        user: null,
        pendingVendorApplication: null,
        loading: false,
        isAuthenticated: false,
        role: null,
        isCustomer: false,
        isVendor: false,
        isAdmin: false,
        canShop: false,
        isApplicant: false,
        isDisabled: false,
      })
    }
  },

  setHasHydrated: (value) => set({ hasHydrated: value }),

  refreshUser: async () => {
    try {
      const session = getStoredSession()
      if (!session?.token) {
        const state = get()
        if (state.isAuthenticated || state.user) {
          set(clearAuthState())
        }
        return
      }

      let raw: unknown
      try {
        raw = await authAPI.getCurrentUser()
      } catch (error) {
        if (error instanceof APIError && error.status === 401) {
          localStorage.removeItem(SESSION_KEY)
          set(clearAuthState())
          return
        }
        console.error('[AUTH] /auth/me failed:', {
          status: error instanceof APIError ? error.status : 'Unknown error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
        raw = null
      }

      if (!raw) {
        const state = get()
        if (state.isAuthenticated || state.user) {
          localStorage.removeItem(SESSION_KEY)
          set(clearAuthState())
        }
        return
      }

      const { user: safeUser, pendingVendorApplication } = parseMeResponse(raw)
      if (safeUser?.disabled) {
        localStorage.removeItem(SESSION_KEY)
        set(clearAuthState())
        return
      }

      set(applyAuthState(safeUser, pendingVendorApplication))
      if (getGuestSessionId() && get().isCustomer) {
        await useCartStore.getState().mergeGuestCart()
      }
    } catch (error) {
      console.error('[AUTH] Hydration failed:', error)
    }
  },

  clearSession: () => {
    localStorage.removeItem(SESSION_KEY)
    set(clearAuthState())
  },

  updateProfile: async (data) => {
    await authAPI.updateProfile(data)
    await get().refreshUser()
  },

  changePassword: async (currentPassword, newPassword) => {
    return authAPI.changePassword(currentPassword, newPassword) as Promise<{ message?: string }>
  },

  forgotPassword: async (email) => {
    return authAPI.forgotPassword(email) as Promise<{ message?: string; resetToken?: string }>
  },

  resetPassword: async (token, newPassword) => {
    return authAPI.resetPassword(token, newPassword) as Promise<{ message?: string }>
  },

  uploadImage: async (file) => {
    const result = await authAPI.uploadImage(file) as { url?: string }
    if (!result?.url) throw new Error('Upload failed')
    return { url: result.url }
  },

  hasRole: (requiredRole) => {
    const { isAuthenticated, role, isApplicant } = get()
    if (!isAuthenticated || !role) return false
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (isApplicant) return roles.includes('CUSTOMER')
    return roles.some((required) => roleSatisfies(role, required))
  },

  getDashboardRoute: () => {
    const currentRole = get().role

    switch (currentRole) {
      case 'ADMIN': return '/admin'
      case 'VENDOR': return '/vendor'
      case 'CUSTOMER': return '/'
      default: return '/'
    }
  },

  getAccessibleRoutes: () => {
    const { isAuthenticated, role } = get()
    if (!isAuthenticated) return ['/', '/auth/login', '/auth/register', '/products']
    const baseRoutes = ['/', '/products', '/cart', '/account', '/account/orders', '/account/wishlist']
    switch (role) {
      case 'ADMIN': return [...baseRoutes, '/admin']
      case 'VENDOR': return ['/', '/products', '/cart', '/vendor', '/vendor/account']
      case 'CUSTOMER': return baseRoutes
      default: return baseRoutes
    }
  },

  canAccessRoute: (requiredRoles) => {
    const { isAuthenticated, role, isApplicant } = get()
    if (!isAuthenticated || !role) return false
    if (isApplicant && requiredRoles.includes('CUSTOMER')) return true
    return canAccessRoles(role, requiredRoles)
  },
}))