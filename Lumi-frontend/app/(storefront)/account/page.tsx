'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { useUpdateProfile, useCurrentUser, useChangePassword } from '@/lib/api/hooks'
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

export default function AccountProfilePage() {
  const auth = useAuthStore()
  const { refetch } = useCurrentUser()
  const updateProfile = useUpdateProfile().mutate
  const changePassword = useChangePassword().mutate
  const [form, setForm] = useState({
    fullName: auth.user?.fullName || '',
    email: auth.user?.email || '',
    phone: auth.user?.phone || '',
    avatar: auth.user?.avatar || '',
  })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [changingPassword, setChangingPassword] = useState(false)

  async function saveProfile() {
    if (!auth.user) return
    try {
      await updateProfile({ fullName: form.fullName, phone: form.phone, avatar: form.avatar || undefined })
      toast.success('Profile updated successfully')
      await refetch()
      auth.refreshUser()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to update profile. Please try again.'))
    }
  }

  async function handleAvatarChange(url: string) {
    setForm((f) => ({ ...f, avatar: url }))
    await updateProfile({ avatar: url })
    await refetch()
    await auth.refreshUser()
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
      const response = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }) as { message?: string }
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
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Profile Photo</h2>
        <ProfileAvatarUpload
          fullName={form.fullName}
          avatar={form.avatar}
          onAvatarChange={handleAvatarChange}
        />
      </div>
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Personal Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Full Name</label><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field mt-1" /></div>
          <div><label className="text-sm font-medium">Email</label><input value={form.email} type="email" className="input-field mt-1" disabled /></div>
          <div><label className="text-sm font-medium">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field mt-1" /></div>
        </div>
        <button className="btn-primary mt-4" onClick={saveProfile}>Save Changes</button>
      </div>
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Password Settings</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <input value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} type="password" className="input-field mt-1" />
            {passwordErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <input value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} type="password" className="input-field mt-1" />
            {passwordErrors.newPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <input value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} type="password" className="input-field mt-1" />
            {passwordErrors.confirm && <p className="text-red-500 text-xs mt-1">{passwordErrors.confirm}</p>}
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={handleChangePassword} disabled={changingPassword}>
          {changingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
