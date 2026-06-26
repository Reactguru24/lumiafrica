'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
import { ProfileAvatarUpload } from '@/components/account/ProfileAvatarUpload'
import { VendorModeToggle } from '@/components/vendor/VendorModeToggle'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { z } from 'zod'

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirm: z.string(),
}).refine((data) => data.newPassword === data.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

export default function VendorAccountPage() {
  const auth = useAuthStore()
  const [form, setForm] = useState({
    fullName: auth.user?.fullName || '',
    email: auth.user?.email || '',
    phone: auth.user?.phone || '',
    avatar: auth.user?.avatar || '',
  })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleAvatarChange(url: string) {
    setForm((f) => ({ ...f, avatar: url }))
    await auth.updateProfile({ avatar: url })
  }

  async function saveProfile() {
    if (!auth.user) return
    try {
      await auth.updateProfile({ fullName: form.fullName, phone: form.phone, avatar: form.avatar || undefined })
      toast.success('Profile updated successfully')
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to update profile. Please try again.'))
    }
  }

  async function handleChangePassword() {
    setPasswordErrors({})
    if (!passwordForm.currentPassword) {
      setPasswordErrors({ currentPassword: 'Current password is required' })
      return
    }
    const result = passwordSchema.safeParse({ newPassword: passwordForm.newPassword, confirm: passwordForm.confirm })
    if (!result.success) {
      const next: Record<string, string> = {}
      result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
      setPasswordErrors(next)
      return
    }
    setChangingPassword(true)
    try {
      const response = await auth.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      toast.success(response?.message || 'Password updated successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to update password. Please try again.'))
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-semibold">Your vendor account</h2>
          <p className="text-sm text-gray-500 mt-1">
            Switch between browsing the marketplace and managing your store — no separate login needed.
          </p>
        </div>
        <VendorModeToggle />
      </div>
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Profile Photo</h2>
        <ProfileAvatarUpload fullName={form.fullName} avatar={form.avatar} onAvatarChange={handleAvatarChange} />
      </div>
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Personal Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Full Name</label><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field mt-1" /></div>
          <div><label className="text-sm font-medium">Email</label><input value={form.email} type="email" className="input-field mt-1" disabled /></div>
          <div><label className="text-sm font-medium">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field mt-1" /></div>
        </div>
        <button type="button" className="btn-primary mt-4" onClick={saveProfile}>Save Changes</button>
      </div>
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Password Settings</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <div className="relative mt-1">
              <input value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} type={showCurrentPassword ? 'text' : 'password'} className="input-field pr-10" />
              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
                {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {passwordErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <div className="relative mt-1">
              <input value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} type={showNewPassword ? 'text' : 'password'} className="input-field pr-10" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
                {showNewPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {passwordErrors.newPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <div className="relative mt-1">
              <input value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} type={showConfirmPassword ? 'text' : 'password'} className="input-field pr-10" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
                {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {passwordErrors.confirm && <p className="text-red-500 text-xs mt-1">{passwordErrors.confirm}</p>}
          </div>
        </div>
        <button type="button" className="btn-primary mt-4" onClick={handleChangePassword} disabled={changingPassword}>
          {changingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
