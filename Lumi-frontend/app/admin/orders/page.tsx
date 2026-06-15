'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { useAdminOrders } from '@/lib/api/hooks'
import { formatCurrency, formatDate } from '@/lib/utils/storage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { usePagination } from '@/lib/hooks/usePagination'
import type { OrderStatus } from '@/lib/types'
import { useUpdateVendorOrderStatus } from '@/lib/api/hooks'

const statuses: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminOrdersPage() {
  const { data: ordersData, loading, refetch } = useAdminOrders()
  const updateStatus = useUpdateVendorOrderStatus().mutate
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all')

  const orders = ((ordersData as any)?.items || ordersData || []) as any[]
  const total = (ordersData as any)?.total || orders.length

  const filtered = orders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const { page, totalPages, paginated, goTo, pageSize } = usePagination(filtered, 10)

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    revenue: orders.reduce((sum: number, o) => sum + (o.total || 0), 0),
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    try {
      await updateStatus({ orderId: id, status })
      toast.success(`Order updated to ${status}`)
      refetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update order')
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Orders</h1><p className="text-gray-600 dark:text-gray-400">Manage and track all customer orders</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 md:p-6 border border-gray-200 dark:border-gray-700"><p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Orders</p><p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p></div>
        <div className="card p-4 md:p-6 border border-gray-200 dark:border-gray-700"><p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Pending</p><p className="text-3xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Awaiting action</p></div>
        <div className="card p-4 md:p-6 border border-gray-200 dark:border-gray-700"><p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">In Transit</p><p className="text-3xl font-bold text-blue-600">{stats.processing}</p><p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Being shipped</p></div>
        <div className="card p-4 md:p-6 border border-gray-200 dark:border-gray-700"><p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Revenue</p><p className="text-3xl font-bold text-green-600">{formatCurrency(stats.revenue)}</p><p className="text-xs text-gray-500 dark:text-gray-500 mt-2">From all orders</p></div>
      </div>
      <div className="card p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1"><input type="text" placeholder="Search by order ID..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); goTo(1) }} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="flex gap-2 flex-wrap md:flex-nowrap">
            <button onClick={() => { setSelectedStatus('all'); goTo(1) }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedStatus === 'all' ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>All</button>
            {statuses.map((status) => <button key={status} onClick={() => { setSelectedStatus(status); goTo(1) }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${selectedStatus === status ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>{status}</button>)}
          </div>
        </div>
      </div>
      <div className="card border border-gray-200 dark:border-gray-700 overflow-hidden">
        {paginated.length > 0 ? (
          <>
            <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"><tr><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Order ID</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Items</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th></tr></thead>
            <tbody>{paginated.map((order) => (<tr key={order.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-6 py-4"><p className="font-semibold text-gray-900 dark:text-white">#{order.id.slice(-8).toUpperCase()}</p><p className="text-xs text-gray-500 dark:text-gray-400">{order.paymentMethod}</p></td>
              <td className="px-6 py-4"><div className="flex gap-2">{(order.items || []).slice(0, 2).map((item: any) => <div key={item.productId} className="relative w-10 h-12 rounded border border-gray-200 dark:border-gray-600 overflow-hidden"><Image src={item.productImage || '/placeholder.png'} alt={item.productName} width={40} height={48} className="object-cover" onError={(e) => { (e.target as any).src = '/placeholder.png' }} />{item.quantity > 1 && <span className="absolute bottom-0 right-0 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs px-1 rounded-tl">×{item.quantity}</span>}</div>)}</div></td>
              <td className="px-6 py-4"><p className="text-sm text-gray-900 dark:text-white">{formatDate(order.createdAt)}</p></td>
              <td className="px-6 py-4"><p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.total)}</p></td>
              <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
              <td className="px-6 py-4"><div className="flex gap-1 flex-wrap">{statuses.map((s) => <button key={s} onClick={() => handleStatusChange(order.id, s)} className={`px-3 py-1 text-xs font-medium rounded capitalize transition-colors ${order.status === s ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{s.slice(0, 3)}</button>)}</div></td>
            </tr>))}</tbody></table></div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"><Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={goTo} /></div>
          </>
        ) : (<div className="p-12 text-center"><p className="text-gray-500 dark:text-gray-400 text-lg">No orders found</p><p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your search or filters</p></div>)}
      </div>
    </div>
  )
}
