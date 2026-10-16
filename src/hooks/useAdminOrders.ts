import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

export interface AdminOrder {
  id: string;
  order_number: string;
  customer_name: string;
  governorate: string;
  status: OrderStatus | null;
  final_retail_price: number;
  created_at: string;
  merchant: { full_name: string } | null;
  merchant_tier: string | null;
  deposit_amount: number | null;
  deposit_verified: boolean | null;
  merchant_payment_amount: number | null;
  merchant_payment_verified: boolean | null;
  is_hidden: boolean;
}

export const useAdminOrders = () => {
  return useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      // Fetch orders first
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          governorate,
          status,
          final_retail_price,
          created_at,
          merchant_id,
          deposit_amount,
          deposit_verified,
          merchant_payment_amount,
          merchant_payment_verified,
          is_hidden
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      if (!ordersData || ordersData.length === 0) return [] as AdminOrder[];

      // Get unique merchant IDs
      const merchantIds = [...new Set(ordersData.map(o => o.merchant_id))];
      
      // Fetch merchant profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, merchant_tier')
        .in('id', merchantIds);

      if (profilesError) throw profilesError;

      // Create a map of merchant_id to profile
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine orders with merchant info
      return ordersData.map(order => {
        const profile = profileMap.get(order.merchant_id);
        return {
          id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          governorate: order.governorate,
          status: order.status,
          final_retail_price: order.final_retail_price,
          created_at: order.created_at,
          merchant: profile ? { full_name: profile.full_name } : null,
          merchant_tier: profile?.merchant_tier || null,
          deposit_amount: order.deposit_amount,
          deposit_verified: order.deposit_verified,
          merchant_payment_amount: order.merchant_payment_amount,
          merchant_payment_verified: order.merchant_payment_verified,
          is_hidden: (order as any).is_hidden ?? false,
        };
      }) as AdminOrder[];
    },
  });
};

export const useToggleOrderHidden = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, hidden }: { orderId: string; hidden: boolean }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ is_hidden: hidden } as any)
        .eq('id', orderId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('UPDATE_FAILED');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('DELETE_FAILED');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-accounting'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
    },
  });
};

// Bulk update order status
export const useBulkUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .in('id', orderIds);

      if (error) throw error;

      // For each order moved to 'returned', let the server decide whether to
      // open a fresh pending return or auto-charge wholesale (2nd return).
      if (status === 'returned') {
        await Promise.all(
          orderIds.map((id) => supabase.rpc('handle_order_returned' as any, { p_order_id: id }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      // Restore stock when order is cancelled
      if (status === 'cancelled') {
        await supabase.rpc('restore_order_stock' as any, { p_order_id: orderId });
      }

      // Server-side handler decides what to do based on prior return history:
      //   - first return  → opens a fresh pending return (7-day deadline).
      //   - second return (after a resend) → auto-charges merchant wholesale
      //     and finalises the return so it can no longer be resent.
      if (status === 'returned') {
        const { error: rpcError } = await supabase.rpc(
          'handle_order_returned' as any,
          { p_order_id: orderId }
        );
        if (rpcError) throw rpcError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-returns'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-order-return'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};

// Admin edit order (customer data + pricing) - only for pending/processing
export interface AdminEditOrderResult {
  paymentRequirementChanged: boolean;
  newMerchantPaymentAmount: number;
  receiptCleared: boolean;
}

export const useAdminEditOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<AdminEditOrderResult, Error, {
    orderId: string;
    updates: {
      customer_name?: string;
      customer_phone?: string;
      customer_phone2?: string;
      governorate?: string;
      region?: string;
      landmark?: string;
      final_retail_price?: number;
    };
  }>({
    mutationFn: async ({ orderId, updates }) => {
      // Verify order is still pending or processing + fetch all fields needed for recalc
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('status, total_merchant_cost, final_retail_price, shipping_fee, governorate, merchant_payment_amount, merchant_payment_verified, merchant_payment_receipt_url')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      if (!order || (order.status !== 'pending' && order.status !== 'processing')) {
        throw new Error('لا يمكن تعديل الطلب بعد مرحلة التجهيز');
      }

      const finalUpdates: any = { ...updates };

      // If governorate changed, fetch new shipping fee
      let newShippingFee: number | null = null;
      const governorateChanged =
        updates.governorate !== undefined && updates.governorate !== order.governorate;

      if (governorateChanged) {
        const { data: gov, error: govError } = await supabase
          .from('governorates')
          .select('shipping_fee')
          .eq('name_ar', updates.governorate!)
          .maybeSingle();

        if (govError) throw govError;
        newShippingFee = gov?.shipping_fee ?? null;
        if (newShippingFee !== null) {
          finalUpdates.shipping_fee = newShippingFee;
        }
      }

      const priceChanged =
        updates.final_retail_price !== undefined &&
        updates.final_retail_price !== order.final_retail_price;

      let paymentRequirementChanged = false;
      let newMerchantPaymentAmount = Number(order.merchant_payment_amount ?? 0);
      let receiptCleared = false;

      // Recalculate net_profit + merchant_payment_amount when price OR governorate changed
      if (priceChanged || governorateChanged) {
        const effectiveRetail = updates.final_retail_price ?? Number(order.final_retail_price);
        const effectiveShipping =
          newShippingFee ?? Number(order.shipping_fee ?? 0);

        const newNetProfit =
          effectiveRetail - Number(order.total_merchant_cost) - effectiveShipping;
        const computedPaymentAmount = newNetProfit < 0 ? Math.abs(newNetProfit) : 0;

        finalUpdates.net_profit = newNetProfit;
        finalUpdates.merchant_payment_amount = computedPaymentAmount;

        const oldPaymentAmount = Number(order.merchant_payment_amount ?? 0);
        if (computedPaymentAmount !== oldPaymentAmount) {
          paymentRequirementChanged = true;
          newMerchantPaymentAmount = computedPaymentAmount;

          // Stale receipt: required amount changed → clear verification + receipt
          if (order.merchant_payment_verified || order.merchant_payment_receipt_url) {
            finalUpdates.merchant_payment_verified = false;
            finalUpdates.merchant_payment_receipt_url = null;
            receiptCleared = true;
          }
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(finalUpdates)
        .eq('id', orderId);

      if (error) throw error;

      return { paymentRequirementChanged, newMerchantPaymentAmount, receiptCleared };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-details'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders-financial'] });
    },
  });
};

export const formatPrice = (price: number): string => {
  return price.toLocaleString('ar-IQ') + ' د.ع';
};
