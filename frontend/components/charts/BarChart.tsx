'use client'

import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { useThemeStore } from '@/lib/stores/theme'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const BRAND_TEAL   = '#0e4d5f'
const BRAND_TEAL_DARK = '#38bdf8' // lighter for dark backgrounds

interface BarChartProps {
  labels: string[]
  data: number[]
  label?: string
  title?: string
  color?: string
}

export function BarChart({ labels, data, label = 'Value', title, color }: BarChartProps) {
  const isDark = useThemeStore((s) => s.isDark)

  const barColor   = color ?? (isDark ? BRAND_TEAL_DARK : BRAND_TEAL)
  const hoverColor = isDark ? '#7dd3fc' : '#0a3a4a'
  const gridColor  = isDark ? '#1f2937' : '#f3f4f6'
  const tickColor  = isDark ? '#6b7280' : '#9ca3af'
  const tooltipBg  = isDark ? '#1f2937' : '#ffffff'
  const tooltipText = isDark ? '#f9fafb' : '#111827'

  const chartData = useMemo(() => ({
    labels,
    datasets: [{
      label,
      data,
      backgroundColor: barColor,
      hoverBackgroundColor: hoverColor,
      borderRadius: 6,
      borderSkipped: false as const,
    }],
  }), [labels, data, label, barColor, hoverColor])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: !!title,
        text: title,
        color: isDark ? '#f9fafb' : '#111827',
        font: { size: 13, weight: '600' as const },
        padding: { bottom: 12 },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipText,
        bodyColor: tooltipText,
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: { color: tickColor, font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        ticks: { color: tickColor, font: { size: 11 } },
        grid: { color: gridColor },
        border: { display: false },
      },
    },
  }), [title, isDark, gridColor, tickColor, tooltipBg, tooltipText])

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  )
}
