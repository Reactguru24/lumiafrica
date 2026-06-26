-- Migrate wishlists to support guest sessions (session_key) alongside user_id.
-- Idempotent: skip when wishlists already has session_key.

SET @already_migrated := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'wishlists'
    AND column_name = 'session_key'
);
SET @sql_skip := IF(@already_migrated > 0, 'SELECT 1', 'SELECT 0');
PREPARE stmt FROM @sql_skip;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @run_migration := @already_migrated = 0;

SET @sql_drop_new := IF(@run_migration, 'DROP TABLE IF EXISTS wishlists_new', 'SELECT 1');
PREPARE stmt FROM @sql_drop_new;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_create_new := IF(
  @run_migration,
  'CREATE TABLE wishlists_new (
    id          BINARY(16)  NOT NULL,
    user_id     BINARY(16)  NULL,
    session_key VARCHAR(64) NULL,
    product_id  BINARY(16) NOT NULL,
    expires_at  TIMESTAMP   NULL,
    created_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wishlist_owner_new CHECK (
      (user_id IS NOT NULL AND session_key IS NULL) OR
      (user_id IS NULL     AND session_key IS NOT NULL)
    ),
    PRIMARY KEY (id),
    UNIQUE KEY uq_wl_user_product (user_id, product_id),
    UNIQUE KEY uq_wl_session_product (session_key, product_id),
    FOREIGN KEY fk_wl_new_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY fk_wl_new_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_expires_at (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql_create_new;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_copy := IF(
  @run_migration,
  'INSERT INTO wishlists_new (id, user_id, session_key, product_id, expires_at, created_at)
   SELECT UNHEX(REPLACE(UUID(), ''-'', '''')), user_id, NULL, product_id, NULL, created_at FROM wishlists',
  'SELECT 1'
);
PREPARE stmt FROM @sql_copy;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_drop_old := IF(@run_migration, 'DROP TABLE wishlists', 'SELECT 1');
PREPARE stmt FROM @sql_drop_old;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_rename := IF(@run_migration, 'RENAME TABLE wishlists_new TO wishlists', 'SELECT 1');
PREPARE stmt FROM @sql_rename;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
