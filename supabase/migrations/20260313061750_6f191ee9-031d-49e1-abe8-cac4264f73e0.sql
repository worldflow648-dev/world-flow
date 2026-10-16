-- Fix corrupted wallet data: recalculate total_earned and balance from actual delivered orders
UPDATE wallets w SET
  total_earned = COALESCE((
    SELECT SUM(o.net_profit) FROM orders o 
    WHERE o.merchant_id = w.merchant_id AND o.status = 'delivered'
  ), 0),
  balance = COALESCE((
    SELECT SUM(o.net_profit) FROM orders o 
    WHERE o.merchant_id = w.merchant_id AND o.status = 'delivered'
  ), 0) - COALESCE(w.total_withdrawn, 0);

-- Delete duplicate wallet_transactions (keep only the earliest per order)
DELETE FROM wallet_transactions wt
WHERE wt.order_id IS NOT NULL
AND wt.id NOT IN (
  SELECT DISTINCT ON (wallet_id, order_id) id
  FROM wallet_transactions
  WHERE order_id IS NOT NULL
  ORDER BY wallet_id, order_id, created_at ASC
);

-- Delete duplicate order_status_history entries (keep only the earliest per order+status change)
DELETE FROM order_status_history osh
WHERE osh.id NOT IN (
  SELECT DISTINCT ON (order_id, old_status, new_status) id
  FROM order_status_history
  ORDER BY order_id, old_status, new_status, created_at ASC
);