"use client";

import { useMemo, useState } from "react";
import { useVendorProfile, useVendorAnalytics } from "@/lib/stores/api";
import { useFormatCurrency } from "@/lib/stores/currency";
import { getFriendlyErrorMessage } from "@/lib/utils/errors";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DoughnutChart } from "@/components/charts/DoughnutChart";
import { StatCard } from "@/components/common/StatCard";
import { VendorRatingInsight } from "@/components/vendor/VendorStoreHeader";
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CubeIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { Vendor } from "@/lib/types";

const PERIODS = [
  { id: "7days", label: "7 days" },
  { id: "30days", label: "30 days" },
  { id: "90days", label: "90 days" },
  { id: "all", label: "All time" },
] as const;

type VendorAnalyticsData = {
  revenue?: number;
  total_revenue?: number;
  totalOrders?: number;
  total_orders?: number;
  totalProducts?: number;
  total_products?: number;
  customers?: number;
  total_customers?: number;
  salesTrend?: { month: string; sales: number; revenue: number }[];
  sales_trend?: { month: string; sales: number; revenue: number }[];
  topProducts?: { name: string; sales: number }[];
  top_products?: { name: string; sales: number }[];
  averageRating?: number;
  average_rating?: number;
  totalReviews?: number;
  total_reviews?: number;
  average_order_value?: number;
  order_status_breakdown?: {
    status: string;
    count: number;
    total_amount: number;
  }[];
  category_sales?: {
    category: string;
    slug: string;
    units: number;
    revenue: number;
    orders: number;
  }[];
  payment_methods?: {
    payment_method: string;
    orders: number;
    amount: number;
  }[];
  payout_history?: {
    period_start: string;
    period_end: string;
    amount: number;
    status: string;
    reference?: string;
  }[];
  daily_trend?: { date: string; count: number }[];
  total_refunds?: number;
  out_of_stock_count?: number;
  low_stock?: { id: string; name: string; stock: number }[];
  outOfStock?: { id: string; name: string; stock: number }[];
};

export default function VendorAnalyticsPage() {
  const formatPrice = useFormatCurrency();
  const [period, setPeriod] = useState<string>("30days");
  const { data: vendorProfile } = useVendorProfile();
  const { data: analytics, loading, error } = useVendorAnalytics(period);

  const vendor = vendorProfile as Vendor | null;
  const a = (analytics as VendorAnalyticsData) || {};

  const revenue = a.revenue ?? a.total_revenue ?? 0;
  const totalOrders = a.totalOrders ?? a.total_orders ?? 0;
  const totalProducts = a.totalProducts ?? a.total_products ?? 0;
  const customers = a.customers ?? a.total_customers ?? 0;
  const salesTrend = a.salesTrend ?? a.sales_trend ?? [];
  const topProducts = a.topProducts ?? a.top_products ?? [];
  const averageRating =
    a.averageRating ?? a.average_rating ?? vendor?.rating ?? 0;
  const totalReviews = a.totalReviews ?? a.total_reviews;

  const aov =
    a.average_order_value ?? (totalOrders > 0 ? revenue / totalOrders : 0);
  const outOfStockCount = a.out_of_stock_count ?? a.outOfStock?.length ?? 0;
  const lowStockCount = a.low_stock?.length ?? 0;
  const totalRefunds = a.total_refunds ?? 0;

  const orderStatusBreakdown = a.order_status_breakdown ?? [];
  const categorySales = a.category_sales ?? [];
  const paymentMethods = a.payment_methods ?? [];
  const payoutHistory = (a.payout_history ?? []).slice(0, 12);
  const dailyTrend = useMemo(
    () => (a.daily_trend ?? []).slice(-30),
    [a.daily_trend],
  );

  const ratingDisplay =
    averageRating > 0 ? `${averageRating.toFixed(1)} ★` : "—";

  if (loading && !analytics) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-10 w-full max-w-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-28 w-full" />
          ))}
        </div>
        <div className="skeleton h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">
        {getFriendlyErrorMessage(error, "Unable to load analytics.")}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track sales, revenue, orders, and product performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 text-sm whitespace-nowrap rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-teal dark:focus:ring-brand-orange ${
                period === p.id
                  ? "bg-brand-teal text-white dark:bg-brand-orange shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {vendor && (
        <VendorRatingInsight
          vendor={{ ...vendor, rating: averageRating || vendor.rating }}
          totalReviews={totalReviews}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Revenue"
          value={formatPrice(revenue)}
          icon={CurrencyDollarIcon}
        />
        <StatCard title="Orders" value={totalOrders} icon={ShoppingCartIcon} />
        <StatCard
          title="Avg. order"
          value={formatPrice(aov)}
          icon={ChartBarIcon}
        />
        <StatCard title="Customers" value={customers} icon={UsersIcon} />
        <StatCard title="Products" value={totalProducts} icon={CubeIcon} />
        <StatCard
          title="Out of stock"
          value={outOfStockCount}
          icon={ExclamationTriangleIcon}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 chart-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Revenue Analytics
          </h3>
          {loading ? (
            <div className="skeleton h-64 w-full" />
          ) : salesTrend.length > 0 ? (
            <LineChart
              labels={salesTrend.map((s) => s.month)}
              datasets={[
                {
                  label: "Revenue",
                  data: salesTrend.map((s) => s.revenue),
                  color: "#a88b73",
                },
              ]}
            />
          ) : (
            <EmptyState label="No revenue data for this period yet." />
          )}
        </div>
        <div className="chart-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Order Status
          </h3>
          {loading ? (
            <div className="skeleton h-64 w-full" />
          ) : orderStatusBreakdown.length > 0 ? (
            <DoughnutChart
              title="Status"
              labels={orderStatusBreakdown.map((s) => s.status)}
              data={orderStatusBreakdown.map((s) => Number(s.count))}
              colors={["#0e4d5f", "#f97316", "#fbbf24", "#9ca3af", "#ec4899"]}
            />
          ) : (
            <EmptyState label="No order status data yet." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="chart-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Daily Orders
          </h3>
          {loading ? (
            <div className="skeleton h-64 w-full" />
          ) : dailyTrend.length > 0 ? (
            <BarChart
              title="Orders per day"
              labels={dailyTrend.map((d) => d.date.slice(5))}
              data={dailyTrend.map((d) => d.count)}
              color="#0e4d5f"
            />
          ) : (
            <EmptyState label="No daily order data yet." />
          )}
        </div>
        <div className="chart-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Sales by Category
          </h3>
          {loading ? (
            <div className="skeleton h-64 w-full" />
          ) : categorySales.length > 0 ? (
            <BarChart
              title="Revenue by category"
              labels={categorySales.map((c) => c.category)}
              data={categorySales.map((c) => c.revenue)}
              color="#f97316"
            />
          ) : (
            <EmptyState label="No category sales data yet." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="chart-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Payment Methods
          </h3>
          {loading ? (
            <div className="skeleton h-64 w-full" />
          ) : paymentMethods.length > 0 ? (
            <DoughnutChart
              title="Payment methods"
              labels={paymentMethods.map((p) => p.payment_method)}
              data={paymentMethods.map((p) => Number(p.orders))}
              colors={["#0e4d5f", "#f97316", "#fbbf24", "#6366f1"]}
            />
          ) : (
            <EmptyState label="No payment data yet." />
          )}
        </div>
        <div className="chart-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Payout History
          </h3>
          {loading ? (
            <div className="skeleton h-64 w-full" />
          ) : payoutHistory.length > 0 ? (
            <LineChart
              labels={payoutHistory.map((p) => p.period_end)}
              datasets={[
                {
                  label: "Payout",
                  data: payoutHistory.map((p) => p.amount),
                  color: "#10b981",
                },
              ]}
            />
          ) : (
            <EmptyState label="No payout history yet." />
          )}
        </div>
      </div>

      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="chart-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Inventory Alerts
          </h3>
          <div className="flex flex-wrap gap-3 mb-4">
            {outOfStockCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {outOfStockCount} out of stock
              </span>
            )}
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {lowStockCount} low stock
              </span>
            )}
          </div>
          {a.low_stock && a.low_stock.length > 0 && (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="table-cell-header">Product</th>
                    <th className="table-cell-header">Stock</th>
                    <th className="table-cell-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {a.low_stock.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="table-cell">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {p.name}
                        </span>
                      </td>
                      <td className="table-cell tabular-nums">{p.stock}</td>
                      <td className="table-cell">
                        <span
                          className={`badge ${p.stock === 0 ? "badge-stock-out" : "badge-stock-low"}`}
                        >
                          {p.stock === 0 ? "Out of stock" : "Low stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="chart-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Top Products by Sales
          </h3>
        </div>
        {loading ? (
          <div className="skeleton h-64 w-full" />
        ) : topProducts.length > 0 ? (
          <BarChart
            labels={topProducts.map((p) => (p.name || "").slice(0, 20))}
            data={topProducts.map((p) => p.sales)}
            color="#1a1a1a"
          />
        ) : (
          <EmptyState label="No product sales data yet." />
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
      {label}
    </div>
  );
}
