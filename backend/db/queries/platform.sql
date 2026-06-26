-- name: GetAverageCommissionRate :one
SELECT COALESCE(AVG(commission_rate), 10.00) AS commission_rate FROM vendors;

-- name: UpdateAllVendorCommissionRates :exec
UPDATE vendors SET commission_rate = ?, updated_at = NOW();

-- name: GetVendorCommissionRate :one
SELECT commission_rate FROM vendors WHERE id = ? LIMIT 1;

-- name: UpdateVendorCommissionRate :exec
UPDATE vendors SET commission_rate = ?, updated_at = NOW() WHERE id = ?;

-- name: CreateOrderItem :exec
INSERT INTO order_items (
  id, order_id, product_id, variant_id, vendor_id,
  product_name, sku, size, color, image_url,
  unit_price, discount, quantity, subtotal, vendor_earnings, platform_fee
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
