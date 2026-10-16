-- Create discount scope enum
CREATE TYPE discount_scope AS ENUM ('store', 'product');

-- Create discount type enum  
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

-- Create discount_codes table
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type discount_type NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  scope discount_scope NOT NULL DEFAULT 'store',
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  min_order_value NUMERIC DEFAULT NULL,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Validation: product_id required for product scope
  CONSTRAINT valid_product_scope CHECK (
    (scope = 'store' AND product_id IS NULL) OR
    (scope = 'product' AND product_id IS NOT NULL)
  ),
  
  -- Validation: percentage must be <= 100
  CONSTRAINT valid_percentage CHECK (
    discount_type = 'fixed' OR discount_value <= 100
  )
);

-- Enable RLS
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage discount codes"
ON discount_codes FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can view active codes (for checkout)
CREATE POLICY "Authenticated can view active codes"
ON discount_codes FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));