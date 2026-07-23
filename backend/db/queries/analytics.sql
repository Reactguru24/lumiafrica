-- name: CountCustomers :one
SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER';

-- name: CountAllVendors :one
SELECT COUNT(*) FROM vendors;

-- name: ListTopVendorsForAnalytics :many
SELECT * FROM vendors ORDER BY rating DESC, created_at DESC LIMIT ?;

-- name: VendorDailyAnalytics :many
SELECT period_date, orders, units_sold, revenue, earnings, refunds
FROM vendor_analytics_daily
WHERE vendor_id = ?
  AND (? IS NULL OR period_date >= ?)
  AND (? IS NULL OR period_date <= ?)
ORDER BY period_date ASC;

-- name: VendorOrderStatusCounts :many
SELECT o.status, COUNT(DISTINCT o.id) as count, SUM(o.total) as total_amount
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE oi.vendor_id = ?
  AND (? IS NULL OR o.created_at >= ?)
  AND (? IS NULL OR o.created_at <= ?)
GROUP BY o.status;

-- name: VendorCategorySales :many
SELECT c.name as category, c.slug,
  COALESCE(SUM(oi.quantity), 0) as units,
  COALESCE(SUM(oi.subtotal), 0) as revenue,
  COUNT(DISTINCT o.id) as orders
FROM order_items oi
INNER JOIN orders o ON o.id = oi.order_id
INNER JOIN products p ON p.id = oi.product_id
INNER JOIN categories c ON c.id = p.category_id
WHERE oi.vendor_id = ?
  AND o.status != 'cancelled'
  AND (? IS NULL OR o.created_at >= ?)
  AND (? IS NULL OR o.created_at <= ?)
GROUP BY c.id, c.name, c.slug
ORDER BY revenue DESC;

-- name: VendorPaymentMethodStats :many
SELECT o.payment_method,
  COUNT(DISTINCT o.id) as orders,
  COALESCE(SUM(o.total), 0) as amount
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE oi.vendor_id = ?
  AND o.status != 'cancelled'
  AND (? IS NULL OR o.created_at >= ?)
  AND (? IS NULL OR o.created_at <= ?)
GROUP BY o.payment_method
ORDER BY amount DESC;

-- name: VendorPayoutHistory :many
SELECT period_start, period_end, amount, status, reference, created_at
FROM vendor_payouts
WHERE vendor_id = ?
ORDER BY created_at DESC
LIMIT ?;
