-- Per-vendor shipments and origin→destination shipping lane rates (Jumia-style marketplace).

CREATE TABLE IF NOT EXISTS shipping_lane_rates (
  id              BINARY(16)    NOT NULL,
  origin_city     VARCHAR(100)  NOT NULL,
  destination_city VARCHAR(100) NOT NULL,
  fee             DECIMAL(10,2) NOT NULL,
  estimated_days  VARCHAR(50)   NOT NULL DEFAULT '3-5 days',
  active          BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lane_cities (origin_city, destination_city),
  INDEX idx_lane_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Allow multiple shipments per order (one per vendor).
SET @has_ship_vendor := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'shipments' AND column_name = 'vendor_id'
);

SET @sql_ship_vendor := IF(
  @has_ship_vendor = 0,
  'ALTER TABLE shipments
     DROP INDEX uq_order_id,
     ADD COLUMN vendor_id BINARY(16) NULL AFTER order_id,
     ADD COLUMN shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER vendor_id,
     ADD COLUMN origin_city VARCHAR(100) NULL AFTER shipping_fee,
     ADD COLUMN destination_city VARCHAR(100) NULL AFTER origin_city,
     MODIFY carrier VARCHAR(100) NULL,
     MODIFY tracking_number VARCHAR(100) NULL,
     ADD INDEX idx_ship_order_vendor (order_id, vendor_id),
     ADD CONSTRAINT fk_ship_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_ship_vendor;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed common Kenya lanes (admin can edit later).
INSERT IGNORE INTO shipping_lane_rates (id, origin_city, destination_city, fee, estimated_days)
SELECT UUID_TO_BIN(UUID()), o.origin_city, o.destination_city, o.fee, o.estimated_days
FROM (
  SELECT 'Mombasa' AS origin_city, 'Nairobi' AS destination_city, 350.00 AS fee, '2-4 days' AS estimated_days
  UNION SELECT 'Kisumu', 'Nairobi', 300.00, '2-4 days'
  UNION SELECT 'Eldoret', 'Nairobi', 250.00, '2-4 days'
  UNION SELECT 'Nakuru', 'Nairobi', 200.00, '1-3 days'
  UNION SELECT 'Nairobi', 'Mombasa', 350.00, '2-4 days'
  UNION SELECT 'Nairobi', 'Kisumu', 300.00, '2-4 days'
  UNION SELECT 'Nairobi', 'Eldoret', 250.00, '2-4 days'
  UNION SELECT 'Nairobi', 'Nakuru', 200.00, '1-3 days'
  UNION SELECT 'Nairobi', 'Nairobi', 150.00, 'Same day'
  UNION SELECT 'Mombasa', 'Mombasa', 150.00, 'Same day'
  UNION SELECT 'Kisumu', 'Kisumu', 150.00, 'Same day'
  UNION SELECT 'Eldoret', 'Eldoret', 150.00, 'Same day'
) o
WHERE NOT EXISTS (SELECT 1 FROM shipping_lane_rates LIMIT 1);
