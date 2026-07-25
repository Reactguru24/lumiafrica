'use client'

import { useState, useMemo } from 'react'
import { useAdminUsers, useDisableUser, useEnableUser, useAdminAnalytics } from '@/lib/stores/api'
import { useAuthStore } from '@/lib/stores/auth'
import { unwrapPaginated } from '@/lib/utils/api'
import { analyticsField } from '@/lib/utils/admin'
import { confirmAction } from '@/lib/utils/swal'
import { StatCard } from '@/components/common/StatCard'
import { ResponsiveDataTable, type TableRow } from '@/components/common/ResponsiveDataTable'
import { Pagination } from '@/components/common/Pagination'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { UserIcon, ShieldCheckIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'
import { adminAPI } from '@/lib/api/client'
import { useCreateUser } from '@/lib/stores/api'

const ROLES = ['ALL', 'CUSTOMER', 'VENDOR', 'ADMIN'] as const

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<(typeof ROLES)[number]>('ALL')
  const limit = 20
  const currentUserId = useAuthStore((s) => s.user?.id)

  const { data: usersData, loading, refetch } = useAdminUsers(page, limit)
  const { data: analyticsData } = useAdminAnalytics()
  const disableUser = useDisableUser().mutate
  const enableUser = useEnableUser().mutate
  const createUser = useCreateUser()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  async function openInvite() {
    setInviteOpen(true)
    try {
      const data = await adminAPI.listRoles()
      setRoles(Array.isArray(data) ? [...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : [])
    } catch (e) {
      toast.error('Unable to load roles')
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createUser.mutate({ email: inviteEmail, full_name: inviteName, role_ids: selectedRoleIds })
      toast.success('Invitation sent')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
      setSelectedRoleIds([])
      refetch()
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to invite user'))
    }
  }

  const { items: users, total, limit: pageLimit } = unwrapPaginated<{
    id: string
    fullName: string
    email: string
    role: string
    disabled: boolean
    createdAt: string
  }>(usersData)

  const filtered = useMemo(() => {
    if (roleFilter === 'ALL') return users
    return users.filter((u) => u.role === roleFilter)
  }, [users, roleFilter])

  const analytics = (analyticsData as Record<string, unknown>) || {}
  const totalUsers = analyticsField<number>(analytics, 'totalUsers', 'total_users') ?? total

  async function handleDisable(id: string, name: string) {
    const confirmed = await confirmAction({
      title: 'Disable this user?',
      text: `${name} will no longer be able to sign in.`,
      confirmText: 'Yes, disable',
    })
    if (!confirmed) return
    try {
      await disableUser(id)
      toast.success('User disabled')
      refetch()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to disable user'))
    }
  }

  async function handleEnable(id: string, name: string) {
    const confirmed = await confirmAction({
      title: 'Re-activate this user?',
      text: `${name} will be able to sign in again.`,
      confirmText: 'Yes, activate',
      icon: 'question',
    })
    if (!confirmed) return
    try {
      await enableUser(id)
      toast.success('User activated')
      refetch()
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, 'Failed to activate user'))
    }
  }

  const tableData = filtered.map((u) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: u.role,
    disabled: u.disabled,
    createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—',
  }))

  const totalPages = Math.max(1, Math.ceil(total / pageLimit))

  function canModifyUser(row: TableRow) {
    return row.role !== 'ADMIN' && row.id !== currentUserId
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        subtitle="Manage customer and vendor accounts. Admin accounts cannot be disabled."
      >
        <button type="button" onClick={openInvite} className="btn-primary px-3 py-2 text-sm">Invite user</button>
      </AdminPageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={totalUsers} icon={UserIcon} />
        <StatCard
          title="On This Page"
          value={users.filter((u) => u.role === 'ADMIN').length}
          icon={ShieldCheckIcon}
        />
        <StatCard
          title="Disabled (page)"
          value={users.filter((u) => u.disabled).length}
          icon={NoSymbolIcon}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => { setRoleFilter(role); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-xl capitalize transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-teal dark:focus:ring-brand-orange ${
              roleFilter === role
                ? 'bg-brand-teal text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {role === 'ALL' ? 'All roles' : role.toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading users...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No users found for this filter.</p>
        </div>
      ) : (
        <div className="card border border-gray-200 dark:border-gray-700 overflow-hidden rounded-xl">
          <ResponsiveDataTable
            columns={[
              { key: 'name', label: 'Name', width: '22%' },
              { key: 'email', label: 'Email', width: '30%' },
              { key: 'role', label: 'Role', width: '14%' },
              { key: 'disabled', label: 'Status', width: '14%' },
              { key: 'createdAt', label: 'Joined', width: '14%' },
            ]}
            rows={tableData}
            renderCell={(key, row) => {
              if (key === 'role') return <span className="capitalize text-xs font-medium text-gray-700 dark:text-gray-300">{row.role as string}</span>
              if (key === 'disabled') {
                return row.disabled
                  ? <span className="text-xs font-medium text-red-600 dark:text-red-400">Disabled</span>
                  : <span className="text-xs font-medium text-green-600 dark:text-green-400">Active</span>
              }
              return undefined
            }}
            renderActions={(row) => {
              if (!canModifyUser(row)) {
                return <span className="text-xs text-gray-500 dark:text-gray-400">Protected</span>
              }
              if (row.disabled) {
                return (
                  <button
                    type="button"
                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 rounded px-1"
                    onClick={() => handleEnable(row.id, row.name as string)}
                  >
                    Activate
                  </button>
                )
              }
              return (
                <button
                  type="button"
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 rounded px-1"
                  onClick={() => handleDisable(row.id, row.name as string)}
                >
                  Disable
                </button>
              )
            }}
          />
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageLimit}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInviteOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Invite User</h3>
            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email" className="input-field" />
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name (optional)" className="input-field" />
              <div>
                <label className="text-sm font-medium mb-1 block">Assign roles</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                  {roles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selectedRoleIds.includes(r.id)} onChange={(e) => {
                        if (e.target.checked) setSelectedRoleIds((s) => [...s, r.id])
                        else setSelectedRoleIds((s) => s.filter((id) => id !== r.id))
                      }} />
                      <span className="capitalize">{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setInviteOpen(false)} className="px-3 py-2 rounded border">Cancel</button>
                <button type="submit" className="btn-primary px-3 py-2">Send invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
