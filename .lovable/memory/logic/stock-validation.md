---
name: Stock Validation Semantics
description: Atomic stock decrement via check_and_decrement_stock; null stock_level means UNLIMITED (UI must mirror this); variant_id is the source of truth for color-aware decrement
type: feature
---
Atomic stock validation is enforced during order creation via the SECURITY DEFINER `check_and_decrement_stock(variant_id, quantity)` PostgreSQL function (`SELECT ... FOR UPDATE` + conditional `UPDATE`). It runs inside `create_order_with_validation` per item and raises `OUT_OF_STOCK:<product_name>` on insufficient stock.

**Null stock_level = unlimited.** The DB function explicitly `RETURN true` when `stock_level IS NULL`, treating it as unmetered inventory. Frontend MUST mirror this:
- `useProducts.getTotalStock` and `ProductCard` return `Infinity` when any variant has null stock → product is always available, never shown as low/out-of-stock.
- `ProductDetail` per-size availability treats null as available.
- `useAdminProducts.getTotalStock` returns `Infinity` for unmetered products; admin views render `∞` via `formatStockDisplay`.

**Color-aware variant resolution.** The cart now stores `selectedColor` and `selectedVariantId`. `create_order_with_validation` resolves a variant in this order:
1. If `variant_id` is supplied → validate `(product_id, variant_id)` and use it.
2. Else if `color` is supplied → match `(product_id, size, color)`.
3. Else → require an unambiguous `(product_id, size)`; if multiple active variants exist for that size raise `AMBIGUOUS_VARIANT:<product_name>`.

`restore_order_stock` mirrors this — restores stock by `variant_id` when present on `order_items`, falling back to `(product_id, size, color)` for legacy rows. This guarantees the exact variant sold is the one credited back on cancellation.
