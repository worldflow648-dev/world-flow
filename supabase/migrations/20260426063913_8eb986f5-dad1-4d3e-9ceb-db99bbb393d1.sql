-- Schedule the auto-expire-returns edge function to run hourly.
-- Idempotent: drops any existing job with the same name first.

DO $$
BEGIN
  PERFORM cron.unschedule('auto-expire-returns-hourly');
EXCEPTION WHEN OTHERS THEN
  -- Job didn't exist; ignore.
  NULL;
END $$;

SELECT cron.schedule(
  'auto-expire-returns-hourly',
  '0 * * * *', -- top of every hour
  $$
  SELECT net.http_post(
    url := 'https://pkibxhvjpsfcbzrhnxqe.supabase.co/functions/v1/auto-expire-returns',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBraWJ4aHZqcHNmY2J6cmhueHFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzA5NjUsImV4cCI6MjA4NTYwNjk2NX0.oa9A2vpmX-Q_yLHzgeClfJL_Rwg9JFkf-5Sk6UytBmQ"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);