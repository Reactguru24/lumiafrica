-- name: ListVendorShippingRatesByVendor :many
SELECT vsr.id, vsr.vendor_id, vsr.zone_id, vsr.fee, vsr.created_at, vsr.updated_at,
       dz.name AS zone_name, dz.estimated_days AS zone_estimated_days
FROM vendor_shipping_rates vsr
INNER JOIN delivery_zones dz ON dz.id = vsr.zone_id
WHERE vsr.vendor_id = ?
ORDER BY dz.name;

-- name: GetVendorShippingRate :one
SELECT id, vendor_id, zone_id, fee, created_at, updated_at
FROM vendor_shipping_rates
WHERE vendor_id = ? AND zone_id = ?
LIMIT 1;

-- name: UpsertVendorShippingRate :exec
INSERT INTO vendor_shipping_rates (id, vendor_id, zone_id, fee)
VALUES (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE fee = VALUES(fee);

-- name: DeleteVendorShippingRate :exec
DELETE FROM vendor_shipping_rates WHERE vendor_id = ? AND zone_id = ?;
