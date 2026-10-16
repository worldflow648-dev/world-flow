-- Reverse the erroneous "Shipping double-count correction" wallet credits from migration 20260624130027.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT wt.id AS txn_id, wt.wallet_id, wt.order_id, wt.amount, o.order_number
    FROM public.wallet_transactions wt
    LEFT JOIN public.orders o ON o.id = wt.order_id
    WHERE wt.description LIKE 'Shipping double-count correction:%'
      AND wt.type = 'credit'
  LOOP
    UPDATE public.wallets
    SET balance = balance - r.amount,
        total_earned = total_earned - r.amount,
        updated_at = now()
    WHERE id = r.wallet_id;

    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, description)
    VALUES (r.wallet_id, r.order_id, -r.amount, 'debit',
            'Reversal of erroneous shipping credit: ' || COALESCE(r.order_number, r.order_id::text));

    DELETE FROM public.wallet_transactions WHERE id = r.txn_id;
  END LOOP;
END $$;

-- Recompute net_profit from canonical definition:
--   merchant_profit = final_retail_price - total_merchant_cost
-- (shipping is customer-paid and does not enter merchant profit)
UPDATE public.orders
SET net_profit = COALESCE(final_retail_price, 0) - COALESCE(total_merchant_cost, 0);