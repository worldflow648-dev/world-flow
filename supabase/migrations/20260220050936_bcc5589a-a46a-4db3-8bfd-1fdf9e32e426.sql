
-- Drop and recreate triggers to ensure they're correct
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
DROP TRIGGER IF EXISTS on_order_delivery ON public.orders;

CREATE TRIGGER on_order_status_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.record_order_status_change();

CREATE TRIGGER on_order_delivery
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_on_delivery();

-- Atomic discount increment function
CREATE OR REPLACE FUNCTION public.increment_discount_used_count(code_text TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE discount_codes SET used_count = COALESCE(used_count, 0) + 1 WHERE code = code_text;
$$;

-- Atomic stock check and decrement function
CREATE OR REPLACE FUNCTION public.check_and_decrement_stock(
  p_variant_id UUID,
  p_quantity INT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_stock INT;
BEGIN
  SELECT stock_level INTO v_stock
  FROM product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF v_stock IS NULL THEN
    RETURN true;
  END IF;

  IF v_stock < p_quantity THEN
    RETURN false;
  END IF;

  UPDATE product_variants
  SET stock_level = stock_level - p_quantity
  WHERE id = p_variant_id;

  RETURN true;
END;
$$;
