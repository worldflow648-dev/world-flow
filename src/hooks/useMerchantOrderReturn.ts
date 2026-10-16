import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MerchantOrderReturn {
  id: string;
  order_id: string;
  status: 'pending' | 'resent' | 'expired';
  deadline_at: string;
  wholesale_settled: boolean;
  wholesale_charge_amount: number | null;
  wholesale_charged_at: string | null;
  resent_at: string | null;
  original_customer_name: string | null;
  original_customer_phone: string | null;
  original_customer_phone2: string | null;
  original_governorate: string | null;
  original_region: string | null;
  original_landmark: string | null;
  resent_to_name: string | null;
  resent_to_phone: string | null;
  resent_to_phone2: string | null;
  resent_to_governorate: string | null;
  resent_to_region: string | null;
  resent_to_landmark: string | null;
}

/**
 * Fetch the order_returns row for a single order (for the merchant viewing
 * their own order). Returns null when no return exists for the order.
 */
export const useMerchantOrderReturn = (orderId: string | undefined) => {
  return useQuery({
    queryKey: ['merchant-order-return', orderId],
    queryFn: async (): Promise<MerchantOrderReturn | null> => {
      if (!orderId) return null;
      // An order can occasionally have multiple return rows (legacy/duplicates).
      // Use a list query and pick the most relevant one in JS so we never fail
      // on .maybeSingle() when more than one row happens to exist.
      const { data, error } = await supabase
        .from('order_returns')
        .select('id, order_id, status, deadline_at, wholesale_settled, wholesale_charge_amount, wholesale_charged_at, resent_at, created_at, original_customer_name, original_customer_phone, original_customer_phone2, original_governorate, original_region, original_landmark, resent_to_name, resent_to_phone, resent_to_phone2, resent_to_governorate, resent_to_region, resent_to_landmark')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Array<MerchantOrderReturn & { created_at?: string }>;
      if (rows.length === 0) return null;
      // Priority: pending → resent → expired, then newest (already ordered).
      const priority = (s: string) => (s === 'pending' ? 0 : s === 'resent' ? 1 : 2);
      const best = [...rows].sort((a, b) => priority(a.status) - priority(b.status))[0];
      return best ?? null;
    },
    enabled: !!orderId,
  });
};

/**
 * Fetch all of the current merchant's expired returns and return them as a
 * Map keyed by order_id. Used by the Orders list to decorate cards with a
 * "transferred to you" badge.
 */
export const useMerchantExpiredReturnsMap = () => {
  return useQuery({
    queryKey: ['merchant-expired-returns'],
    queryFn: async (): Promise<Map<string, MerchantOrderReturn>> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Map();

      const { data, error } = await supabase
        .from('order_returns')
        .select('id, order_id, status, deadline_at, wholesale_settled, wholesale_charge_amount, wholesale_charged_at')
        .eq('merchant_id', user.id)
        .eq('status', 'expired');

      if (error) throw error;
      const map = new Map<string, MerchantOrderReturn>();
      (data ?? []).forEach((row: any) => {
        map.set(row.order_id, row as MerchantOrderReturn);
      });
      return map;
    },
  });
};
