-- name: CountAllOrders :one
SELECT COUNT(*) FROM orders;

-- name: ListAllOrders :many
SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- name: CreateOrder :exec
INSERT INTO orders (
  id, user_id, delivery_zone_id, delivery_zone_name, coupon_id, subtotal, discount_amount, shipping_cost, tax_amount, total,
  payment_method, status, delivery_address, notes
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?);

-- name: GetOrderByIDAndUser :one
SELECT * FROM orders WHERE id = ? AND user_id = ? LIMIT 1;

-- name: GetOrderByID :one
SELECT * FROM orders WHERE id = ? LIMIT 1;

-- name: ListOrdersByUser :many
SELECT * FROM orders WHERE user_id = ?
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountOrdersByUser :one
SELECT COUNT(*) FROM orders WHERE user_id = ?;

-- name: UpdateOrderStatus :exec
UPDATE orders SET status = ?, delivered_at = ? WHERE id = ?;

-- name: SetOrderTimestamps :exec
UPDATE orders SET created_at = ?, updated_at = ? WHERE id = ?;

-- name: SetOrderUpdatedAt :exec
UPDATE orders SET updated_at = ? WHERE id = ?;

-- name: ListRecentOrders :many
SELECT * FROM orders ORDER BY created_at DESC LIMIT ?;

-- name: ListOrdersByVendor :many
SELECT DISTINCT o.*
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE oi.vendor_id = ?
ORDER BY o.created_at DESC
LIMIT ? OFFSET ?;

-- name: CountOrdersByVendor :one
SELECT COUNT(DISTINCT o.id)
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE oi.vendor_id = ?;

-- name: ListOrdersSince :many
SELECT * FROM orders
WHERE status != 'cancelled'
  AND (sqlc.narg('since') IS NULL OR created_at >= sqlc.narg('since'));

-- name: ListOrdersByVendorSince :many
SELECT DISTINCT o.*
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE o.status != 'cancelled'
  AND oi.vendor_id = ?
  AND (sqlc.narg('since') IS NULL OR o.created_at >= sqlc.narg('since'))
ORDER BY o.created_at DESC;

-- name: CountDistinctOrderCustomers :one
SELECT COUNT(DISTINCT user_id) FROM orders WHERE status != 'cancelled';

-- name: ListOrderItemsByOrder :many
SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC;

-- name: ListOrderItemsByOrderIDs :many
SELECT * FROM order_items WHERE order_id IN (sqlc.slice('order_ids'));
