-- Fix product_images.url column to support base64-encoded images stored in PostgreSQL
ALTER TABLE product_images ALTER COLUMN url TYPE TEXT;
