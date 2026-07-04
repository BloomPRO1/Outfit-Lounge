-- Fix: reverseVariantSplit used to demote products.type from 'both' back to 'sale'
-- once the last unit of rental stock was reversed. That hid the "To Rent" transfer
-- button/Mode column for the whole product going forward, even though its rent-split
-- ('-R') variant still exists and could be used again.
-- 'both' is a permanent capability flag, not a reflection of current stock levels,
-- so promote back any product that has a genuine rent-split sibling variant.
-- Safe/additive only: no rows are deleted, no other columns are touched.
UPDATE products p
SET type = 'both',
    updated_at = NOW()
WHERE p.type = 'sale'
  AND EXISTS (
    SELECT 1 FROM product_variants pv
    WHERE pv.product_id = p.id
      AND pv.sku LIKE '%-R'
      AND EXISTS (
        SELECT 1 FROM product_variants base
        WHERE base.product_id = p.id
          AND base.sku = LEFT(pv.sku, LENGTH(pv.sku) - 2)
      )
  );
