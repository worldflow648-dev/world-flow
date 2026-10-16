-- Remove duplicate pending order_returns rows, keeping the oldest per order
DELETE FROM public.order_returns r
USING (
  SELECT order_id, MIN(created_at) AS keep_at
  FROM public.order_returns
  WHERE status = 'pending'
  GROUP BY order_id
  HAVING COUNT(*) > 1
) keepers
WHERE r.order_id = keepers.order_id
  AND r.status = 'pending'
  AND r.created_at <> keepers.keep_at;

-- Prevent future duplicates: at most one pending return per order
CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_returns_active
ON public.order_returns(order_id)
WHERE status = 'pending';