import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search as SearchIcon, X, Shirt, Coffee, Layers, CircleDot, Flame, type LucideIcon } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useStorefrontCategories } from "@/hooks/useCatalogData";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MerchantLayout } from "@/components/MerchantLayout";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, LucideIcon> = {
  hoodies: Shirt, cups: Coffee, sweatshirts: Layers, tshirts: CircleDot,
};

const getIconComponent = (iconName: string | null | undefined, categoryName: string): LucideIcon => {
  if (iconName && categoryIcons[iconName]) return categoryIcons[iconName];
  const nameLower = categoryName.toLowerCase();
  if (nameLower.includes('hood') || nameLower.includes('هود')) return Shirt;
  if (nameLower.includes('cup') || nameLower.includes('كوب') || nameLower.includes('أكواب')) return Coffee;
  if (nameLower.includes('sweat') || nameLower.includes('سويت')) return Layers;
  if (nameLower.includes('shirt') || nameLower.includes('تيشيرت')) return CircleDot;
  return CircleDot;
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const categoryParam = searchParams.get("category") || "all";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [isFocused, setIsFocused] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useStorefrontCategories();
  const { data: products, isLoading: productsLoading } = useProducts(
    selectedCategory !== "all" ? { categoryId: selectedCategory } : undefined
  );

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [queryClient]);

  const filteredProducts = products?.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return product.name.toLowerCase().includes(query) || (product.name_en && product.name_en.toLowerCase().includes(query));
  });

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === "all") searchParams.delete("category");
    else searchParams.set("category", categoryId);
    setSearchParams(searchParams);
  };

  const isLoading = productsLoading || categoriesLoading;

  return (
    <MerchantLayout hideHeader>
      <div className="pb-24 md:pb-8">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="py-4 px-4">
            <h1 className="text-lg font-bold mb-3 flex items-center gap-2">
              <SearchIcon className="h-5 w-5 text-primary" />
              {t('nav.search')}
            </h1>
            <div className={cn("relative transition-all duration-300", isFocused && "scale-[1.02]")}>
              <SearchIcon className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={cn("ps-12 pe-10 h-12 rounded-2xl bg-card shadow-card border-0 text-base transition-all duration-300", isFocused && "shadow-float ring-2 ring-primary/20")}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute end-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center press-effect">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="px-4 py-3 overflow-x-auto hide-scrollbar">
          <div className="flex gap-2">
            <button onClick={() => handleCategoryChange("all")} className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-300 press-effect",
              selectedCategory === "all" ? "bg-gradient-primary text-white shadow-glow" : "bg-card text-foreground shadow-card hover:shadow-float"
            )}>
              <Flame className={cn("h-4 w-4", selectedCategory === "all" ? "text-white" : "text-primary")} strokeWidth={2} />
              <span>{t('common.all')}</span>
            </button>
            {categoriesLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded-2xl flex-shrink-0" />)
            ) : (
              categories?.map((category) => {
                const IconComponent = getIconComponent(category.icon, category.name);
                const isActive = selectedCategory === category.id;
                return (
                  <button key={category.id} onClick={() => handleCategoryChange(category.id)} className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-300 press-effect",
                    isActive ? "bg-gradient-primary text-white shadow-glow" : "bg-card text-foreground shadow-card hover:shadow-float"
                  )}>
                    <IconComponent className={cn("h-4 w-4", isActive ? "text-white" : "text-primary")} strokeWidth={2} />
                    <span>{language === 'en' && category.name_en ? category.name_en : category.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <PullToRefresh onRefresh={handleRefresh} className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card animate-pulse">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">{filteredProducts.length} {t('common.product')}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((product, index) => (
                  <div key={product.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState type="search" description={t('errors.tryDifferentSearch')} />
          )}
        </PullToRefresh>
      </div>
    </MerchantLayout>
  );
};

export default Search;
