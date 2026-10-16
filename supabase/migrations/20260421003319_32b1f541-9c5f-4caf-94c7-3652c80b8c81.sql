-- Create overtime payments audit table
CREATE TABLE public.attendance_overtime_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL UNIQUE,
  staff_id uuid NOT NULL,
  minutes integer NOT NULL,
  amount numeric NOT NULL,
  note text,
  paid_by uuid NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_overtime_payments_staff ON public.attendance_overtime_payments(staff_id);
CREATE INDEX idx_overtime_payments_paid_at ON public.attendance_overtime_payments(paid_at);

ALTER TABLE public.attendance_overtime_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage overtime payments"
  ON public.attendance_overtime_payments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own overtime payments"
  ON public.attendance_overtime_payments
  FOR SELECT
  TO authenticated
  USING (staff_id = auth.uid());

-- Seed default app_settings keys
INSERT INTO public.app_settings (key, value) VALUES
  ('attendance_overtime_enabled', 'true'),
  ('attendance_overtime_rate_per_hour', '5000'),
  ('attendance_overtime_min_minutes', '15')
ON CONFLICT (key) DO NOTHING;