SET @has_column := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'password_set_at'
);
SET @sql_add := IF(
  @has_column = 0,
  'ALTER TABLE users ADD COLUMN password_set_at TIMESTAMP NULL DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE users SET password_set_at = updated_at WHERE password_set_at IS NULL AND role IN ('CUSTOMER', 'ADMIN');
