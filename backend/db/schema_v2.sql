-- =============================================================================
-- Lumi Backend — Schema v2
-- =============================================================================
--
-- UUID storage convention
-- -----------------------
-- All primary and foreign keys are BINARY(16).
-- Store UUIDs with the swap flag for sequential InnoDB inserts:
--   INSERT: UUID_TO_BIN(?, 1)
--   SELECT: BIN_TO_UUID(id, 1) AS id
-- sqlc.yaml type overrides are required to map BINARY(16) ↔ string in Go.
--
-- Price / stock model
-- -------------------
-- price, discount, effective_price live on product_variants — variants are the
-- atomic unit of inventory and pricing. Products carry min_price, max_price,
-- and total_stock as denormalized caches for search queries; update them in the
-- same transaction as any variant write.
--
-- stock_reservations
-- ------------------
-- A time-limited inventory hold created at checkout initiation to prevent
-- overselling. Distinct from a persistent cart (add cart_items if needed).
--
-- Deletion policy
-- ---------------
-- Financial records (orders, order_items, payment_transactions) use RESTRICT
-- on their user/vendor FKs. Archive or anonymize those entities; do not hard-
-- delete them while financial history exists.
--
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- USERS & AUTH
-- =============================================================================

CREATE TABLE users (
  id                BINARY(16)   NOT NULL,
  full_name         VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(20)  NOT NULL,
  password          VARCHAR(255) NOT NULL,
  role              ENUM('CUSTOMER', 'VENDOR', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  avatar            VARCHAR(255) NULL,
  disabled          BOOLEAN      NOT NULL DEFAULT false,
  email_verified_at TIMESTAMP    NULL,
  password_set_at   TIMESTAMP    NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email         (email),
  UNIQUE KEY uq_phone         (phone),
  INDEX      idx_role_disabled (role, disabled),
  INDEX      idx_created_at    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE email_verifications (
  id          BINARY(16) NOT NULL,
  user_id     BINARY(16) NOT NULL,
  token_hash  CHAR(64)   NOT NULL,
  expires_at  TIMESTAMP  NOT NULL,
  verified_at TIMESTAMP  NULL,
  created_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash),
  FOREIGN KEY fk_ev_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE refresh_tokens (
  id         BINARY(16)   NOT NULL,
  user_id    BINARY(16)   NOT NULL,
  token_hash CHAR(64)     NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(45)  NULL,
  expires_at TIMESTAMP    NOT NULL,
  revoked_at TIMESTAMP    NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash),
  FOREIGN KEY fk_rt_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id    (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE password_reset_tokens (
  id         BINARY(16)   NOT NULL,
  user_id    BINARY(16)   NOT NULL,
  token      VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  used       BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_token (token),
  FOREIGN KEY fk_prt_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id    (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Prevents duplicate processing of retried requests on mutating endpoints.
-- Flow: check key_hash → if completed return cached response → else lock and process.
CREATE TABLE idempotency_keys (
  id            BINARY(16)   NOT NULL,
  key_hash      CHAR(64)     NOT NULL,   -- SHA-256(user_id + client key)
  user_id       BINARY(16)   NOT NULL,
  endpoint      VARCHAR(255) NOT NULL,   -- e.g. POST /payments/orders/initialize
  request_hash  CHAR(64)     NOT NULL,   -- SHA-256(request body) — reject if mismatched
  response_code SMALLINT     NULL,
  response_body JSON         NULL,
  locked_at     TIMESTAMP    NULL,       -- set when processing begins
  completed_at  TIMESTAMP    NULL,       -- set when response is stored
  expires_at    TIMESTAMP    NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_key_hash (key_hash),
  FOREIGN KEY fk_ik_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_endpoint (user_id, endpoint),
  INDEX idx_expires_at    (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ADDRESSES
-- =============================================================================

CREATE TABLE addresses (
  id         BINARY(16)   NOT NULL,
  user_id    BINARY(16)   NOT NULL,
  label      VARCHAR(100) NOT NULL,
  street     VARCHAR(255) NOT NULL,
  city       VARCHAR(100) NOT NULL,
  state      VARCHAR(100) NOT NULL,
  country    VARCHAR(100) NOT NULL,
  zip_code   VARCHAR(20)  NOT NULL,
  is_default BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_addr_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id      (user_id),
  INDEX idx_user_default (user_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- CATEGORIES
-- =============================================================================

-- Self-referential tree. A product references a leaf category; its parent is
-- the top-level category. Replaces products.category and products.subcategory.
CREATE TABLE categories (
  id         BINARY(16)   NOT NULL,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL,
  parent_id  BINARY(16)   NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  active     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_name        (name),
  UNIQUE KEY uq_slug        (slug),
  FOREIGN KEY fk_cat_parent (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_parent_id   (parent_id),
  INDEX idx_parent_sort (parent_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- VENDORS
-- =============================================================================

CREATE TABLE vendors (
  id              BINARY(16)    NOT NULL,
  user_id         BINARY(16)    NOT NULL,
  store_name      VARCHAR(255)  NOT NULL,
  slug            VARCHAR(255)  NOT NULL,
  description     TEXT          NULL,
  logo            VARCHAR(255)  NOT NULL,
  banner          VARCHAR(255)  NULL,
  contact_phone   VARCHAR(20)   NOT NULL,
  business_email  VARCHAR(255)  NOT NULL,
  country         VARCHAR(100)  NOT NULL,
  city            VARCHAR(100)  NOT NULL,
  social_links    JSON          NULL,
  commission_rate DECIMAL(5,2)  NOT NULL DEFAULT 10.00,
  rating          DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  verified        BOOLEAN       NOT NULL DEFAULT false,
  suspended       BOOLEAN       NOT NULL DEFAULT false,
  is_featured     BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_user_id (user_id),
  UNIQUE KEY uq_slug    (slug),
  FOREIGN KEY fk_vendor_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_suspended_featured (suspended, is_featured),
  INDEX idx_verified_suspended (verified, suspended),
  INDEX idx_rating             (rating DESC),
  INDEX idx_created_at         (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE vendor_categories (
  vendor_id   BINARY(16) NOT NULL,
  category_id BINARY(16) NOT NULL,

  PRIMARY KEY (vendor_id, category_id),
  FOREIGN KEY fk_vc_vendor   (vendor_id)   REFERENCES vendors(id)    ON DELETE CASCADE,
  FOREIGN KEY fk_vc_category (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- categories is a JSON snapshot of the applicant's selected categories at
-- submission time. It is a record, not a live relation.
CREATE TABLE vendor_applications (
  id                   BINARY(16)   NOT NULL,
  user_id              BINARY(16)   NULL,
  applicant_name       VARCHAR(255) NOT NULL DEFAULT '',
  store_name           VARCHAR(255) NOT NULL,
  business_description TEXT         NOT NULL,
  logo                 VARCHAR(255) NOT NULL,
  business_certificate VARCHAR(512) NOT NULL DEFAULT '',
  vendor_photo         VARCHAR(255) NOT NULL DEFAULT '',
  business_photo       VARCHAR(255) NOT NULL DEFAULT '',
  business_email       VARCHAR(255) NOT NULL,
  contact_phone        VARCHAR(20)  NOT NULL,
  country              VARCHAR(100) NOT NULL,
  city                 VARCHAR(100) NOT NULL,
  registration_number  VARCHAR(100) NOT NULL,
  categories           JSON         NOT NULL,
  risk_status          ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'low',
  status               ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  review_note          TEXT         NULL,
  reviewed_by          BINARY(16)   NULL,
  submitted_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at          TIMESTAMP    NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_va_reviewer (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id      (user_id),
  INDEX idx_status       (status),
  INDEX idx_submitted_at (submitted_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE vendor_payout_methods (
  id           BINARY(16)   NOT NULL,
  vendor_id    BINARY(16)   NOT NULL,
  type         ENUM('mpesa', 'bank_transfer') NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_ref  VARCHAR(255) NOT NULL,   -- encrypt at app layer before storing
  bank_name    VARCHAR(100) NULL,
  is_default   BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_vpm_vendor (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  INDEX idx_vendor_id      (vendor_id),
  INDEX idx_vendor_default (vendor_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- PRODUCTS
-- =============================================================================

-- price, discount, and effective_price live on product_variants.
-- min_price, max_price, total_stock are denormalized caches updated in the
-- same transaction as any variant write — they power search indexes.
CREATE TABLE products (
  id           BINARY(16)    NOT NULL,
  vendor_id    BINARY(16)    NOT NULL,
  category_id  BINARY(16)    NOT NULL,
  name         VARCHAR(255)  NOT NULL,
  description  TEXT          NOT NULL,
  brand        VARCHAR(100)  NOT NULL,
  gender       ENUM('men', 'women', 'kids', 'unisex') NOT NULL,
  sku          VARCHAR(100)  NOT NULL,
  -- Cached from variants; updated on any variant price/stock change.
  min_price    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_price    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_stock  INT           NOT NULL DEFAULT 0,
  rating       DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  review_count INT           NOT NULL DEFAULT 0,
  status       ENUM('active', 'pending', 'hidden', 'archived') NOT NULL DEFAULT 'pending',
  bestseller   BOOLEAN       NOT NULL DEFAULT false,
  new_arrival  BOOLEAN       NOT NULL DEFAULT false,
  featured     BOOLEAN       NOT NULL DEFAULT false,
  trending     BOOLEAN       NOT NULL DEFAULT false,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_sku (sku),
  FOREIGN KEY fk_prod_vendor   (vendor_id)   REFERENCES vendors(id)    ON DELETE RESTRICT,
  FOREIGN KEY fk_prod_category (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  -- Use MATCH() AGAINST() in queries; LIKE '%q%' cannot use this index.
  FULLTEXT INDEX ft_search (name, description, brand),
  -- Lead composite indexes with status — nearly every product query filters it.
  INDEX idx_vendor_status         (vendor_id, status),
  INDEX idx_status_stock          (status, total_stock),
  INDEX idx_category_status_stock (category_id, status, total_stock),
  INDEX idx_status_min_price      (status, min_price),
  INDEX idx_status_max_price      (status, max_price),
  INDEX idx_status_rating         (status, rating DESC),
  INDEX idx_status_created        (status, created_at DESC),
  INDEX idx_status_featured       (status, featured),
  INDEX idx_status_trending       (status, trending),
  INDEX idx_status_bestseller     (status, bestseller)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Atomic stock guard pattern:
--   UPDATE product_variants SET stock = stock - ?
--   WHERE id = ? AND stock >= ?
-- price and discount here are the source of truth.
-- After any price/stock change, update products.min_price, max_price, total_stock
-- in the same transaction.
CREATE TABLE product_variants (
  id              BINARY(16)    NOT NULL,
  product_id      BINARY(16)    NOT NULL,
  size            VARCHAR(50)   NOT NULL,
  color           VARCHAR(100)  NOT NULL,
  color_hex       CHAR(7)       NULL,        -- #RRGGBB for UI colour swatches
  price           DECIMAL(10,2) NOT NULL,
  discount        DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  effective_price DECIMAL(10,2) GENERATED ALWAYS AS (
                    ROUND(price * (1 - discount / 100), 2)
                  ) STORED,
  stock           INT           NOT NULL DEFAULT 0,
  sku             VARCHAR(100)  NULL,        -- variant-level SKU, optional
  deleted_at      TIMESTAMP     NULL,        -- soft delete; NULL = active
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_pv_discount CHECK (discount BETWEEN 0 AND 100),
  CONSTRAINT chk_pv_stock    CHECK (stock >= 0),

  PRIMARY KEY (id),
  UNIQUE KEY uq_variant_sku        (sku),
  UNIQUE KEY uq_product_size_color (product_id, size, color),
  FOREIGN KEY fk_pv_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_effective_price (product_id, effective_price),
  INDEX idx_product_stock           (product_id, stock),
  -- Filters active variants: WHERE product_id = ? AND deleted_at IS NULL
  INDEX idx_product_deleted         (product_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE product_images (
  id         BINARY(16)   NOT NULL,
  product_id BINARY(16)   NOT NULL,
  url        VARCHAR(255) NOT NULL,
  alt        VARCHAR(255) NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_primary BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_pi_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_primary (product_id, is_primary),
  INDEX idx_product_sort    (product_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE product_tags (
  product_id BINARY(16)  NOT NULL,
  tag        VARCHAR(50) NOT NULL,

  PRIMARY KEY (product_id, tag),
  FOREIGN KEY fk_pt_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE product_price_history (
  id         BINARY(16)    NOT NULL,
  product_id BINARY(16)    NOT NULL,
  variant_id BINARY(16)    NOT NULL,
  old_price  DECIMAL(10,2) NOT NULL,
  new_price  DECIMAL(10,2) NOT NULL,
  changed_by BINARY(16)    NOT NULL,
  changed_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_pph_product (product_id) REFERENCES products(id)         ON DELETE CASCADE,
  FOREIGN KEY fk_pph_variant (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  FOREIGN KEY fk_pph_user    (changed_by) REFERENCES users(id)            ON DELETE RESTRICT,
  INDEX idx_product_changed (product_id, changed_at DESC),
  INDEX idx_variant_changed (variant_id, changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- WISHLISTS
-- =============================================================================

-- A wishlist row is owned by either a logged-in user (user_id) or a guest (session_key).
CREATE TABLE wishlists (
  id          BINARY(16)  NOT NULL,
  user_id     BINARY(16)  NULL,
  session_key VARCHAR(64) NULL,
  product_id  BINARY(16) NOT NULL,
  expires_at  TIMESTAMP   NULL,
  created_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_wishlist_owner CHECK (
    (user_id IS NOT NULL AND session_key IS NULL) OR
    (user_id IS NULL     AND session_key IS NOT NULL)
  ),

  PRIMARY KEY (id),
  UNIQUE KEY uq_wl_user_product (user_id, product_id),
  UNIQUE KEY uq_wl_session_product (session_key, product_id),
  FOREIGN KEY fk_wl_user    (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY fk_wl_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- CART
-- =============================================================================

-- A cart is owned by either a logged-in user (user_id) or a guest (session_key).
-- Exactly one must be set — enforced by the CHECK constraint.
-- Guest-to-user merge flow: on login, find guest cart by session_key, update
-- user_id = :logged_in_user, session_key = NULL, expires_at = NULL.
-- If the user already has a cart, reconcile items first then delete the guest cart.
CREATE TABLE carts (
  id          BINARY(16)  NOT NULL,
  user_id     BINARY(16)  NULL,         -- NULL for guest carts
  session_key VARCHAR(64) NULL,         -- NULL for authenticated carts; hash of frontend token
  expires_at  TIMESTAMP   NULL,         -- set for guest carts; NULL = never expires
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_cart_owner CHECK (
    (user_id IS NOT NULL AND session_key IS NULL) OR
    (user_id IS NULL     AND session_key IS NOT NULL)
  ),

  PRIMARY KEY (id),
  UNIQUE KEY uq_user_id     (user_id),
  UNIQUE KEY uq_session_key (session_key),
  FOREIGN KEY fk_cart_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- Cron cleanup: DELETE FROM carts WHERE expires_at < NOW()
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE cart_items (
  id         BINARY(16) NOT NULL,
  cart_id    BINARY(16) NOT NULL,
  variant_id BINARY(16) NOT NULL,
  quantity   INT        NOT NULL DEFAULT 1,
  added_at   TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Prevents duplicate rows for the same variant; use ON DUPLICATE KEY UPDATE
  -- quantity = quantity + ? when adding an item that already exists.
  CONSTRAINT chk_ci_quantity CHECK (quantity > 0),

  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_variant (cart_id, variant_id),
  FOREIGN KEY fk_ci_cart    (cart_id)    REFERENCES carts(id)             ON DELETE CASCADE,
  FOREIGN KEY fk_ci_variant (variant_id) REFERENCES product_variants(id)  ON DELETE CASCADE,
  INDEX idx_cart_id (cart_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- DELIVERY
-- =============================================================================

CREATE TABLE delivery_zones (
  id             BINARY(16)    NOT NULL,
  name           VARCHAR(100)  NOT NULL,
  base_cost      DECIMAL(10,2) NOT NULL,
  estimated_days VARCHAR(50)   NOT NULL,
  active         BOOLEAN       NOT NULL DEFAULT true,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_name (name),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE delivery_zone_areas (
  id        BINARY(16)   NOT NULL,
  zone_id   BINARY(16)   NOT NULL,
  area_type ENUM('city', 'county', 'country') NOT NULL,
  area_name VARCHAR(100) NOT NULL,

  PRIMARY KEY (id),
  FOREIGN KEY fk_dza_zone (zone_id) REFERENCES delivery_zones(id) ON DELETE CASCADE,
  INDEX idx_zone_id     (zone_id),
  INDEX idx_area_lookup (area_type, area_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- COUPONS
-- =============================================================================

CREATE TABLE coupons (
  id               BINARY(16)    NOT NULL,
  code             VARCHAR(50)   NOT NULL,
  type             ENUM('percentage', 'fixed') NOT NULL,
  value            DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  max_discount     DECIMAL(10,2) NULL,
  max_uses         INT           NULL,
  uses_count       INT           NOT NULL DEFAULT 0,
  per_user_limit   INT           NOT NULL DEFAULT 1,
  vendor_id        BINARY(16)    NULL,
  active           BOOLEAN       NOT NULL DEFAULT true,
  starts_at        TIMESTAMP     NULL,
  expires_at       TIMESTAMP     NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_code (code),
  FOREIGN KEY fk_coupon_vendor (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  INDEX idx_active_expires (active, expires_at),
  INDEX idx_vendor_id      (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- ORDERS
-- =============================================================================

-- delivery_address is a structured JSON snapshot of the address at checkout:
-- {"label":"...","street":"...","city":"...","state":"...","country":"...","zip_code":"..."}
CREATE TABLE orders (
  id               BINARY(16)    NOT NULL,
  user_id          BINARY(16)    NOT NULL,
  delivery_zone_id BINARY(16)    NULL,
  coupon_id        BINARY(16)    NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  discount_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_cost    DECIMAL(10,2) NOT NULL,
  tax_amount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total            DECIMAL(10,2) NOT NULL,
  currency         VARCHAR(3)    NOT NULL DEFAULT 'KES',
  payment_method   VARCHAR(50)   NOT NULL,
  status           ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  delivery_address JSON          NOT NULL,
  notes            TEXT          NULL,
  delivered_at     TIMESTAMP     NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_order_user          (user_id)          REFERENCES users(id)          ON DELETE RESTRICT,
  FOREIGN KEY fk_order_delivery_zone (delivery_zone_id) REFERENCES delivery_zones(id) ON DELETE SET NULL,
  FOREIGN KEY fk_order_coupon        (coupon_id)        REFERENCES coupons(id)        ON DELETE SET NULL,
  INDEX idx_user_status  (user_id, status),
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_status       (status),
  INDEX idx_created_at   (created_at DESC),
  INDEX idx_zone_id      (delivery_zone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Snapshot columns (product_name, sku, unit_price, image_url) are frozen at
-- purchase time — product data changes, order history must not.
-- vendor_earnings and platform_fee are computed from vendor.commission_rate
-- at creation and never re-derived, so payout totals are always stable.
-- variant_id is NOT NULL: price and stock live on variants, so every item
-- must reference one.
CREATE TABLE order_items (
  id              BINARY(16)    NOT NULL,
  order_id        BINARY(16)    NOT NULL,
  product_id      BINARY(16)    NOT NULL,
  variant_id      BINARY(16)    NOT NULL,
  vendor_id       BINARY(16)    NOT NULL,
  product_name    VARCHAR(255)  NOT NULL,
  sku             VARCHAR(100)  NOT NULL,
  size            VARCHAR(50)   NOT NULL,
  color           VARCHAR(100)  NOT NULL,
  image_url       VARCHAR(255)  NULL,
  unit_price      DECIMAL(10,2) NOT NULL,
  discount        DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  quantity        INT           NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  vendor_earnings DECIMAL(10,2) NOT NULL,
  platform_fee    DECIMAL(10,2) NOT NULL,

  CONSTRAINT chk_oi_quantity CHECK (quantity > 0),

  PRIMARY KEY (id),
  FOREIGN KEY fk_oi_order   (order_id)   REFERENCES orders(id)           ON DELETE CASCADE,
  FOREIGN KEY fk_oi_product (product_id) REFERENCES products(id)         ON DELETE RESTRICT,
  FOREIGN KEY fk_oi_variant (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
  FOREIGN KEY fk_oi_vendor  (vendor_id)  REFERENCES vendors(id)          ON DELETE RESTRICT,
  INDEX idx_order_id       (order_id),
  INDEX idx_vendor_id      (vendor_id),
  INDEX idx_product_id     (product_id),
  INDEX idx_variant_id     (variant_id),
  INDEX idx_vendor_product (vendor_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE order_status_history (
  id          BINARY(16)   NOT NULL,
  order_id    BINARY(16)   NOT NULL,
  from_status VARCHAR(50)  NULL,
  to_status   VARCHAR(50)  NOT NULL,
  changed_by  BINARY(16)   NULL,
  note        TEXT         NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_osh_order (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY fk_osh_user  (changed_by) REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_order_id   (order_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- One shipment per order (UNIQUE on order_id). Remove UNIQUE later if
-- partial fulfillment across multiple shipments is needed.
CREATE TABLE shipments (
  id                 BINARY(16)   NOT NULL,
  order_id           BINARY(16)   NOT NULL,
  carrier            VARCHAR(100) NOT NULL,
  tracking_number    VARCHAR(100) NOT NULL,
  tracking_url       VARCHAR(255) NULL,
  status             ENUM('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed')
                     NOT NULL DEFAULT 'pending',
  shipped_at         TIMESTAMP    NULL,
  estimated_delivery DATE         NULL,
  delivered_at       TIMESTAMP    NULL,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_order_id (order_id),
  FOREIGN KEY fk_ship_order (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_status   (status),
  INDEX idx_tracking (carrier, tracking_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- items JSON records which order_items the customer is returning (partial return
-- support). Add order_return_items table when the workflow is built out fully.
CREATE TABLE order_returns (
  id            BINARY(16)    NOT NULL,
  order_id      BINARY(16)    NOT NULL,
  user_id       BINARY(16)    NOT NULL,
  reason        TEXT          NOT NULL,
  items         JSON          NULL,
  status        ENUM('requested', 'approved', 'rejected', 'refunded') NOT NULL DEFAULT 'requested',
  refund_amount DECIMAL(10,2) NULL,
  refund_status ENUM('pending', 'processing', 'completed', 'failed') NULL,
  admin_note    TEXT          NULL,
  resolved_at   TIMESTAMP     NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_ret_order (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  FOREIGN KEY fk_ret_user  (user_id)  REFERENCES users(id)  ON DELETE RESTRICT,
  INDEX idx_order_id (order_id),
  INDEX idx_user_id  (user_id),
  INDEX idx_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE coupon_uses (
  id              BINARY(16)    NOT NULL,
  coupon_id       BINARY(16)    NOT NULL,
  user_id         BINARY(16)    NOT NULL,
  order_id        BINARY(16)    NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_coupon_order (coupon_id, order_id),
  FOREIGN KEY fk_cu_coupon (coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT,
  FOREIGN KEY fk_cu_user   (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY fk_cu_order  (order_id)  REFERENCES orders(id)  ON DELETE CASCADE,
  INDEX idx_user_coupon (user_id, coupon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- STOCK RESERVATIONS
-- =============================================================================

-- Time-limited inventory hold created when a customer initiates checkout.
-- Prevents overselling while payment is in flight.
-- Distinct from carts (persistent saved items) — see cart_items above.
-- variant_id is NOT NULL: stock lives on variants, so every reservation
-- must target a specific one.
CREATE TABLE stock_reservations (
  id             BINARY(16)  NOT NULL,
  user_id        BINARY(16)  NOT NULL,
  variant_id     BINARY(16)  NOT NULL,
  quantity       INT         NOT NULL,
  reserved_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reserved_until TIMESTAMP   NOT NULL,
  status         ENUM('reserved', 'completed', 'abandoned') NOT NULL DEFAULT 'reserved',
  order_id       BINARY(16)  NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_sr_quantity CHECK (quantity > 0),

  PRIMARY KEY (id),
  FOREIGN KEY fk_sr_user    (user_id)    REFERENCES users(id)            ON DELETE CASCADE,
  FOREIGN KEY fk_sr_variant (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  FOREIGN KEY fk_sr_order   (order_id)   REFERENCES orders(id)           ON DELETE SET NULL,
  INDEX idx_user_status    (user_id, status),
  INDEX idx_variant_id     (variant_id),
  INDEX idx_reserved_until (reserved_until),
  INDEX idx_status         (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- REVIEWS
-- =============================================================================

CREATE TABLE reviews (
  id              BINARY(16)  NOT NULL,
  product_id      BINARY(16)  NOT NULL,
  vendor_id       BINARY(16)  NOT NULL,
  user_id         BINARY(16)  NOT NULL,
  order_id        BINARY(16)  NULL,
  rating          TINYINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT        NOT NULL,
  vendor_reply    TEXT        NULL,
  vendor_reply_at TIMESTAMP   NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_product_user (product_id, user_id),
  FOREIGN KEY fk_rev_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY fk_rev_vendor  (vendor_id)  REFERENCES vendors(id)  ON DELETE CASCADE,
  FOREIGN KEY fk_rev_user    (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY fk_rev_order   (order_id)   REFERENCES orders(id)   ON DELETE SET NULL,
  INDEX idx_product_rating  (product_id, rating),
  INDEX idx_product_created (product_id, created_at DESC),
  INDEX idx_vendor_id       (vendor_id),
  INDEX idx_user_id         (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- SUBSCRIPTIONS & PAYOUTS
-- =============================================================================

-- active is a cached boolean maintained by the subscription expiry cron.
-- Queries requiring guaranteed freshness should also check expires_at > NOW().
CREATE TABLE vendor_subscriptions (
  id             BINARY(16)    NOT NULL,
  vendor_id      BINARY(16)    NOT NULL,
  plan           ENUM('monthly', 'quarterly', 'biannual', 'yearly') NOT NULL,
  amount_paid    DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50)   NOT NULL,
  started_at     TIMESTAMP     NOT NULL,
  expires_at     TIMESTAMP     NOT NULL,
  active         BOOLEAN       NOT NULL DEFAULT true,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_vs_vendor (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  INDEX idx_vendor_active  (vendor_id, active),
  INDEX idx_active_expires (active, expires_at),
  INDEX idx_expires_at     (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE vendor_payouts (
  id               BINARY(16)    NOT NULL,
  vendor_id        BINARY(16)    NOT NULL,
  payout_method_id BINARY(16)    NOT NULL,
  amount           DECIMAL(10,2) NOT NULL,
  currency         VARCHAR(3)    NOT NULL DEFAULT 'KES',
  status           ENUM('pending', 'processing', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  period_start     DATE          NOT NULL,
  period_end       DATE          NOT NULL,
  reference        VARCHAR(100)  NULL,
  admin_note       TEXT          NULL,
  initiated_at     TIMESTAMP     NULL,
  completed_at     TIMESTAMP     NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_vp_vendor (vendor_id)        REFERENCES vendors(id)              ON DELETE RESTRICT,
  FOREIGN KEY fk_vp_method (payout_method_id) REFERENCES vendor_payout_methods(id) ON DELETE RESTRICT,
  INDEX idx_vendor_status (vendor_id, status),
  INDEX idx_status        (status),
  INDEX idx_period        (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE vendor_payout_items (
  payout_id     BINARY(16)    NOT NULL,
  order_item_id BINARY(16)    NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,

  PRIMARY KEY (payout_id, order_item_id),
  FOREIGN KEY fk_vpi_payout     (payout_id)     REFERENCES vendor_payouts(id) ON DELETE CASCADE,
  FOREIGN KEY fk_vpi_order_item (order_item_id) REFERENCES order_items(id)    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Populated nightly from order_items (delivered orders only).
-- Analytics reads this summary table instead of scanning orders + variants.
CREATE TABLE vendor_analytics_daily (
  vendor_id   BINARY(16)    NOT NULL,
  period_date DATE          NOT NULL,
  orders      INT           NOT NULL DEFAULT 0,
  units_sold  INT           NOT NULL DEFAULT 0,
  revenue     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  earnings    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  refunds     DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  PRIMARY KEY (vendor_id, period_date),
  FOREIGN KEY fk_vad_vendor (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  INDEX idx_period_date (period_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- PAYMENTS
-- =============================================================================

CREATE TABLE payment_transactions (
  id                   BINARY(16)    NOT NULL,
  reference            VARCHAR(100)  NOT NULL,
  type                 ENUM('order', 'subscription') NOT NULL,
  user_id              BINARY(16)    NOT NULL,
  vendor_id            BINARY(16)    NULL,
  amount               DECIMAL(10,2) NOT NULL,
  currency             VARCHAR(3)    NOT NULL DEFAULT 'KES',
  status               ENUM('pending', 'success', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  paystack_access_code VARCHAR(100)  NULL,
  metadata             JSON          NOT NULL,
  order_id             BINARY(16)    NULL,
  subscription_id      BINARY(16)    NULL,
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_reference (reference),
  FOREIGN KEY fk_pt_user         (user_id)         REFERENCES users(id)                ON DELETE RESTRICT,
  FOREIGN KEY fk_pt_vendor       (vendor_id)       REFERENCES vendors(id)              ON DELETE SET NULL,
  FOREIGN KEY fk_pt_order        (order_id)        REFERENCES orders(id)               ON DELETE SET NULL,
  FOREIGN KEY fk_pt_subscription (subscription_id) REFERENCES vendor_subscriptions(id) ON DELETE SET NULL,
  INDEX idx_user_id     (user_id),
  INDEX idx_type_status (type, status),
  INDEX idx_status      (status),
  INDEX idx_created_at  (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- INVENTORY AUDIT
-- =============================================================================

-- Append-only. quantity_delta is signed: negative = decrement, positive = restock.
-- variant_id is NOT NULL: stock lives on variants, so every movement targets one.
CREATE TABLE stock_movements (
  id             BINARY(16)  NOT NULL,
  product_id     BINARY(16)  NOT NULL,
  variant_id     BINARY(16)  NOT NULL,
  quantity_delta INT         NOT NULL,
  reason         ENUM('order', 'return', 'restock', 'adjustment', 'correction') NOT NULL,
  reference_type VARCHAR(50) NULL,
  reference_id   BINARY(16)  NULL,
  note           TEXT        NULL,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_sm_product (product_id) REFERENCES products(id)         ON DELETE CASCADE,
  FOREIGN KEY fk_sm_variant (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  INDEX idx_product_id     (product_id),
  INDEX idx_variant_id     (variant_id),
  INDEX idx_product_reason (product_id, reason),
  INDEX idx_reference      (reference_type, reference_id),
  INDEX idx_created_at     (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE notifications (
  id         BINARY(16)   NOT NULL,
  user_id    BINARY(16)   NOT NULL,
  type       VARCHAR(50)  NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       TEXT         NOT NULL,
  data       JSON         NULL,
  read_at    TIMESTAMP    NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_notif_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- Covering index: unread count / unread list without a table lookup.
  INDEX idx_user_read  (user_id, read_at),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- AUDIT LOG
-- =============================================================================

-- actor_name and actor_role are snapshots of the user at the time of the action.
-- If the user is later renamed, deleted, or changes role, the audit record
-- still accurately reflects who did what and in what capacity.
CREATE TABLE audit_logs (
  id            BINARY(16)   NOT NULL,
  user_id       BINARY(16)   NOT NULL,
  actor_name    VARCHAR(255) NOT NULL,
  actor_role    VARCHAR(20)  NOT NULL,
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50)  NOT NULL,
  resource_id   BINARY(16)   NOT NULL,
  before_state  JSON         NULL,
  after_state   JSON         NULL,
  ip_address    VARCHAR(45)  NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_al_user (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_user_id    (user_id),
  INDEX idx_resource   (resource_type, resource_id),
  INDEX idx_action     (action, created_at DESC),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- COLLECTIONS & PROMOTIONS
-- =============================================================================

CREATE TABLE collections (
  id          BINARY(16)   NOT NULL,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  image       VARCHAR(255) NULL,
  active      BOOLEAN      NOT NULL DEFAULT true,
  sort_order  INT          NOT NULL DEFAULT 0,
  starts_at   TIMESTAMP    NULL,
  ends_at     TIMESTAMP    NULL,
  created_by  BINARY(16)   NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_slug (slug),
  FOREIGN KEY fk_coll_creator (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_active_sort (active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE collection_products (
  collection_id BINARY(16) NOT NULL,
  product_id    BINARY(16) NOT NULL,
  sort_order    INT        NOT NULL DEFAULT 0,

  PRIMARY KEY (collection_id, product_id),
  FOREIGN KEY fk_cp_collection (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY fk_cp_product    (product_id)    REFERENCES products(id)    ON DELETE CASCADE,
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE promotions (
  id             BINARY(16)    NOT NULL,
  name           VARCHAR(255)  NOT NULL,
  type           ENUM('flash_sale', 'seasonal', 'clearance') NOT NULL,
  discount_type  ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  starts_at      TIMESTAMP     NOT NULL,
  ends_at        TIMESTAMP     NOT NULL,
  active         BOOLEAN       NOT NULL DEFAULT true,
  created_by     BINARY(16)    NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY fk_promo_creator (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_active_window (active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE promotion_products (
  promotion_id BINARY(16) NOT NULL,
  product_id   BINARY(16) NOT NULL,

  PRIMARY KEY (promotion_id, product_id),
  FOREIGN KEY fk_pp_promotion (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
  FOREIGN KEY fk_pp_product   (product_id)   REFERENCES products(id)   ON DELETE CASCADE,
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- SEARCH
-- =============================================================================

-- Written on every search (INSERT ... ON DUPLICATE KEY UPDATE count = count + 1).
-- Read for autocomplete (FULLTEXT) and trending terms (ORDER BY count DESC).
CREATE TABLE search_terms (
  term       VARCHAR(255) NOT NULL,
  count      INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (term),
  INDEX       idx_count (count DESC),
  FULLTEXT INDEX ft_term (term)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;
