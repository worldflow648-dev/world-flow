import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

export interface InvoiceOrder {
  id: string;
  order_number: string;
  created_at: string;
  delivered_at: string | null;
  net_profit: number;
  final_retail_price: number;
  total_merchant_cost: number;
  customer_name: string;
  customer_phone: string;
  customer_phone2: string | null;
  governorate: string;
  region: string | null;
  landmark: string | null;
  shipping_fee: number | null;
  discount_amount: number | null;
}

export interface MonthlyInvoice {
  monthKey: string; // "2026-02"
  monthLabel: string; // "فبراير 2026"
  ordersCount: number;
  totalProfit: number;
  totalRevenue: number;
  orders: InvoiceOrder[];
}

export function useMerchantInvoices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["merchant-invoices", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MonthlyInvoice[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, created_at, delivered_at, net_profit, final_retail_price, total_merchant_cost, customer_name, customer_phone, customer_phone2, governorate, region, landmark, shipping_fee, discount_amount")
        .eq("merchant_id", user!.id)
        .eq("status", "delivered")
        .order("delivered_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by month of delivered_at
      const grouped = new Map<string, InvoiceOrder[]>();
      for (const order of data) {
        const date = order.delivered_at || order.created_at;
        const key = format(parseISO(date), "yyyy-MM");
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(order);
      }

      const invoices: MonthlyInvoice[] = [];
      for (const [monthKey, orders] of grouped) {
        const sampleDate = parseISO(orders[0].delivered_at || orders[0].created_at);
        invoices.push({
          monthKey,
          monthLabel: format(sampleDate, "MMMM yyyy", { locale: ar }),
          ordersCount: orders.length,
          totalProfit: orders.reduce((s, o) => s + Number(o.net_profit), 0),
          totalRevenue: orders.reduce((s, o) => s + Number(o.final_retail_price), 0),
          orders,
        });
      }

      return invoices;
    },
  });
}
