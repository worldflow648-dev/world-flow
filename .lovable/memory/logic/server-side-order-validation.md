---
name: Server-Side Order Validation
description: Merchant order creation goes through SECURITY DEFINER RPC create_order_with_validation; client cannot insert directly into orders/order_items
type: feature
---
Merchant orders are created exclusively via the `create_order_with_validation(text,...,jsonb)` Postgres RPC. RLS INSERT policies for merchants on `orders` and `order_items` were removed — only this SECURITY DEFINER function (and admin direct insert) can write orders.

The RPC recomputes server-side from trusted DB values:
- `shipping_fee` from `governorates`
- `wholesale_price` / `merchant_price` from `products`
- addon prices AND `wholesale_price` from `product_addons` / `addon_options` (option overrides addon when present; option `wholesale_price` falls back to addon `wholesale_price` when null)
- tier discount from `tier_discounts` for caller's `merchant_tier`
- `discount_code` validation + amount
- `total_*`, `final_retail_price`, `net_profit`, `merchant_payment_amount`

**`final_retail_price` includes shipping**: `(Σ retail*qty) − discount + shipping_fee`. This is the full amount the customer pays. Admin revenue reports sum this directly.

**`total_wholesale_cost` includes addon wholesale**: `Σ (product.wholesale_price + Σ addon.wholesale_price) * qty`. Platform profit reflects real production costs (printing ink, packaging, etc.).

**`net_profit`** (merchant payout) = `final_retail_price − total_merchant_cost − shipping_fee` — semantics unchanged: shipping is paid by the customer but the platform pays the courier, so it nets out of merchant payout.

Client (`useCreateOrder`) only sends: customer fields, governorate/region/landmark, notes, discount_code, receipt URLs, and per-item `{product_id, size, color, quantity, retail_price, design/mockup urls, addons:[{id, optionId}]}`. Any client-supplied totals or prices are ignored.

Validation rejections (raise as `CODE` or `CODE:ProductName`): `OUT_OF_STOCK`, `ZERO_RETAIL_PRICE`, `BELOW_COST` (when `app_settings.allow_below_cost_pricing='false'`), `INVALID_GOVERNORATE`, `INVALID_DISCOUNT_CODE`, `MERCHANT_PAYMENT_RECEIPT_REQUIRED`, etc. Translated to Arabic toasts client-side.

Defense-in-depth: orders has CHECK constraints requiring non-negative `final_retail_price`, `total_merchant_cost`, `total_wholesale_cost`, `shipping_fee`.
