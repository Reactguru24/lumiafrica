-- Replace middle banner with admin-managed feature showcase section.
SET @has_showcase := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'homepage_showcase'
);

SET @sql_showcase := IF(
  @has_showcase = 0,
  'CREATE TABLE homepage_showcase (
    id               BINARY(16)   NOT NULL,
    overline         VARCHAR(100) NOT NULL DEFAULT ''Made for East Africa'',
    headline         VARCHAR(255) NOT NULL DEFAULT '''',
    description      TEXT         NOT NULL,
    button_text      VARCHAR(100) NOT NULL DEFAULT ''Explore Trends'',
    button_link      VARCHAR(512) NOT NULL DEFAULT ''/products?trending=true'',
    background_color VARCHAR(7)   NOT NULL DEFAULT ''#084c54'',
    image_1          VARCHAR(512) NOT NULL DEFAULT '''',
    image_2          VARCHAR(512) NOT NULL DEFAULT '''',
    image_3          VARCHAR(512) NOT NULL DEFAULT '''',
    image_4          VARCHAR(512) NOT NULL DEFAULT '''',
    active           BOOLEAN      NOT NULL DEFAULT true,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_active (active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql_showcase;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
