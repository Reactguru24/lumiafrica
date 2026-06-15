-- name: CountAllOrders :one
SELECT COUNT(*) FROM orders;

-- name: ListAllOrders :many
SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- name: CreateOrder :exec
INSERT INTO orders (
  id, user_id, items, subtotal, shipping_cost, total, payment_method, status, delivery_address, notes
) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?);

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

-- name: ListRecentOrders :many
SELECT * FROM orders ORDER BY created_at DESC LIMIT ?;

-- name: ListOrdersByVendor :many
SELECT * FROM orders
WHERE JSON_SEARCH(items, 'one', ?, NULL, '$[*].vendorId') IS NOT NULL
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountOrdersByVendor :one
SELECT COUNT(*) FROM orders
WHERE JSON_SEARCH(items, 'one', ?, NULL, '$[*].vendorId') IS NOT NULL;

-- name: ListOrdersSince :many
SELECT * FROM orders
WHERE status != 'cancelled'
  AND (sqlc.narg('since') IS NULL OR created_at >= sqlc.narg('since'));

-- name: CountDistinctOrderCustomers :one
SELECT COUNT(DISTINCT user_id) FROM orders WHERE status != 'cancelled';
