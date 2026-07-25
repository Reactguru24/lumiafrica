-- Seed test credentials for local development and QA.
--
-- Admin:    admin@test.local / Admin123!
-- Vendor:   vendor@test.local / Vendor123!
-- Customer: customer@test.local / Customer123!

SET @admin_id = (SELECT id FROM users WHERE email = 'admin@test.local' LIMIT 1);
INSERT IGNORE INTO users (id, full_name, email, phone, password, role, disabled, password_set_at)
VALUES (
  COALESCE(@admin_id, UUID_TO_BIN(UUID(),1)),
  'Admin Test',
  'admin@test.local',
  '+2348000000001',
  '$2a$10$Fw2PVeFv.dnI79Dr1ynJweG4TtONf3jSDUVzZpuYvxe627cfLxcIm',
  'ADMIN',
  false,
  NOW()
);
SET @admin_id = (SELECT id FROM users WHERE email = 'admin@test.local' LIMIT 1);

SET @vendor_user_id = (SELECT id FROM users WHERE email = 'vendor@test.local' LIMIT 1);
INSERT IGNORE INTO users (id, full_name, email, phone, password, role, disabled, password_set_at)
VALUES (
  COALESCE(@vendor_user_id, UUID_TO_BIN(UUID(),1)),
  'Vendor Test',
  'vendor@test.local',
  '+2348000000002',
  '$2a$10$2w9BPkW1rJnpFAUF2dpaIuxCdLbOdaWycCbx8l43d3SOKXICdlLta',
  'VENDOR',
  false,
  NOW()
);
SET @vendor_user_id = (SELECT id FROM users WHERE email = 'vendor@test.local' LIMIT 1);

SET @customer_id = (SELECT id FROM users WHERE email = 'customer@test.local' LIMIT 1);
INSERT IGNORE INTO users (id, full_name, email, phone, password, role, disabled, password_set_at)
VALUES (
  COALESCE(@customer_id, UUID_TO_BIN(UUID(),1)),
  'Customer Test',
  'customer@test.local',
  '+2348000000003',
  '$2a$10$84NWsePx3Vfd9ZpTAafOheSTSPLkVNLgjeHchaBJBkkku4qsNl1my',
  'CUSTOMER',
  false,
  NOW()
);
SET @customer_id = (SELECT id FROM users WHERE email = 'customer@test.local' LIMIT 1);

SET @vendor_id = (SELECT id FROM vendors WHERE business_email = 'vendor@test.local' LIMIT 1);
INSERT IGNORE INTO vendors (
  id, user_id, store_name, slug, description, logo, banner,
  contact_phone, business_email, country, city, social_links
)
VALUES (
  COALESCE(@vendor_id, UUID_TO_BIN(UUID(),1)),
  @vendor_user_id,
  'Vendor Test Store',
  'vendor-test-store',
  'Test vendor store for development',
  'https://example.com/logo.png',
  'https://example.com/banner.png',
  '+2348000000002',
  'vendor@test.local',
  'Nigeria',
  'Lagos',
  JSON_OBJECT()
);
SET @vendor_id = (SELECT id FROM vendors WHERE business_email = 'vendor@test.local' LIMIT 1);

SET @platform_admin_role_id = (SELECT id FROM rbac_roles WHERE name = 'platform_admin' LIMIT 1);
INSERT IGNORE INTO rbac_user_roles (user_id, role_id, assigned_at)
VALUES (@admin_id, @platform_admin_role_id, NOW());

-- Make sure existing admin users are also assigned the platform_admin role.
INSERT IGNORE INTO rbac_user_roles (user_id, role_id, assigned_at)
SELECT u.id, @platform_admin_role_id, NOW()
FROM users u
WHERE u.role = 'ADMIN';
