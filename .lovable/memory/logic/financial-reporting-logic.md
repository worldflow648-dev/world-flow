---
name: Financial Reporting Logic
description: settlement_receipts + per-order settlement_order_links as source of truth
type: feature
---
The `settlement_receipts` table and order-level `net_profit` data are the source of truth for financial reporting. Per-order "isPaid" status is determined by `settlement_order_links` (settlement_id → order_id mapping), NOT by date heuristics.

When admin settles a balance: insert receipt row, insert one `settlement_order_links` row per delivered + currently-unlinked order. `useMerchantSettlementOrders` joins against `settlement_order_links` to mark each order paid/unpaid. Historical settlements are backfilled by chronological date heuristic in a one-time migration.
