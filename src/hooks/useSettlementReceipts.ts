import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SettlementReceipt {
  id: string;
  merchant_id: string;
  merchant_name?: string;
  settled_by_name?: string;
  amount: number;
  description: string | null;
  settled_by: string | null;
  created_at: string;
}

// Admin: fetch all settlement receipts with merchant names
export function useAdminSettlementReceipts() {
  return useQuery({
    queryKey: ["settlement-receipts", "admin"],
    queryFn: async (): Promise<SettlementReceipt[]> => {
      const { data, error } = await supabase
        .from("settlement_receipts" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch merchant + admin names
      const merchantIds = [...new Set((data as any[]).map((r: any) => r.merchant_id))];
      const settledByIds = [...new Set((data as any[]).map((r: any) => r.settled_by).filter(Boolean))];
      const allIds = [...new Set([...merchantIds, ...settledByIds])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allIds);

      return (data as any[]).map((r: any) => ({
        ...r,
        merchant_name: profiles?.find((p) => p.id === r.merchant_id)?.full_name || "غير معروف",
        settled_by_name: r.settled_by ? (profiles?.find((p) => p.id === r.settled_by)?.full_name || "غير معروف") : null,
      }));
    },
  });
}

// Merchant: fetch own settlement receipts
export function useMerchantSettlements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["settlement-receipts", "merchant", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<SettlementReceipt[]> => {
      const { data, error } = await supabase
        .from("settlement_receipts" as any)
        .select("*")
        .eq("merchant_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}
