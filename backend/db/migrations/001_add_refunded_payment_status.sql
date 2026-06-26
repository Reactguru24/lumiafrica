-- Run once on existing databases:
-- mysql -u ... -p lumi_db < db/migrations/001_add_refunded_payment_status.sql
ALTER TABLE payment_transactions
  MODIFY COLUMN status ENUM('pending', 'success', 'failed', 'refunded') NOT NULL DEFAULT 'pending';
