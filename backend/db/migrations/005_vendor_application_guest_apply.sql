-- Allow vendor applications without a linked customer account.
-- Idempotent: safe to re-run after partial or complete application.

SET @has_fk := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'vendor_applications'
    AND constraint_name = 'fk_va_user'
);
SET @sql_drop_fk := IF(@has_fk > 0, 'ALTER TABLE vendor_applications DROP FOREIGN KEY fk_va_user', 'SELECT 1');
PREPARE stmt FROM @sql_drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @user_id_nullable := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'vendor_applications'
    AND column_name = 'user_id'
    AND is_nullable = 'YES'
);
SET @sql_nullable_user := IF(
  @user_id_nullable = 0,
  'ALTER TABLE vendor_applications MODIFY user_id BINARY(16) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_nullable_user;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_applicant_name := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'vendor_applications'
    AND column_name = 'applicant_name'
);
SET @sql_add_cols := IF(
  @has_applicant_name = 0,
  'ALTER TABLE vendor_applications
     ADD COLUMN applicant_name VARCHAR(255) NOT NULL DEFAULT '''' AFTER user_id,
     ADD COLUMN business_certificate VARCHAR(512) NOT NULL DEFAULT '''' AFTER logo,
     ADD COLUMN vendor_photo VARCHAR(255) NOT NULL DEFAULT '''' AFTER business_certificate,
     ADD COLUMN business_photo VARCHAR(255) NOT NULL DEFAULT '''' AFTER vendor_photo',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add_cols;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
