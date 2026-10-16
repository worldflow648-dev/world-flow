import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

// Mutation to update order status
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-order-item'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });
};

// Mutation to add notes to order status history
export type IssueUrgency = 'low' | 'medium' | 'high';

export const useReportOrderIssue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, issueType, urgency = 'medium' }: { orderId: string; issueType: string; urgency?: IssueUrgency }) => {
      // Get current order status
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Insert into status history with notes (urgency parsed by DB trigger)
      const { error } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          old_status: order.status,
          new_status: order.status as OrderStatus,
          notes: `مشكلة: ${issueType} | urgency:${urgency}`,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });
};

export interface StaffOrderItem {
  id: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  size: string;
  color: string | null;
  quantity: number;
  designFileUrl: string | null;
  mockupFileUrl: string | null;
  designFileUrls: string[];
  mockupFileUrls: string[];
  productImage: string | null;
  orderStatus: 'pending' | 'processing';
  createdAt: string;
  merchantId: string;
  merchantName: string;
  merchantTier: string | null;
  merchantNotes: string | null;
  customerName: string;
  customerPhone: string;
  customerGovernorate: string;
  customerAddress: string;
  hasGiftWrapping: boolean;
  hasSpecialPrint: boolean;
  depositAmount: number;
  depositReceiptUrl: string | null;
  depositVerified: boolean;
  merchantPaymentAmount: number;
  merchantPaymentReceiptUrl: string | null;
  merchantPaymentVerified: boolean;
}

export interface StaffStats {
  processedToday: number;
  pendingCount: number;
  issuesCount: number;
}

// Helper to detect addons
const hasAddon = (addons: Json | null, addonId: string): boolean => {
  if (!addons || !Array.isArray(addons)) return false;
  return addons.some((addon: any) => addon?.id === addonId || addon?.name?.includes(addonId));
};

// Format customer address from region and landmark
const formatAddress = (region: string | null, landmark: string | null): string => {
  return [region, landmark].filter(Boolean).join(' - ') || 'غير محدد';
};

export const useStaffOrders = () => {
  return useQuery({
    queryKey: ['staff-orders'],
    queryFn: async (): Promise<StaffOrderItem[]> => {
      // Step 1: Fetch orders with pending/processing status
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at, merchant_notes, customer_name, customer_phone, governorate, region, landmark, merchant_id, deposit_amount, deposit_receipt_url, deposit_verified, merchant_payment_amount, merchant_payment_receipt_url, merchant_payment_verified')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true }); // FIFO: oldest first

      if (ordersError) throw ordersError;
      if (!orders?.length) return [];

      const orderIds = orders.map((o) => o.id);
      const merchantIds = [...new Set(orders.map((o) => o.merchant_id))];

      // Step 2: Fetch order items and merchant profiles in parallel
      const [itemsResult, profilesResult] = await Promise.all([
        supabase
          .from('order_items')
          .select('id, order_id, product_name, size, color, quantity, design_file_url, mockup_file_url, design_file_urls, mockup_file_urls, product_image, addons')
          .in('order_id', orderIds),
        supabase
          .from('profiles')
          .select('id, full_name, merchant_tier')
          .in('id', merchantIds),
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const items = itemsResult.data || [];
      const profiles = profilesResult.data || [];

      // Step 3: Map order items with order and merchant data
      return items.map((item) => {
        const order = orders.find((o) => o.id === item.order_id)!;
        const merchant = profiles.find((p) => p.id === order.merchant_id);

        return {
          id: item.id,
          orderId: order.id,
          orderNumber: order.order_number,
          productName: item.product_name,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          designFileUrl: item.design_file_url,
          mockupFileUrl: item.mockup_file_url,
          designFileUrls: (item as any).design_file_urls || (item.design_file_url ? [item.design_file_url] : []),
          mockupFileUrls: (item as any).mockup_file_urls || (item.mockup_file_url ? [item.mockup_file_url] : []),
          productImage: item.product_image,
          orderStatus: order.status as 'pending' | 'processing',
          createdAt: order.created_at,
          merchantId: order.merchant_id,
          merchantName: merchant?.full_name || 'غير معروف',
          merchantTier: merchant?.merchant_tier || null,
          merchantNotes: order.merchant_notes,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerGovernorate: order.governorate,
          customerAddress: formatAddress(order.region, order.landmark),
          hasGiftWrapping: hasAddon(item.addons, 'gift'),
          hasSpecialPrint: hasAddon(item.addons, 'special'),
          depositAmount: order.deposit_amount || 0,
          depositReceiptUrl: order.deposit_receipt_url || null,
          depositVerified: order.deposit_verified || false,
          merchantPaymentAmount: order.merchant_payment_amount || 0,
          merchantPaymentReceiptUrl: order.merchant_payment_receipt_url || null,
          merchantPaymentVerified: order.merchant_payment_verified || false,
        };
      }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
  });
};

export const useStaffOrderItem = (itemId: string | undefined) => {
  return useQuery({
    queryKey: ['staff-order-item', itemId],
    queryFn: async (): Promise<StaffOrderItem | null> => {
      if (!itemId) return null;

      // Fetch the specific order item
      const { data: item, error: itemError } = await supabase
        .from('order_items')
        .select('id, order_id, product_name, size, color, quantity, design_file_url, mockup_file_url, design_file_urls, mockup_file_urls, product_image, addons')
        .eq('id', itemId)
        .maybeSingle();

      if (itemError) throw itemError;
      if (!item) return null;

      // Fetch the associated order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at, merchant_notes, customer_name, customer_phone, governorate, region, landmark, merchant_id, deposit_amount, deposit_receipt_url, deposit_verified, merchant_payment_amount, merchant_payment_receipt_url, merchant_payment_verified')
        .eq('id', item.order_id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) return null;

      // Fetch merchant profile
      const { data: merchant } = await supabase
        .from('profiles')
        .select('full_name, merchant_tier')
        .eq('id', order.merchant_id)
        .maybeSingle();

      return {
        id: item.id,
        orderId: order.id,
        orderNumber: order.order_number,
        productName: item.product_name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        designFileUrl: item.design_file_url,
        mockupFileUrl: item.mockup_file_url,
        designFileUrls: (item as any).design_file_urls || (item.design_file_url ? [item.design_file_url] : []),
        mockupFileUrls: (item as any).mockup_file_urls || (item.mockup_file_url ? [item.mockup_file_url] : []),
        productImage: item.product_image,
        orderStatus: order.status as 'pending' | 'processing',
        createdAt: order.created_at,
        merchantId: order.merchant_id,
        merchantName: merchant?.full_name || 'غير معروف',
        merchantTier: merchant?.merchant_tier || null,
        merchantNotes: order.merchant_notes,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerGovernorate: order.governorate,
        customerAddress: formatAddress(order.region, order.landmark),
        hasGiftWrapping: hasAddon(item.addons, 'gift'),
        hasSpecialPrint: hasAddon(item.addons, 'special'),
        depositAmount: order.deposit_amount || 0,
        depositReceiptUrl: order.deposit_receipt_url || null,
        depositVerified: order.deposit_verified || false,
        merchantPaymentAmount: order.merchant_payment_amount || 0,
        merchantPaymentReceiptUrl: order.merchant_payment_receipt_url || null,
        merchantPaymentVerified: order.merchant_payment_verified || false,
      };
    },
    enabled: !!itemId,
  });
};

export const useStaffStats = () => {
  return useQuery({
    queryKey: ['staff-stats'],
    queryFn: async (): Promise<StaffStats> => {
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Parallel queries for stats
      const [processedResult, pendingResult] = await Promise.all([
        // Count orders printed today (staff processes = prints)
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['printed', 'processing'])
          .gte('updated_at', todayISO),
        // Count pending orders
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'processing']),
      ]);

      return {
        processedToday: processedResult.count || 0,
        pendingCount: pendingResult.count || 0,
        issuesCount: 0, // No issue status in current schema
      };
    },
  });
};

// Helper to calculate waiting time
export const getWaitingTime = (createdAt: string): { text: string; isOverdue: boolean } => {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = now - created;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const isOverdue = diffHours >= 24;

  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    return {
      text: `منتظر منذ ${days} يوم و ${remainingHours} ساعة`,
      isOverdue: true,
    };
  } else if (diffHours > 0) {
    return {
      text: `منتظر منذ ${diffHours} ساعة`,
      isOverdue: false,
    };
  } else {
    return {
      text: `منتظر منذ ${diffMinutes} دقيقة`,
      isOverdue: false,
    };
  }
};

// Status configuration for UI
export const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: {
    label: 'قيد المراجعة',
    color: 'text-amber-800 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  processing: {
    label: 'تمت الموافقة',
    color: 'text-blue-800 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  printed: {
    label: 'تم التجهيز',
    color: 'text-indigo-800 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  shipped: {
    label: 'تم الشحن',
    color: 'text-purple-800 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  delivered: {
    label: 'تم التسليم',
    color: 'text-green-800 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
};

// Completed order item for history
export interface CompletedOrderItem {
  id: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  size: string;
  color: string | null;
  quantity: number;
  orderStatus: 'printed' | 'shipped' | 'delivered';
  completedAt: string;
  merchantName: string;
  merchantTier: string | null;
}

// Hook to fetch completed orders (last 7 days)
export const useStaffCompletedOrders = () => {
  return useQuery({
    queryKey: ['staff-completed-orders'],
    queryFn: async (): Promise<CompletedOrderItem[]> => {
      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch completed orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, status, updated_at, merchant_id')
        .in('status', ['printed', 'shipped', 'delivered'])
        .gte('updated_at', sevenDaysAgo.toISOString())
        .order('updated_at', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;
      if (!orders?.length) return [];

      const orderIds = orders.map((o) => o.id);
      const merchantIds = [...new Set(orders.map((o) => o.merchant_id))];

      // Fetch order items and profiles in parallel
      const [itemsResult, profilesResult] = await Promise.all([
        supabase
          .from('order_items')
          .select('id, order_id, product_name, size, color, quantity')
          .in('order_id', orderIds),
        supabase
          .from('profiles')
          .select('id, full_name, merchant_tier')
          .in('id', merchantIds),
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const items = itemsResult.data || [];
      const profiles = profilesResult.data || [];

      // Map items with order data
      return items.map((item) => {
        const order = orders.find((o) => o.id === item.order_id)!;
        const merchant = profiles.find((p) => p.id === order.merchant_id);

        return {
          id: item.id,
          orderId: order.id,
          orderNumber: order.order_number,
          productName: item.product_name,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          orderStatus: order.status as 'printed' | 'shipped' | 'delivered',
          completedAt: order.updated_at,
          merchantName: merchant?.full_name || 'غير معروف',
          merchantTier: merchant?.merchant_tier || null,
        };
      });
    },
  });
};
