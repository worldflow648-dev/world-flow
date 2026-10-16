CREATE POLICY "Merchants can resend own returns"
ON public.order_returns
FOR UPDATE
TO authenticated
USING (merchant_id = auth.uid() AND status = 'pending')
WITH CHECK (merchant_id = auth.uid());