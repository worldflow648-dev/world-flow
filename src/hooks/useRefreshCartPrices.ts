import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

/**
 * Refreshes cart item prices against the live `products` table on mount.
 * - Updates merchant_price / wholesale_price in cart state if changed.
 * - Surfaces a one-time toast if any prices changed.
 * - Returns a Set of inactive product IDs (caller can warn / block checkout).
 */
export function useRefreshCartPrices() {
  const { items, updateItemPrices, getInactiveProductIds, setInactiveProductIds } = useCart();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (items.length === 0) return;
    ranRef.current = true;

    const productIds = Array.from(new Set(items.map(i => i.product.id)));

    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, merchant_price, wholesale_price, is_active, name')
        .in('id', productIds);

      if (error || !data) return;

      const updates: { id: string; merchant_price: number; wholesale_price: number }[] = [];
      const inactive: string[] = [];
      let anyPriceChange = false;

      for (const item of items) {
        const fresh = data.find(p => p.id === item.product.id);
        if (!fresh) continue;
        if (!fresh.is_active) inactive.push(fresh.id);
        if (
          Number(fresh.merchant_price) !== Number(item.product.merchant_price) ||
          Number(fresh.wholesale_price) !== Number(item.product.wholesale_price)
        ) {
          updates.push({
            id: item.product.id,
            merchant_price: Number(fresh.merchant_price),
            wholesale_price: Number(fresh.wholesale_price),
          });
          anyPriceChange = true;
        }
      }

      if (updates.length > 0) updateItemPrices(updates);
      setInactiveProductIds(inactive);

      if (anyPriceChange) {
        toast.info("تم تحديث أسعار بعض المنتجات في سلتك");
      }
      if (inactive.length > 0) {
        toast.warning("بعض المنتجات في سلتك لم تعد متاحة");
      }
    })();
  }, [items, updateItemPrices, setInactiveProductIds]);

  return { inactiveProductIds: getInactiveProductIds() };
}
