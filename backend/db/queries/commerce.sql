-- name: ListActiveDeliveryZones :many
SELECT * FROM delivery_zones WHERE active = true ORDER BY name;

-- name: GetDeliveryZoneByID :one
SELECT * FROM delivery_zones WHERE id = ? LIMIT 1;

-- name: FindDeliveryZoneByCity :one
SELECT dz.id, dz.name, dz.base_cost, dz.estimated_days, dz.active, dz.created_at, dz.updated_at
FROM delivery_zones dz
INNER JOIN delivery_zone_areas dza ON dza.zone_id = dz.id
WHERE dz.active = true AND dza.area_type = 'city' AND LOWER(dza.area_name) = LOWER(?)
LIMIT 1;

-- name: CreateDeliveryZone :exec
INSERT INTO delivery_zones (id, name, base_cost, estimated_days, active)
VALUES (?, ?, ?, ?, true);

-- name: CreateDeliveryZoneArea :exec
INSERT INTO delivery_zone_areas (id, zone_id, area_type, area_name)
VALUES (?, ?, ?, ?);

-- name: GetCouponByCode :one
SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) LIMIT 1;

-- name: GetCouponByID :one
SELECT * FROM coupons WHERE id = ? LIMIT 1;

-- name: CountCouponUsesByUser :one
SELECT COUNT(*) FROM coupon_uses WHERE coupon_id = ? AND user_id = ?;

-- name: CreateCouponUse :exec
INSERT INTO coupon_uses (id, coupon_id, user_id, order_id, discount_amount)
VALUES (?, ?, ?, ?, ?);

-- name: IncrementCouponUses :exec
UPDATE coupons SET uses_count = uses_count + 1 WHERE id = ?;

-- name: ListAllCoupons :many
SELECT * FROM coupons ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- name: CountAllCoupons :one
SELECT COUNT(*) FROM coupons;

-- name: CreateCoupon :exec
INSERT INTO coupons (
  id, code, type, value, min_order_amount, max_discount, max_uses, per_user_limit, vendor_id, active, starts_at, expires_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?);

-- name: SetCouponActive :exec
UPDATE coupons SET active = ? WHERE id = ?;

-- name: UpdateCoupon :exec
UPDATE coupons
SET code = ?,
    type = ?,
    value = ?,
    min_order_amount = ?,
    max_discount = ?,
    max_uses = ?,
    per_user_limit = ?,
    starts_at = ?,
    expires_at = ?
WHERE id = ?;

-- name: ListActivePromotions :many
SELECT * FROM promotions
WHERE active = true
  AND deleted_at IS NULL
  AND starts_at <= NOW() AND ends_at >= NOW()
ORDER BY starts_at DESC;

-- name: ListAllPromotions :many
SELECT * FROM promotions
WHERE deleted_at IS NULL
ORDER BY starts_at DESC LIMIT ? OFFSET ?;

-- name: CountAllPromotions :one
SELECT COUNT(*) FROM promotions WHERE deleted_at IS NULL;

-- name: CreatePromotion :exec
INSERT INTO promotions (id, name, type, discount_type, discount_value, starts_at, ends_at, active, created_by)
VALUES (?, ?, ?, ?, ?, ?, ?, true, ?);

-- name: AddPromotionProduct :exec
INSERT IGNORE INTO promotion_products (promotion_id, product_id) VALUES (?, ?);

-- name: ListPromotionProductIDs :many
SELECT product_id FROM promotion_products WHERE promotion_id = ?;

-- name: GetPromotionByID :one
SELECT * FROM promotions WHERE id = ? AND deleted_at IS NULL LIMIT 1;

-- name: SoftDeletePromotion :exec
UPDATE promotions SET deleted_at = NOW(), active = false, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL;

-- name: UpdatePromotion :exec
UPDATE promotions
SET name = ?, type = ?, discount_type = ?, discount_value = ?, starts_at = ?, ends_at = ?
WHERE id = ?;

-- name: SetPromotionActive :exec
UPDATE promotions SET active = ? WHERE id = ?;

-- name: DeletePromotionProducts :exec
DELETE FROM promotion_products WHERE promotion_id = ?;

-- name: ListActiveCollections :many
SELECT * FROM collections
WHERE active = true
  AND (starts_at IS NULL OR starts_at <= NOW())
  AND (ends_at IS NULL OR ends_at >= NOW())
ORDER BY sort_order, name;

-- name: GetCollectionBySlug :one
SELECT * FROM collections WHERE slug = ? AND active = true LIMIT 1;

-- name: ListAllCollections :many
SELECT * FROM collections ORDER BY sort_order, name LIMIT ? OFFSET ?;

-- name: CountAllCollections :one
SELECT COUNT(*) FROM collections;

-- name: CreateCollection :exec
INSERT INTO collections (id, name, slug, description, image, active, sort_order, starts_at, ends_at, created_by)
VALUES (?, ?, ?, ?, ?, true, ?, ?, ?, ?);

-- name: AddCollectionProduct :exec
INSERT IGNORE INTO collection_products (collection_id, product_id, sort_order) VALUES (?, ?, ?);

-- name: ListCollectionProductIDs :many
SELECT product_id FROM collection_products WHERE collection_id = ? ORDER BY sort_order;

-- name: GetCollectionByID :one
SELECT * FROM collections WHERE id = ? LIMIT 1;

-- name: UpdateCollection :exec
UPDATE collections
SET name = ?, slug = ?, description = ?, image = ?, sort_order = ?, starts_at = ?, ends_at = ?
WHERE id = ?;

-- name: SetCollectionActive :exec
UPDATE collections SET active = ? WHERE id = ?;

-- name: DeleteCollectionProducts :exec
DELETE FROM collection_products WHERE collection_id = ?;
