-- name: ListActiveHomepageHeroSlides :many
SELECT * FROM homepage_hero_slides
WHERE active = true
ORDER BY sort_order ASC, created_at ASC;

-- name: ListAllHomepageHeroSlides :many
SELECT * FROM homepage_hero_slides
ORDER BY sort_order ASC, created_at ASC;

-- name: GetHomepageHeroSlideByID :one
SELECT * FROM homepage_hero_slides WHERE id = ? LIMIT 1;

-- name: CreateHomepageHeroSlide :exec
INSERT INTO homepage_hero_slides (id, label, title, subtitle, image, link, sort_order, active)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateHomepageHeroSlide :exec
UPDATE homepage_hero_slides
SET label = ?, title = ?, subtitle = ?, image = ?, link = ?, sort_order = ?
WHERE id = ?;

-- name: SetHomepageHeroSlideActive :exec
UPDATE homepage_hero_slides SET active = ? WHERE id = ?;

-- name: DeleteHomepageHeroSlide :exec
DELETE FROM homepage_hero_slides WHERE id = ?;

-- name: ListActiveHomepagePromoItems :many
SELECT * FROM homepage_promo_items
WHERE active = true
ORDER BY sort_order ASC, created_at ASC;

-- name: ListAllHomepagePromoItems :many
SELECT * FROM homepage_promo_items
ORDER BY sort_order ASC, created_at ASC;

-- name: GetHomepagePromoItemByID :one
SELECT * FROM homepage_promo_items WHERE id = ? LIMIT 1;

-- name: CreateHomepagePromoItem :exec
INSERT INTO homepage_promo_items (id, title, description, icon, sort_order, active)
VALUES (?, ?, ?, ?, ?, ?);

-- name: UpdateHomepagePromoItem :exec
UPDATE homepage_promo_items
SET title = ?, description = ?, icon = ?, sort_order = ?
WHERE id = ?;

-- name: SetHomepagePromoItemActive :exec
UPDATE homepage_promo_items SET active = ? WHERE id = ?;

-- name: DeleteHomepagePromoItem :exec
DELETE FROM homepage_promo_items WHERE id = ?;

-- name: GetActiveHomepageShowcase :one
SELECT * FROM homepage_showcase
WHERE active = true
ORDER BY updated_at DESC
LIMIT 1;

-- name: GetHomepageShowcase :one
SELECT * FROM homepage_showcase
ORDER BY updated_at DESC
LIMIT 1;

-- name: CreateHomepageShowcase :exec
INSERT INTO homepage_showcase (
  id, overline, headline, description, button_text, button_link,
  background_color, image_1, image_2, image_3, image_4, active
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateHomepageShowcase :exec
UPDATE homepage_showcase
SET overline = ?, headline = ?, description = ?, button_text = ?, button_link = ?,
    background_color = ?, image_1 = ?, image_2 = ?, image_3 = ?, image_4 = ?, active = ?
WHERE id = ?;
