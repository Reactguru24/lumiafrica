-- Vendor-controlled shipping fees (per seller, applied once per vendor per order).

SET @has_shipping_cost := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'vendors'
    AND column_name = 'shipping_cost'
);

SET @sql_shipping_cost := IF(
  @has_shipping_cost = 0,
  'ALTER TABLE vendors ADD COLUMN shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER city',
  'SELECT 1'
);
PREPARE stmt FROM @sql_shipping_cost;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_free_shipping_threshold := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'vendors'
    AND column_name = 'free_shipping_threshold'
);

SET @sql_free_shipping_threshold := IF(
  @has_free_shipping_threshold = 0,
  'ALTER TABLE vendors ADD COLUMN free_shipping_threshold DECIMAL(10,2) NULL DEFAULT NULL AFTER shipping_cost',
  'SELECT 1'
);
PREPARE stmt FROM @sql_free_shipping_threshold;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
