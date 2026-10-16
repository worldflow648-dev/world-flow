 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 interface FinancialOverview {
   totalRevenue: number;
   totalCost: number;
   grossProfit: number;
   merchantEarnings: number;
   adminNetProfit: number;
   outstandingBalance: number;
   totalSettled: number;
   totalShipping: number;
 }
 
 interface MerchantFinancial {
   id: string;
   name: string;
   phone: string | null;
   ordersCount: number;
   totalRevenue: number;
   totalProfit: number;
   walletBalance: number;
   totalWithdrawn: number;
 }
 
interface OrderFinancial {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  governorate: string;
  region: string | null;
  status: string;
  created_at: string;
  final_retail_price: number;
  total_wholesale_cost: number;
  total_merchant_cost: number;
  shipping_fee: number | null;
  net_profit: number;
  merchant_id: string;
  merchant_name?: string;
  discount_code?: string | null;
  discount_amount?: number | null;
  items?: OrderItemDetail[];
}
 
 interface OrderItemDetail {
   id: string;
   product_name: string;
   product_image: string | null;
   quantity: number;
   size: string;
   color: string | null;
   wholesale_price: number;
   merchant_price: number;
   retail_price: number;
   addons: any;
   design_file_url?: string | null;
   mockup_file_url?: string | null;
   design_file_urls?: string[] | null;
   mockup_file_urls?: string[] | null;
 }
 
 interface TransactionRecord {
   id: string;
   created_at: string;
   amount: number;
   type: string;
   description: string | null;
   order_id: string | null;
   merchant_id: string;
   merchant_name: string;
   order_number?: string;
 }
 
 interface GovernorateRevenue {
   governorate: string;
   revenue: number;
   count: number;
 }
 
 interface DailyRevenue {
   date: string;
   revenue: number;
   profit: number;
 }
 
export function useFinancialOverview() {
  return useQuery({
    queryKey: ['admin-financial-overview'],
    queryFn: async (): Promise<FinancialOverview> => {
      // Get delivered orders totals
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('final_retail_price, total_wholesale_cost, shipping_fee, net_profit')
        .eq('status', 'delivered');

      if (ordersError) throw ordersError;

      // Get settlement receipts for accurate settled total
      const { data: settlementsData, error: settError } = await supabase
        .from('settlement_receipts')
        .select('amount');

      if (settError) throw settError;

      // Get total expenses
      const { data: expensesData, error: expError } = await supabase
        .from('expenses')
        .select('amount');

      if (expError) throw expError;

      const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const totalRevenue = ordersData?.reduce((sum, o) => sum + (o.final_retail_price || 0), 0) || 0;
      const totalCost = ordersData?.reduce((sum, o) => sum + (o.total_wholesale_cost || 0), 0) || 0;
      const totalShipping = ordersData?.reduce((sum, o) => sum + (o.shipping_fee || 0), 0) || 0;
      const merchantEarnings = ordersData?.reduce((sum, o) => sum + (o.net_profit || 0), 0) || 0;
      const grossProfit = totalRevenue - totalCost;
      const adminNetProfit = totalRevenue - totalCost - totalShipping - merchantEarnings - totalExpenses;
      const totalSettled = settlementsData?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      const outstandingBalance = merchantEarnings - totalSettled;

      return {
        totalRevenue,
        totalCost,
        grossProfit,
        merchantEarnings,
        adminNetProfit,
        outstandingBalance,
        totalSettled,
        totalShipping,
      };
    },
  });
}
 
 export function useMerchantFinancials() {
   return useQuery({
     queryKey: ['admin-merchant-financials'],
     queryFn: async (): Promise<MerchantFinancial[]> => {
       // Get all merchants (users with merchant role)
       const { data: merchantRoles, error: rolesError } = await supabase
         .from('user_roles')
         .select('user_id')
         .eq('role', 'merchant');
 
       if (rolesError) throw rolesError;
 
       const merchantIds = merchantRoles?.map(r => r.user_id) || [];
 
       if (merchantIds.length === 0) return [];
 
       // Get profiles
       const { data: profiles, error: profilesError } = await supabase
         .from('profiles')
         .select('id, full_name, phone')
         .in('id', merchantIds);
 
       if (profilesError) throw profilesError;
 
       // Get orders per merchant
       const { data: orders, error: ordersError } = await supabase
         .from('orders')
         .select('merchant_id, final_retail_price, net_profit, status')
         .in('merchant_id', merchantIds);
 
       if (ordersError) throw ordersError;
 
       // Get wallets
       const { data: wallets, error: walletsError } = await supabase
         .from('wallets')
         .select('merchant_id, balance, total_withdrawn')
         .in('merchant_id', merchantIds);
 
       if (walletsError) throw walletsError;
 
       // Aggregate data per merchant
       return profiles?.map(profile => {
         const merchantOrders = orders?.filter(o => o.merchant_id === profile.id) || [];
         const deliveredOrders = merchantOrders.filter(o => o.status === 'delivered');
         const wallet = wallets?.find(w => w.merchant_id === profile.id);
 
         return {
           id: profile.id,
           name: profile.full_name,
           phone: profile.phone,
           ordersCount: merchantOrders.length,
           totalRevenue: deliveredOrders.reduce((sum, o) => sum + (o.final_retail_price || 0), 0),
           totalProfit: deliveredOrders.reduce((sum, o) => sum + (o.net_profit || 0), 0),
           walletBalance: wallet?.balance || 0,
           totalWithdrawn: wallet?.total_withdrawn || 0,
         };
       }) || [];
     },
   });
 }
 
 export function useOrdersFinancial(filters: {
   status?: string;
   merchantId?: string;
   governorate?: string;
   search?: string;
 } = {}) {
   return useQuery({
     queryKey: ['admin-orders-financial', filters],
     queryFn: async (): Promise<OrderFinancial[]> => {
       let query = supabase
         .from('orders')
         .select(`
           id,
           order_number,
           customer_name,
           customer_phone,
           governorate,
           region,
           status,
           created_at,
           final_retail_price,
           total_wholesale_cost,
           total_merchant_cost,
           shipping_fee,
           net_profit,
           merchant_id
         `)
         .order('created_at', { ascending: false });
 
       if (filters?.status && filters.status !== 'all') {
         query = query.eq('status', filters.status as any);
       }
       if (filters?.merchantId && filters.merchantId !== 'all') {
         query = query.eq('merchant_id', filters.merchantId);
       }
       if (filters?.governorate && filters.governorate !== 'all') {
         query = query.eq('governorate', filters.governorate);
       }
       if (filters?.search) {
         query = query.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
       }
 
       const { data, error } = await query;
       if (error) throw error;
 
       // Get merchant names
       const merchantIds = [...new Set(data?.map(o => o.merchant_id) || [])];
       const { data: profiles } = await supabase
         .from('profiles')
         .select('id, full_name')
         .in('id', merchantIds);
 
       return data?.map(order => ({
         ...order,
         merchant_name: profiles?.find(p => p.id === order.merchant_id)?.full_name || 'غير معروف',
       })) || [];
     },
   });
 }
 
 export function useOrderDetails(orderId: string | null) {
  return useQuery({
    queryKey: ['admin-order-details', orderId],
    enabled: !!orderId,
    retry: 1,
    queryFn: async (): Promise<OrderFinancial | null> => {
      if (!orderId) return null;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) return null;

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', order.merchant_id)
        .maybeSingle();

      return {
        ...order,
        merchant_name: profile?.full_name || 'غير معروف',
      items: items?.map(item => ({
          id: item.id,
          product_name: item.product_name,
          product_image: item.product_image,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          wholesale_price: item.wholesale_price,
          merchant_price: item.merchant_price,
          retail_price: item.retail_price,
          addons: item.addons,
          design_file_url: item.design_file_url,
          mockup_file_url: item.mockup_file_url,
          design_file_urls: (item as any).design_file_urls ?? null,
          mockup_file_urls: (item as any).mockup_file_urls ?? null,
        })) || [],
      };
    },
  });
}
 
 export function useTransactionLedger(filters?: {
   type?: string;
   merchantId?: string;
   dateFrom?: string;
   dateTo?: string;
 }) {
   return useQuery({
     queryKey: ['admin-transactions', filters],
     queryFn: async (): Promise<TransactionRecord[]> => {
       // Get all transactions with wallet info
       const { data: wallets, error: walletsError } = await supabase
         .from('wallets')
         .select('id, merchant_id');
 
       if (walletsError) throw walletsError;
 
       const walletIds = wallets?.map(w => w.id) || [];
 
       if (walletIds.length === 0) return [];
 
       let query = supabase
         .from('wallet_transactions')
         .select('*')
         .in('wallet_id', walletIds)
         .order('created_at', { ascending: false });
 
       if (filters?.type && filters.type !== 'all') {
         query = query.eq('type', filters.type);
       }
       if (filters?.dateFrom) {
         query = query.gte('created_at', filters.dateFrom);
       }
       if (filters?.dateTo) {
         query = query.lte('created_at', filters.dateTo);
       }
 
       const { data: transactions, error: txError } = await query;
       if (txError) throw txError;
 
       // Get merchant profiles
       const merchantIds = [...new Set(wallets?.map(w => w.merchant_id) || [])];
       const { data: profiles } = await supabase
         .from('profiles')
         .select('id, full_name')
         .in('id', merchantIds);
 
       // Get order numbers for credit transactions
       const orderIds = transactions?.filter(t => t.order_id).map(t => t.order_id) || [];
       const { data: orders } = await supabase
         .from('orders')
         .select('id, order_number')
         .in('id', orderIds);
 
       return transactions?.map(tx => {
         const wallet = wallets?.find(w => w.id === tx.wallet_id);
         const profile = profiles?.find(p => p.id === wallet?.merchant_id);
         const order = orders?.find(o => o.id === tx.order_id);
 
         return {
           ...tx,
           merchant_id: wallet?.merchant_id || '',
           merchant_name: profile?.full_name || 'غير معروف',
           order_number: order?.order_number,
         };
       }).filter(tx => {
         if (filters?.merchantId && filters.merchantId !== 'all') {
           return tx.merchant_id === filters.merchantId;
         }
         return true;
       }) || [];
     },
   });
 }
 
 export function useGovernorateRevenue() {
   return useQuery({
     queryKey: ['admin-governorate-revenue'],
     queryFn: async (): Promise<GovernorateRevenue[]> => {
       const { data, error } = await supabase
         .from('orders')
         .select('governorate, final_retail_price')
         .eq('status', 'delivered');
 
       if (error) throw error;
 
       const grouped = data?.reduce((acc, order) => {
         const gov = order.governorate || 'غير محدد';
         if (!acc[gov]) {
           acc[gov] = { revenue: 0, count: 0 };
         }
         acc[gov].revenue += order.final_retail_price || 0;
         acc[gov].count += 1;
         return acc;
       }, {} as Record<string, { revenue: number; count: number }>);
 
       return Object.entries(grouped || {}).map(([governorate, data]) => ({
         governorate,
         revenue: data.revenue,
         count: data.count,
       })).sort((a, b) => b.revenue - a.revenue);
     },
   });
 }
 
 export function useDailyRevenue(days: number = 30) {
   return useQuery({
     queryKey: ['admin-daily-revenue', days],
     queryFn: async (): Promise<DailyRevenue[]> => {
       const startDate = new Date();
       startDate.setDate(startDate.getDate() - days);
 
        const { data, error } = await supabase
          .from('orders')
          .select('created_at, delivered_at, final_retail_price, net_profit, total_wholesale_cost, shipping_fee')
          .eq('status', 'delivered')
          .gte('delivered_at', startDate.toISOString());

        if (error) throw error;

        const grouped = data?.reduce((acc, order) => {
          // Earned revenue basis: group by delivered_at; skip rows without it (defensive)
          if (!order.delivered_at) return acc;
          const date = new Date(order.delivered_at).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { revenue: 0, profit: 0 };
          }
          acc[date].revenue += order.final_retail_price || 0;
          const adminProfit = (order.final_retail_price || 0) - 
                             (order.total_wholesale_cost || 0) - 
                             (order.net_profit || 0);
          acc[date].profit += adminProfit;
          return acc;
        }, {} as Record<string, { revenue: number; profit: number }>);

        return Object.entries(grouped || {}).map(([date, data]) => ({
          date,
          revenue: data.revenue,
          profit: data.profit,
        })).sort((a, b) => a.date.localeCompare(b.date));
     },
   });
 }
 
export function useGovernorates() {
    return useQuery({
      queryKey: ['governorates'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('governorates')
          .select('id, name_ar')
          .eq('is_active', true);
        if (error) throw error;
        return data || [];
      },
    });
  }

// ===== Breakdown hooks (clickable stat cards) =====

export interface DeliveredOrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  merchant_id: string;
  merchant_name: string;
  delivered_at: string | null;
  created_at: string;
  final_retail_price: number;
  total_wholesale_cost: number;
  shipping_fee: number;
  net_profit: number;
  admin_profit: number;
}

export function useRevenueBreakdown() {
  return useQuery({
    queryKey: ['admin-revenue-breakdown'],
    queryFn: async (): Promise<DeliveredOrderRow[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, merchant_id, delivered_at, created_at, final_retail_price, total_wholesale_cost, shipping_fee, net_profit')
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });
      if (error) throw error;
      const merchantIds = [...new Set((data || []).map(o => o.merchant_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', merchantIds);
      return (data || []).map(o => {
        const retail = o.final_retail_price || 0;
        const cost = o.total_wholesale_cost || 0;
        const ship = o.shipping_fee || 0;
        const np = o.net_profit || 0;
        return {
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          merchant_id: o.merchant_id,
          merchant_name: profiles?.find(p => p.id === o.merchant_id)?.full_name || 'غير معروف',
          delivered_at: o.delivered_at,
          created_at: o.created_at,
          final_retail_price: retail,
          total_wholesale_cost: cost,
          shipping_fee: ship,
          net_profit: np,
          admin_profit: retail - cost - ship - np,
        };
      });
    },
  });
}

export interface ExpenseRow {
  id: string;
  category: string;
  description: string | null;
  expense_date: string;
  amount: number;
}

export interface AdminProfitBreakdownData {
  orders: DeliveredOrderRow[];
  expenses: ExpenseRow[];
  totals: {
    revenue: number;
    cost: number;
    shipping: number;
    merchantEarnings: number;
    expenses: number;
    adminNetProfit: number;
  };
}

export function useAdminProfitBreakdown() {
  return useQuery({
    queryKey: ['admin-profit-breakdown'],
    queryFn: async (): Promise<AdminProfitBreakdownData> => {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, merchant_id, delivered_at, created_at, final_retail_price, total_wholesale_cost, shipping_fee, net_profit')
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });
      if (orderErr) throw orderErr;

      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .select('id, category, description, expense_date, amount')
        .order('expense_date', { ascending: false });
      if (expErr) throw expErr;

      const merchantIds = [...new Set((orderData || []).map(o => o.merchant_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', merchantIds);

      const orders: DeliveredOrderRow[] = (orderData || []).map(o => {
        const retail = o.final_retail_price || 0;
        const cost = o.total_wholesale_cost || 0;
        const ship = o.shipping_fee || 0;
        const np = o.net_profit || 0;
        return {
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          merchant_id: o.merchant_id,
          merchant_name: profiles?.find(p => p.id === o.merchant_id)?.full_name || 'غير معروف',
          delivered_at: o.delivered_at,
          created_at: o.created_at,
          final_retail_price: retail,
          total_wholesale_cost: cost,
          shipping_fee: ship,
          net_profit: np,
          admin_profit: retail - cost - ship - np,
        };
      });

      const revenue = orders.reduce((s, o) => s + o.final_retail_price, 0);
      const cost = orders.reduce((s, o) => s + o.total_wholesale_cost, 0);
      const shipping = orders.reduce((s, o) => s + o.shipping_fee, 0);
      const merchantEarnings = orders.reduce((s, o) => s + o.net_profit, 0);
      const expensesTotal = (expData || []).reduce((s, e) => s + (e.amount || 0), 0);

      return {
        orders,
        expenses: (expData || []) as ExpenseRow[],
        totals: {
          revenue,
          cost,
          shipping,
          merchantEarnings,
          expenses: expensesTotal,
          adminNetProfit: revenue - cost - shipping - merchantEarnings - expensesTotal,
        },
      };
    },
  });
}

export interface OutstandingMerchantRow {
  merchant_id: string;
  merchant_name: string;
  earned: number;
  settled: number;
  outstanding: number;
}

export function useOutstandingBreakdown() {
  return useQuery({
    queryKey: ['admin-outstanding-breakdown'],
    queryFn: async (): Promise<OutstandingMerchantRow[]> => {
      const { data: orders, error: oErr } = await supabase
        .from('orders')
        .select('merchant_id, net_profit')
        .eq('status', 'delivered');
      if (oErr) throw oErr;
      const { data: receipts, error: rErr } = await supabase
        .from('settlement_receipts')
        .select('merchant_id, amount');
      if (rErr) throw rErr;

      const earnedMap = new Map<string, number>();
      (orders || []).forEach(o => {
        earnedMap.set(o.merchant_id, (earnedMap.get(o.merchant_id) || 0) + (o.net_profit || 0));
      });
      const settledMap = new Map<string, number>();
      (receipts || []).forEach((r: any) => {
        settledMap.set(r.merchant_id, (settledMap.get(r.merchant_id) || 0) + (r.amount || 0));
      });

      const merchantIds = [...new Set([...earnedMap.keys(), ...settledMap.keys()])];
      if (merchantIds.length === 0) return [];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', merchantIds);

      return merchantIds.map(id => {
        const earned = earnedMap.get(id) || 0;
        const settled = settledMap.get(id) || 0;
        return {
          merchant_id: id,
          merchant_name: profiles?.find(p => p.id === id)?.full_name || 'غير معروف',
          earned,
          settled,
          outstanding: earned - settled,
        };
      }).sort((a, b) => Math.abs(b.outstanding) - Math.abs(a.outstanding));
    },
  });
}

export interface SettlementReceiptRow {
  id: string;
  created_at: string;
  merchant_id: string;
  merchant_name: string;
  amount: number;
  description: string | null;
  settled_by: string | null;
  settled_by_name: string | null;
}

export function useSettlementsBreakdown() {
  return useQuery({
    queryKey: ['admin-settlements-breakdown'],
    queryFn: async (): Promise<SettlementReceiptRow[]> => {
      const { data, error } = await supabase
        .from('settlement_receipts')
        .select('id, created_at, merchant_id, amount, description, settled_by')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const ids = [...new Set([
        ...data.map((r: any) => r.merchant_id),
        ...data.map((r: any) => r.settled_by).filter(Boolean),
      ])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      return (data as any[]).map(r => ({
        id: r.id,
        created_at: r.created_at,
        merchant_id: r.merchant_id,
        merchant_name: profiles?.find(p => p.id === r.merchant_id)?.full_name || 'غير معروف',
        amount: r.amount,
        description: r.description,
        settled_by: r.settled_by,
        settled_by_name: r.settled_by ? (profiles?.find(p => p.id === r.settled_by)?.full_name || 'غير معروف') : null,
      }));
    },
  });
}

export interface MerchantSettlementOrder {
  id: string;
  order_number: string;
  customer_name: string;
  net_profit: number;
  delivered_at: string | null;
  created_at: string;
  status: string;
  isPaid: boolean;
}

export function useMerchantSettlementOrders(merchantId: string | null) {
  return useQuery({
    queryKey: ['merchant-settlement-orders', merchantId],
    enabled: !!merchantId,
    queryFn: async (): Promise<MerchantSettlementOrder[]> => {
      if (!merchantId) return [];

      // Get all delivered orders for this merchant
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, net_profit, delivered_at, created_at, status')
        .eq('merchant_id', merchantId)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });

      if (error) throw error;
      if (!orders || orders.length === 0) return [];

      // Look up which orders are linked to a settlement (per-order mapping)
      const orderIds = orders.map(o => o.id);
      const { data: links } = await supabase
        .from('settlement_order_links' as any)
        .select('order_id')
        .in('order_id', orderIds);

      const paidIds = new Set((links || []).map((l: any) => l.order_id));

      return orders.map(order => ({
        ...order,
        status: order.status || 'delivered',
        isPaid: paidIds.has(order.id),
      }));
    },
  });
}