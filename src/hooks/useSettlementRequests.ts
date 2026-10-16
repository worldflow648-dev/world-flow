import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SettlementRequest {
  id: string;
  merchant_id: string;
  amount: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const usePendingSettlementRequest = () => {
  return useQuery({
    queryKey: ['my-pending-settlement-request'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('settlement_requests' as any)
        .select('*')
        .eq('merchant_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0) ? data[0] as unknown as SettlementRequest : null;
    },
  });
};

export const useCreateSettlementRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('settlement_requests' as any)
        .insert({ merchant_id: user.id, amount, status: 'pending' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-pending-settlement-request'] });
    },
  });
};

// Admin: fetch all pending settlement requests
export const useAdminSettlementRequests = () => {
  return useQuery({
    queryKey: ['admin-settlement-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlement_requests' as any)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SettlementRequest[];
    },
  });
};

export const useUpdateSettlementRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const { error } = await supabase
        .from('settlement_requests' as any)
        .update({ status, admin_notes, resolved_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settlement-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};
