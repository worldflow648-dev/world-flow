import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AddonOption {
  id: string;
  addon_id: string;
  name: string;
  name_en: string | null;
  price: number | null;
  wholesale_price: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export const useAddonOptions = (addonId: string | null) => {
  return useQuery({
    queryKey: ['addon-options', addonId],
    queryFn: async () => {
      if (!addonId) return [];
      
      const { data, error } = await supabase
        .from('addon_options')
        .select('*')
        .eq('addon_id', addonId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as AddonOption[];
    },
    enabled: !!addonId,
  });
};

export const useAllAddonOptions = () => {
  return useQuery({
    queryKey: ['all-addon-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_options')
        .select('*')
        .order('addon_id')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as AddonOption[];
    },
  });
};

interface CreateAddonOptionData {
  addon_id: string;
  name: string;
  name_en?: string;
  price?: number | null;
  wholesale_price?: number | null;
  sort_order?: number;
}

export const useCreateAddonOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAddonOptionData) => {
      const { data: option, error } = await supabase
        .from('addon_options')
        .insert({
          addon_id: data.addon_id,
          name: data.name,
          name_en: data.name_en || null,
          price: data.price ?? null,
          wholesale_price: data.wholesale_price ?? null,
          sort_order: data.sort_order ?? 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return option;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['addon-options', variables.addon_id] });
      queryClient.invalidateQueries({ queryKey: ['all-addon-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
    },
  });
};

interface UpdateAddonOptionData {
  id: string;
  addon_id?: string;
  name?: string;
  name_en?: string | null;
  price?: number | null;
  wholesale_price?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

export const useUpdateAddonOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateAddonOptionData) => {
      const { id, ...updates } = data;
      
      const { data: option, error } = await supabase
        .from('addon_options')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return option;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
      queryClient.invalidateQueries({ queryKey: ['all-addon-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
    },
  });
};

export const useDeleteAddonOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (optionId: string) => {
      // Soft delete
      const { error } = await supabase
        .from('addon_options')
        .update({ is_active: false })
        .eq('id', optionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-options'] });
      queryClient.invalidateQueries({ queryKey: ['all-addon-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin-addons'] });
      queryClient.invalidateQueries({ queryKey: ['product-addons'] });
    },
  });
};
