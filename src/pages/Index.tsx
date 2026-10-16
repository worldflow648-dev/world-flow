import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HeroSlider } from "@/components/HeroSlider";
import { CategoryGrid } from "@/components/CategoryGrid";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { PullToRefresh } from "@/components/PullToRefresh";
import { MerchantLayout } from "@/components/MerchantLayout";

const Index = () => {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ]);
  }, [queryClient]);

  return (
    <MerchantLayout>
      <PullToRefresh onRefresh={handleRefresh} className="pb-24 md:pb-8">
        <main>
          <HeroSlider />
          <CategoryGrid />
          <FeaturedProducts />
        </main>
      </PullToRefresh>
    </MerchantLayout>
  );
};

export default Index;
