-- Per-vendor shipping fee per delivery zone (e.g. 500 KES for Nairobi Metro).

SET @has_vendor_shipping_rates := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'vendor_shipping_rates'
);

SET @sql_vendor_shipping_rates := IF(
  @has_vendor_shipping_rates = 0,
  'CREATE TABLE vendor_shipping_rates (
    id         BINARY(16)    NOT NULL,
    vendor_id  BINARY(16)    NOT NULL,
    zone_id    BINARY(16)    NOT NULL,
    fee        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vendor_zone (vendor_id, zone_id),
    FOREIGN KEY fk_vsr_vendor (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY fk_vsr_zone   (zone_id)   REFERENCES delivery_zones(id) ON DELETE CASCADE,
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_zone_id   (zone_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql_vendor_shipping_rates;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
