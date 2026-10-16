ALTER TABLE orders ADD COLUMN merchant_payment_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN merchant_payment_receipt_url text;
ALTER TABLE orders ADD COLUMN merchant_payment_verified boolean DEFAULT false;