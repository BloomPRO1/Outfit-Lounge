-- Drop the restrictive payment_type CHECK constraint so 'damage_charge' and
-- any future types are accepted. Application code handles type validation.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;

-- Default damage charge settings
INSERT INTO settings (key, value, category, label) VALUES
  ('damage_charge_type',    'none', 'fines', 'Damage Charge Type'),
  ('damage_flat_charge',    '0',    'fines', 'Damage Flat Charge (LKR)'),
  ('damage_charge_percent', '50',   'fines', 'Damage Charge (% of item rental cost)')
ON CONFLICT (key) DO NOTHING;
