import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  size: string;
  color: string | null;
  quantity: number;
  merchant_price: number;
  wholesale_price: number;
  retail_price: number;
  addons: any;
  design_file_url: string | null;
  mockup_file_url: string | null;
  design_file_urls: string[] | null;
  mockup_file_urls: string[] | null;
}

export interface MerchantOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  estimated_delivery: string | null;
  delivered_at: string | null;
  customer_name: string;
  customer_phone: string;
  governorate: string;
  region: string | null;
  landmark: string | null;
  merchant_notes: string | null;
  shipping_fee: number | null;
  total_merchant_cost: number;
  total_wholesale_cost: number;
  final_retail_price: number;
  net_profit: number;
  items: OrderItem[];
}

export const useMerchantOrders = () => {
  return useQuery({
    queryKey: ['merchant-orders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MerchantOrder[];
    },
  });
};

export const useMerchantOrderById = (orderId: string) => {
  return useQuery({
    queryKey: ['merchant-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as MerchantOrder;
    },
    enabled: !!orderId,
  });
};

interface CreateOrderData {
  customer_name: string;
  customer_phone: string;
  customer_phone2?: string;
  governorate: string;
  region?: string;
  landmark?: string;
  merchant_notes?: string;
  shipping_fee: number;
  total_merchant_cost: number;
  total_wholesale_cost: number;
  final_retail_price: number;
  net_profit: number;
  discount_code?: string;
  discount_amount?: number;
  deposit_amount?: number;
  deposit_receipt_url?: string;
  merchant_payment_amount?: number;
  merchant_payment_receipt_url?: string;
  items: Omit<OrderItem, 'id'>[];
}

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'يجب تسجيل الدخول',
  NOT_MERCHANT: 'هذا الإجراء متاح للتجار فقط',
  NO_ITEMS: 'لا توجد منتجات في الطلب',
  INVALID_GOVERNORATE: 'المحافظة غير صالحة',
  INVALID_PRODUCT: 'منتج غير صالح',
  INVALID_QUANTITY: 'الكمية غير صالحة',
  PRODUCT_NOT_FOUND: 'المنتج غير متوفر',
  INVALID_VARIANT: 'حجم المنتج غير صالح',
  AMBIGUOUS_VARIANT: 'يرجى تحديد لون المنتج قبل المتابعة',
  INVALID_ADDON: 'إضافة غير صالحة',
  ADDON_NOT_FOUND: 'الإضافة غير متوفرة',
  ADDON_OPTION_NOT_FOUND: 'خيار الإضافة غير متوفر',
  INVALID_DISCOUNT_CODE: 'كود الخصم غير صالح',
  DISCOUNT_USED_UP: 'كود الخصم مستنفذ',
  DISCOUNT_MIN_ORDER: 'لم يتم الوصول للحد الأدنى لكود الخصم',
  DISCOUNT_PRODUCT_MISMATCH: 'كود الخصم لا ينطبق على هذه المنتجات',
  DISCOUNT_IS_PRODUCT_SPECIFIC: 'هذا كود مخصص لمنتج معين — طبّقه من صفحة المنتج',
  MERCHANT_PAYMENT_RECEIPT_REQUIRED: 'يجب رفع وصل دفع التاجر',
};


function translateOrderError(message: string): string {
  // Postgres exceptions are formatted like "OUT_OF_STOCK:Product Name"
  const code = message.split(':')[0].trim();
  if (code === 'OUT_OF_STOCK') {
    const name = message.split(':').slice(1).join(':').trim();
    return `المنتج "${name}" غير متوفر بالكمية المطلوبة`;
  }
  if (code === 'ZERO_RETAIL_PRICE') {
    const name = message.split(':').slice(1).join(':').trim();
    return `سعر البيع غير صالح للمنتج "${name}"`;
  }
  if (code === 'BELOW_COST') {
    const name = message.split(':').slice(1).join(':').trim();
    return `سعر البيع أقل من التكلفة للمنتج "${name}"`;
  }
  if (code === 'AMBIGUOUS_VARIANT') {
    const name = message.split(':').slice(1).join(':').trim();
    return `يرجى تحديد لون المنتج "${name}" قبل المتابعة`;
  }
  if (code === 'ITEM_DISCOUNT_INVALID') {
    const name = message.split(':').slice(1).join(':').trim();
    return `كود خصم غير صالح على المنتج "${name}"`;
  }
  if (code === 'ITEM_DISCOUNT_USED_UP') {
    const name = message.split(':').slice(1).join(':').trim();
    return `كود الخصم مستنفذ على المنتج "${name}"`;
  }
  if (code === 'ITEM_DISCOUNT_IS_STOREWIDE') {
    const name = message.split(':').slice(1).join(':').trim();
    return `الكود على "${name}" هو كود عام — طبّقه من صفحة الدفع`;
  }
  if (code === 'ITEM_DISCOUNT_PRODUCT_MISMATCH') {
    const name = message.split(':').slice(1).join(':').trim();
    return `كود الخصم غير صالح للمنتج "${name}"`;
  }
  return ORDER_ERROR_MESSAGES[code] || message;
}


export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Build trusted payload — server recomputes prices, shipping, profit.
      // Pass explicit variant_id + color so server can resolve unambiguously.
      const itemsPayload = orderData.items.map((item: any) => ({
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        size: item.size,
        color: item.color ?? null,
        quantity: item.quantity,
        retail_price: item.retail_price,
        design_file_url: item.design_file_url,
        mockup_file_url: item.mockup_file_url,
        addons: Array.isArray(item.addons) ? item.addons : [],
        discount_code: item.discount_code ?? null,
      }));


      const { data: orderId, error } = await supabase.rpc('create_order_with_validation' as any, {
        p_customer_name: orderData.customer_name,
        p_customer_phone: orderData.customer_phone,
        p_customer_phone2: orderData.customer_phone2 ?? null,
        p_governorate: orderData.governorate,
        p_region: orderData.region ?? null,
        p_landmark: orderData.landmark ?? null,
        p_merchant_notes: orderData.merchant_notes ?? null,
        p_discount_code: orderData.discount_code ?? null,
        p_deposit_receipt_url: orderData.deposit_receipt_url ?? null,
        p_merchant_payment_receipt_url: orderData.merchant_payment_receipt_url ?? null,
        p_items: itemsPayload,
      });

      if (error) {
        throw new Error(translateOrderError(error.message));
      }

      return { id: orderId as unknown as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // First verify the order is in pending status
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      if (order.status !== 'pending') {
        throw new Error('يمكن إلغاء الطلبات المعلقة فقط');
      }


      // Update order status to cancelled
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Restore stock for cancelled order items
      await supabase.rpc('restore_order_stock' as any, { p_order_id: orderId });

      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard-orders'] });
    },
  });
};

// Real-time subscription for order status changes
export const useOrderStatusSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          // Invalidate queries to refetch updated data
          queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            queryClient.invalidateQueries({ queryKey: ['merchant-order', payload.new.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
