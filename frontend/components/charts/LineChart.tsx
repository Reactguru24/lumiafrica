'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { useThemeStore } from '@/lib/stores/theme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface LineChartProps {
  labels: string[]
  datasets: { label: string; data: number[]; color?: string }[]
  title?: string
}

export function LineChart({ labels, datasets, title }: LineChartProps) {
  const isDark = useThemeStore((s) => s.isDark)

  const chartData = useMemo(() => ({
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color || ['#1a1a1a', '#a88b73', '#2563eb'][i % 3],
      backgroundColor: `${ds.color || '#1a1a1a'}20`,
      fill: true,
      tension: 0.4,
    })),
  }), [labels, datasets])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: isDark ? '#9ca3af' : '#6b7280' } },
      title: { display: !!title, text: title, color: isDark ? '#fff' : '#1a1a1a' },
    },
    scales: {
      x: { ticks: { color: isDark ? '#9ca3af' : '#6b7280' }, grid: { color: isDark ? '#374151' : '#f3f4f6' } },
      y: { ticks: { color: isDark ? '#9ca3af' : '#6b7280' }, grid: { color: isDark ? '#374151' : '#f3f4f6' } },
    },
  }), [title, isDark])

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  )
}
