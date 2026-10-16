
-- Attach triggers for order status history and wallet updates
CREATE TRIGGER on_order_status_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.record_order_status_change();

CREATE TRIGGER on_order_delivery
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_on_delivery();

-- Fix staff RLS to see more order statuses
DROP POLICY "Staff can view pending and processing orders" ON public.orders;
CREATE POLICY "Staff can view relevant orders" ON public.orders
FOR SELECT USING (
  has_role(auth.uid(), 'staff'::app_role) AND 
  status IN ('pending', 'processing', 'printed', 'shipped', 'delivered')
);

-- Update staff update policy to include printed status
DROP POLICY "Staff can update order status" ON public.orders;
CREATE POLICY "Staff can update order status" ON public.orders
FOR UPDATE USING (
  has_role(auth.uid(), 'staff'::app_role) AND 
  status IN ('pending', 'processing', 'printed')
);

-- Add customer_phone2 column
ALTER TABLE public.orders ADD COLUMN customer_phone2 text;

-- Add discount tracking columns to orders
ALTER TABLE public.orders ADD COLUMN discount_code text;
ALTER TABLE public.orders ADD COLUMN discount_amount numeric DEFAULT 0;

-- RLS policy for merchants to update own pending orders (for cancellation)
CREATE POLICY "Merchants can update own pending orders" ON public.orders
FOR UPDATE USING (
  merchant_id = auth.uid() AND 
  has_role(auth.uid(), 'merchant'::app_role) AND 
  status = 'pending'
);
