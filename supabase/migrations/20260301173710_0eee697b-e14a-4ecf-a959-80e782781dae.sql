
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT oi.product_id, oi.size, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.product_id IS NOT NULL
  LOOP
    UPDATE product_variants
    SET stock_level = stock_level + item.quantity
    WHERE product_id = item.product_id
      AND size = item.size
      AND is_active = true
      AND stock_level IS NOT NULL;
  END LOOP;
END;
$$;
