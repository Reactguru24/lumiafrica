'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
import { useCartStore } from '@/lib/stores/cart'
import { registerSchema } from '@/lib/utils/validation'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { credentialErrorsFromApiError, validateCredentialsBeforeSubmit } from '@/lib/utils/credentials'
import { getAuthRedirectTarget } from '@/lib/utils/safeRedirect'
import { useGuestRedirect } from '@/lib/hooks/useGuestRedirect'

export default function RegisterPage() {
  const router = useRouter()
  const auth = useAuthStore()
  useGuestRedirect()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loginHref, setLoginHref] = useState('/auth/login')

  useEffect(() => {
    const redirect = new URLSearchParams(window.location.search).get('redirect')
    setLoginHref(
      redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : '/auth/login',
    )
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    const result = registerSchema.safeParse(form)
    if (!result.success) {
      const next: Record<string, string> = {}
      result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
      setErrors(next)
      return
    }
    try {
      const credentialErrors = await validateCredentialsBeforeSubmit({
        email: form.email,
        phone: form.phone,
        context: 'register',
      })
      if (Object.keys(credentialErrors).length > 0) {
        setErrors(credentialErrors)
        return
      }

      await useCartStore.getState().pushLocalToGuestCart()
      await auth.register({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password })
      toast.success('Account created successfully!')
      router.push(getAuthRedirectTarget('/account'))
    } catch (e: unknown) {
      const fieldErrors = credentialErrorsFromApiError(e)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      }
      toast.error(getFriendlyErrorMessage(e, 'Unable to create your account. Please try again.'))
    }
  }

  return (
      <div>
        <h1 className="font-display text-3xl font-semibold mb-2">Create Account</h1>
        <p className="text-gray-500 mb-8">Join LumiAfrica and start shopping across East Africa</p>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                type="text"
                className="input-field"
                autoComplete="name"
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                type="email"
                className="input-field"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                type="tel"
                className="input-field"
                autoComplete="tel"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
                {showPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
                {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>
          <button type="submit" className="btn-primary bg-brand-orange hover:bg-brand-orange/90 w-full" disabled={auth.loading}>
            {auth.loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href={loginHref} className="text-gray-900 dark:text-white font-medium hover:underline">Sign In</Link>
        </p>
      </div>
  )
}
