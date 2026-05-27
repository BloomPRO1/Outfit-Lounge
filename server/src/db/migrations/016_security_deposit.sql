-- Migration 016: add security deposit / ID card fields to rentals
ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS security_type VARCHAR(20)
    CHECK (security_type IN ('deposit', 'id_card')),
  ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS security_id_number VARCHAR(100);
