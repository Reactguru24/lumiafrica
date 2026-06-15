import { create } from 'zustand'
import type { User, UserRole, VendorApplication } from '@/lib/types'
import { authAPI } from '@/lib/api/client'

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
  isApplicant: boolean
  isDisabled: boolean
  login: (email: string, password: string) => Promise<Omit<User, 'password'>>
  register: (data: { fullName: string; email: string; phone: string; password: string }) => Promise<Omit<User, 'password'>>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
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
    isCustomer: role === 'CUSTOMER' && !isApplicant,
    isVendor: role === 'VENDOR',
    isAdmin: role === 'ADMIN',
    isApplicant,
    isDisabled: user?.disabled ?? false,
  }
}

const SESSION_KEY = 'session'

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
        isApplicant: false,
        isDisabled: false,
      })
    }
  },

  setHasHydrated: (value) => set({ hasHydrated: value }),

  refreshUser: async () => {
    try {
      let raw: unknown
      try {
        raw = await authAPI.getCurrentUser()
      } catch (error) {
        console.error('[AUTH] /auth/me failed:', {
          status: error instanceof Error ? error.message : 'Unknown error',
          error,
          timestamp: new Date().toISOString(),
        })
        raw = null
      }

      if (!raw) {
        const state = get()
        if (state.isAuthenticated || state.user) {
          console.warn('[AUTH] Clearing auth state - /auth/me returned no data')
          set({
            user: null,
            pendingVendorApplication: null,
            isAuthenticated: false,
            role: null,
            isCustomer: false,
            isVendor: false,
            isAdmin: false,
            isApplicant: false,
          })
        }
        return
      }

      const { user: safeUser, pendingVendorApplication } = parseMeResponse(raw)
      if (safeUser?.disabled) {
        console.warn('[AUTH] User is disabled, clearing auth state')
        set({
          user: null,
          pendingVendorApplication: null,
          isAuthenticated: false,
          role: null,
          isCustomer: false,
          isVendor: false,
          isAdmin: false,
          isApplicant: false,
        })
        return
      }

      console.log('[AUTH] Hydration successful:', {
        userId: safeUser?.id,
        role: safeUser?.role,
        email: safeUser?.email,
      })
      set(applyAuthState(safeUser, pendingVendorApplication))
    } catch (error) {
      console.error('[AUTH] Hydration failed:', error)
    }
  },

  clearSession: () => {
    set({
      user: null,
      pendingVendorApplication: null,
      isAuthenticated: false,
      role: null,
      isCustomer: false,
      isVendor: false,
      isAdmin: false,
      isApplicant: false,
    })
  },

  hasRole: (requiredRole) => {
    const { isAuthenticated, role, isApplicant } = get()
    if (!isAuthenticated || !role) return false
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (isApplicant) return roles.includes('CUSTOMER')
    return roles.includes(role)
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
    const baseRoutes = ['/', '/products', '/cart', '/account']
    switch (role) {
      case 'ADMIN': return [...baseRoutes, '/admin']
      case 'VENDOR': return [...baseRoutes, '/vendor']
      case 'CUSTOMER': return [...baseRoutes, '/account']
      default: return baseRoutes
    }
  },

  canAccessRoute: (requiredRoles) => {
    const { isAuthenticated, role, isApplicant } = get()
    if (!isAuthenticated || !role) return false
    if (isApplicant && requiredRoles.includes('CUSTOMER')) return true
    return requiredRoles.includes(role)
  },
}))