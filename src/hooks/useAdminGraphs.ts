import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OrdersByStatus {
  status: string;
  count: number;
}

interface OrdersTrend {
  date: string;
  count: number;
}

export function useOrdersByStatus() {
  return useQuery({
    queryKey: ['admin-orders-by-status'],
    queryFn: async (): Promise<OrdersByStatus[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('status');

      if (error) throw error;

      const grouped = (data || []).reduce((acc, order) => {
        const status = order.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped).map(([status, count]) => ({
        status,
        count,
      }));
    },
  });
}

export function useOrdersTrend(days: number = 30) {
  return useQuery({
    queryKey: ['admin-orders-trend', days],
    queryFn: async (): Promise<OrdersTrend[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const grouped = (data || []).reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Fill in missing days
      const result: OrdersTrend[] = [];
      const current = new Date(startDate);
      const today = new Date();
      while (current <= today) {
        const dateStr = current.toISOString().split('T')[0];
        result.push({ date: dateStr, count: grouped[dateStr] || 0 });
        current.setDate(current.getDate() + 1);
      }

      return result;
    },
  });
}
