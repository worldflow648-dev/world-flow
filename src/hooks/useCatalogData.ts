import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  name_en?: string | null;
  icon?: string | null;
}

export interface ProductAddonOption {
  id: string;
  addon_id: string;
  name: string;
  name_en: string | null;
  price: number | null;
  sort_order: number;
}

export interface ProductAddon {
  id: string;
  name: string;
  name_en?: string | null;
  price: number;
  requires_deposit?: boolean | null;
  deposit_price?: number | null;
  options?: ProductAddonOption[];
}

export interface Governorate {
  id: string;
  name_ar: string;
  name_en: string | null;
  shipping_fee: number | null;
}

// Admin categories (id + name only)
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
};

// Storefront categories (with icon for display)
export const useStorefrontCategories = () => {
  return useQuery({
    queryKey: ['storefront-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_en, icon')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
};

export const useAddons = () => {
  return useQuery({
    queryKey: ['product-addons'],
    queryFn: async () => {
      // Fetch addons
      const { data: addons, error: addonsError } = await supabase
        .from('product_addons')
        .select('id, name, name_en, price, requires_deposit, deposit_price')
        .eq('is_active', true);

      if (addonsError) throw addonsError;

      // Fetch all active options
      const { data: options, error: optionsError } = await supabase
        .from('addon_options')
        .select('id, addon_id, name, name_en, price, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (optionsError) throw optionsError;

      // Map options to their addons
      const addonsWithOptions = addons.map(addon => ({
        ...addon,
        options: options?.filter(opt => opt.addon_id === addon.id) || [],
      }));

      return addonsWithOptions as ProductAddon[];
    },
  });
};

export const useGovernorates = () => {
  return useQuery({
    queryKey: ['governorates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governorates')
        .select('id, name_ar, name_en, shipping_fee')
        .eq('is_active', true);

      if (error) throw error;
      return data as Governorate[];
    },
  });
};

// Format price in IQD
export const formatPrice = (price: number): string => {
  return price.toLocaleString('ar-IQ') + ' د.ع';
};
