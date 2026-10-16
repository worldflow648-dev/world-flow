
-- 1. Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses"
ON public.expenses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create app_settings table
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
ON public.app_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view settings"
ON public.app_settings FOR SELECT
USING (true);

-- Seed defaults
INSERT INTO public.app_settings (key, value) VALUES
('support_whatsapp', '9647700000000'),
('support_email', 'support@example.com');

-- 3. Add merchant_tier to activation_keys
ALTER TABLE public.activation_keys
ADD COLUMN merchant_tier TEXT DEFAULT 'basic';

-- 4. Add merchant_tier to profiles
ALTER TABLE public.profiles
ADD COLUMN merchant_tier TEXT DEFAULT 'basic';

-- 5. Update complete_user_registration to copy tier
CREATE OR REPLACE FUNCTION public.complete_user_registration(p_user_id uuid, p_activation_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_tier text;
BEGIN
  SELECT role, merchant_tier INTO v_role, v_tier
  FROM activation_keys
  WHERE code = p_activation_key
    AND is_used = false
    AND expires_at > now();
  
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  
  UPDATE activation_keys
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE code = p_activation_key;
  
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, v_role)
  ON CONFLICT DO NOTHING;
  
  -- Update profile tier
  UPDATE profiles
  SET merchant_tier = COALESCE(v_tier, 'basic')
  WHERE id = p_user_id;
  
  IF v_role = 'merchant' THEN
    INSERT INTO wallets (merchant_id, balance, total_earned, total_withdrawn)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN true;
END;
$function$;
