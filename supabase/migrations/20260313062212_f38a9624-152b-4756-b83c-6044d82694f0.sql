-- Fix corrupted total_withdrawn: recalculate from actual withdrawal transactions
UPDATE wallets SET
  total_withdrawn = COALESCE((
    SELECT SUM(ABS(amount)) FROM wallet_transactions 
    WHERE wallet_id = wallets.id AND type = 'withdrawal'
  ), 0);

-- Recalculate balance from total_earned minus total_withdrawn
UPDATE wallets SET balance = COALESCE(total_earned, 0) - COALESCE(total_withdrawn, 0);