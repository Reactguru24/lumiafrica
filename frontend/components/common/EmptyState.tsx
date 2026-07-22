import { InboxIcon } from '@heroicons/react/24/outline'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <InboxIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="wishlist-empty-title">{title}</h3>
      {description && <p className="wishlist-empty-desc">{description}</p>}
      {actionLabel && onAction && (
        <button className="btn-primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  )
}
