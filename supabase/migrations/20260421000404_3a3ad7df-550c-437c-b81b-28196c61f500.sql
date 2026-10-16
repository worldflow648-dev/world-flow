-- Create urgency enum
DO $$ BEGIN
  CREATE TYPE public.issue_urgency AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add urgency column to issue_reports
ALTER TABLE public.issue_reports
  ADD COLUMN IF NOT EXISTS urgency public.issue_urgency NOT NULL DEFAULT 'medium';

-- Update trigger function to parse urgency suffix from notes
CREATE OR REPLACE FUNCTION public.create_issue_report_from_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_raw text;
  v_issue_type text;
  v_urgency_str text;
  v_urgency public.issue_urgency := 'medium';
  v_pipe_pos int;
BEGIN
  IF NEW.notes IS NOT NULL AND NEW.notes LIKE 'مشكلة:%' THEN
    v_raw := trim(replace(NEW.notes, 'مشكلة:', ''));

    -- Look for "| urgency:<level>" suffix
    v_pipe_pos := position('|' in v_raw);
    IF v_pipe_pos > 0 THEN
      v_urgency_str := lower(trim(substring(v_raw from v_pipe_pos + 1)));
      v_issue_type := NULLIF(trim(substring(v_raw from 1 for v_pipe_pos - 1)), '');

      -- Strip "urgency:" prefix if present
      IF v_urgency_str LIKE 'urgency:%' THEN
        v_urgency_str := trim(substring(v_urgency_str from 9));
      END IF;

      IF v_urgency_str IN ('low', 'medium', 'high') THEN
        v_urgency := v_urgency_str::public.issue_urgency;
      END IF;
    ELSE
      v_issue_type := NULLIF(v_raw, '');
    END IF;

    INSERT INTO public.issue_reports (
      order_id,
      order_status_history_id,
      issue_type,
      reported_by,
      reported_at,
      status,
      urgency
    ) VALUES (
      NEW.order_id,
      NEW.id,
      COALESCE(v_issue_type, 'غير محدد'),
      NEW.changed_by,
      NEW.created_at,
      'new',
      v_urgency
    );
  END IF;
  RETURN NEW;
END;
$function$;