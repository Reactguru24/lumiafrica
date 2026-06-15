-- name: GetProductByID :one
SELECT * FROM products WHERE id = ? AND status != 'archived' LIMIT 1;

-- name: GetProductByIDAny :one
SELECT * FROM products WHERE id = ? LIMIT 1;

-- name: GetProductByVendor :one
SELECT * FROM products WHERE id = ? AND vendor_id = ? LIMIT 1;

-- name: ListVendorProducts :many
SELECT * FROM products WHERE vendor_id = ?
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountVendorProducts :one
SELECT COUNT(*) FROM products WHERE vendor_id = ?;

-- name: ListPendingProducts :many
SELECT * FROM products WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountPendingProducts :one
SELECT COUNT(*) FROM products WHERE status = 'pending';

-- name: ListAdminProducts :many
SELECT * FROM products WHERE status != 'archived'
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountAdminProducts :one
SELECT COUNT(*) FROM products WHERE status != 'archived';

-- name: CreateProduct :exec
INSERT INTO products (
  id, vendor_id, name, description, brand, category, subcategory, gender,
  price, discount, images, colors, sizes, sku, stock, status,
  bestseller, new_arrival, featured, trending
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?);

-- name: UpdateProduct :exec
UPDATE products
SET name = COALESCE(sqlc.narg('name'), name),
    description = COALESCE(sqlc.narg('description'), description),
    brand = COALESCE(sqlc.narg('brand'), brand),
    category = COALESCE(sqlc.narg('category'), category),
    subcategory = COALESCE(sqlc.narg('subcategory'), subcategory),
    gender = COALESCE(sqlc.narg('gender'), gender),
    price = COALESCE(sqlc.narg('price'), price),
    stock = COALESCE(sqlc.narg('stock'), stock),
    discount = COALESCE(sqlc.narg('discount'), discount),
    sizes = COALESCE(sqlc.narg('sizes'), sizes),
    colors = COALESCE(sqlc.narg('colors'), colors),
    images = COALESCE(sqlc.narg('images'), images)
WHERE id = sqlc.arg('id') AND vendor_id = sqlc.arg('vendor_id');

-- name: ArchiveProduct :exec
UPDATE products SET status = 'archived' WHERE id = ? AND vendor_id = ?;

-- name: ModerateProduct :exec
UPDATE products SET status = ? WHERE id = ?;

-- name: UpdateProductRating :exec
UPDATE products SET rating = ?, review_count = ? WHERE id = ?;

-- name: ListProductIDsByVendor :many
SELECT id FROM products WHERE vendor_id = ?;

-- name: SearchProducts :many
SELECT * FROM products
WHERE status = 'active'
  AND (sqlc.narg('q') IS NULL OR name LIKE CONCAT('%', sqlc.narg('q'), '%') OR description LIKE CONCAT('%', sqlc.narg('q'), '%') OR brand LIKE CONCAT('%', sqlc.narg('q'), '%'))
  AND (sqlc.narg('category') IS NULL OR category = sqlc.narg('category'))
  AND (sqlc.narg('subcategory') IS NULL OR subcategory = sqlc.narg('subcategory'))
  AND (sqlc.narg('brand') IS NULL OR brand = sqlc.narg('brand'))
  AND (sqlc.narg('gender') IS NULL OR gender = sqlc.narg('gender'))
  AND (sqlc.narg('vendor_id') IS NULL OR vendor_id = sqlc.narg('vendor_id'))
  AND (sqlc.narg('size') IS NULL OR JSON_CONTAINS(sizes, JSON_QUOTE(sqlc.narg('size'))))
  AND (sqlc.narg('color') IS NULL OR JSON_SEARCH(colors, 'one', sqlc.narg('color'), NULL, '$[*].name') IS NOT NULL)
  AND (sqlc.narg('min_price') IS NULL OR price >= sqlc.narg('min_price'))
  AND (sqlc.narg('max_price') IS NULL OR price <= sqlc.narg('max_price'))
  AND (sqlc.narg('min_rating') IS NULL OR rating >= sqlc.narg('min_rating'))
  AND (sqlc.arg('featured_only') = false OR featured = true)
  AND (sqlc.arg('trending_only') = false OR trending = true)
  AND (sqlc.arg('on_sale_only') = false OR discount > 0)
ORDER BY
  CASE WHEN sqlc.arg('sort_by') = 'popular' THEN review_count END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'rating' THEN rating END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'trending' THEN trending END DESC, review_count DESC, rating DESC,
  CASE WHEN sqlc.arg('sort_by') = 'bestsellers' THEN review_count END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'price-asc' THEN price END ASC,
  CASE WHEN sqlc.arg('sort_by') = 'price-desc' THEN price END DESC,
  created_at DESC
LIMIT ? OFFSET ?;

-- name: CountSearchProducts :one
SELECT COUNT(*) FROM products
WHERE status = 'active'
  AND (sqlc.narg('q') IS NULL OR name LIKE CONCAT('%', sqlc.narg('q'), '%') OR description LIKE CONCAT('%', sqlc.narg('q'), '%') OR brand LIKE CONCAT('%', sqlc.narg('q'), '%'))
  AND (sqlc.narg('category') IS NULL OR category = sqlc.narg('category'))
  AND (sqlc.narg('subcategory') IS NULL OR subcategory = sqlc.narg('subcategory'))
  AND (sqlc.narg('brand') IS NULL OR brand = sqlc.narg('brand'))
  AND (sqlc.narg('gender') IS NULL OR gender = sqlc.narg('gender'))
  AND (sqlc.narg('vendor_id') IS NULL OR vendor_id = sqlc.narg('vendor_id'))
  AND (sqlc.narg('size') IS NULL OR JSON_CONTAINS(sizes, JSON_QUOTE(sqlc.narg('size'))))
  AND (sqlc.narg('color') IS NULL OR JSON_SEARCH(colors, 'one', sqlc.narg('color'), NULL, '$[*].name') IS NOT NULL)
  AND (sqlc.narg('min_price') IS NULL OR price >= sqlc.narg('min_price'))
  AND (sqlc.narg('max_price') IS NULL OR price <= sqlc.narg('max_price'))
  AND (sqlc.narg('min_rating') IS NULL OR rating >= sqlc.narg('min_rating'))
  AND (sqlc.arg('featured_only') = false OR featured = true)
  AND (sqlc.arg('trending_only') = false OR trending = true)
  AND (sqlc.arg('on_sale_only') = false OR discount > 0);

-- name: ListDistinctCategories :many
SELECT DISTINCT category FROM products WHERE status = 'active' ORDER BY category;

-- name: ListDistinctBrands :many
SELECT DISTINCT brand FROM products WHERE status = 'active' ORDER BY brand;

-- name: ListDistinctSubcategories :many
SELECT DISTINCT subcategory FROM products WHERE status = 'active' ORDER BY subcategory;

-- name: ListDistinctColors :many
SELECT DISTINCT jt.color_name AS color_name
FROM products p
JOIN JSON_TABLE(
  COALESCE(p.colors, '[]'),
  '$[*]' COLUMNS (color_name VARCHAR(100) PATH '$.name')
) AS jt
WHERE p.status = 'active' AND jt.color_name IS NOT NULL AND jt.color_name != ''
ORDER BY color_name;

-- name: ListDistinctSizes :many
SELECT DISTINCT jt.size_val AS size_val
FROM products p
JOIN JSON_TABLE(
  COALESCE(p.sizes, '[]'),
  '$[*]' COLUMNS (size_val VARCHAR(20) PATH '$')
) AS jt
WHERE p.status = 'active' AND jt.size_val IS NOT NULL AND jt.size_val != ''
ORDER BY size_val;

-- name: GetProductPriceRange :one
SELECT COALESCE(MIN(price), 0) AS min_price, COALESCE(MAX(price), 0) AS max_price
FROM products WHERE status = 'active';

-- name: CountProductsByVendor :one
SELECT COUNT(*) FROM products WHERE vendor_id = ?;

-- name: ListProductsByVendor :many
SELECT * FROM products WHERE vendor_id = ?;

-- name: ListLowStockByVendor :many
SELECT * FROM products WHERE vendor_id = ? AND stock > 0 AND stock <= 10;

-- name: CountOutOfStockByVendor :one
SELECT COUNT(*) FROM products WHERE vendor_id = ? AND stock = 0;

-- name: CountAllProducts :one
SELECT COUNT(*) FROM products;

-- name: ListRandomRelatedProducts :many
SELECT * FROM products
WHERE status = 'active' AND id != ?
ORDER BY RAND()
LIMIT ?;
