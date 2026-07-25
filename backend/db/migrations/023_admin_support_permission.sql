-- Add support permissions for admin support CRUD access.

SET @role_id = (SELECT id FROM rbac_roles WHERE name = 'platform_admin' LIMIT 1);
INSERT IGNORE INTO rbac_permissions (id, name, description) VALUES
  (UUID_TO_BIN(UUID(),1), 'admin.support.create', 'Create support conversations'),
  (UUID_TO_BIN(UUID(),1), 'admin.support.read', 'View support conversations'),
  (UUID_TO_BIN(UUID(),1), 'admin.support.update', 'Update support conversations'),
  (UUID_TO_BIN(UUID(),1), 'admin.support.delete', 'Delete support conversations');

INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id, created_at)
SELECT @role_id, p.id, NOW()
FROM rbac_permissions p
WHERE p.name IN (
  'admin.support.create',
  'admin.support.read',
  'admin.support.update',
  'admin.support.delete'
);
