-- Fix: reset available_for_rent = 0 for non-rent variants of 'both' type products.
-- 'Both' type products should have all stock in the sale pool by default;
-- only variants created by the split-to-rent workflow (color/size ending in '-R') keep their rent allocation.
UPDATE product_variants pv
SET available_for_rent = 0,
    updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id
  AND p.type = 'both'
  AND (pv.color IS NULL OR pv.color NOT LIKE '%-R')
  AND (pv.size IS NULL OR pv.size NOT LIKE '%-R')
  AND pv.available_for_rent > 0;
