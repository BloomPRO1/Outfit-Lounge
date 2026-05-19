-- Individual allowance line items per payroll record
CREATE TABLE IF NOT EXISTS payroll_allowances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_record_id UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
  label             VARCHAR(100) NOT NULL,
  amount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_allowances_record
  ON payroll_allowances (payroll_record_id);
