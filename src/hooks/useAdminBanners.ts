import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  link: string | null;
  bg_gradient: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
}

export type BannerInsert = Omit<Banner, 'id' | 'created_at'>;

export const useAdminBanners = () => {
  return useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners' as any)
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as unknown as Banner[];
    },
  });
};

export const useActiveBanners = () => {
  return useQuery({
    queryKey: ['active-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as unknown as Banner[];
    },
  });
};

export const useCreateBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banner: BannerInsert) => {
      const { error } = await supabase.from('banners' as any).insert(banner as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
};

export const useUpdateBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BannerInsert> }) => {
      const { error } = await supabase.from('banners' as any).update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
};

export const useDeleteBanner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banners' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });
};
