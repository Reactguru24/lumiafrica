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

export default function VendorAccountPage() {
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

  async function handleAvatarChange(url: string) {
    setForm((f) => ({ ...f, avatar: url }))
    await updateProfile({ avatar: url })
    await refetch()
    await auth.refreshUser()
  }

  async function saveProfile() {
    try {
      await updateProfile({ fullName: form.fullName, phone: form.phone })
      toast.success('Profile updated')
      await refetch()
      await auth.refreshUser()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Unable to update profile.'))
    }
  }

  async function handleChangePassword() {
    setPasswordErrors({})
    if (!passwordForm.currentPassword) {
      setPasswordErrors({ currentPassword: 'Current password is required' })
      return
    }
    const result = passwordSchema.safeParse(passwordForm)
    if (!result.success) {
      const next: Record<string, string> = {}
      result.error.issues.forEach((i) => { next[i.path[0] as string] = i.message })
      setPasswordErrors(next)
      return
    }
    setChangingPassword(true)
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
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
          <input value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} type="password" placeholder="Current password" className="input-field" />
          {passwordErrors.currentPassword && <p className="text-red-500 text-xs">{passwordErrors.currentPassword}</p>}
          <input value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} type="password" placeholder="New password" className="input-field" />
          <input value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} type="password" placeholder="Confirm password" className="input-field" />
        </div>
        <button type="button" className="btn-primary" onClick={handleChangePassword} disabled={changingPassword}>
          {changingPassword ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
