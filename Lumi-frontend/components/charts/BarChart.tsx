'use client'

import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { useThemeStore } from '@/lib/stores/theme'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface BarChartProps {
  labels: string[]
  data: number[]
  label?: string
  title?: string
  color?: string
}

export function BarChart({ labels, data, label = 'Value', title, color = '#1a1a1a' }: BarChartProps) {
  const isDark = useThemeStore((s) => s.isDark)

  const chartData = useMemo(() => ({
    labels,
    datasets: [{ label, data, backgroundColor: color, borderRadius: 4 }],
  }), [labels, data, label, color])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: !!title, text: title, color: isDark ? '#fff' : '#1a1a1a' },
    },
    scales: {
      x: { ticks: { color: isDark ? '#9ca3af' : '#6b7280' }, grid: { display: false } },
      y: { ticks: { color: isDark ? '#9ca3af' : '#6b7280' }, grid: { color: isDark ? '#374151' : '#f3f4f6' } },
    },
  }), [title, isDark])

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  )
}
