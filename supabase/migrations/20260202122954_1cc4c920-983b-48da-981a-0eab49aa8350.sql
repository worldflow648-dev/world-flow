-- =====================================================
-- WorldFlow POD Database Schema - Part 1
-- Create tables first, then functions that reference them
-- =====================================================

-- 1. Create Enums (if not exists from previous attempt)
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'merchant', 'staff', 'guest');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending',
    'processing', 
    'printed',
    'shipped',
    'delivered',
    'returned',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create ALL Tables First
-- =====================================================

-- Profiles table (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User roles table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Activation keys for merchant signup (if not exists)
CREATE TABLE IF NOT EXISTS public.activation_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  is_used boolean DEFAULT false,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Categories (if not exists)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  icon text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products with dual pricing (if not exists)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id),
  name text NOT NULL,
  name_en text,
  description text,
  wholesale_price decimal(12,2) NOT NULL,
  merchant_price decimal(12,2) NOT NULL,
  images text[],
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product variants (if not exists)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  size text NOT NULL,
  color text,
  color_hex text,
  stock_level int DEFAULT 0,
  sku text UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product addons (if not exists)
CREATE TABLE IF NOT EXISTS public.product_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  price decimal(12,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Orders with 3-price logic (if not exists)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  merchant_id uuid REFERENCES auth.users(id) NOT NULL,
  status order_status DEFAULT 'pending',
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  governorate text NOT NULL,
  region text,
  landmark text,
  total_wholesale_cost decimal(12,2) NOT NULL,
  total_merchant_cost decimal(12,2) NOT NULL,
  final_retail_price decimal(12,2) NOT NULL,
  shipping_fee decimal(12,2) DEFAULT 5000,
  net_profit decimal(12,2) NOT NULL,
  merchant_notes text,
  estimated_delivery timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

-- Order items with frozen prices (if not exists)
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  product_image text,
  variant_id uuid REFERENCES public.product_variants(id),
  size text NOT NULL,
  color text,
  quantity int NOT NULL,
  wholesale_price decimal(12,2) NOT NULL,
  merchant_price decimal(12,2) NOT NULL,
  retail_price decimal(12,2) NOT NULL,
  addons jsonb DEFAULT '[]',
  design_file_url text,
  mockup_file_url text
);

-- Order status history (if not exists)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  old_status order_status,
  new_status order_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Merchant wallets (if not exists)
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance decimal(12,2) DEFAULT 0,
  total_earned decimal(12,2) DEFAULT 0,
  total_withdrawn decimal(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Wallet transactions (if not exists)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  amount decimal(12,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Governorates lookup (if not exists)
CREATE TABLE IF NOT EXISTS public.governorates (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text,
  shipping_fee decimal(12,2) DEFAULT 5000,
  is_active boolean DEFAULT true
);

-- 3. NOW Create Functions (after tables exist)
-- =====================================================

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Generate unique order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_number text;
  exists_check boolean;
BEGIN
  LOOP
    new_number := 'ORD-' || floor(random() * 9000 + 1000)::text;
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_number) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_number;
END;
$$;

-- Update wallet on delivery
CREATE OR REPLACE FUNCTION public.update_wallet_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    UPDATE wallets
    SET 
      balance = balance + NEW.net_profit,
      total_earned = total_earned + NEW.net_profit,
      updated_at = now()
    WHERE merchant_id = NEW.merchant_id;
    
    INSERT INTO wallet_transactions (wallet_id, order_id, amount, type, description)
    SELECT w.id, NEW.id, NEW.net_profit, 'credit', 'Order delivered: ' || NEW.order_number
    FROM wallets w WHERE w.merchant_id = NEW.merchant_id;
    
    NEW.delivered_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Record order status changes
CREATE OR REPLACE FUNCTION public.record_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Validate activation key
CREATE OR REPLACE FUNCTION public.validate_activation_key(key_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM activation_keys 
    WHERE code = key_code 
      AND is_used = false 
      AND expires_at > now()
  );
END;
$$;

-- Use activation key
CREATE OR REPLACE FUNCTION public.use_activation_key(key_code text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE activation_keys
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE code = key_code 
    AND is_used = false 
    AND expires_at > now();
  
  RETURN FOUND;
END;
$$;

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. Triggers
-- =====================================================

-- Drop existing triggers first to avoid duplicates
DROP TRIGGER IF EXISTS on_delivery_update_wallet ON public.orders;
DROP TRIGGER IF EXISTS on_status_change_record ON public.orders;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_wallets_updated_at ON public.wallets;

-- Create triggers
CREATE TRIGGER on_delivery_update_wallet
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_on_delivery();

CREATE TRIGGER on_status_change_record
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.record_order_status_change();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS on all tables
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Activation keys policies
CREATE POLICY "Admins can manage activation keys"
  ON public.activation_keys FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can validate keys"
  ON public.activation_keys FOR SELECT
  TO authenticated
  USING (true);

-- Categories policies
CREATE POLICY "Anyone can view active categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Products policies
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants and staff can view active products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      public.has_role(auth.uid(), 'merchant') OR 
      public.has_role(auth.uid(), 'staff')
    )
  );

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Product variants policies
CREATE POLICY "Anyone can view active variants"
  ON public.product_variants FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Product addons policies
CREATE POLICY "Anyone can view active addons"
  ON public.product_addons FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage addons"
  ON public.product_addons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Orders policies
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid() AND public.has_role(auth.uid(), 'merchant'));

CREATE POLICY "Staff can view pending and processing orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'staff') AND 
    status IN ('pending', 'processing')
  );

CREATE POLICY "Merchants can create own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid() AND public.has_role(auth.uid(), 'merchant'));

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update order status"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'staff') AND 
    status IN ('pending', 'processing')
  );

-- Order items policies
CREATE POLICY "Users can view order items for accessible orders"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_id AND (
        o.merchant_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        (public.has_role(auth.uid(), 'staff') AND o.status IN ('pending', 'processing'))
      )
    )
  );

CREATE POLICY "Merchants can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_id AND o.merchant_id = auth.uid()
    )
  );

-- Order status history policies
CREATE POLICY "Users can view status history"
  ON public.order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_id AND (
        o.merchant_id = auth.uid() OR
        public.has_role(auth.uid(), 'admin') OR
        public.has_role(auth.uid(), 'staff')
      )
    )
  );

CREATE POLICY "Staff and admins can insert status history"
  ON public.order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'staff')
  );

-- Wallets policies
CREATE POLICY "Merchants can view own wallet"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

CREATE POLICY "Admins can view all wallets"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can modify wallets"
  ON public.wallets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Wallet transactions policies
CREATE POLICY "Merchants can view own transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wallets w 
      WHERE w.id = wallet_id AND w.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Governorates policies
CREATE POLICY "Anyone can view active governorates"
  ON public.governorates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage governorates"
  ON public.governorates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Seed Data
-- =====================================================

-- Insert governorates (on conflict do nothing)
INSERT INTO public.governorates (id, name_ar, name_en, shipping_fee) VALUES
  ('baghdad', 'بغداد', 'Baghdad', 5000),
  ('basra', 'البصرة', 'Basra', 7000),
  ('erbil', 'أربيل', 'Erbil', 8000),
  ('najaf', 'النجف', 'Najaf', 6000),
  ('karbala', 'كربلاء', 'Karbala', 6000),
  ('mosul', 'الموصل', 'Mosul', 8000),
  ('kirkuk', 'كركوك', 'Kirkuk', 7000),
  ('babylon', 'بابل', 'Babylon', 5500),
  ('wasit', 'واسط', 'Wasit', 6000),
  ('diyala', 'ديالى', 'Diyala', 6000),
  ('anbar', 'الأنبار', 'Anbar', 8000),
  ('sulaymaniyah', 'السليمانية', 'Sulaymaniyah', 8000),
  ('dohuk', 'دهوك', 'Dohuk', 8000),
  ('maysan', 'ميسان', 'Maysan', 7000),
  ('dhi_qar', 'ذي قار', 'Dhi Qar', 7000),
  ('muthanna', 'المثنى', 'Muthanna', 7000),
  ('qadisiyyah', 'القادسية', 'Qadisiyyah', 6000),
  ('saladin', 'صلاح الدين', 'Saladin', 7000)
ON CONFLICT (id) DO NOTHING;

-- Insert categories (on conflict do nothing based on name)
INSERT INTO public.categories (name, name_en, icon, sort_order) 
SELECT 'هوديز', 'Hoodies', '👕', 1 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'هوديز');
INSERT INTO public.categories (name, name_en, icon, sort_order) 
SELECT 'أكواب', 'Cups', '☕', 2 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'أكواب');
INSERT INTO public.categories (name, name_en, icon, sort_order) 
SELECT 'سويت شيرت', 'Sweatshirts', '🧥', 3 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'سويت شيرت');
INSERT INTO public.categories (name, name_en, icon, sort_order) 
SELECT 'تيشيرتات', 'T-shirts', '👚', 4 WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'تيشيرتات');

-- Insert product addons (if not exists)
INSERT INTO public.product_addons (name, name_en, price) 
SELECT 'تغليف احترافي', 'Professional Wrapping', 1500 WHERE NOT EXISTS (SELECT 1 FROM public.product_addons WHERE name = 'تغليف احترافي');
INSERT INTO public.product_addons (name, name_en, price) 
SELECT 'طباعة A3/A4', 'A3/A4 Printing', 2000 WHERE NOT EXISTS (SELECT 1 FROM public.product_addons WHERE name = 'طباعة A3/A4');