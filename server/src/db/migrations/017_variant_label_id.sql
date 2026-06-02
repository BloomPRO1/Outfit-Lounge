-- Short numeric label ID for each variant — used as the barcode value on printed labels.
-- Sequential, human-readable, and far shorter than the full SKU.
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS label_id SERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_label_id ON product_variants(label_id);
