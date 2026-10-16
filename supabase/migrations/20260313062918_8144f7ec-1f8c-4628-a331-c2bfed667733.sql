CREATE TABLE public.settlement_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  wallet_transaction_id uuid REFERENCES public.wallet_transactions(id),
  amount numeric NOT NULL,
  description text,
  settled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settlement_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settlement receipts"
  ON public.settlement_receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view own receipts"
  ON public.settlement_receipts FOR SELECT TO authenticated
  USING (merchant_id = auth.uid());