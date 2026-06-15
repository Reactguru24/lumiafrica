'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { useCartStore } from '@/lib/stores/cart'
import { useThemeStore } from '@/lib/stores/theme'
import { useCurrencyStore } from '@/lib/stores/currency'

function StoreHydration() {
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated)
  const hydrateCart = useCartStore((s) => s.hydrate)
  const hydrateTheme = useThemeStore((s) => s.hydrate)
  const hydrateCurrency = useCurrencyStore((s) => s.hydrate)

  useEffect(() => {
    console.log('[HYDRATION] Starting store hydration...')
    try {
      refreshUser()
      hydrateCart()
      hydrateTheme()
      hydrateCurrency()
      console.log('[HYDRATION] Store hydration complete')
    } catch (error) {
      console.error('[HYDRATION] Failed during hydration:', error)
    } finally {
      setHasHydrated(true)
      console.log('[HYDRATION] hasHydrated set to true')
    }
  }, [refreshUser, setHasHydrated, hydrateCart, hydrateTheme, hydrateCurrency])

  return null
}

function RoutePrefetch() {
  const router = useRouter()

  useEffect(() => {
    router.prefetch('/auth/login')
    router.prefetch('/auth/register')
    router.prefetch('/auth/forgot-password')
    router.prefetch('/products')
    router.prefetch('/cart')
  }, [router])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <StoreHydration />
      <RoutePrefetch />
      {children}
      <Toaster position="top-right" richColors closeButton duration={3000} />
    </>
  )
}
