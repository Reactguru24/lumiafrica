-- name: ListActiveDeliveryCities :many
SELECT DISTINCT destination_city
FROM shipping_lane_rates
WHERE active = true
ORDER BY destination_city;

-- name: GetShippingLaneRate :one
SELECT id, origin_city, destination_city, fee, estimated_days, active, created_at, updated_at
FROM shipping_lane_rates
WHERE active = true
  AND LOWER(origin_city) = LOWER(?)
  AND LOWER(destination_city) = LOWER(?)
LIMIT 1;

-- name: ListAllShippingLaneRates :many
SELECT id, origin_city, destination_city, fee, estimated_days, active, created_at, updated_at
FROM shipping_lane_rates
ORDER BY origin_city, destination_city;

-- name: GetShippingLaneRateByID :one
SELECT id, origin_city, destination_city, fee, estimated_days, active, created_at, updated_at
FROM shipping_lane_rates WHERE id = ? LIMIT 1;

-- name: CreateShippingLaneRate :exec
INSERT INTO shipping_lane_rates (id, origin_city, destination_city, fee, estimated_days, active)
VALUES (?, ?, ?, ?, ?, true);

-- name: UpdateShippingLaneRate :exec
UPDATE shipping_lane_rates
SET origin_city = ?, destination_city = ?, fee = ?, estimated_days = ?, updated_at = NOW()
WHERE id = ?;

-- name: SetShippingLaneRateActive :exec
UPDATE shipping_lane_rates SET active = ?, updated_at = NOW() WHERE id = ?;

-- name: CreateShipment :exec
INSERT INTO shipments (
  id, order_id, vendor_id, shipping_fee, origin_city, destination_city,
  carrier, tracking_number, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending');

-- name: ListShipmentsByOrder :many
SELECT id, order_id, vendor_id, shipping_fee, origin_city, destination_city,
       carrier, tracking_number, tracking_url, status, shipped_at, estimated_delivery, delivered_at, created_at, updated_at
FROM shipments WHERE order_id = ? ORDER BY created_at ASC;

-- name: ListShipmentsByOrderAndVendor :one
SELECT id, order_id, vendor_id, shipping_fee, origin_city, destination_city,
       carrier, tracking_number, tracking_url, status, shipped_at, estimated_delivery, delivered_at, created_at, updated_at
FROM shipments WHERE order_id = ? AND vendor_id = ? LIMIT 1;
