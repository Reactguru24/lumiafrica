'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { useGuestRedirect } from '@/lib/hooks/useGuestRedirect'
import { z } from 'zod'

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export default function ForgotPasswordPage() {
  useGuestRedirect()
  const forgotPassword = useAuthStore((s) => s.forgotPassword)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const result = forgotSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.issues[0]?.message || 'Invalid email')
      return
    }
    setLoading(true)
    try {
      const response = await forgotPassword(email)
      setSent(true)
      if (response?.resetToken) {
        setDevToken(response.resetToken)
      }
      toast.success(response?.message || 'Check your email for reset instructions.')
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to send reset instructions. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold mb-2">Forgot Password</h1>
      <p className="text-gray-500 mb-8">Enter your email and we&apos;ll send you instructions to reset your password.</p>

      {sent ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-sm text-green-800 dark:text-green-200">
            If an account exists with that email, password reset instructions have been sent.
          </div>
          {devToken && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">Development mode — reset token:</p>
              <Link href={`/auth/reset-password?token=${devToken}`} className="text-brand-teal dark:text-brand-orange underline break-all">
                Reset your password
              </Link>
            </div>
          )}
          <Link href="/auth/login" className="btn-secondary inline-block text-center w-full">Back to Sign In</Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input-field" placeholder="you@email.com" />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-gray-900 dark:text-white font-medium hover:underline">Sign In</Link>
          </p>
        </form>
      )}
    </div>
  )
}
