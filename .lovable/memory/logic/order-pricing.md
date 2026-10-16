---
name: Order Pricing
description: Server-side computation of order financials including shipping in customer total and addon wholesale costs
type: logic
---
**Customer total (`final_retail_price`)** = `Σ (retail_price * quantity) − discount_amount + shipping_fee`. Includes shipping — represents the full amount the customer pays.

**Total wholesale cost** = `Σ (product.wholesale_price + Σ addon.wholesale_price) * quantity`. Addons contribute their `wholesale_price` (option overrides addon; falls back to addon value when option's is null).

**Total merchant cost** (raw) = `Σ (product.merchant_price + Σ addon.price) * quantity`, then minus tier discount.

**Merchant net profit** (payout) = `final_retail_price − total_merchant_cost − shipping_fee`. Shipping is paid by the customer in the customer total but nets out of merchant payout (platform pays courier).

**Platform net profit** = `total_merchant_cost − total_wholesale_cost − Σ shipping_fee − expenses`. Includes addon wholesale cost so platform margin reflects real production costs (printing ink, packaging materials, etc.).

**Merchant payment requirement**: when `net_profit < 0` (retail too low to cover cost+shipping), merchant must upload an external payment receipt of `abs(net_profit)`.

All computation happens server-side in `create_order_with_validation` RPC; client-supplied financial fields are ignored.
