CREATE POLICY "Admins can create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));