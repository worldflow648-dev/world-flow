---
name: Cart Persistence
description: localStorage cart + price re-validation on Cart/Checkout mount
type: feature
---
Cart state is persisted to localStorage (excluding File objects) to prevent data loss on refresh.

On Cart and Checkout mount, `useRefreshCartPrices()` fetches fresh `products` rows for cart items and:
- Calls `updateItemPrices` on `CartContext` to sync `merchant_price` / `wholesale_price`; toasts "تم تحديث أسعار بعض المنتجات في سلتك" if any changed.
- Tracks inactive product IDs via `setInactiveProductIds`; Cart blocks continue when any item is inactive and toasts a warning.

Server-side RPC `create_order_with_validation` remains authoritative — this hook is purely a UX/trust layer to prevent on-screen ↔ billed total mismatches.
