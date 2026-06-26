-- name: GetActiveSubscription :one
SELECT * FROM vendor_subscriptions WHERE vendor_id = ? AND active = true LIMIT 1;

-- name: ListSubscriptionsByVendor :many
SELECT * FROM vendor_subscriptions WHERE vendor_id = ?
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountSubscriptionsByVendor :one
SELECT COUNT(*) FROM vendor_subscriptions WHERE vendor_id = ?;

-- name: DeactivateVendorSubscriptions :exec
UPDATE vendor_subscriptions SET active = false WHERE vendor_id = ? AND active = true;

-- name: CreateSubscription :exec
INSERT INTO vendor_subscriptions (
  id, vendor_id, plan, amount_paid, payment_method, started_at, expires_at, active
) VALUES (?, ?, ?, ?, ?, ?, ?, true);

-- name: DeactivateSubscription :exec
UPDATE vendor_subscriptions SET active = false WHERE id = ?;

-- name: ListAllSubscriptions :many
SELECT * FROM vendor_subscriptions
WHERE (sqlc.narg('active') IS NULL OR active = sqlc.narg('active'))
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountAllSubscriptions :one
SELECT COUNT(*) FROM vendor_subscriptions
WHERE (sqlc.narg('active') IS NULL OR active = sqlc.narg('active'));
