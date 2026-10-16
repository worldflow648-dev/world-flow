import { useState, forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Flame, Sparkles } from "lucide-react";
import { Product } from "@/hooks/useProducts";
import { formatPrice } from "@/hooks/useCatalogData";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
}

export const ProductCard = forwardRef<HTMLAnchorElement, ProductCardProps>(
  ({ product, showBadge = true }, ref) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const [imageLoaded, setImageLoaded] = useState(false);

    // null stock_level = unlimited (matches DB). Treat as Infinity → always available, never low-stock.
    const variants = product.variants || [];
    const hasUnlimited = variants.some(v => v.stock_level === null);
    const totalStock = hasUnlimited
      ? Infinity
      : variants.reduce((sum, v) => sum + (v.stock_level || 0), 0);
    const isLowStock = !hasUnlimited && totalStock > 0 && totalStock <= 5;
    const isNew = product.created_at && 
      new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const handleMouseEnter = () => {
      queryClient.prefetchQuery({ queryKey: ['product', product.id], staleTime: 30000 });
    };

    const handleQuickAdd = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Route to product page where size, addons, and retail price can be properly set.
      // Direct add bypassed the selling-price guard and produced zero-price orders.
      navigate(`/product/${product.id}`);
    };

    const productImage = product.images?.[0] || "/placeholder.svg";
    const displayName = language === 'en' && product.name_en ? product.name_en : product.name;

    return (
      <Link ref={ref} to={`/product/${product.id}`} className="block animate-slide-up" onMouseEnter={handleMouseEnter}>
        <div className="bg-card rounded-2xl overflow-hidden shadow-card hover-lift group">
          <div className="aspect-[3/4] overflow-hidden bg-muted relative">
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10 animate-pulse" />
            )}
            <img
              src={productImage}
              alt={displayName}
              className={cn("h-full w-full object-cover transition-all duration-500 group-hover:scale-110", imageLoaded ? "opacity-100" : "opacity-0")}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
            
            {showBadge && isNew && (
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-primary text-white text-[10px] font-bold shadow-float animate-bounce-in">
                <Sparkles className="h-3 w-3" />
                {t('common.new')}
              </div>
            )}
            
            {showBadge && !isNew && isLowStock && (
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-premium text-white text-[10px] font-bold shadow-float animate-bounce-in">
                <Flame className="h-3 w-3" />
                {t('common.lastPieces', { count: totalStock })}
              </div>
            )}

            <button
              onClick={handleQuickAdd}
              disabled={totalStock === 0}
              className={cn(
                "absolute bottom-3 left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 press-effect",
                totalStock === 0 ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-card text-primary shadow-float hover:bg-primary hover:text-primary-foreground hover:shadow-glow"
              )}
              aria-label={t('cart.addToCart')}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3 space-y-1.5">
            <h3 className="text-sm font-medium line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">
              {displayName}
            </h3>
            <div className="flex items-center justify-between">
              <p className="text-price font-bold text-base">{formatPrice(product.merchant_price)}</p>
              {totalStock > 0 ? (
                <span className="text-[10px] text-success font-medium">{t('common.available')}</span>
              ) : (
                <span className="text-[10px] text-destructive font-medium">{t('common.unavailable')}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }
);

ProductCard.displayName = "ProductCard";
