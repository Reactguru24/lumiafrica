'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { useUserOrders } from '@/lib/api/hooks'
import { formatCurrency, formatDate } from '@/lib/utils/storage'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { usePagination } from '@/lib/hooks/usePagination'
import { Pagination } from '@/components/common/Pagination'

export default function AccountOrdersPage() {
  const { data: ordersData, loading, refetch } = useUserOrders()
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'delivered' | 'cancelled'>('all')
  const orders = ((ordersData as any)?.items || ordersData || []) as any[]
  const filtered = filter === 'all' ? orders : orders.filter((o: any) => o.status === filter)
  const { page, totalPages, paginated, total, goTo, reset, pageSize } = usePagination(filtered, 8)

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['all', 'pending', 'processing', 'delivered', 'cancelled'] as const).map((f) => (
          <button key={f} className={`px-4 py-2 text-sm capitalize whitespace-nowrap rounded-full transition-colors ${filter === f ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`} onClick={() => { setFilter(f); reset() }}>{f}</button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-8">Loading orders...</div>
      ) : !filtered.length ? (
        <EmptyState title="No orders yet" description="Your order history will appear here." />
      ) : (
        <>
          <div className="space-y-4">
            {paginated.map((order: any) => (
              <div key={order.id} className="card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div><p className="font-medium text-sm">Order #{order.id?.slice?.(-8) || order.id}</p><p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p></div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex gap-3 overflow-x-auto">
                  {(order.items || []).map((item: any, idx: number) => (
                    <div key={item.productId || idx} className="flex items-center gap-2 shrink-0">
                      <Image src={item.productImage || '/placeholder.png'} alt={item.productName || 'Product'} width={48} height={64} className="w-12 h-16 object-cover" />
                      <div><p className="text-sm font-medium">{item.productName || 'Product'}</p><p className="text-xs text-gray-500">Qty: {item.quantity || 1} · {item.size || ''}</p></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-sm text-gray-500">{(order.items || []).length} item(s)</span>
                  <span className="font-semibold">{formatCurrency(order.total || 0)}</span>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={goTo} />
        </>
      )}
    </div>
  )
}
