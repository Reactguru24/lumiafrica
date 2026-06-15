import type { ComponentType, SVGProps } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}

export function StatCard({ title, value, change, icon: Icon }: StatCardProps) {
  return (
    <div className="card p-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{change}</p>}
        </div>
        {Icon && <Icon className="w-8 h-8 text-gray-400" />}
      </div>
    </div>
  )
}
