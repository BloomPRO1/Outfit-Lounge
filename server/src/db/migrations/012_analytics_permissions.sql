-- Add analytics module permissions (covers /analytics and /expenses pages)
INSERT INTO role_permissions (role, module, can_read, can_write) VALUES
  ('manager',         'analytics', true,  true),
  ('cashier',         'analytics', false, false),
  ('inventory_staff', 'analytics', false, false)
ON CONFLICT (role, module) DO NOTHING;
