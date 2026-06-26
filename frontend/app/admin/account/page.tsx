'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '@/lib/stores/auth'
import { ProfileAvatarUpload } from '@/components/account/ProfileAvatarUpload'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { z } from 'zod'

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirm: z.string(),
}).refine((data) => data.newPassword === data.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

export default function AdminAccountPage() {
  const auth = useAuthStore()
  const [form, setForm] = useState({
    fullName: auth.user?.fullName || '',
    email: auth.user?.email || '',
    phone: auth.user?.phone || '',
    avatar: auth.user?.avatar || '',
  })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleAvatarChange(url: string) {
    setForm((f) => ({ ...f, avatar: url }))
    await auth.updateProfile({ avatar: url })
  }

  async function saveProfile() {
    try {
      await auth.updateProfile({ fullName: form.fullName, phone: form.phone })
      toast.success('Profile updated')
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to update profile.'))
    }
  }

  async function handleChangePassword() {
    const result = passwordSchema.safeParse(passwordForm)
    if (!result.success || !passwordForm.currentPassword) {
      toast.error('Please fill in all password fields correctly.')
      return
    }
    setChangingPassword(true)
    try {
      await auth.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      toast.success('Password updated')
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to update password.'))
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-semibold">My Account</h1>
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Profile Photo</h2>
        <ProfileAvatarUpload fullName={form.fullName} avatar={form.avatar} onAvatarChange={handleAvatarChange} />
      </div>
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold">Personal Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Full Name</label><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field mt-1" /></div>
          <div><label className="text-sm font-medium">Email</label><input value={form.email} disabled className="input-field mt-1" /></div>
          <div><label className="text-sm font-medium">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field mt-1" /></div>
        </div>
        <button type="button" className="btn-primary" onClick={saveProfile}>Save</button>
      </div>
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold">Password</h2>
        <div className="space-y-3 max-w-md">
          <div className="relative">
            <input value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} type={showCurrentPassword ? 'text' : 'password'} placeholder="Current password" className="input-field pr-10" />
            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
              {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          <div className="relative">
            <input value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} type={showNewPassword ? 'text' : 'password'} placeholder="New password" className="input-field pr-10" />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
              {showNewPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          <div className="relative">
            <input value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" className="input-field pr-10" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 focus:outline-none">
              {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" /> : <EyeIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={handleChangePassword} disabled={changingPassword}>
          {changingPassword ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
