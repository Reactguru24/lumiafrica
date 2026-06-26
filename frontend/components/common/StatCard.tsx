import type { ComponentType, SVGProps } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  compact?: boolean
}

export function StatCard({ title, value, change, icon: Icon, compact }: StatCardProps) {
  return (
    <div className={`card min-w-0 animate-slide-up ${compact ? 'p-3 sm:p-4 text-center' : 'p-4 sm:p-6'}`}>
      <div className={`flex items-start justify-between gap-2 ${compact ? 'flex-col items-center' : ''}`}>
        <div className={`min-w-0 ${compact ? 'w-full' : 'flex-1'}`}>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white break-words leading-tight tabular-nums">
            {value}
          </p>
          {change && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{change}</p>}
        </div>
        {Icon && !compact && <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 shrink-0" />}
      </div>
    </div>
  )
}
