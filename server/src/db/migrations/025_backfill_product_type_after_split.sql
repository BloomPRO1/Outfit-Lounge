-- Fix: products that already had stock split into a rental variant (via the
-- "Transfer to rental" action) but were never promoted from type='sale' to 'both'.
-- This left them without a rental badge/label and invisible to rental search/booking,
-- since those all filter/display by products.type rather than per-variant data.
-- Safe/additive only: no rows are deleted, no other columns are touched.
UPDATE products p
SET type = 'both',
    updated_at = NOW()
WHERE p.type = 'sale'
  AND EXISTS (
    SELECT 1 FROM product_variants pv
    WHERE pv.product_id = p.id
      AND pv.available_for_rent > 0
      AND (
        (pv.color IS NOT NULL AND pv.color LIKE '%-R')
        OR (pv.size IS NOT NULL AND pv.size LIKE '%-R')
        OR pv.sku LIKE '%-R'
      )
  );
