'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
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
  const resetPassword = useAuthStore((s) => s.resetPassword)
  const token = searchParams.get('token') || ''
  const isVendorActivation = searchParams.get('vendor') === '1'
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
    setLoading(true)
    try {
      const response = await resetPassword(token, form.newPassword)
      toast.success(response?.message || (isVendorActivation ? 'Vendor access activated. You can sign in now.' : 'Password reset successfully.'))
      router.push(isVendorActivation ? '/auth/login?vendor=activated' : '/auth/login')
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to reset password. Please request a new reset link.'))
    } finally {
      setLoading(false)
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
      <h1 className="font-display text-3xl font-semibold mb-2">
        {isVendorActivation ? 'Activate your vendor account' : 'Reset Password'}
      </h1>
      <p className="text-gray-500 mb-8">
        {isVendorActivation
          ? 'Set a secure password for your vendor account. After this, sign in with your business email to open the seller dashboard.'
          : 'Enter your new password below.'}
      </p>
      <form className="space-y-5" onSubmit={submit}>
        <div>
          <label className="block text-sm font-medium mb-1.5">New Password</label>
          <div className="relative">
            <input value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} type={showNewPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
              {showNewPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
          <div className="relative">
            <input value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} type={showConfirmPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
              {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
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
