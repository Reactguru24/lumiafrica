'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useResetPassword } from '@/lib/api/hooks'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { useGuestRedirect } from '@/lib/hooks/useGuestRedirect'
import { z } from 'zod'

const resetSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function ResetPasswordContent() {
  useGuestRedirect()
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetPassword = useResetPassword()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    if (!token) {
      toast.error('Invalid reset link. Please request a new password reset.')
      return
    }
    const result = resetSchema.safeParse(form)
    if (!result.success) {
      const next: Record<string, string> = {}
      result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
      setErrors(next)
      return
    }
    try {
      const response = await resetPassword.mutate({ token, newPassword: form.newPassword }) as { message?: string }
      toast.success(response?.message || 'Password reset successfully.')
      router.push('/auth/login')
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to reset password. Please request a new reset link.'))
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold mb-2">Invalid Reset Link</h1>
        <p className="text-gray-500 mb-6">This password reset link is invalid or has expired.</p>
        <Link href="/auth/forgot-password" className="btn-primary inline-block">Request New Reset Link</Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-2">Reset Password</h1>
      <p className="text-gray-500 mb-8">Enter your new password below.</p>
      <form className="space-y-5" onSubmit={submit}>
        <div>
          <label className="block text-sm font-medium mb-1.5">New Password</label>
          <input value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} type="password" className="input-field" placeholder="••••••••" />
          {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
          <input value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} type="password" className="input-field" placeholder="••••••••" />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={resetPassword.loading}>
          {resetPassword.loading ? 'Resetting...' : 'Reset Password'}
        </button>
        <p className="text-center text-sm text-gray-500">
          <Link href="/auth/login" className="text-gray-900 dark:text-white font-medium hover:underline">Back to Sign In</Link>
        </p>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
