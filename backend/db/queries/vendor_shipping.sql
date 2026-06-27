-- name: ListVendorShippingRatesByVendor :many
SELECT vsr.id, vsr.vendor_id, vsr.zone_id, vsr.fee, vsr.created_at, vsr.updated_at,
       dz.name AS zone_name, dz.estimated_days AS zone_estimated_days
FROM vendor_shipping_rates vsr
INNER JOIN delivery_zones dz ON dz.id = vsr.zone_id
WHERE vsr.vendor_id = ? AND vsr.deleted_at IS NULL
ORDER BY dz.name;

-- name: GetVendorShippingRate :one
SELECT id, vendor_id, zone_id, fee, created_at, updated_at
FROM vendor_shipping_rates
WHERE vendor_id = ? AND zone_id = ? AND deleted_at IS NULL
LIMIT 1;

-- name: UpsertVendorShippingRate :exec
INSERT INTO vendor_shipping_rates (id, vendor_id, zone_id, fee)
VALUES (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE fee = VALUES(fee), deleted_at = NULL, updated_at = NOW();

-- name: SoftDeleteVendorShippingRate :exec
UPDATE vendor_shipping_rates SET deleted_at = NOW(), updated_at = NOW()
WHERE vendor_id = ? AND zone_id = ? AND deleted_at IS NULL;
