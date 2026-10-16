
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  cta_text text DEFAULT 'تسوق الآن',
  link text DEFAULT '/search',
  bg_gradient text DEFAULT 'from-indigo-600 via-violet-600 to-purple-700',
  icon text DEFAULT 'sparkles',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banners"
ON public.banners FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active banners"
ON public.banners FOR SELECT
USING (is_active = true);
