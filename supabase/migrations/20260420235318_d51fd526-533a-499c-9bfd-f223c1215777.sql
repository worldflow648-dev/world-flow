-- 1. Drop the duplicate trigger (keep trg_update_wallet_on_delivery)
DROP TRIGGER IF EXISTS on_delivery_update_wallet ON public.orders;

-- 2. Deduplicate wallet_transactions: for each (wallet_id, order_id, type) with multiple rows of the same amount, keep only the earliest
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY wallet_id, order_id, type, amount
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.wallet_transactions
  WHERE order_id IS NOT NULL
)
DELETE FROM public.wallet_transactions wt
USING ranked r
WHERE wt.id = r.id AND r.rn > 1;

-- 3. Recompute every wallet's balance, total_earned, total_withdrawn from the cleaned transactions
WITH agg AS (
  SELECT
    w.id AS wallet_id,
    COALESCE(SUM(wt.amount), 0) AS new_balance,
    COALESCE(SUM(CASE WHEN wt.type = 'credit' AND wt.amount > 0 THEN wt.amount ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN wt.type = 'debit' AND COALESCE(wt.description, '') LIKE 'Reversal:%' THEN wt.amount ELSE 0 END), 0)
      AS new_total_earned,
    COALESCE(ABS(SUM(CASE WHEN wt.type = 'debit' AND COALESCE(wt.description, '') NOT LIKE 'Reversal:%' THEN wt.amount ELSE 0 END)), 0)
      AS new_total_withdrawn
  FROM public.wallets w
  LEFT JOIN public.wallet_transactions wt ON wt.wallet_id = w.id
  GROUP BY w.id
)
UPDATE public.wallets w
SET balance = agg.new_balance,
    total_earned = agg.new_total_earned,
    total_withdrawn = agg.new_total_withdrawn,
    updated_at = now()
FROM agg
WHERE w.id = agg.wallet_id;