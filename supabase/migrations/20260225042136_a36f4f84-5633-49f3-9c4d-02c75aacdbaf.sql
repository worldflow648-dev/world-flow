
-- Create tier_discounts table
CREATE TABLE public.tier_discounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tier_discounts ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage tier discounts"
ON public.tier_discounts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read
CREATE POLICY "Authenticated can view tier discounts"
ON public.tier_discounts FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_tier_discounts_updated_at
BEFORE UPDATE ON public.tier_discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.tier_discounts (tier, discount_type, discount_value, is_active)
VALUES
  ('basic', 'percentage', 0, true),
  ('professional', 'percentage', 0, true);
