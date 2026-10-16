import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductVariant {
  id: string;
  size: string;
  color: string | null;
  color_hex: string | null;
  stock_level: number;
  is_active: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  name_en: string | null;
}

export interface Product {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  merchant_price: number;
  wholesale_price: number;
  images: string[] | null;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  category: ProductCategory | null;
  variants: ProductVariant[];
}

interface UseProductsOptions {
  categoryId?: string;
  limit?: number;
  search?: string;
}

export const useProducts = (options?: UseProductsOptions) => {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, name_en),
          variants:product_variants(id, size, color, color_hex, stock_level, is_active)
        `)
        .eq('is_active', true);

      if (options?.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter active variants only
      return (data as Product[]).map(product => ({
        ...product,
        variants: product.variants?.filter(v => v.is_active) || [],
      }));
    },
  });
};

export const useProductById = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name, name_en),
          variants:product_variants(id, size, color, color_hex, stock_level, is_active)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      // Filter active variants only
      return {
        ...data,
        variants: data.variants?.filter((v: ProductVariant) => v.is_active) || [],
      } as Product;
    },
    enabled: !!id,
  });
};

// Calculate total stock for a product.
// null `stock_level` means UNLIMITED (matches DB `check_and_decrement_stock` semantics) → return Infinity.
export const getTotalStock = (product: Product): number => {
  const variants = product.variants || [];
  if (variants.length === 0) return 0;
  if (variants.some(v => v.stock_level === null)) return Infinity;
  return variants.reduce((sum, v) => sum + (v.stock_level || 0), 0);
};
