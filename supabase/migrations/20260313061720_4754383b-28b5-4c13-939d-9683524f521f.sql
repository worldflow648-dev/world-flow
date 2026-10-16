-- 1. Remove duplicate triggers
DROP TRIGGER IF EXISTS on_order_delivery ON orders;
DROP TRIGGER IF EXISTS on_status_change_record ON orders;

-- 2. Add RLS policy for admin wallet_transaction inserts
CREATE POLICY "Admins can insert transactions"
ON wallet_transactions FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));