-- name: GetCategoryBySlug :one
SELECT * FROM categories WHERE slug = ? LIMIT 1;

-- name: GetCategoryByID :one
SELECT * FROM categories WHERE id = ? LIMIT 1;

-- name: ListRootCategories :many
SELECT * FROM categories WHERE parent_id IS NULL AND active = true ORDER BY sort_order, name;

-- name: ListChildCategories :many
SELECT * FROM categories WHERE parent_id = ? AND active = true ORDER BY sort_order, name;

-- name: ListAllActiveCategories :many
SELECT * FROM categories WHERE active = true ORDER BY sort_order, name;

-- name: CreateCategory :exec
INSERT INTO categories (id, name, slug, parent_id, sort_order, active)
VALUES (?, ?, ?, ?, ?, true);
