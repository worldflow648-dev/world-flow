
-- 1. Hidden flag
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_orders_is_hidden ON public.orders(is_hidden);

-- 2. Admin DELETE policy on orders
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Stock restoration trigger before delete
CREATE OR REPLACE FUNCTION public.restore_stock_before_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only restore for statuses where stock is still considered deducted
  IF OLD.status IS NULL OR OLD.status NOT IN ('cancelled') THEN
    PERFORM public.restore_order_stock(OLD.id);
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_before_order_delete ON public.orders;
CREATE TRIGGER trg_restore_stock_before_order_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_before_order_delete();

-- 4. Cascade cleanup of dependent rows (no FKs declared, so do it explicitly)
CREATE OR REPLACE FUNCTION public.cleanup_order_dependents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.order_items WHERE order_id = OLD.id;
  DELETE FROM public.order_status_history WHERE order_id = OLD.id;
  DELETE FROM public.order_returns WHERE order_id = OLD.id;
  DELETE FROM public.issue_reports WHERE order_id = OLD.id;
  DELETE FROM public.settlement_order_links WHERE order_id = OLD.id;
  DELETE FROM public.wallet_transactions WHERE order_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_order_dependents ON public.orders;
CREATE TRIGGER trg_cleanup_order_dependents
  BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_order_dependents();
