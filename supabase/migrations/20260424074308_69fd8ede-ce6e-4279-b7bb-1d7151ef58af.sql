-- Create attendance_shifts table
CREATE TABLE public.attendance_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  grace_minutes INT NOT NULL DEFAULT 15,
  absent_after_minutes INT NOT NULL DEFAULT 60,
  overtime_enabled BOOLEAN NOT NULL DEFAULT true,
  overtime_rate_per_hour NUMERIC NOT NULL DEFAULT 5000,
  overtime_min_minutes INT NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shifts"
ON public.attendance_shifts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view shifts"
ON public.attendance_shifts
FOR SELECT
TO authenticated
USING (true);

-- Add shift_id to profiles
ALTER TABLE public.profiles
ADD COLUMN shift_id UUID NULL REFERENCES public.attendance_shifts(id) ON DELETE SET NULL;

-- Add shift_id to staff_attendance (captured at check-in time)
ALTER TABLE public.staff_attendance
ADD COLUMN shift_id UUID NULL REFERENCES public.attendance_shifts(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_shift_id ON public.profiles(shift_id);
CREATE INDEX idx_staff_attendance_shift_id ON public.staff_attendance(shift_id);