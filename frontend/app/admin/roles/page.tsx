 'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminAPI } from '@/lib/api/client'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])
  const [permQuery, setPermQuery] = useState('')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')

  async function load() {
    try {
      setLoading(true)
      const data = await adminAPI.listRoles()
      setRoles(Array.isArray(data) ? [...data].sort((a, b) => (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')) : [])
      const perms = await adminAPI.listPermissions()
      setPermissions(Array.isArray(perms) ? [...perms].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : [])
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
          <button type="submit" className="btn-primary w-full sm:w-auto text-sm px-4 py-2" disabled={loading || !name || !displayName}>{loading ? 'Creating…' : 'Create Role'}</button>
        </form>
        <hr className="my-4" />
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select className="input-field" value={inviteRoleId ?? ''} onChange={(e) => setInviteRoleId(e.target.value || null)}>
            <option value="">Select role to invite into</option>
            {roles.map((r) => (<option key={r.id} value={r.id}>{r.display_name || r.name}</option>))}
          </select>
          <input className="input-field" placeholder="Recipient email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <input className="input-field" placeholder="Full name (optional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <button type="submit" className="btn-secondary w-full sm:w-auto text-sm px-4 py-2" disabled={loading || !inviteRoleId || !inviteEmail}>{loading ? 'Sending…' : 'Invite'}</button>
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
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary text-sm px-4 py-2" onClick={async () => {
                    setEditingRole(r.id)
                    try {
                      setLoading(true)
                      const rp = await adminAPI.getRolePermissions(r.id)
                      setSelectedPerms(Array.isArray(rp) ? rp.map((p: any) => p.id) : [])
                    } catch (err) {
                      toast.error(getFriendlyErrorMessage(err, 'Unable to load role permissions'))
                    } finally { setLoading(false) }
                  }}>Edit permissions</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Permissions modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 p-4 rounded max-w-xl w-full">
            <h3 className="font-semibold mb-2">Edit permissions</h3>
            <div className="mb-3 flex gap-2">
              <input className="input-field flex-1" placeholder="Search permissions" value={permQuery} onChange={(e) => setPermQuery(e.target.value)} />
              <button type="button" className="btn-secondary text-sm px-4 py-2" onClick={async () => {
                // reload role perms
                try {
                  setLoading(true)
                  const rp = await adminAPI.getRolePermissions(editingRole)
                  setSelectedPerms(Array.isArray(rp) ? rp.map((p: any) => p.id) : [])
                } catch (err) {
                  toast.error(getFriendlyErrorMessage(err, 'Unable to load role permissions'))
                } finally { setLoading(false) }
              }}>Reload</button>
            </div>
            <div className="max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {permissions.map((p) => (
                // filter by search
                permQuery && !((p.name || '').toLowerCase().includes(permQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(permQuery.toLowerCase())) ? null : (
                <label key={p.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={(e) => {
                    if (e.target.checked) setSelectedPerms((s) => [...s, p.id])
                    else setSelectedPerms((s) => s.filter((x) => x !== p.id))
                  }} />
                  <div>
                    <div className="text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.description}</div>
                  </div>
                </label>
                )
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary text-sm px-4 py-2" onClick={() => setEditingRole(null)}>Cancel</button>
              <button type="button" className="btn-primary text-sm px-4 py-2" onClick={async () => {
                try {
                  setLoading(true)
                  await adminAPI.assignPermissionToRole(editingRole, selectedPerms)
                  toast.success('Permissions updated')
                  setEditingRole(null)
                } catch (err) {
                  toast.error(getFriendlyErrorMessage(err, 'Unable to update permissions'))
                } finally { setLoading(false) }
              }}>{loading ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
