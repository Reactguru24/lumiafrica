-- Homepage hero carousel, promo strip, and banner (admin-managed).
-- Idempotent: skips when tables already exist.

SET @has_hero := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'homepage_hero_slides'
);

SET @sql_hero := IF(
  @has_hero = 0,
  'CREATE TABLE homepage_hero_slides (
    id          BINARY(16)   NOT NULL,
    label       VARCHAR(100) NOT NULL DEFAULT '''',
    title       VARCHAR(255) NOT NULL,
    subtitle    TEXT         NULL,
    image       VARCHAR(512) NOT NULL,
    link        VARCHAR(512) NOT NULL DEFAULT ''/products'',
    sort_order  INT          NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_active_sort (active, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql_hero;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_promo := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'homepage_promo_items'
);

SET @sql_promo := IF(
  @has_promo = 0,
  'CREATE TABLE homepage_promo_items (
    id          BINARY(16)   NOT NULL,
    title       VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '''',
    icon        VARCHAR(20)  NOT NULL DEFAULT ''✓'',
    sort_order  INT          NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_active_sort (active, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql_promo;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_banner := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'homepage_banners'
);

SET @sql_banner := IF(
  @has_banner = 0,
  'CREATE TABLE homepage_banners (
    id          BINARY(16)   NOT NULL,
    title       VARCHAR(255) NULL,
    subtitle    TEXT         NULL,
    image       VARCHAR(512) NOT NULL,
    link        VARCHAR(512) NULL,
    active      BOOLEAN      NOT NULL DEFAULT false,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_active_sort (active, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql_banner;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
