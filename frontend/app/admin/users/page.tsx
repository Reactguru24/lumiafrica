'use client'

import { useState, useMemo } from 'react'
import { useAdminUsers, useDisableUser, useEnableUser, useAdminAnalytics } from '@/lib/stores/api'
import { useAuthStore } from '@/lib/stores/auth'
import { unwrapPaginated } from '@/lib/utils/api'
import { analyticsField } from '@/lib/utils/admin'
import { confirmAction } from '@/lib/utils/swal'
import { StatCard } from '@/components/common/StatCard'
import { ResponsiveDataTable } from '@/components/common/ResponsiveDataTable'
import { Pagination } from '@/components/common/Pagination'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { UserIcon, ShieldCheckIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { getFriendlyErrorMessage } from '@/lib/utils/errors'

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

  function canModifyUser(row: typeof tableData[number]) {
    return row.role !== 'ADMIN' && row.id !== currentUserId
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        subtitle="Manage customer and vendor accounts. Admin accounts cannot be disabled."
      />

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
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
              roleFilter === role
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            {role === 'ALL' ? 'All roles' : role.toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading users...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No users found for this filter.</p>
        </div>
      ) : (
        <div className="card border border-gray-200 dark:border-gray-700 overflow-hidden">
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
              if (key === 'role') return <span className="capitalize text-xs font-medium">{row.role as string}</span>
              if (key === 'disabled') {
                return row.disabled
                  ? <span className="text-red-600 text-xs font-medium">Disabled</span>
                  : <span className="text-green-600 text-xs font-medium">Active</span>
              }
              return undefined
            }}
            renderActions={(row) => {
              if (!canModifyUser(row)) {
                return <span className="text-xs text-gray-400">Protected</span>
              }
              if (row.disabled) {
                return (
                  <button
                    type="button"
                    className="text-xs text-green-700 hover:text-green-800 font-medium"
                    onClick={() => handleEnable(row.id, row.name as string)}
                  >
                    Activate
                  </button>
                )
              }
              return (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
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
    </div>
  )
}
