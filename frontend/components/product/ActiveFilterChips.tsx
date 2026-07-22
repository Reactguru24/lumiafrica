'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import type { ProductFilters, Vendor } from '@/lib/types'
import { activeFilterTags, type ActiveFilterTag } from '@/lib/utils/productFilters'

interface ActiveFilterChipsProps {
  filters: ProductFilters
  vendors?: Vendor[]
  onClear: (key: ActiveFilterTag['key']) => void
  onClearAll?: () => void
}

export function ActiveFilterChips({ filters, vendors, onClear, onClearAll }: ActiveFilterChipsProps) {
  const tags = activeFilterTags(filters, vendors)
  if (!tags.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {tags.map((tag) => (
        <button
          key={tag.key}
          type="button"
          className="filter-chip filter-chip-active"
          onClick={() => onClear(tag.key)}
        >
          <span>{tag.label}</span>
          <XMarkIcon className="w-3.5 h-3.5 shrink-0" />
        </button>
      ))}
      {onClearAll && tags.length > 1 && (
        <button type="button" className="text-xs text-gray-500 hover:text-brand-teal dark:hover:text-brand-orange font-medium transition-colors" onClick={onClearAll}>
          Clear all
        </button>
      )}
    </div>
  )
}
