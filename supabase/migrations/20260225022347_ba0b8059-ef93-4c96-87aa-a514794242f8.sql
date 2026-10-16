
-- Create order_returns table
CREATE TABLE public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resent', 'expired')),
  deadline_days integer NOT NULL DEFAULT 14,
  deadline_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  resent_to_name text,
  resent_to_phone text,
  resent_to_phone2 text,
  resent_to_governorate text,
  resent_to_region text,
  resent_to_landmark text,
  resent_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage returns"
ON public.order_returns
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Merchants can view their own returns
CREATE POLICY "Merchants can view own returns"
ON public.order_returns
FOR SELECT
TO authenticated
USING (merchant_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_order_returns_updated_at
BEFORE UPDATE ON public.order_returns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_order_returns_order_id ON public.order_returns(order_id);
CREATE INDEX idx_order_returns_merchant_id ON public.order_returns(merchant_id);
CREATE INDEX idx_order_returns_status ON public.order_returns(status);
