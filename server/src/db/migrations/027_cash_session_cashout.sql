-- Let a cashier withdraw a custom amount from the counted end-of-day balance
-- (e.g. depositing to the safe/bank) while the remainder stays in the till.
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS cashout_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
