---
name: Financial Trigger Architecture
description: update_wallet_on_delivery handles credit on delivered AND reverses on un-deliver
type: feature
---
Database triggers for financial updates are consolidated to prevent duplication.

`update_wallet_on_delivery` (BEFORE UPDATE on orders):
- Credits wallet (balance + total_earned) and inserts a `wallet_transactions` 'credit' row when status transitions INTO 'delivered'. Sets `delivered_at = now()`.
- **Reverses** when status transitions OUT of 'delivered' (delivered → cancelled/returned/processing/etc): debits the wallet by OLD.net_profit and inserts a 'debit' wallet_transaction with description prefix `'Reversal:'`. Defensive: only reverses if a matching credit exists for the order and no prior reversal is recorded (prevents double-reversal).
- Clears `delivered_at` only when reverting to a non-terminal status; cancelled/returned keep historic `delivered_at` for audit.

Payouts (admin settlement) debit the wallet via the admin settlement mutation, which also inserts a `settlement_receipts` row and `settlement_order_links` rows mapping the settlement to the specific delivered orders it covers.
