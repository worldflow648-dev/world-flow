-- 1. Create the issue_status enum
CREATE TYPE public.issue_status AS ENUM (
  'new',
  'in_progress',
  'waiting_merchant',
  'declined',
  'duplicate',
  'postponed',
  'solved'
);

-- 2. Create issue_reports table
CREATE TABLE public.issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_status_history_id uuid,
  issue_type text NOT NULL DEFAULT 'غير محدد',
  reported_by uuid,
  reported_at timestamptz NOT NULL DEFAULT now(),
  status public.issue_status NOT NULL DEFAULT 'new',
  admin_notes text,
  duplicate_of uuid REFERENCES public.issue_reports(id) ON DELETE SET NULL,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_issue_reports_order_id ON public.issue_reports(order_id);
CREATE INDEX idx_issue_reports_status ON public.issue_reports(status);
CREATE INDEX idx_issue_reports_created_at ON public.issue_reports(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage issue reports"
ON public.issue_reports
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Updated_at trigger
CREATE TRIGGER update_issue_reports_updated_at
BEFORE UPDATE ON public.issue_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Auto-create issue_reports rows from new staff issue notes
CREATE OR REPLACE FUNCTION public.create_issue_report_from_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue_type text;
BEGIN
  IF NEW.notes IS NOT NULL AND NEW.notes LIKE 'مشكلة:%' THEN
    v_issue_type := NULLIF(trim(replace(NEW.notes, 'مشكلة:', '')), '');
    INSERT INTO public.issue_reports (
      order_id,
      order_status_history_id,
      issue_type,
      reported_by,
      reported_at,
      status
    ) VALUES (
      NEW.order_id,
      NEW.id,
      COALESCE(v_issue_type, 'غير محدد'),
      NEW.changed_by,
      NEW.created_at,
      'new'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_issue_report_from_history
AFTER INSERT ON public.order_status_history
FOR EACH ROW
EXECUTE FUNCTION public.create_issue_report_from_history();

-- 6. Backfill existing issue notes
INSERT INTO public.issue_reports (
  order_id,
  order_status_history_id,
  issue_type,
  reported_by,
  reported_at,
  status,
  created_at,
  updated_at
)
SELECT
  osh.order_id,
  osh.id,
  COALESCE(NULLIF(trim(replace(osh.notes, 'مشكلة:', '')), ''), 'غير محدد'),
  osh.changed_by,
  osh.created_at,
  'new'::public.issue_status,
  osh.created_at,
  osh.created_at
FROM public.order_status_history osh
WHERE osh.notes LIKE 'مشكلة:%';