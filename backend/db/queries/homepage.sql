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

-- name: ListActiveHomepageBanners :many
SELECT * FROM homepage_banners
WHERE active = true
ORDER BY sort_order ASC, created_at ASC
LIMIT 1;

-- name: ListAllHomepageBanners :many
SELECT * FROM homepage_banners
ORDER BY sort_order ASC, created_at ASC;

-- name: GetHomepageBannerByID :one
SELECT * FROM homepage_banners WHERE id = ? LIMIT 1;

-- name: CreateHomepageBanner :exec
INSERT INTO homepage_banners (id, title, subtitle, image, link, active, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: UpdateHomepageBanner :exec
UPDATE homepage_banners
SET title = ?, subtitle = ?, image = ?, link = ?, sort_order = ?
WHERE id = ?;

-- name: SetHomepageBannerActive :exec
UPDATE homepage_banners SET active = ? WHERE id = ?;

-- name: DeleteHomepageBanner :exec
DELETE FROM homepage_banners WHERE id = ?;
