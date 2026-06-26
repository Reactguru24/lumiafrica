-- Idempotent migration: allow reviews without a linked order.
-- Safe to re-run on schema_v2 databases where order_id is already BINARY(16) NULL.

SET @needs_nullable := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'reviews'
    AND column_name = 'order_id'
    AND is_nullable = 'NO'
);

SET @sql_drop_fk := IF(
  @needs_nullable > 0,
  'ALTER TABLE reviews DROP FOREIGN KEY fk_rev_order',
  'SELECT 1'
);
PREPARE stmt FROM @sql_drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_modify := IF(
  @needs_nullable > 0,
  'ALTER TABLE reviews MODIFY COLUMN order_id BINARY(16) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_modify;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_add_fk := IF(
  @needs_nullable > 0,
  'ALTER TABLE reviews ADD CONSTRAINT fk_rev_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove legacy unique index if present.
SET @drop_legacy := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'reviews' AND index_name = 'unique_review'
);
SET @sql_drop_legacy := IF(@drop_legacy > 0, 'ALTER TABLE reviews DROP INDEX unique_review', 'SELECT 1');
PREPARE stmt FROM @sql_drop_legacy;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Keep one review per product/user (latest id).
DELETE r1 FROM reviews r1
INNER JOIN reviews r2
  ON r1.product_id = r2.product_id
 AND r1.user_id = r2.user_id
 AND r1.id < r2.id;

SET @add_unique := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'reviews' AND index_name = 'unique_product_user_review'
);
SET @sql_add_unique := IF(@add_unique = 0, 'ALTER TABLE reviews ADD UNIQUE KEY unique_product_user_review (product_id, user_id)', 'SELECT 1');
PREPARE stmt FROM @sql_add_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE vendors v
SET rating = COALESCE((
  SELECT ROUND(AVG(r.rating), 2)
  FROM reviews r
  WHERE r.vendor_id = v.id
), 0);
