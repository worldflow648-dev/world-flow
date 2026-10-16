
-- Create settlement_requests table
CREATE TABLE public.settlement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.settlement_requests ENABLE ROW LEVEL SECURITY;

-- Merchants can insert their own requests
CREATE POLICY "Merchants can insert own settlement requests"
  ON public.settlement_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid() AND has_role(auth.uid(), 'merchant'::app_role));

-- Merchants can view their own requests
CREATE POLICY "Merchants can view own settlement requests"
  ON public.settlement_requests
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "Admins can view all settlement requests"
  ON public.settlement_requests
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all requests (approve/reject)
CREATE POLICY "Admins can update settlement requests"
  ON public.settlement_requests
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
