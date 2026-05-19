-- Rename bonuses to allowances in payroll_records
ALTER TABLE payroll_records RENAME COLUMN bonuses TO allowances;
