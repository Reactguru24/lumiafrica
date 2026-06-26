import type { ReactNode } from 'react'

type AdminPageHeaderProps = {
  title: string
  subtitle?: string
  children?: ReactNode
}

export function AdminPageHeader({ title, subtitle, children }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="page-heading text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2 shrink-0">{children}</div>}
    </div>
  )
}
