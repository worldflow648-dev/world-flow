import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalSales: number;
  netProfit: number;
  pendingOrders: number;
  pendingOrdersOverdue: number;
  activeMerchants: number;
  needsVerification: number;
}

export interface SalesDataPoint {
  day: string;
  sales: number;
  profit: number;
}

// Arabic day names for weekly chart
const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Arabic week labels for monthly chart
const getWeekLabel = (weekNumber: number) => `الأسبوع ${weekNumber}`;

export const useAdminDashboard = (customRange?: { from: Date; to: Date } | null) => {
  // Query for dashboard statistics
  const statsQuery = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch all orders for aggregation
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('status, created_at, final_retail_price, total_merchant_cost, total_wholesale_cost, shipping_fee, deposit_amount, deposit_verified, merchant_payment_amount, merchant_payment_verified');

      if (ordersError) throw ordersError;

      // Fetch merchant count from user_roles
      const { data: merchants, error: merchantsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'merchant');

      if (merchantsError) throw merchantsError;

      // Fetch total expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount');

      if (expensesError) throw expensesError;

      const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Calculate statistics from orders
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      let totalSales = 0;
      let platformMargin = 0;
      let pendingOrders = 0;
      let pendingOrdersOverdue = 0;
      let needsVerificationCount = 0;

      (orders || []).forEach((order) => {
        if (order.status === 'delivered') {
          totalSales += Number(order.final_retail_price) || 0;
          // Platform margin = what merchants paid us - what we paid suppliers.
          // Shipping is paid by the customer and passed through to the courier (net zero).
          platformMargin +=
            (Number(order.total_merchant_cost) || 0) -
            (Number(order.total_wholesale_cost) || 0);
        }
        if (order.status === 'pending') {
          pendingOrders++;
          const createdAt = new Date(order.created_at);
          if (createdAt < twentyFourHoursAgo) {
            pendingOrdersOverdue++;
          }
        }
        if (((order.deposit_amount || 0) > 0 && !order.deposit_verified) ||
            ((order.merchant_payment_amount || 0) > 0 && !order.merchant_payment_verified)) {
          needsVerificationCount++;
        }
      });

      // Subtract operating expenses to get true platform net profit
      const netProfit = platformMargin - totalExpenses;

      // Get unique merchant count
      const uniqueMerchants = new Set(merchants?.map((m) => m.user_id) || []);

      return {
        totalSales,
        netProfit,
        pendingOrders,
        pendingOrdersOverdue,
        activeMerchants: uniqueMerchants.size,
        needsVerification: needsVerificationCount,
      };
    },
  });

  // Query for chart data
  const rangeFromKey = customRange?.from.toISOString() ?? null;
  const rangeToKey = customRange?.to.toISOString() ?? null;
  const chartQuery = useQuery({
    queryKey: ['admin-dashboard-chart', rangeFromKey, rangeToKey],
    queryFn: async () => {
      // Determine fetch start: earlier of (30 days ago) or (custom range from)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fetchStart =
        customRange && customRange.from < thirtyDaysAgo ? customRange.from : thirtyDaysAgo;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('delivered_at, final_retail_price, net_profit')
        .eq('status', 'delivered')
        .gte('delivered_at', fetchStart.toISOString())
        .order('delivered_at', { ascending: true });

      if (error) throw error;

      // Group by day for weekly data (last 7 days)
      const weeklyMap = new Map<string, { sales: number; profit: number }>();
      const monthlyMap = new Map<number, { sales: number; profit: number }>();
      const customMap = new Map<string, { sales: number; profit: number }>();

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const rangeFrom = customRange ? new Date(customRange.from) : null;
      const rangeTo = customRange ? new Date(customRange.to) : null;
      if (rangeFrom) rangeFrom.setHours(0, 0, 0, 0);
      if (rangeTo) rangeTo.setHours(23, 59, 59, 999);

      (orders || []).forEach((order) => {
        if (!order.delivered_at) return;

        const deliveredDate = new Date(order.delivered_at);
        const sales = Number(order.final_retail_price) || 0;
        const profit = Number(order.net_profit) || 0;

        // Weekly data (last 7 days)
        if (deliveredDate >= sevenDaysAgo) {
          const dayName = arabicDays[deliveredDate.getDay()];
          const existing = weeklyMap.get(dayName) || { sales: 0, profit: 0 };
          weeklyMap.set(dayName, {
            sales: existing.sales + sales,
            profit: existing.profit + profit,
          });
        }

        // Monthly data (group by week number within last 30 days)
        const daysSinceStart = Math.floor(
          (now.getTime() - deliveredDate.getTime()) / (24 * 60 * 60 * 1000)
        );
        const weekNumber = 4 - Math.floor(daysSinceStart / 7);
        if (weekNumber >= 1 && weekNumber <= 4) {
          const existing = monthlyMap.get(weekNumber) || { sales: 0, profit: 0 };
          monthlyMap.set(weekNumber, {
            sales: existing.sales + sales,
            profit: existing.profit + profit,
          });
        }

        // Custom range data (per day)
        if (rangeFrom && rangeTo && deliveredDate >= rangeFrom && deliveredDate <= rangeTo) {
          const key = deliveredDate.toISOString().split('T')[0];
          const existing = customMap.get(key) || { sales: 0, profit: 0 };
          customMap.set(key, {
            sales: existing.sales + sales,
            profit: existing.profit + profit,
          });
        }
      });

      // Convert to arrays - ensure all days/weeks are represented
      const weeklyData: SalesDataPoint[] = arabicDays.map((day) => ({
        day,
        sales: weeklyMap.get(day)?.sales || 0,
        profit: weeklyMap.get(day)?.profit || 0,
      }));

      const monthlyData: SalesDataPoint[] = [1, 2, 3, 4].map((week) => ({
        day: getWeekLabel(week),
        sales: monthlyMap.get(week)?.sales || 0,
        profit: monthlyMap.get(week)?.profit || 0,
      }));

      // Build custom range daily series (fill missing days with zero)
      let customData: SalesDataPoint[] = [];
      if (rangeFrom && rangeTo) {
        const cursor = new Date(rangeFrom);
        while (cursor <= rangeTo) {
          const key = cursor.toISOString().split('T')[0];
          const entry = customMap.get(key) || { sales: 0, profit: 0 };
          customData.push({
            day: cursor.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' }),
            sales: entry.sales,
            profit: entry.profit,
          });
          cursor.setDate(cursor.getDate() + 1);
        }
      }

      return { weeklyData, monthlyData, customData };
    },
  });

  // Low stock query
  const lowStockQuery = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: async () => {
      const { data: products, error: pError } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true);
      if (pError) throw pError;

      const { data: variants, error: vError } = await supabase
        .from('product_variants')
        .select('product_id, stock_level')
        .eq('is_active', true);
      if (vError) throw vError;

      // Group stock by product
      const stockMap = new Map<string, number>();
      variants?.forEach(v => {
        stockMap.set(v.product_id, (stockMap.get(v.product_id) || 0) + (v.stock_level || 0));
      });

      return products
        ?.filter(p => (stockMap.get(p.id) || 0) < 15)
        .map(p => ({ id: p.id, name: p.name, stock: stockMap.get(p.id) || 0 })) || [];
    },
  });

  return {
    stats: statsQuery,
    chart: chartQuery,
    lowStock: lowStockQuery,
  };
};

// Format price in IQD
export const formatPrice = (price: number): string => {
  return price.toLocaleString('ar-IQ') + ' د.ع';
};
