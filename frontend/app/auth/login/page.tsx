'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
import { useCartStore } from '@/lib/stores/cart'
import { loginSchema } from '@/lib/utils/validation'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { safeRedirect } from '@/lib/utils/safeRedirect'
import { Modal } from '@/components/common/Modal'

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuthStore()
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showVendorChoice, setShowVendorChoice] = useState(false)
  const [pauseAutoRedirect, setPauseAutoRedirect] = useState(false)

  useEffect(() => {
    if (hasHydrated && isAuthenticated && !pauseAutoRedirect) {
      router.replace(auth.getDashboardRoute())
    }
  }, [hasHydrated, isAuthenticated, pauseAutoRedirect, router, auth])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    const result = loginSchema.safeParse(form)
    if (!result.success) {
      const next: Record<string, string> = {}
      result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
      setErrors(next)
      return
    }
    try {
      await useCartStore.getState().pushLocalToGuestCart()
      const user = await auth.login(form.email, form.password)
      toast.success('Welcome back!')
      const redirect = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null
      if (redirect) {
        router.push(safeRedirect(redirect))
        return
      }
      if (user.role === 'VENDOR') {
        setPauseAutoRedirect(true)
        setShowVendorChoice(true)
        return
      }
      router.push(auth.getDashboardRoute())
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to sign in. Please check your credentials.'))
    }
  }

  return (
      <div>
        <h1 className="font-display text-3xl font-semibold mb-2">Welcome Back</h1>
        <p className="text-gray-500 mb-2">Sign in to your account</p>
        <form className="space-y-5" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="input-field" placeholder="you@email.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-gray-500 hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type={showPassword ? "text" : "password"} className="input-field pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
                {showPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          <button type="submit" className="btn-primary bg-brand-orange hover:bg-brand-orange/90 w-full" disabled={auth.loading}>
            {auth.loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-gray-900 dark:text-white font-medium hover:underline">Register</Link>
        </p>
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-500 mb-3">Want to sell on Lumi?</p>
          <Link href="/auth/apply-vendor" className="btn-secondary w-full inline-block text-sm py-2.5">
            Apply to Be a Vendor
          </Link>
        </div>
        <Modal
          open={showVendorChoice}
          title="Where would you like to go?"
          onClose={() => {
            setShowVendorChoice(false)
            setPauseAutoRedirect(false)
            router.push('/vendor')
          }}
          size="md"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            You signed in with a vendor account. Choose where to continue.
          </p>
          <div className="grid gap-3">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                setShowVendorChoice(false)
                setPauseAutoRedirect(false)
                router.push('/vendor')
              }}
            >
              Vendor Dashboard
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => {
                setShowVendorChoice(false)
                setPauseAutoRedirect(false)
                router.push('/')
              }}
            >
              Customer Homepage
            </button>
          </div>
        </Modal>
      </div>
  )
}
