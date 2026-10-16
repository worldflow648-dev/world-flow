import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminGovernorate {
  id: string;
  name_ar: string;
  name_en: string | null;
  shipping_fee: number | null;
  is_active: boolean | null;
}

export const useAdminGovernorates = () => {
  return useQuery({
    queryKey: ['admin-governorates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governorates')
        .select('*')
        .order('name_ar');
      if (error) throw error;
      return data as AdminGovernorate[];
    },
  });
};

export const useUpdateGovernorate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, shipping_fee, is_active }: { id: string; shipping_fee: number; is_active: boolean }) => {
      const { error } = await supabase
        .from('governorates')
        .update({ shipping_fee, is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-governorates'] });
      queryClient.invalidateQueries({ queryKey: ['governorates'] });
    },
  });
};
