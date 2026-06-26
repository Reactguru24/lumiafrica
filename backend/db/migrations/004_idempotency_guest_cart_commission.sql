-- Legacy migration for pre-schema_v2 databases (VARCHAR(36) ids).
-- Superseded by schema_v2.sql: BINARY(16) ids, carts/cart_items, wishlists,
-- idempotency_keys, and per-line vendor_earnings/platform_fee on order_items.
-- Idempotent: no-op when schema_v2 is already applied.

SET @is_schema_v2 := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND column_name = 'id'
    AND data_type = 'binary'
);

SET @sql_vendor_override := IF(
  @is_schema_v2 = 0,
  'ALTER TABLE vendors ADD COLUMN commission_rate_override DECIMAL(5, 2) NULL AFTER is_featured',
  'SELECT 1'
);
PREPARE stmt FROM @sql_vendor_override;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_products_fk := IF(
  @is_schema_v2 = 0,
  'ALTER TABLE products ADD CONSTRAINT fk_products_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql_products_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_reviews_fk := IF(
  @is_schema_v2 = 0,
  'ALTER TABLE reviews ADD CONSTRAINT fk_reviews_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql_reviews_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idempotency_key := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'payment_transactions'
    AND column_name = 'idempotency_key'
);
SET @sql_payment_idempotency := IF(
  @is_schema_v2 = 0 AND @has_idempotency_key = 0,
  'ALTER TABLE payment_transactions
     ADD COLUMN idempotency_key VARCHAR(64) NULL AFTER reference,
     ADD UNIQUE KEY unique_user_idempotency (user_id, idempotency_key)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_payment_idempotency;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_payment_order_fk := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'payment_transactions'
    AND constraint_name = 'fk_payment_order'
);
SET @sql_payment_fks := IF(
  @is_schema_v2 = 0 AND @has_payment_order_fk = 0,
  'ALTER TABLE payment_transactions
     ADD CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
     ADD CONSTRAINT fk_payment_subscription FOREIGN KEY (subscription_id) REFERENCES vendor_subscriptions(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_payment_fks;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_platform_settings := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'platform_settings'
);
SET @sql_platform_settings := IF(
  @is_schema_v2 = 0 AND @has_platform_settings = 0,
  'CREATE TABLE platform_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT ''default'',
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
    commission_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )',
  'SELECT 1'
);
PREPARE stmt FROM @sql_platform_settings;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_platform_seed := IF(
  @is_schema_v2 = 0 AND @has_platform_settings = 0,
  'INSERT IGNORE INTO platform_settings (id, commission_rate, commission_enabled) VALUES (''default'', 10.00, true)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_platform_seed;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_order_settlements := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'order_settlements'
);
SET @sql_order_settlements := IF(
  @is_schema_v2 = 0 AND @has_order_settlements = 0,
  'CREATE TABLE order_settlements (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    vendor_id VARCHAR(36) NOT NULL,
    gross_amount DECIMAL(15, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(15, 2) NOT NULL,
    net_vendor_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_order_vendor (order_id, vendor_id),
    INDEX idx_vendor_id (vendor_id)
  )',
  'SELECT 1'
);
PREPARE stmt FROM @sql_order_settlements;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_drop_cart_reservations := IF(
  @is_schema_v2 = 0,
  'DROP TABLE IF EXISTS cart_reservations',
  'SELECT 1'
);
PREPARE stmt FROM @sql_drop_cart_reservations;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_cart_items := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'cart_items'
);
SET @sql_cart_items := IF(
  @is_schema_v2 = 0 AND @has_cart_items = 0,
  'CREATE TABLE cart_items (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    guest_session_id VARCHAR(36),
    product_id VARCHAR(36) NOT NULL,
    size VARCHAR(50) NOT NULL,
    color VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    saved_for_later BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_cart_item (user_id, product_id, size, color),
    UNIQUE KEY unique_guest_cart_item (guest_session_id, product_id, size, color),
    INDEX idx_user_id (user_id),
    INDEX idx_guest_session_id (guest_session_id)
  )',
  'SELECT 1'
);
PREPARE stmt FROM @sql_cart_items;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_wishlist_items := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'wishlist_items'
);
SET @sql_wishlist_items := IF(
  @is_schema_v2 = 0 AND @has_wishlist_items = 0,
  'CREATE TABLE wishlist_items (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    guest_session_id VARCHAR(36),
    product_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_wishlist (user_id, product_id),
    UNIQUE KEY unique_guest_wishlist (guest_session_id, product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_guest_session_id (guest_session_id)
  )',
  'SELECT 1'
);
PREPARE stmt FROM @sql_wishlist_items;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
