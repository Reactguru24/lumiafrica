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
  id, vendor_id, category_id, name, description, brand, gender, sku,
  min_price, max_price, total_stock, status,
  bestseller, new_arrival, featured, trending
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateProduct :exec
UPDATE products
SET name = COALESCE(sqlc.narg('name'), name),
    description = COALESCE(sqlc.narg('description'), description),
    brand = COALESCE(sqlc.narg('brand'), brand),
    category_id = COALESCE(sqlc.narg('category_id'), category_id),
    gender = COALESCE(sqlc.narg('gender'), gender),
    status = COALESCE(sqlc.narg('status'), status)
WHERE id = sqlc.arg('id') AND vendor_id = sqlc.arg('vendor_id');

-- name: UpdateProductInventory :exec
UPDATE products SET total_stock = ? WHERE id = ?;

-- name: ArchiveProduct :exec
UPDATE products SET status = 'archived' WHERE id = ? AND vendor_id = ?;

-- name: ModerateProduct :exec
UPDATE products SET status = ? WHERE id = ?;

-- name: UpdateProductRating :exec
UPDATE products SET rating = ?, review_count = ? WHERE id = ?;

-- name: ListProductIDsByVendor :many
SELECT id FROM products WHERE vendor_id = ?;

-- name: SearchProducts :many
SELECT p.* FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active'
  AND p.total_stock > 0
  AND (sqlc.narg('q') IS NULL OR p.name LIKE CONCAT('%', sqlc.narg('q'), '%') OR p.description LIKE CONCAT('%', sqlc.narg('q'), '%') OR p.brand LIKE CONCAT('%', sqlc.narg('q'), '%'))
  AND (sqlc.narg('category') IS NULL OR c.slug = sqlc.narg('category') OR c.name = sqlc.narg('category'))
  AND (sqlc.narg('subcategory') IS NULL OR EXISTS (
    SELECT 1 FROM categories child
    WHERE child.id = p.category_id AND child.slug = sqlc.narg('subcategory')
  ))
  AND (sqlc.narg('brand') IS NULL OR p.brand = sqlc.narg('brand'))
  AND (sqlc.narg('gender') IS NULL OR p.gender = sqlc.narg('gender'))
  AND (sqlc.narg('vendor_id') IS NULL OR p.vendor_id = sqlc.narg('vendor_id'))
  AND (sqlc.narg('size') IS NULL OR EXISTS (
    SELECT 1 FROM product_variants pv
    WHERE pv.product_id = p.id AND pv.size = sqlc.narg('size') AND pv.deleted_at IS NULL AND pv.stock > 0
  ))
  AND (sqlc.narg('color') IS NULL OR EXISTS (
    SELECT 1 FROM product_variants pv
    WHERE pv.product_id = p.id AND pv.color = sqlc.narg('color') AND pv.deleted_at IS NULL AND pv.stock > 0
  ))
  AND (sqlc.narg('min_price') IS NULL OR p.min_price >= sqlc.narg('min_price'))
  AND (sqlc.narg('max_price') IS NULL OR p.max_price <= sqlc.narg('max_price'))
  AND (sqlc.narg('min_rating') IS NULL OR p.rating >= sqlc.narg('min_rating'))
  AND (sqlc.arg('featured_only') = false OR p.featured = true)
  AND (sqlc.arg('trending_only') = false OR p.trending = true)
  AND (sqlc.arg('bestseller_only') = false OR p.bestseller = true)
  AND (sqlc.arg('new_arrival_only') = false OR p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
  AND (sqlc.arg('on_sale_only') = false OR EXISTS (
    SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.discount > 0 AND pv.deleted_at IS NULL
  ))
ORDER BY
  CASE WHEN sqlc.arg('sort_by') = 'popular' THEN p.review_count END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'popular' THEN p.rating END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'rating' THEN p.rating END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'trending' THEN p.trending END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'bestsellers' THEN p.bestseller END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'price-asc' THEN p.min_price END ASC,
  CASE WHEN sqlc.arg('sort_by') = 'price-desc' THEN p.max_price END DESC,
  CASE WHEN sqlc.arg('sort_by') = 'newest' THEN p.created_at END DESC,
  p.created_at DESC
LIMIT ? OFFSET ?;

-- name: CountSearchProducts :one
SELECT COUNT(*) FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active'
  AND p.total_stock > 0
  AND (sqlc.narg('q') IS NULL OR p.name LIKE CONCAT('%', sqlc.narg('q'), '%') OR p.description LIKE CONCAT('%', sqlc.narg('q'), '%') OR p.brand LIKE CONCAT('%', sqlc.narg('q'), '%'))
  AND (sqlc.narg('category') IS NULL OR c.slug = sqlc.narg('category') OR c.name = sqlc.narg('category'))
  AND (sqlc.narg('subcategory') IS NULL OR EXISTS (
    SELECT 1 FROM categories child WHERE child.id = p.category_id AND child.slug = sqlc.narg('subcategory')
  ))
  AND (sqlc.narg('brand') IS NULL OR p.brand = sqlc.narg('brand'))
  AND (sqlc.narg('gender') IS NULL OR p.gender = sqlc.narg('gender'))
  AND (sqlc.narg('vendor_id') IS NULL OR p.vendor_id = sqlc.narg('vendor_id'))
  AND (sqlc.narg('size') IS NULL OR EXISTS (
    SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size = sqlc.narg('size') AND pv.deleted_at IS NULL AND pv.stock > 0
  ))
  AND (sqlc.narg('color') IS NULL OR EXISTS (
    SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color = sqlc.narg('color') AND pv.deleted_at IS NULL AND pv.stock > 0
  ))
  AND (sqlc.narg('min_price') IS NULL OR p.min_price >= sqlc.narg('min_price'))
  AND (sqlc.narg('max_price') IS NULL OR p.max_price <= sqlc.narg('max_price'))
  AND (sqlc.narg('min_rating') IS NULL OR p.rating >= sqlc.narg('min_rating'))
  AND (sqlc.arg('featured_only') = false OR p.featured = true)
  AND (sqlc.arg('trending_only') = false OR p.trending = true)
  AND (sqlc.arg('bestseller_only') = false OR p.bestseller = true)
  AND (sqlc.arg('new_arrival_only') = false OR p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))
  AND (sqlc.arg('on_sale_only') = false OR EXISTS (
    SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.discount > 0 AND pv.deleted_at IS NULL
  ));

-- name: ListDistinctCategories :many
SELECT DISTINCT c.name AS category
FROM products p
INNER JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active' AND p.total_stock > 0
ORDER BY category;

-- name: ListDistinctBrands :many
SELECT DISTINCT brand FROM products WHERE status = 'active' AND total_stock > 0 ORDER BY brand;

-- name: ListDistinctSubcategories :many
SELECT DISTINCT c.name AS subcategory
FROM products p
INNER JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active' AND p.total_stock > 0 AND c.parent_id IS NOT NULL
ORDER BY subcategory;

-- name: ListDistinctColors :many
SELECT DISTINCT pv.color AS color_name
FROM product_variants pv
INNER JOIN products p ON p.id = pv.product_id
WHERE p.status = 'active' AND p.total_stock > 0 AND pv.deleted_at IS NULL AND pv.stock > 0
ORDER BY color_name;

-- name: ListDistinctSizes :many
SELECT DISTINCT pv.size AS size_val
FROM product_variants pv
INNER JOIN products p ON p.id = pv.product_id
WHERE p.status = 'active' AND p.total_stock > 0 AND pv.deleted_at IS NULL AND pv.stock > 0
ORDER BY size_val;

-- name: GetProductPriceRange :one
SELECT COALESCE(MIN(min_price), 0) AS min_price, COALESCE(MAX(max_price), 0) AS max_price
FROM products WHERE status = 'active' AND total_stock > 0;

-- name: CountProductsByVendor :one
SELECT COUNT(*) FROM products WHERE vendor_id = ?;

-- name: ListProductsByVendor :many
SELECT * FROM products WHERE vendor_id = ?;

-- name: ListLowStockByVendor :many
SELECT * FROM products WHERE vendor_id = ? AND total_stock > 0 AND total_stock <= 10;

-- name: CountOutOfStockByVendor :one
SELECT COUNT(*) FROM products WHERE vendor_id = ? AND total_stock = 0;

-- name: CountAllProducts :one
SELECT COUNT(*) FROM products;

-- name: ListRandomRelatedProducts :many
SELECT * FROM products
WHERE status = 'active' AND total_stock > 0 AND id != ? AND category_id = ?
ORDER BY RAND()
LIMIT ?;

-- name: ListHomepageFeaturedProducts :many
SELECT * FROM products
WHERE status = 'active' AND total_stock > 0 AND featured = true
ORDER BY updated_at DESC
LIMIT ?;

-- name: ListHomepageTrendingProducts :many
SELECT * FROM products
WHERE status = 'active' AND total_stock > 0 AND trending = true
ORDER BY review_count DESC, rating DESC
LIMIT ?;

-- name: ListHomepageBestsellerProducts :many
SELECT * FROM products
WHERE status = 'active' AND total_stock > 0 AND bestseller = true
ORDER BY review_count DESC, rating DESC
LIMIT ?;

-- name: ListHomepageNewArrivalProducts :many
SELECT * FROM products
WHERE status = 'active' AND total_stock > 0
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_at DESC
LIMIT ?;

-- name: ListHomepageRecentProducts :many
SELECT * FROM products
WHERE status = 'active' AND total_stock > 0
ORDER BY created_at DESC
LIMIT ?;

-- name: DecrementProductStock :execrows
UPDATE product_variants
SET stock = stock - ?, updated_at = NOW()
WHERE id = ? AND stock >= ? AND deleted_at IS NULL;

-- name: SetProductCreatedAt :exec
UPDATE products SET created_at = ? WHERE id = ?;

-- name: SetProductFeatured :exec
UPDATE products SET featured = ? WHERE id = ?;

-- name: ClearVendorFeaturedProducts :exec
UPDATE products SET featured = false WHERE vendor_id = ?;

-- name: SetProductFeaturedByVendor :exec
UPDATE products SET featured = ? WHERE id = ? AND vendor_id = ?;

-- name: CountFeaturedProductsByVendorExceptProduct :one
SELECT COUNT(*) FROM products
WHERE vendor_id = ? AND featured = true AND id != ?;

-- name: RestoreProductByVendor :exec
UPDATE products SET status = 'active' WHERE id = ? AND vendor_id = ? AND status = 'archived';

-- name: HideOutOfStockProductByVendor :exec
UPDATE products SET status = 'hidden' WHERE id = ? AND vendor_id = ? AND total_stock = 0;

-- name: RefreshTrendingProducts :exec
UPDATE products SET trending = false WHERE trending = true;

-- name: RefreshNewArrivalProducts :exec
UPDATE products SET new_arrival = (created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY));

-- name: RefreshBestsellerProducts :exec
UPDATE products SET bestseller = false WHERE bestseller = true;

-- name: CreateProductVariant :exec
INSERT INTO product_variants (
  id, product_id, size, color, color_hex, price, discount, stock, sku
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateProductVariant :exec
UPDATE product_variants
SET size = COALESCE(sqlc.narg('size'), size),
    color = COALESCE(sqlc.narg('color'), color),
    color_hex = COALESCE(sqlc.narg('color_hex'), color_hex),
    price = COALESCE(sqlc.narg('price'), price),
    discount = COALESCE(sqlc.narg('discount'), discount),
    stock = COALESCE(sqlc.narg('stock'), stock),
    sku = COALESCE(sqlc.narg('sku'), sku),
    updated_at = NOW()
WHERE id = ? AND deleted_at IS NULL;

-- name: SoftDeleteProductVariantsByProduct :exec
UPDATE product_variants SET deleted_at = NOW(), updated_at = NOW()
WHERE product_id = ? AND deleted_at IS NULL;

-- name: ListProductVariants :many
SELECT * FROM product_variants
WHERE product_id = ? AND deleted_at IS NULL
ORDER BY created_at ASC;

-- name: GetProductVariant :one
SELECT * FROM product_variants WHERE id = ? AND deleted_at IS NULL LIMIT 1;

-- name: GetProductVariantByProductSizeColor :one
SELECT * FROM product_variants
WHERE product_id = ? AND size = ? AND color = ? AND deleted_at IS NULL
LIMIT 1;

-- name: RefreshProductVariantCaches :exec
UPDATE products p
SET
  min_price = (
    SELECT COALESCE(MIN(pv.effective_price), 0) FROM product_variants pv
    WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
  ),
  max_price = (
    SELECT COALESCE(MAX(pv.effective_price), 0) FROM product_variants pv
    WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
  ),
  total_stock = (
    SELECT COALESCE(SUM(pv.stock), 0) FROM product_variants pv
    WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
  ),
  updated_at = NOW()
WHERE p.id = ?;

-- name: CreateProductImage :exec
INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary)
VALUES (?, ?, ?, ?, ?, ?);

-- name: DeleteProductImages :exec
DELETE FROM product_images WHERE product_id = ?;

-- name: ListProductImages :many
SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC;

-- name: ListPendingProductsSearch :many
SELECT * FROM products
WHERE status = 'pending'
  AND (sqlc.arg('search') = '' OR name LIKE sqlc.arg('search') OR brand LIKE sqlc.arg('search') OR sku LIKE sqlc.arg('search'))
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountPendingProductsSearch :one
SELECT COUNT(*) FROM products
WHERE status = 'pending'
  AND (sqlc.arg('search') = '' OR name LIKE sqlc.arg('search') OR brand LIKE sqlc.arg('search') OR sku LIKE sqlc.arg('search'));

-- name: ListAdminProductsSearch :many
SELECT * FROM products
WHERE status != 'archived'
  AND (sqlc.arg('search') = '' OR name LIKE sqlc.arg('search') OR brand LIKE sqlc.arg('search') OR sku LIKE sqlc.arg('search'))
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: CountAdminProductsSearch :one
SELECT COUNT(*) FROM products
WHERE status != 'archived'
  AND (sqlc.arg('search') = '' OR name LIKE sqlc.arg('search') OR brand LIKE sqlc.arg('search') OR sku LIKE sqlc.arg('search'));

-- name: ListOnSaleProductIDs :many
SELECT DISTINCT p.id FROM products p
INNER JOIN product_variants pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
WHERE p.status = 'active'
  AND p.total_stock > 0
  AND pv.discount > 0
ORDER BY p.created_at DESC;
