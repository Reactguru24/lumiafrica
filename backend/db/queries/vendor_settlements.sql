-- name: CreateOrderVendorSettlement :exec
INSERT INTO order_vendor_settlements (
  id, order_id, vendor_id, product_subtotal, shipping_fee, platform_fee, vendor_earnings, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- name: ListOrderVendorSettlementsByOrder :many
SELECT id, order_id, vendor_id, product_subtotal, shipping_fee, platform_fee, vendor_earnings,
       status, payout_status, created_at, updated_at
FROM order_vendor_settlements
WHERE order_id = ?
ORDER BY created_at ASC;

-- name: GetOrderVendorSettlement :one
SELECT id, order_id, vendor_id, product_subtotal, shipping_fee, platform_fee, vendor_earnings,
       status, payout_status, created_at, updated_at
FROM order_vendor_settlements
WHERE order_id = ? AND vendor_id = ?
LIMIT 1;

-- name: UpdateOrderVendorSettlementStatus :exec
UPDATE order_vendor_settlements
SET status = ?, updated_at = NOW()
WHERE order_id = ? AND vendor_id = ?;

-- name: MarkOrderVendorSettlementPaid :exec
UPDATE order_vendor_settlements
SET payout_status = 'paid', updated_at = NOW()
WHERE id = ? AND vendor_id = ?;

-- name: GetVendorAvailableSettlementBalance :one
SELECT COALESCE(SUM(vendor_earnings), 0) AS balance
FROM order_vendor_settlements
WHERE vendor_id = ?
  AND status = 'delivered'
  AND payout_status = 'pending';

-- name: ListPayableVendorSettlements :many
SELECT id, order_id, vendor_id, product_subtotal, shipping_fee, platform_fee, vendor_earnings,
       status, payout_status, created_at, updated_at
FROM order_vendor_settlements
WHERE vendor_id = ?
  AND status = 'delivered'
  AND payout_status = 'pending'
ORDER BY updated_at ASC;

-- name: CountUndeliveredVendorSettlementsForOrder :one
SELECT COUNT(*) AS count
FROM order_vendor_settlements
WHERE order_id = ?
  AND status != 'delivered'
  AND status != 'cancelled';

-- name: UpdateShipmentStatus :exec
UPDATE shipments
SET status = ?,
    shipped_at = CASE WHEN ? IN ('picked_up','in_transit','out_for_delivery','delivered') AND shipped_at IS NULL THEN NOW() ELSE shipped_at END,
    delivered_at = CASE WHEN ? = 'delivered' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
WHERE order_id = ? AND vendor_id = ?;
