-- Seed RBAC roles and permissions
-- Adds a platform_admin role, a set of default admin permissions,
-- and assigns the role to existing users with users.role = 'ADMIN'.

SET @role_id = (SELECT id FROM rbac_roles WHERE name = 'platform_admin' LIMIT 1);
INSERT IGNORE INTO rbac_roles (id, name, display_name, created_at)
VALUES (COALESCE(@role_id, UUID_TO_BIN(UUID(),1)), 'platform_admin', 'Platform Admin', NOW());
SET @role_id = (SELECT id FROM rbac_roles WHERE name = 'platform_admin' LIMIT 1);

-- Insert default CRUD permissions (id generated for each)
INSERT IGNORE INTO rbac_permissions (id, name, description) VALUES
  (UUID_TO_BIN(UUID(),1), 'admin.dashboard.read', 'View the admin dashboard'),
  (UUID_TO_BIN(UUID(),1), 'admin.users.create', 'Create users'),
  (UUID_TO_BIN(UUID(),1), 'admin.users.read', 'View users'),
  (UUID_TO_BIN(UUID(),1), 'admin.users.update', 'Update users'),
  (UUID_TO_BIN(UUID(),1), 'admin.users.delete', 'Delete users'),
  (UUID_TO_BIN(UUID(),1), 'admin.roles.create', 'Create roles'),
  (UUID_TO_BIN(UUID(),1), 'admin.roles.read', 'View roles'),
  (UUID_TO_BIN(UUID(),1), 'admin.roles.update', 'Update roles'),
  (UUID_TO_BIN(UUID(),1), 'admin.roles.delete', 'Delete roles'),
  (UUID_TO_BIN(UUID(),1), 'admin.permissions.create', 'Create permissions'),
  (UUID_TO_BIN(UUID(),1), 'admin.permissions.read', 'View permissions'),
  (UUID_TO_BIN(UUID(),1), 'admin.permissions.update', 'Update permissions'),
  (UUID_TO_BIN(UUID(),1), 'admin.permissions.delete', 'Delete permissions'),
  (UUID_TO_BIN(UUID(),1), 'admin.vendors.create', 'Create vendors'),
  (UUID_TO_BIN(UUID(),1), 'admin.vendors.read', 'View vendors'),
  (UUID_TO_BIN(UUID(),1), 'admin.vendors.update', 'Update vendors'),
  (UUID_TO_BIN(UUID(),1), 'admin.vendors.delete', 'Delete vendors'),
  (UUID_TO_BIN(UUID(),1), 'admin.subscriptions.create', 'Create subscriptions'),
  (UUID_TO_BIN(UUID(),1), 'admin.subscriptions.read', 'View subscriptions'),
  (UUID_TO_BIN(UUID(),1), 'admin.subscriptions.update', 'Update subscriptions'),
  (UUID_TO_BIN(UUID(),1), 'admin.subscriptions.delete', 'Delete subscriptions'),
  (UUID_TO_BIN(UUID(),1), 'admin.products.create', 'Create products'),
  (UUID_TO_BIN(UUID(),1), 'admin.products.read', 'View products'),
  (UUID_TO_BIN(UUID(),1), 'admin.products.update', 'Update products'),
  (UUID_TO_BIN(UUID(),1), 'admin.products.delete', 'Delete products'),
  (UUID_TO_BIN(UUID(),1), 'admin.orders.create', 'Create orders'),
  (UUID_TO_BIN(UUID(),1), 'admin.orders.read', 'View orders'),
  (UUID_TO_BIN(UUID(),1), 'admin.orders.update', 'Update orders'),
  (UUID_TO_BIN(UUID(),1), 'admin.orders.delete', 'Delete orders'),
  (UUID_TO_BIN(UUID(),1), 'admin.shipping.create', 'Create shipping lanes'),
  (UUID_TO_BIN(UUID(),1), 'admin.shipping.read', 'View shipping lanes'),
  (UUID_TO_BIN(UUID(),1), 'admin.shipping.update', 'Update shipping lanes'),
  (UUID_TO_BIN(UUID(),1), 'admin.shipping.delete', 'Delete shipping lanes'),
  (UUID_TO_BIN(UUID(),1), 'admin.commerce.create', 'Create commerce features'),
  (UUID_TO_BIN(UUID(),1), 'admin.commerce.read', 'View commerce features'),
  (UUID_TO_BIN(UUID(),1), 'admin.commerce.update', 'Update commerce features'),
  (UUID_TO_BIN(UUID(),1), 'admin.commerce.delete', 'Delete commerce features'),
  (UUID_TO_BIN(UUID(),1), 'admin.homepage.create', 'Create homepage content'),
  (UUID_TO_BIN(UUID(),1), 'admin.homepage.read', 'View homepage content'),
  (UUID_TO_BIN(UUID(),1), 'admin.homepage.update', 'Update homepage content'),
  (UUID_TO_BIN(UUID(),1), 'admin.homepage.delete', 'Delete homepage content'),
  (UUID_TO_BIN(UUID(),1), 'admin.settings.create', 'Create platform settings'),
  (UUID_TO_BIN(UUID(),1), 'admin.settings.read', 'View platform settings'),
  (UUID_TO_BIN(UUID(),1), 'admin.settings.update', 'Update platform settings'),
  (UUID_TO_BIN(UUID(),1), 'admin.settings.delete', 'Delete platform settings');

-- Map the inserted permissions to the platform_admin role
INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id, created_at)
SELECT @role_id, p.id, NOW()
FROM rbac_permissions p
WHERE p.name IN (
  'admin.dashboard.read',
  'admin.users.create', 'admin.users.read', 'admin.users.update', 'admin.users.delete',
  'admin.roles.create', 'admin.roles.read', 'admin.roles.update', 'admin.roles.delete',
  'admin.permissions.create', 'admin.permissions.read', 'admin.permissions.update', 'admin.permissions.delete',
  'admin.vendors.create', 'admin.vendors.read', 'admin.vendors.update', 'admin.vendors.delete',
  'admin.subscriptions.create', 'admin.subscriptions.read', 'admin.subscriptions.update', 'admin.subscriptions.delete',
  'admin.products.create', 'admin.products.read', 'admin.products.update', 'admin.products.delete',
  'admin.orders.create', 'admin.orders.read', 'admin.orders.update', 'admin.orders.delete',
  'admin.shipping.create', 'admin.shipping.read', 'admin.shipping.update', 'admin.shipping.delete',
  'admin.commerce.create', 'admin.commerce.read', 'admin.commerce.update', 'admin.commerce.delete',
  'admin.homepage.create', 'admin.homepage.read', 'admin.homepage.update', 'admin.homepage.delete',
  'admin.settings.create', 'admin.settings.read', 'admin.settings.update', 'admin.settings.delete'
);

-- Assign the platform_admin role to existing users with users.role = 'ADMIN'
INSERT IGNORE INTO rbac_user_roles (user_id, role_id, assigned_at)
SELECT u.id, @role_id, NOW() FROM users u WHERE u.role = 'ADMIN';

-- Note: Run this migration using your usual migrations tooling (e.g. migrate command).