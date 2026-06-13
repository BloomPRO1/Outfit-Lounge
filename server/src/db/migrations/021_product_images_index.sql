-- Speed up the product-image LATERAL lookup in the products list query
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
