import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderReturn {
  id: string;
  order_id: string;
  merchant_id: string;
  status: 'pending' | 'resent' | 'expired';
  deadline_days: number;
  deadline_at: string;
  resent_to_name: string | null;
  resent_to_phone: string | null;
  resent_to_phone2: string | null;
  resent_to_governorate: string | null;
  resent_to_region: string | null;
  resent_to_landmark: string | null;
  resent_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  new_retail_price: number | null;
  wholesale_charge_amount: number | null;
  wholesale_charged_at: string | null;
  wholesale_charged_by: string | null;
  wholesale_settled: boolean;
  // Joined fields
  order_number?: string;
  customer_name?: string;
  merchant_name?: string;
  order_status?: string;
  order_total_wholesale_cost?: number;
}

export const useOrderReturns = () => {
  return useQuery({
    queryKey: ['order-returns'],
    queryFn: async () => {
      const { data: returns, error } = await supabase
        .from('order_returns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!returns || returns.length === 0) return [] as OrderReturn[];

      // Get order details
      const orderIds = [...new Set(returns.map(r => r.order_id))];
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, status, total_wholesale_cost')
        .in('id', orderIds);

      const orderMap = new Map(orders?.map(o => [o.id, o]) || []);

      // Get merchant names
      const merchantIds = [...new Set(returns.map(r => r.merchant_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', merchantIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return returns.map(r => ({
        ...r,
        status: r.status as 'pending' | 'resent' | 'expired',
        order_number: orderMap.get(r.order_id)?.order_number || '',
        customer_name: orderMap.get(r.order_id)?.customer_name || '',
        merchant_name: profileMap.get(r.merchant_id) || '',
        order_status: orderMap.get(r.order_id)?.status || '',
        order_total_wholesale_cost: Number(orderMap.get(r.order_id)?.total_wholesale_cost || 0),
      })) as OrderReturn[];
    },
  });
};

export const useCreateReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, merchantId, deadlineDays = 7 }: {
      orderId: string;
      merchantId: string;
      deadlineDays?: number;
    }) => {
      const deadlineAt = new Date();
      deadlineAt.setDate(deadlineAt.getDate() + deadlineDays);

      const { error } = await supabase
        .from('order_returns')
        .insert({
          order_id: orderId,
          merchant_id: merchantId,
          deadline_days: deadlineDays,
          deadline_at: deadlineAt.toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
    },
  });
};

export const useResendReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ returnId, data }: {
      returnId: string;
      data: {
        resent_to_name: string;
        resent_to_phone: string;
        resent_to_phone2?: string;
        resent_to_governorate: string;
        resent_to_region?: string;
        resent_to_landmark?: string;
        new_retail_price?: number | null;
        discount_code?: string | null;
        discount_amount?: number | null;
        discount_base_price?: number | null;
      };
    }) => {
      const { data: returnRow, error: fetchError } = await supabase
        .from('order_returns')
        .select('order_id')
        .eq('id', returnId)
        .single();

      if (fetchError) throw fetchError;

      // Snapshot the original buyer (currently still on the order row) so the
      // app can show both the original and the new buyer after the resend.
      let originalSnapshot: Record<string, string | null> = {};
      let currentFinalRetailPrice: number | null = null;
      if (returnRow?.order_id) {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('customer_name, customer_phone, customer_phone2, governorate, region, landmark, final_retail_price')
          .eq('id', returnRow.order_id)
          .single();
        if (orderRow) {
          originalSnapshot = {
            original_customer_name: orderRow.customer_name ?? null,
            original_customer_phone: orderRow.customer_phone ?? null,
            original_customer_phone2: orderRow.customer_phone2 ?? null,
            original_governorate: orderRow.governorate ?? null,
            original_region: orderRow.region ?? null,
            original_landmark: orderRow.landmark ?? null,
          };
          currentFinalRetailPrice = Number(orderRow.final_retail_price) || 0;
        }
      }

      const { error } = await supabase
        .from('order_returns')
        .update({
          ...data,
          ...originalSnapshot,
          status: 'resent',
          resent_at: new Date().toISOString(),
        } as any)
        .eq('id', returnId);

      if (error) throw error;

      if (returnRow?.order_id) {
        const orderUpdate: Record<string, unknown> = {
          status: 'resent',
          // Sync the new buyer's contact details onto the order itself so the
          // merchant, admin, staff, and shipping label all show the new
          // recipient — not the original (failed) one.
          customer_name: data.resent_to_name,
          customer_phone: data.resent_to_phone,
          customer_phone2: data.resent_to_phone2 ?? null,
          governorate: data.resent_to_governorate,
          region: data.resent_to_region ?? null,
          landmark: data.resent_to_landmark ?? null,
        };

        // Decide the base retail price to apply discount against.
        const basePrice =
          data.discount_base_price && data.discount_base_price > 0
            ? data.discount_base_price
            : data.new_retail_price && data.new_retail_price > 0
              ? data.new_retail_price
              : currentFinalRetailPrice ?? 0;

        const hasDiscount =
          !!data.discount_code &&
          !!data.discount_amount &&
          data.discount_amount > 0 &&
          basePrice > 0;

        if (hasDiscount) {
          orderUpdate.discount_code = data.discount_code;
          orderUpdate.discount_amount = data.discount_amount;
          orderUpdate.final_retail_price = Math.max(basePrice - (data.discount_amount as number), 0);
        } else if (data.new_retail_price && data.new_retail_price > 0) {
          orderUpdate.final_retail_price = data.new_retail_price;
        }

        const { error: orderError } = await supabase
          .from('orders')
          .update(orderUpdate)
          .eq('id', returnRow.order_id);

        if (orderError) throw orderError;

        // Best-effort: bump the discount code's usage counter (don't fail the resend).
        if (hasDiscount && data.discount_code) {
          try {
            await supabase.rpc('increment_discount_used_count', { code_text: data.discount_code });
          } catch {
            // ignore — resend already succeeded
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-order'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-order-return'] });
    },
  });
};

export const useAdminResendReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ returnId, data }: {
      returnId: string;
      data: {
        resent_to_name: string;
        resent_to_phone: string;
        resent_to_phone2?: string;
        resent_to_governorate: string;
        resent_to_region?: string;
        resent_to_landmark?: string;
        new_retail_price?: number | null;
        discount_code?: string | null;
        discount_amount?: number | null;
        discount_base_price?: number | null;
      };
    }) => {
      const { error } = await supabase.rpc('admin_resend_returned_order', {
        p_return_id: returnId,
        p_resent_to_name: data.resent_to_name,
        p_resent_to_phone: data.resent_to_phone,
        p_resent_to_phone2: data.resent_to_phone2 ?? null,
        p_resent_to_governorate: data.resent_to_governorate,
        p_resent_to_region: data.resent_to_region ?? null,
        p_resent_to_landmark: data.resent_to_landmark ?? null,
        p_new_retail_price: data.new_retail_price ?? null,
        p_discount_code: data.discount_code ?? null,
        p_discount_amount: data.discount_amount ?? null,
        p_discount_base_price: data.discount_base_price ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-order'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-order-return'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};

export const useChargeMerchantWholesale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (returnId: string) => {
      const { data, error } = await supabase.rpc('charge_merchant_wholesale', { p_return_id: returnId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};

export interface ExpireReturnArgs {
  returnId: string;
  chargeWholesale?: boolean;
  wholesaleSettled?: boolean;
}

export interface ExpireReturnResult {
  charged: boolean;
  amount: number;
}

export const useUpdateReturnDeadline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ returnId, deadlineDays, createdAt }: {
      returnId: string;
      deadlineDays: number;
      createdAt: string;
    }) => {
      const deadlineAt = new Date(createdAt);
      deadlineAt.setDate(deadlineAt.getDate() + deadlineDays);

      const { error } = await supabase
        .from('order_returns')
        .update({
          deadline_days: deadlineDays,
          deadline_at: deadlineAt.toISOString(),
        })
        .eq('id', returnId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
    },
  });
};

export const useExpireReturn = () => {
  const queryClient = useQueryClient();

  return useMutation<ExpireReturnResult, Error, ExpireReturnArgs>({
    mutationFn: async ({ returnId, chargeWholesale = false, wholesaleSettled = false }) => {
      let charged = false;
      let amount = 0;

      if (chargeWholesale && !wholesaleSettled) {
        const { data, error: chargeError } = await supabase.rpc('charge_merchant_wholesale', {
          p_return_id: returnId,
          p_reason: 'expired',
        });
        if (chargeError) throw chargeError;
        charged = true;
        amount = Number(data) || 0;
      }

      const { error } = await supabase
        .from('order_returns')
        .update({ status: 'expired' })
        .eq('id', returnId);

      if (error) throw error;
      return { charged, amount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};
