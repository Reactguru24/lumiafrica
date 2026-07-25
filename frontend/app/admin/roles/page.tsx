 'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminAPI } from '@/lib/api/client'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')

  async function load() {
    try {
      setLoading(true)
      const data = await adminAPI.listRoles()
      setRoles(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to load roles'))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      setLoading(true)
      await adminAPI.createRole({ name, display_name: displayName })
      toast.success('Role created')
      setName('')
      setDisplayName('')
      await load()
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to create role'))
    } finally { setLoading(false) }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteRoleId || !inviteEmail) return toast.error('Select a role and provide an email')
    try {
      setLoading(true)
      await adminAPI.inviteUserToRole(inviteRoleId, { email: inviteEmail, full_name: inviteName })
      toast.success('Invitation sent')
      setInviteEmail('')
      setInviteName('')
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to invite user'))
    } finally { setLoading(false) }
  }

  return (
    <div>
      <AdminPageHeader title="Roles" subtitle="Manage roles and assignments" />
      <div className="card p-4 mb-4">
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className="input-field" placeholder="name (internal)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-field" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <button className="btn-primary" disabled={loading || !name || !displayName}>{loading ? 'Creating…' : 'Create Role'}</button>
        </form>
        <hr className="my-4" />
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select className="input-field" value={inviteRoleId ?? ''} onChange={(e) => setInviteRoleId(e.target.value || null)}>
            <option value="">Select role to invite into</option>
            {roles.map((r) => (<option key={r.id} value={r.id}>{r.display_name || r.name}</option>))}
          </select>
          <input className="input-field" placeholder="Recipient email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <input className="input-field" placeholder="Full name (optional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <button className="btn-secondary" disabled={loading || !inviteRoleId || !inviteEmail}>{loading ? 'Sending…' : 'Invite'}</button>
        </form>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Existing roles</h3>
        {roles.length === 0 ? (
          <div className="text-sm text-gray-500">No roles found.</div>
        ) : (
          <ul className="space-y-2">
            {roles.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.display_name || r.name}</div>
                  <div className="text-xs text-gray-500">{r.name}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
