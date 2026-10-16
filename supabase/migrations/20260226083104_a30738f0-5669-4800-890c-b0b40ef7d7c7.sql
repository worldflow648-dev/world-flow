
-- Add deposit tracking columns to orders
ALTER TABLE orders ADD COLUMN deposit_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN deposit_receipt_url text;
ALTER TABLE orders ADD COLUMN deposit_verified boolean DEFAULT false;

-- Add requires_deposit flag to product_addons
ALTER TABLE product_addons ADD COLUMN requires_deposit boolean DEFAULT false;
