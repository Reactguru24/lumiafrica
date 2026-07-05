-- Per-vendor financial split for multi-vendor orders (one customer payment, many vendor settlements).

CREATE TABLE IF NOT EXISTS order_vendor_settlements (
  id               BINARY(16)    NOT NULL,
  order_id         BINARY(16)    NOT NULL,
  vendor_id        BINARY(16)    NOT NULL,
  product_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_fee     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  platform_fee     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  vendor_earnings  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status           ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'processing',
  payout_status    ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_vendor_settlement (order_id, vendor_id),
  INDEX idx_vendor_payout (vendor_id, status, payout_status),
  CONSTRAINT fk_ovs_order  FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ovs_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
