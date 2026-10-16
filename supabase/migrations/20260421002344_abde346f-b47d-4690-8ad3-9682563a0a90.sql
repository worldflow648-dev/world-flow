-- Create staff_attendance table
CREATE TABLE public.staff_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL,
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  work_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Baghdad')::date,
  status TEXT NOT NULL DEFAULT 'on_time',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one check-in per staff per day
CREATE UNIQUE INDEX idx_staff_attendance_unique_day 
  ON public.staff_attendance(staff_id, work_date);

CREATE INDEX idx_staff_attendance_work_date ON public.staff_attendance(work_date);
CREATE INDEX idx_staff_attendance_staff_id ON public.staff_attendance(staff_id);

-- Enable RLS
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Staff can view their own records
CREATE POLICY "Staff can view own attendance"
ON public.staff_attendance
FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- Staff can insert their own check-in
CREATE POLICY "Staff can insert own attendance"
ON public.staff_attendance
FOR INSERT
TO authenticated
WITH CHECK (staff_id = auth.uid() AND public.has_role(auth.uid(), 'staff'::app_role));

-- Staff can update their own record (for check-out)
CREATE POLICY "Staff can update own attendance"
ON public.staff_attendance
FOR UPDATE
TO authenticated
USING (staff_id = auth.uid())
WITH CHECK (staff_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins can manage all attendance"
ON public.staff_attendance
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_staff_attendance_updated_at
BEFORE UPDATE ON public.staff_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('attendance_shift_start', '15:00'),
  ('attendance_shift_end', '22:00'),
  ('attendance_late_grace_minutes', '15'),
  ('attendance_required', 'true')
ON CONFLICT (key) DO NOTHING;