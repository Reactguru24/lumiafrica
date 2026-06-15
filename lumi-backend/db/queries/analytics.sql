-- name: CountCustomers :one
SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER';

-- name: CountAllVendors :one
SELECT COUNT(*) FROM vendors;

-- name: ListTopVendorsForAnalytics :many
SELECT * FROM vendors ORDER BY total_sales DESC, rating DESC LIMIT ?;
