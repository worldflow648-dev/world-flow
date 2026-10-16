import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminProductVariant {
  id: string;
  size: string;
  color: string | null;
  color_hex: string | null;
  stock_level: number | null;
  is_active: boolean | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  merchant_price: number;
  wholesale_price: number;
  images: string[] | null;
  is_active: boolean | null;
  created_at: string;
  category: { name: string } | null;
  variants: AdminProductVariant[];
}

export const useAdminProducts = () => {
  return useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          variants:product_variants(id, size, color, color_hex, stock_level, is_active)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminProduct[];
    },
  });
};

// Helper to calculate total stock from variants.
// null stock_level = UNLIMITED (admin UI should render "∞" / "غير محدود").
// Returns Infinity when any variant is unmetered, otherwise the sum.
export const getTotalStock = (variants: AdminProductVariant[]): number => {
  if (variants.length === 0) return 0;
  if (variants.some(v => v.stock_level === null)) return Infinity;
  return variants.reduce((sum, v) => sum + (v.stock_level || 0), 0);
};

// Display helper: format stock for admin views (∞ for unlimited).
export const formatStockDisplay = (stock: number): string => {
  return Number.isFinite(stock) ? String(stock) : '∞';
};

// Format price in IQD
export const formatPrice = (price: number): string => {
  return price.toLocaleString('ar-IQ') + ' د.ع';
};

// Mutation to create a new product with variants
interface CreateProductData {
  name: string;
  name_en?: string;
  description?: string;
  category_id: string;
  merchant_price: number;
  wholesale_price: number;
  images?: string[];
  variants: { size: string; stock_level: number; color?: string; color_hex?: string }[];
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductData) => {
      // Insert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: data.name,
          name_en: data.name_en || null,
          description: data.description || null,
          category_id: data.category_id,
          merchant_price: data.merchant_price,
          wholesale_price: data.wholesale_price,
          images: data.images || null,
          is_active: true,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Insert variants if any
      if (data.variants.length > 0) {
        const variantInserts = data.variants.map(v => ({
          product_id: product.id,
          size: v.size,
          stock_level: v.stock_level,
          color: v.color || null,
          color_hex: v.color_hex || null,
          is_active: true,
        }));

        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(variantInserts);

        if (variantsError) throw variantsError;
      }

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Mutation to update an existing product
interface UpdateProductData {
  id: string;
  name?: string;
  name_en?: string;
  description?: string;
  category_id?: string;
  merchant_price?: number;
  wholesale_price?: number;
  images?: string[];
  is_active?: boolean;
}

// Mutation to update product variants
interface UpdateVariantData {
  product_id: string;
  variants: { size: string; stock_level: number; color?: string; color_hex?: string }[];
}

export const useUpdateProductVariants = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateVariantData) => {
      // Delete existing variants
      const { error: deleteError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', data.product_id);

      if (deleteError) throw deleteError;

      // Insert new variants
      if (data.variants.length > 0) {
        const variantInserts = data.variants.map(v => ({
          product_id: data.product_id,
          size: v.size,
          stock_level: v.stock_level,
          color: v.color || null,
          color_hex: v.color_hex || null,
          is_active: true,
        }));

        const { error: insertError } = await supabase
          .from('product_variants')
          .insert(variantInserts);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProductData) => {
      const { id, ...updates } = data;
      
      const { data: product, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Mutation to soft delete a product (set is_active = false)
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
