'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
import { useCartStore } from '@/lib/stores/cart'
import { registerSchema } from '@/lib/utils/validation'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { safeRedirect } from '@/lib/utils/safeRedirect'
import { useGuestRedirect } from '@/lib/hooks/useGuestRedirect'

export default function RegisterPage() {
  const router = useRouter()
  const auth = useAuthStore()
  useGuestRedirect()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
      await useCartStore.getState().pushLocalToGuestCart()
      await auth.register({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password })
      toast.success('Account created successfully!')
      const redirect = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null
      router.push(safeRedirect(redirect, '/account'))
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to create your account. Please try again.'))
    }
  }

  return (
      <div>
        <h1 className="font-display text-3xl font-semibold mb-2">Create Account</h1>
        <p className="text-gray-500 mb-8">Join LumiAfrica and start shopping across East Africa</p>
        <form className="space-y-4" onSubmit={submit}>
          {(['fullName', 'email', 'phone'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1.5">{field === 'fullName' ? 'Full Name' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                className="input-field"
              />
              {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
            </div>
          ))}
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
          <Link href="/auth/login" className="text-gray-900 dark:text-white font-medium hover:underline">Sign In</Link>
        </p>
      </div>
  )
}
