-- Delivery zones are owned by vendors; orders store zone name for checkout by label.

SET @has_vendor_id := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'delivery_zones' AND column_name = 'vendor_id'
);

SET @sql_add_vendor_id := IF(
  @has_vendor_id = 0,
  'ALTER TABLE delivery_zones
     ADD COLUMN vendor_id BINARY(16) NULL AFTER id,
     ADD INDEX idx_vendor_id (vendor_id),
     ADD CONSTRAINT fk_dz_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add_vendor_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_uq_vendor_name := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'delivery_zones' AND index_name = 'uq_vendor_zone_name'
);

SET @sql_uq := IF(
  @has_uq_vendor_name = 0,
  'ALTER TABLE delivery_zones
     DROP INDEX uq_name,
     ADD UNIQUE KEY uq_vendor_zone_name (vendor_id, name)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_uq;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_zone_name_col := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'delivery_zone_name'
);

SET @sql_zone_name := IF(
  @has_zone_name_col = 0,
  'ALTER TABLE orders ADD COLUMN delivery_zone_name VARCHAR(100) NULL AFTER delivery_zone_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql_zone_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
