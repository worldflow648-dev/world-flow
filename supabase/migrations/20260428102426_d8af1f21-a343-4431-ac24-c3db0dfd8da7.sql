ALTER TABLE public.order_returns
  ADD COLUMN IF NOT EXISTS original_customer_name text,
  ADD COLUMN IF NOT EXISTS original_customer_phone text,
  ADD COLUMN IF NOT EXISTS original_customer_phone2 text,
  ADD COLUMN IF NOT EXISTS original_governorate text,
  ADD COLUMN IF NOT EXISTS original_region text,
  ADD COLUMN IF NOT EXISTS original_landmark text;