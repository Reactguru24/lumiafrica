'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { useThemeStore } from '@/lib/stores/theme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// Brand palette
const BRAND_TEAL = '#0e4d5f'
const BRAND_ORANGE = '#f97316'
const BRAND_YELLOW = '#fbbf24'

const PALETTE_LIGHT = [BRAND_TEAL, BRAND_ORANGE, BRAND_YELLOW]
const PALETTE_DARK  = ['#38bdf8', '#fb923c', '#fcd34d'] // lighter variants for dark bg

interface LineChartProps {
  labels: string[]
  datasets: { label: string; data: number[]; color?: string }[]
  title?: string
}

export function LineChart({ labels, datasets, title }: LineChartProps) {
  const isDark = useThemeStore((s) => s.isDark)

  const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT

  const gridColor   = isDark ? '#1f2937' : '#f3f4f6'
  const tickColor   = isDark ? '#6b7280' : '#9ca3af'
  const tooltipBg   = isDark ? '#1f2937' : '#ffffff'
  const tooltipText = isDark ? '#f9fafb' : '#111827'
  const legendColor = isDark ? '#9ca3af' : '#6b7280'

  const chartData = useMemo(() => ({
    labels,
    datasets: datasets.map((ds, i) => {
      const color = ds.color ?? palette[i % palette.length]
      return {
        label: ds.label,
        data: ds.data,
        borderColor: color,
        backgroundColor: `${color}25`,
        pointBackgroundColor: color,
        pointBorderColor: isDark ? '#111827' : '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      }
    }),
  }), [labels, datasets, palette, isDark])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        labels: {
          color: legendColor,
          usePointStyle: true,
          pointStyleWidth: 8,
          padding: 16,
          font: { size: 12 },
        },
      },
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
        grid: { color: gridColor },
        border: { display: false },
      },
      y: {
        ticks: { color: tickColor, font: { size: 11 } },
        grid: { color: gridColor },
        border: { display: false },
      },
    },
  }), [title, isDark, gridColor, tickColor, tooltipBg, tooltipText, legendColor])

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  )
}
