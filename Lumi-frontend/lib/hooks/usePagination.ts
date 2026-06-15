import { useState, useMemo, useEffect, useCallback } from 'react'

export function usePagination<T>(items: T[] | undefined, pageSize = 12) {
  const [page, setPage] = useState(1)

  const safeItems = Array.isArray(items) ? items : []
  const total = safeItems.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const paginated = useMemo(() => {
    if (safeItems.length === 0) return []
    const start = (page - 1) * pageSize
    return safeItems.slice(start, start + pageSize)
  }, [safeItems, page, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const goTo = useCallback((p: number) => {
    setPage((prev) => {
      const next = Math.min(Math.max(1, p), totalPages)
      return prev === next ? prev : next
    })
  }, [totalPages])

  const reset = useCallback(() => {
    setPage((prev) => (prev === 1 ? prev : 1))
  }, [])

  return { page, totalPages, paginated, total, goTo, reset, pageSize }
}
