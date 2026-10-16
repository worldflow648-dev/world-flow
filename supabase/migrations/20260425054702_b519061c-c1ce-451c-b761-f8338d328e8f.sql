-- Change default return deadline from 14 days to 7 days on the order_returns table
ALTER TABLE public.order_returns
  ALTER COLUMN deadline_days SET DEFAULT 7;

ALTER TABLE public.order_returns
  ALTER COLUMN deadline_at SET DEFAULT (now() + interval '7 days');

-- Backfill: update any existing pending returns that still use the old 14-day deadline
UPDATE public.order_returns
SET deadline_days = 7,
    deadline_at   = created_at + interval '7 days',
    updated_at    = now()
WHERE status = 'pending'
  AND deadline_days = 14;