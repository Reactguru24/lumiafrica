-- Docker MySQL bootstrap (optional).
-- MYSQL_DATABASE creates lumi_marketplace; schema is applied by the Go app on startup.
CREATE DATABASE IF NOT EXISTS lumi_marketplace
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
