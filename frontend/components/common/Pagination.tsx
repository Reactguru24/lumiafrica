'use client'

import { useMemo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  const pages = useMemo(() => {
    const result: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) result.push(i)
      return result
    }
    result.push(1)
    if (page > 3) result.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) result.push(i)
    if (page < totalPages - 2) result.push('...')
    result.push(totalPages)
    return result
  }, [page, totalPages])

  if (totalPages <= 1) return null

  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  function go(p: number) {
    if (p >= 1 && p <= totalPages) onPageChange(p)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
      <p className="text-sm text-gray-500">
        Showing {rangeStart}–{rangeEnd} of {total}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          className="control-button !p-1.5"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => go(page - 1)}
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              className={`min-w-[2rem] h-8 text-sm font-medium rounded-sm transition-colors ${
                p === page ? 'bg-brand-teal text-white dark:bg-brand-orange' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => go(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="control-button !p-1.5"
          disabled={page >= totalPages}
          aria-label="Next page"
          onClick={() => go(page + 1)}
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </nav>
    </div>
  )
}
