'use client'

import { useState } from 'react'
import { useAdminSubscriptions } from '@/lib/api/hooks'
import { formatCurrency, formatDate } from '@/lib/utils/storage'
import Image from 'next/image'
import { StatusBadge } from '@/components/common/StatusBadge'

export default function AdminSubscriptionsPage() {
  const { data: subsData, loading } = useAdminSubscriptions()
  const subscriptions = ((subsData as any)?.items || subsData || []) as any[]

  const activeCount = subscriptions.filter((s: any) => s.active).length
  const totalRevenue = subscriptions.reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
  const expiringSoon = subscriptions.filter((s: any) => s.active && (new Date(s.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7).length
  const expiredCount = subscriptions.filter((s: any) => !s.active).length

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Vendor Subscriptions</h1>
      {loading ? <div className="text-center py-8">Loading...</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Active</p><p className="text-2xl font-bold">{activeCount}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Revenue</p><p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Expiring Soon</p><p className="text-2xl font-bold text-yellow-600">{expiringSoon}</p></div>
            <div className="card p-4"><p className="text-xs text-gray-500 mb-1">Expired</p><p className="text-2xl font-bold text-red-600">{expiredCount}</p></div>
          </div>
          {subscriptions.length === 0 ? <div className="card p-8 text-center text-gray-500">No subscriptions yet</div> : (
            <div className="space-y-3">{subscriptions.map((sub: any) => {
              const daysLeft = Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              const isActive = sub.active && daysLeft > 0
              return (
                <div key={sub.id} className="card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {sub.vendorLogo && <Image src={sub.vendorLogo} alt={sub.vendorName} width={40} height={40} className="w-10 h-10 rounded-full object-cover" onError={(e) => { (e.target as any).src = '/placeholder.png' }} />}
                    <div><h3 className="font-semibold text-sm">{sub.vendorName || 'Unknown'}</h3><p className="text-xs text-gray-500">{sub.planName || sub.plan}</p></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><p className="text-xs text-gray-500">Amount</p><p className="font-semibold">{formatCurrency(sub.amount || 0)}</p></div>
                    <div><p className="text-xs text-gray-500">Started</p><p className="text-xs">{formatDate(sub.startedAt)}</p></div>
                    <div><p className="text-xs text-gray-500">Expires</p><p className="text-xs">{formatDate(sub.expiresAt)}</p></div>
                    <div><StatusBadge status={isActive ? 'active' : 'expired'} /></div>
                  </div>
                </div>
              )
            })}</div>
          )}
        </>
      )}
    </div>
  )
}
