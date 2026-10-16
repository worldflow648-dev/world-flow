import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalEarnings: number;
  pendingEarnings: number;
  walletBalance: number;
}

export interface WeeklyData {
  day: string;
  profit: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  orderCount: number;
  revenue: number;
}

export interface SalesReport {
  ordersCount: number;
  revenue: number;
  profit: number;
  chartData: { date: string; profit: number; orders: number }[];
}

export const useMerchantDashboard = (dateRange?: { from: Date; to: Date } | null) => {
  const ordersQuery = useQuery({
    queryKey: ['merchant-dashboard-orders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          net_profit,
          final_retail_price,
          created_at,
          delivered_at,
          items:order_items(product_name, quantity, retail_price, merchant_price, wholesale_price)
        `)
        .eq('merchant_id', user.id);

      if (error) throw error;
      return data;
    },
  });

  const walletQuery = useQuery({
    queryKey: ['merchant-wallet'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('merchant_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const stats = useMemo<DashboardStats>(() => {
    const orders = ordersQuery.data || [];
    const wallet = walletQuery.data;

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const processingOrders = orders.filter(o => ['processing', 'printed', 'shipped'].includes(o.status || '')).length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    const deliveredProfit = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.net_profit || 0), 0);

    const pendingProfit = orders
      .filter(o => ['pending', 'processing', 'printed', 'shipped'].includes(o.status || ''))
      .reduce((sum, o) => sum + (o.net_profit || 0), 0);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      totalEarnings: deliveredProfit,
      pendingEarnings: pendingProfit,
      walletBalance: wallet?.balance || 0,
    };
  }, [ordersQuery.data, walletQuery.data]);

  const weeklyData = useMemo<WeeklyData[]>(() => {
    const orders = ordersQuery.data || [];
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = new Date();
    const last7Days: WeeklyData[] = [];

    // Earned profit basis: only delivered orders, grouped by delivered_at
    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = deliveredOrders.filter(o => {
        const basis = (o as any).delivered_at || o.created_at;
        if (!basis) return false;
        const orderDate = new Date(basis).toISOString().split('T')[0];
        return orderDate === dateStr;
      });

      last7Days.push({
        day: dayName,
        profit: dayOrders.reduce((sum, o) => sum + (o.net_profit || 0), 0),
        orders: dayOrders.length,
      });
    }

    return last7Days;
  }, [ordersQuery.data]);

  const topProducts = useMemo<TopProduct[]>(() => {
    const orders = ordersQuery.data || [];
    const productMap = new Map<string, { count: number; revenue: number }>();

    orders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const existing = productMap.get(item.product_name) || { count: 0, revenue: 0 };
        const itemRevenue = (Number(item.retail_price) || 0) * (Number(item.quantity) || 0);
        productMap.set(item.product_name, {
          count: existing.count + (Number(item.quantity) || 0),
          revenue: existing.revenue + itemRevenue,
        });
      });
    });

    return Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        orderCount: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);
  }, [ordersQuery.data]);

  const salesReport = useMemo<SalesReport>(() => {
    const orders = ordersQuery.data || [];
    if (!dateRange) return { ordersCount: 0, revenue: 0, profit: 0, chartData: [] };

    const fromTime = dateRange.from.getTime();
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999);
    const toTime = toDate.getTime();

    // Earned revenue/profit basis: delivered orders, by delivered_at
    const filtered = orders.filter(o => {
      if (o.status !== 'delivered') return false;
      const basis = (o as any).delivered_at || o.created_at;
      if (!basis) return false;
      const t = new Date(basis).getTime();
      return t >= fromTime && t <= toTime;
    });

    const dailyMap = new Map<string, { profit: number; orders: number }>();
    filtered.forEach(o => {
      const basis = (o as any).delivered_at || o.created_at;
      const key = new Date(basis).toISOString().split('T')[0];
      const existing = dailyMap.get(key) || { profit: 0, orders: 0 };
      dailyMap.set(key, { profit: existing.profit + (o.net_profit || 0), orders: existing.orders + 1 });
    });

    const chartData = Array.from(dailyMap.entries())
      .map(([date, d]) => ({ date, profit: d.profit, orders: d.orders }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      ordersCount: filtered.length,
      revenue: filtered.reduce((s, o) => s + (o.final_retail_price || 0), 0),
      profit: filtered.reduce((s, o) => s + (o.net_profit || 0), 0),
      chartData,
    };
  }, [ordersQuery.data, dateRange]);

  return {
    stats,
    weeklyData,
    topProducts,
    salesReport,
    isLoading: ordersQuery.isLoading || walletQuery.isLoading,
    error: ordersQuery.error || walletQuery.error,
  };
};
