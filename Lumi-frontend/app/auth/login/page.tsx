'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { loginSchema } from '@/lib/utils/validation'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { useGuestRedirect } from '@/lib/hooks/useGuestRedirect'

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuthStore()
  useGuestRedirect()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
      await auth.login(form.email, form.password)
      toast.success('Welcome back!')
      const redirect = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect')
        : null
      router.push(redirect || auth.getDashboardRoute())
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to sign in. Please check your credentials.'))
    }
  }

  return (
      <div>
        <h1 className="font-display text-3xl font-semibold mb-2">Welcome Back</h1>
        <p className="text-gray-500 mb-2">Sign in to your account</p>
        <p className="text-xs text-gray-500 mb-8">Customer, vendor, and admin accounts are separate. Use the email for the role you need — sign out before switching.</p>
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
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" className="input-field" placeholder="••••••••" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={auth.loading}>
            {auth.loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-gray-900 dark:text-white font-medium hover:underline">Register</Link>
        </p>
      </div>
  )
}
