-- Soft-delete columns for user-facing delete actions.
ALTER TABLE addresses
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER is_default;

CREATE INDEX idx_addresses_user_deleted ON addresses (user_id, deleted_at);

ALTER TABLE coupons
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER active;

CREATE INDEX idx_coupons_deleted_at ON coupons (deleted_at);

ALTER TABLE collections
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER created_by;

CREATE INDEX idx_collections_deleted_at ON collections (deleted_at);

ALTER TABLE vendor_shipping_rates
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER fee;

CREATE INDEX idx_vsr_vendor_deleted ON vendor_shipping_rates (vendor_id, deleted_at);
