-- name: CreatePaymentTransaction :exec
INSERT INTO payment_transactions (
  id, reference, type, user_id, vendor_id, amount, currency, status, paystack_access_code, metadata
) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?);

-- name: GetPaymentByReference :one
SELECT * FROM payment_transactions WHERE reference = ? LIMIT 1;

-- name: GetPaymentByID :one
SELECT * FROM payment_transactions WHERE id = ? LIMIT 1;

-- name: UpdatePaymentStatus :exec
UPDATE payment_transactions
SET status = ?, order_id = ?, subscription_id = ?, updated_at = NOW()
WHERE id = ?;

-- name: UpdatePaymentStatusIfPending :execrows
UPDATE payment_transactions
SET status = ?, order_id = ?, subscription_id = ?, updated_at = NOW()
WHERE id = ? AND status = 'pending';

-- name: UpdatePaymentInitMetadata :exec
UPDATE payment_transactions SET metadata = ?, paystack_access_code = ?, updated_at = NOW() WHERE id = ?;

-- name: ListExpiredActiveSubscriptions :many
SELECT * FROM vendor_subscriptions
WHERE active = true AND expires_at <= NOW();

-- name: ListFeaturedProductsAdmin :many
SELECT p.* FROM products p
INNER JOIN vendors v ON p.vendor_id = v.id
WHERE p.featured = true AND p.status IN ('active', 'pending') AND v.suspended = false
ORDER BY p.updated_at DESC
LIMIT ? OFFSET ?;

-- name: CountFeaturedProductsAdmin :one
SELECT COUNT(*) FROM products p
INNER JOIN vendors v ON p.vendor_id = v.id
WHERE p.featured = true AND p.status IN ('active', 'pending') AND v.suspended = false;

-- name: ListFeaturedVendorsAdmin :many
SELECT v.* FROM vendors v
WHERE v.is_featured = true AND v.suspended = false
ORDER BY v.store_name ASC
LIMIT ? OFFSET ?;

-- name: CountFeaturedVendorsAdmin :one
SELECT COUNT(*) FROM vendors WHERE is_featured = true AND suspended = false;

-- name: UnfeatureVendorIfNoActiveSubscription :exec
UPDATE vendors v
SET is_featured = false
WHERE v.id = ?
  AND NOT EXISTS (
    SELECT 1 FROM vendor_subscriptions vs
    WHERE vs.vendor_id = v.id AND vs.active = true AND vs.expires_at > NOW()
  );
