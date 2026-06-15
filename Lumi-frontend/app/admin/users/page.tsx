'use client'

import { useState } from 'react'
import { useAdminUsers, useDisableUser } from '@/lib/api/hooks'
import { formatCurrency } from '@/lib/utils/storage'
import { StatCard } from '@/components/common/StatCard'
import { ResponsiveDataTable } from '@/components/common/ResponsiveDataTable'
import { UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export default function AdminUsersPage() {
  const { data: usersData, loading, refetch } = useAdminUsers()
  const disableUser = useDisableUser().mutate

  const users = ((usersData as any)?.items || usersData || []) as any[]

  async function handleDisable(id: string) {
    try {
      await disableUser(id)
      toast.success('User disabled')
      refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to disable user')
    }
  }

  const tableData = users.map((u: any) => ({
    id: u.id,
    name: u.fullName,
    email: u.email,
    role: u.role,
    disabled: u.disabled,
    createdAt: new Date(u.createdAt).toLocaleDateString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Users</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage customer, vendor, and admin accounts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={users.length} icon={UserIcon} />
        <StatCard title="Admins" value={users.filter((u: any) => u.role === 'ADMIN').length} icon={ShieldCheckIcon} />
        <StatCard title="Disabled" value={users.filter((u: any) => u.disabled).length} icon={UserIcon} />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 text-lg">No users found</p>
        </div>
      ) : (
        <div className="card border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ResponsiveDataTable
            columns={[
              { key: 'name', label: 'Name', width: '25%' },
              { key: 'email', label: 'Email', width: '35%' },
              { key: 'role', label: 'Role', width: '15%' },
              { key: 'disabled', label: 'Status', width: '15%' },
            ]}
            rows={tableData}
            renderCell={(key, row) => {
              if (key === 'role') return <span className="capitalize">{row.role as string}</span>
              if (key === 'disabled') return row.disabled ? <span className="text-red-600">Disabled</span> : <span className="text-green-600">Active</span>
              return undefined
            }}
            renderActions={(row) => !row.disabled ? (
              <button className="text-xs text-red-600 hover:text-red-700" onClick={() => handleDisable(row.id)}>Disable</button>
            ) : (
              <span className="text-xs text-gray-400">Disabled</span>
            )}
          />
        </div>
      )}
    </div>
  )
}
