-- Soft-delete support for promotions (hide from admin/storefront without losing history).
ALTER TABLE promotions
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER created_by;

CREATE INDEX idx_promotions_deleted_at ON promotions (deleted_at);
