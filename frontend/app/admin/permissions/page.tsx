 'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { adminAPI } from '@/lib/api/client'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

export default function AdminPermissionsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  

  async function load() {
    try {
      setLoading(true)
      const data = await adminAPI.listPermissions()
      setItems(Array.isArray(data) ? [...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : [])
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to load permissions'))
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Permission creation via UI is disabled. Permissions should be managed via migrations or CLI.

  return (
    <div>
      <AdminPageHeader title="Permissions" subtitle="Create and manage permissions" />
      <div className="card p-4 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500">Permission creation via the admin UI is disabled. Manage permissions via migrations or the backend CLI.</div>
          <button type="button" className="btn-secondary text-sm px-4 py-2 w-full sm:w-auto" onClick={() => load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
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
