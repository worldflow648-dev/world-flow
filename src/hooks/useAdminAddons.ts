import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminAddonOption {
  id: string;
  addon_id: string;
  name: string;
  name_en: string | null;
  price: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface AdminAddon {
  id: string;
  name: string;
  name_en: string | null;
  tag: string | null;
  price: number;
  wholesale_price: number;
  is_active: boolean | null;
  requires_deposit: boolean | null;
  deposit_price: number | null;
  created_at: string;
  options?: AdminAddonOption[];
}

export const useAdminAddons = () => {
  return useQuery({
    queryKey: ['admin-addons'],
    queryFn: async () => {
      // Fetch addons
      const { data: addons, error: addonsError } = await supabase
        .from('product_addons')
        .select('*')
        .order('created_at', { ascending: false });

      if (addonsError) throw addonsError;

      // Fetch all active options
      const { data: options, error: optionsError } = await supabase
        .from('addon_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (optionsError) throw optionsError;

      // Map options to their addons
      const addonsWithOptions = addons.map(addon => ({
        ...addon,
        options: options?.filter(opt => opt.addon_id === addon.id) || [],
      }));

      return addonsWithOptions as AdminAddon[];
    },
  });
};

interface CreateAddonData {
  name: string;
  name_en?: string;
  tag?: string;
  price: number;
  wholesale_price?: number;
  requires_deposit?: boolean;
  deposit_price?: number;
}

export const useCreateAddon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAddonData) => {
      const { data: addon, error } = await supabase
        .from('product_addons')
        .insert({
          name: data.name,
          name_en: data.name_en || null,
          tag: data.tag || null,
          price: data.price,
          wholesale_price: data.wholesale_price ?? 0,
          is_active: true,
          requires_deposit: data.requires_deposit || false,
          deposit_price: data.deposit_price || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return addon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
      queryClient.invalidateQueries({ queryKey: ['addons'] });
    },
  });
};

interface UpdateAddonData {
  id: string;
  name?: string;
  name_en?: string;
  tag?: string;
  price?: number;
  wholesale_price?: number;
  is_active?: boolean;
  requires_deposit?: boolean;
  deposit_price?: number;
}

export const useUpdateAddon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateAddonData) => {
      const { id, ...updates } = data;
      
      const { data: addon, error } = await supabase
        .from('product_addons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return addon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
      queryClient.invalidateQueries({ queryKey: ['addons'] });
    },
  });
};

export const useDeleteAddon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addonId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('product_addons')
        .update({ is_active: false })
        .eq('id', addonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
      queryClient.invalidateQueries({ queryKey: ['addons'] });
    },
  });
};
