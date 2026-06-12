-- ─────────────────────────────────────────────────────────────────────────────
-- PROMOTION CODES  (never-expiring codes with flat or percentage discounts)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotion_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(50) UNIQUE NOT NULL,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  discount_type  VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat_amount')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  scope          VARCHAR(20) NOT NULL DEFAULT 'both' CHECK (scope IN ('pos', 'rental', 'both')),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  usage_count    INTEGER NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROMOTION CODE USAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotion_code_usages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_code_id   UUID NOT NULL REFERENCES promotion_codes(id) ON DELETE CASCADE,
  sale_id             UUID REFERENCES sales(id)   ON DELETE SET NULL,
  rental_id           UUID REFERENCES rentals(id) ON DELETE SET NULL,
  discount_amount     DECIMAL(10,2) NOT NULL,
  used_by             UUID REFERENCES users(id)   ON DELETE SET NULL,
  used_at             TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_code_usage_has_ref CHECK (sale_id IS NOT NULL OR rental_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_promotion_codes_code      ON promotion_codes(code);
CREATE INDEX IF NOT EXISTS idx_promotion_codes_active    ON promotion_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_code    ON promotion_code_usages(promotion_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_sale    ON promotion_code_usages(sale_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_rental  ON promotion_code_usages(rental_id);
