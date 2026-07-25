 'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminAPI } from '@/lib/api/client'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

export default function AdminPermissionsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function load() {
    try {
      setLoading(true)
      const data = await adminAPI.listPermissions()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to load permissions'))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      setLoading(true)
      await adminAPI.createPermission({ name, description })
      toast.success('Permission created')
      setName('')
      setDescription('')
      await load()
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to create permission'))
    } finally { setLoading(false) }
  }

  return (
    <div>
      <AdminPageHeader title="Permissions" subtitle="Create and manage permissions" />
      <div className="card p-4 mb-4">
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input className="input-field" placeholder="name (e.g. admin.users.create)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input-field" placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div />
          <button className="btn-primary" disabled={loading || !name}>{loading ? 'Creating…' : 'Create Permission'}</button>
        </form>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Existing permissions</h3>
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">No permissions found.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.description}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
