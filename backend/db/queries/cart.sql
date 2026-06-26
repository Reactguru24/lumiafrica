-- name: GetCartByUserID :one
SELECT * FROM carts WHERE user_id = ? LIMIT 1;

-- name: GetCartBySessionKey :one
SELECT * FROM carts WHERE session_key = ? LIMIT 1;

-- name: CreateCart :exec
INSERT INTO carts (id, user_id, session_key, expires_at)
VALUES (?, ?, ?, ?);

-- name: DeleteCartByID :exec
DELETE FROM carts WHERE id = ?;

-- name: DeleteCartBySessionKey :exec
DELETE FROM carts WHERE session_key = ?;

-- name: AssignGuestCartToUser :exec
UPDATE carts
SET user_id = ?, session_key = NULL, expires_at = NULL, updated_at = NOW()
WHERE session_key = ?;

-- name: ListCartItemsByCartID :many
SELECT
  sqlc.embed(ci),
  pv.product_id AS variant_product_id,
  pv.size AS variant_size,
  pv.color AS variant_color
FROM cart_items ci
INNER JOIN product_variants pv ON pv.id = ci.variant_id AND pv.deleted_at IS NULL
WHERE ci.cart_id = ?
ORDER BY ci.added_at ASC;

-- name: GetCartItemByCartAndVariant :one
SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ? LIMIT 1;

-- name: CreateCartItem :exec
INSERT INTO cart_items (id, cart_id, variant_id, quantity)
VALUES (?, ?, ?, ?);

-- name: UpdateCartItemQuantity :exec
UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?;

-- name: DeleteCartItem :exec
DELETE FROM cart_items WHERE id = ?;

-- name: ClearCartItems :exec
DELETE FROM cart_items WHERE cart_id = ?;

-- name: GetVariantByProductSizeColor :one
SELECT * FROM product_variants
WHERE product_id = ? AND size = ? AND color = ? AND deleted_at IS NULL
LIMIT 1;

-- name: ListWishlistByUser :many
SELECT product_id FROM wishlists WHERE user_id = ? ORDER BY created_at ASC;

-- name: ListWishlistBySessionKey :many
SELECT product_id FROM wishlists WHERE session_key = ? ORDER BY created_at ASC;

-- name: AddWishlistItemForUser :exec
INSERT IGNORE INTO wishlists (id, user_id, session_key, product_id, expires_at)
VALUES (?, ?, NULL, ?, NULL);

-- name: AddWishlistItemForSession :exec
INSERT IGNORE INTO wishlists (id, user_id, session_key, product_id, expires_at)
VALUES (?, NULL, ?, ?, ?);

-- name: RemoveWishlistItemByUser :exec
DELETE FROM wishlists WHERE user_id = ? AND product_id = ?;

-- name: RemoveWishlistItemBySession :exec
DELETE FROM wishlists WHERE session_key = ? AND product_id = ?;

-- name: DeleteWishlistBySessionKey :exec
DELETE FROM wishlists WHERE session_key = ?;
