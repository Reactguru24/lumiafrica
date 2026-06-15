-- name: GetReviewByProductAndUser :one
SELECT id, product_id, vendor_id, user_id, order_id, rating, comment, vendor_reply, vendor_reply_at, created_at, updated_at FROM reviews WHERE product_id = ? AND user_id = ? LIMIT 1;

-- name: CreateReview :exec
INSERT INTO reviews (id, product_id, vendor_id, user_id, order_id, rating, comment)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: ListReviewsByProduct :many
SELECT id, product_id, vendor_id, user_id, order_id, rating, comment, vendor_reply, vendor_reply_at, created_at, updated_at FROM reviews WHERE product_id = ?
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountReviewsByProduct :one
SELECT COUNT(*) FROM reviews WHERE product_id = ?;

-- name: ListReviewsByProductIDs :many
SELECT r.id, r.product_id, r.vendor_id, r.user_id, r.order_id, r.rating, r.comment, r.vendor_reply, r.vendor_reply_at, r.created_at, r.updated_at
FROM reviews r
WHERE r.product_id IN (sqlc.slice('product_ids'))
ORDER BY r.created_at DESC
LIMIT ? OFFSET ?;

-- name: CountReviewsByProductIDs :one
SELECT COUNT(*) FROM reviews
WHERE product_id IN (sqlc.slice('product_ids'));

-- name: GetReviewByID :one
SELECT id, product_id, vendor_id, user_id, order_id, rating, comment, vendor_reply, vendor_reply_at, created_at, updated_at FROM reviews WHERE id = ? LIMIT 1;

-- name: ListReviewsByProductID :many
SELECT rating FROM reviews WHERE product_id = ?;

-- name: CountReviewsByProductID :one
SELECT COUNT(*) FROM reviews WHERE product_id = ?;

-- name: UpdateReviewReply :exec
UPDATE reviews
SET vendor_reply = ?, vendor_reply_at = ?
WHERE id = ?;

-- name: AvgRatingByProduct :one
SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = ?;
