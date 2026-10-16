import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export function FeaturedProducts() {
  const { data: products, isLoading } = useProducts({ limit: 8 });
  const { t, isRTL } = useLanguage();

  const ViewAllArrow = isRTL ? ArrowLeft : ArrowRight;

  if (isLoading) {
    return (
      <section className="px-4 mt-8 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">{t('featured.title')}</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-card">
              <Skeleton className="aspect-[3/4] w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return (
      <section className="px-4 mt-8 pb-28">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">{t('featured.title')}</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">{t('featured.noProducts')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 mt-8 pb-28">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">{t('featured.title')}</h2>
        </div>
        <Link to="/search" className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline press-effect">
          {t('common.viewAll')}
          <ViewAllArrow className="h-4 w-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product, index) => (
          <div key={product.id} className="animate-slide-up" style={{ animationDelay: `${index * 75}ms` }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
