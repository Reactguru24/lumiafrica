'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { registerSchema } from '@/lib/utils/validation'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { useGuestRedirect } from '@/lib/hooks/useGuestRedirect'

export default function RegisterPage() {
  const router = useRouter()
  const auth = useAuthStore()
  useGuestRedirect()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
      await auth.register({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password })
      toast.success('Account created successfully!')
      router.push('/account')
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to create your account. Please try again.'))
    }
  }

  return (
      <div>
        <h1 className="font-display text-3xl font-semibold mb-2">Create Account</h1>
        <p className="text-gray-500 mb-8">Join LumiAfrica and start shopping across East Africa</p>
        <form className="space-y-4" onSubmit={submit}>
          {(['fullName', 'email', 'phone', 'password', 'confirmPassword'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1.5 capitalize">{field === 'fullName' ? 'Full Name' : field === 'confirmPassword' ? 'Confirm Password' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                type={field.includes('password') ? 'password' : field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                className="input-field"
                placeholder={field.includes('password') ? '••••••••' : undefined}
              />
              {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
            </div>
          ))}
          <button type="submit" className="btn-primary w-full" disabled={auth.loading}>
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
