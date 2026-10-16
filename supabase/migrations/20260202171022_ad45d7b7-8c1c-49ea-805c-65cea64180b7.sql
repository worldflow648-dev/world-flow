-- Create addon_options table for sub-addons
CREATE TABLE public.addon_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_id UUID NOT NULL REFERENCES public.product_addons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  price NUMERIC,  -- NULL means use parent addon price
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;

-- Admin can manage all addon options
CREATE POLICY "Admins can manage addon options"
ON public.addon_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active addon options
CREATE POLICY "Anyone can view active addon options"
ON public.addon_options
FOR SELECT
USING (is_active = true);

-- Create index for faster lookups
CREATE INDEX idx_addon_options_addon_id ON public.addon_options(addon_id);
CREATE INDEX idx_addon_options_sort_order ON public.addon_options(addon_id, sort_order);