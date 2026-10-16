import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TierDiscount {
  id: string;
  tier: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTierDiscounts() {
  return useQuery({
    queryKey: ["tier-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_discounts" as any)
        .select("*")
        .order("tier");
      if (error) throw error;
      return (data || []) as unknown as TierDiscount[];
    },
  });
}

export function useUpdateTierDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; discount_type: string; discount_value: number; is_active: boolean }) => {
      const { error } = await supabase
        .from("tier_discounts" as any)
        .update({
          discount_type: params.discount_type,
          discount_value: params.discount_value,
          is_active: params.is_active,
        } as any)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tier-discounts"] });
      toast.success("تم تحديث الخصم بنجاح");
    },
    onError: (error: any) => {
      toast.error("فشل في تحديث الخصم", { description: error.message });
    },
  });
}

export function useMerchantTierDiscount() {
  const { profile } = useAuth();
  const { data: tiers } = useTierDiscounts();

  const tier = profile?.merchant_tier || "basic";
  const tierDiscount = tiers?.find((t) => t.tier === tier);

  if (!tierDiscount || !tierDiscount.is_active || tierDiscount.discount_value <= 0) {
    return { discountPercent: 0, discountFixed: 0, discountType: "percentage" as string, tierName: tier, hasDiscount: false };
  }

  return {
    discountPercent: tierDiscount.discount_type === "percentage" ? tierDiscount.discount_value : 0,
    discountFixed: tierDiscount.discount_type === "fixed" ? tierDiscount.discount_value : 0,
    discountType: tierDiscount.discount_type,
    tierName: tier,
    hasDiscount: true,
  };
}

export function calculateTierDiscount(
  totalMerchantCost: number,
  discountType: string,
  discountPercent: number,
  discountFixed: number
): number {
  if (discountType === "percentage" && discountPercent > 0) {
    return Math.floor(totalMerchantCost * discountPercent / 100);
  }
  if (discountType === "fixed" && discountFixed > 0) {
    return Math.min(discountFixed, totalMerchantCost);
  }
  return 0;
}
