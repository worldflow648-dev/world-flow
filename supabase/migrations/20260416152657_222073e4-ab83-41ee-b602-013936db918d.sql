DROP POLICY "Users can view order items for accessible orders" ON order_items;

CREATE POLICY "Users can view order items for accessible orders"
ON order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
    AND (
      o.merchant_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (
        has_role(auth.uid(), 'staff'::app_role)
        AND o.status IN ('pending', 'processing', 'printed', 'shipped', 'delivered')
      )
    )
  )
);