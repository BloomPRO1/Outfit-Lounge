-- Cashier should not have access to the dashboard
UPDATE role_permissions SET can_read = false, can_write = false
WHERE role = 'cashier' AND module = 'dashboard';
