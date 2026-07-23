"use client";

import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useThemeStore } from "@/lib/stores/theme";

ChartJS.register(ArcElement, Tooltip, Legend);

const BRAND_TEAL = "#0e4d5f";
const BRAND_ORANGE = "#f97316";
const BRAND_YELLOW = "#fbbf24";
const GRAY = "#9ca3af";

const PALETTE_LIGHT = [
  BRAND_TEAL,
  BRAND_ORANGE,
  BRAND_YELLOW,
  "#6366f1",
  "#ec4899",
  GRAY,
];
const PALETTE_DARK = [
  "#38bdf8",
  "#fb923c",
  "#fcd34d",
  "#818cf8",
  "#f472b6",
  "#9ca3af",
];

interface DoughnutChartProps {
  labels: string[];
  data: number[];
  colors?: string[];
  title?: string;
}

export function DoughnutChart({
  labels,
  data,
  colors,
  title,
}: DoughnutChartProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const palette = colors || (isDark ? PALETTE_DARK : PALETTE_LIGHT);
  const tickColor = isDark ? "#9ca3af" : "#6b7280";
  const tooltipBg = isDark ? "#1f2937" : "#ffffff";
  const tooltipText = isDark ? "#f9fafb" : "#111827";

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: title || "",
          data,
          backgroundColor: palette.slice(0, data.length),
          borderColor: isDark ? "#111827" : "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }),
    [labels, data, palette, title, isDark],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: tickColor,
            usePointStyle: true,
            pointStyleWidth: 8,
            padding: 16,
            font: { size: 12 },
          },
        },
        title: {
          display: !!title,
          text: title,
          color: isDark ? "#f9fafb" : "#111827",
          font: { size: 13, weight: 600 },
          padding: { bottom: 12 },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: tooltipText,
          borderColor: isDark ? "#374151" : "#e5e7eb",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
    }),
    [title, isDark, tickColor, tooltipBg, tooltipText],
  );

  return (
    <div className="h-64">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
