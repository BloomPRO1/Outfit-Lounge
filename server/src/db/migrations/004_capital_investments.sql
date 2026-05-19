-- Capital investments tracking table
CREATE TABLE IF NOT EXISTS capital_investments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      DECIMAL(12,2) NOT NULL,
  category    VARCHAR(50)   NOT NULL CHECK (category IN
              ('stock_purchase','equipment','rent','utilities','salaries','other')),
  note        TEXT,
  invested_at DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capital_investments_date ON capital_investments (invested_at DESC);

-- Add analytics module permissions
INSERT INTO role_permissions (role, module, can_read, can_write)
VALUES
  ('manager',         'analytics', true,  true),
  ('cashier',         'analytics', false, false),
  ('inventory_staff', 'analytics', false, false)
ON CONFLICT (role, module) DO NOTHING;
