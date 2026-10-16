import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Product } from "@/hooks/useProducts";

export interface CartItemAddon {
  id: string;
  name: string;
  price: number;
  optionId?: string;
  optionName?: string;
  requires_deposit?: boolean;
  deposit_price?: number;
}

export interface CartItem {
  id: string;
  product: Product;
  selectedSize: string;
  selectedColor: string | null;
  selectedVariantId: string | null;
  quantity: number;
  addons: CartItemAddon[];
  designFiles?: File[];
  mockupFiles?: File[];
  retailPrice: number;
  discountCode?: string;
  discountAmount?: number; // per single unit
}

// Serializable version (no File objects)
interface SerializableCartItem {
  id: string;
  product: Product;
  selectedSize: string;
  selectedColor?: string | null;
  selectedVariantId?: string | null;
  quantity: number;
  addons: CartItemAddon[];
  retailPrice: number;
  discountCode?: string;
  discountAmount?: number;
}


const CART_STORAGE_KEY = 'cart_items';

function loadCartFromStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed: SerializableCartItem[] = JSON.parse(stored);
    return parsed.map(item => ({
      ...item,
      // Back-compat defaults for carts saved before color was tracked
      selectedColor: item.selectedColor ?? null,
      selectedVariantId: item.selectedVariantId ?? null,
      designFiles: undefined,
      mockupFiles: undefined,
    }));
  } catch {
    return [];
  }
}

function saveCartToStorage(items: CartItem[]) {
  try {
    const serializable: SerializableCartItem[] = items.map(({ designFiles, mockupFiles, ...rest }) => rest);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Storage full or unavailable
  }
}


interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  updateItemPrices: (updates: { id: string; merchant_price: number; wholesale_price: number }[]) => void;
  setInactiveProductIds: (ids: string[]) => void;
  getInactiveProductIds: () => string[];
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getAddonsTotal: () => number;
  getTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [inactiveIds, setInactiveIds] = useState<string[]>([]);

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    const newItem: CartItem = {
      ...item,
      id: `${item.product.id}-${item.selectedSize}-${item.selectedColor ?? 'nocolor'}-${Date.now()}`,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const updateItemPrices = useCallback(
    (updates: { id: string; merchant_price: number; wholesale_price: number }[]) => {
      if (updates.length === 0) return;
      setItems((prev) =>
        prev.map((item) => {
          const u = updates.find((x) => x.id === item.product.id);
          if (!u) return item;
          return {
            ...item,
            product: {
              ...item.product,
              merchant_price: u.merchant_price,
              wholesale_price: u.wholesale_price,
            },
          };
        })
      );
    },
    []
  );

  const setInactiveProductIds = useCallback((ids: string[]) => {
    setInactiveIds(ids);
  }, []);

  const getInactiveProductIds = useCallback(() => inactiveIds, [inactiveIds]);

  const clearCart = useCallback(() => {
    setItems([]);
    setInactiveIds([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const getSubtotal = useCallback(() => {
    return items.reduce(
      (sum, item) => sum + item.product.merchant_price * item.quantity,
      0
    );
  }, [items]);

  const getAddonsTotal = useCallback(() => {
    return items.reduce((sum, item) => {
      const itemAddonsTotal = item.addons.reduce((a, addon) => a + addon.price, 0);
      return sum + itemAddonsTotal * item.quantity;
    }, 0);
  }, [items]);

  const getTotal = useCallback(() => {
    return getSubtotal() + getAddonsTotal();
  }, [getSubtotal, getAddonsTotal]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItemQuantity,
        updateItemPrices,
        setInactiveProductIds,
        getInactiveProductIds,
        clearCart,
        getItemCount,
        getSubtotal,
        getAddonsTotal,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
