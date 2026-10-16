import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Trash2, Minus, Plus, ShoppingCart, AlertTriangle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";

import { formatPrice } from "@/hooks/useCatalogData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CartActionSlot } from "@/components/CartActionSlot";
import { EmptyState } from "@/components/EmptyState";
import { MerchantLayout } from "@/components/MerchantLayout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRefreshCartPrices } from "@/hooks/useRefreshCartPrices";

const Cart = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateItemQuantity, clearCart, getSubtotal, getAddonsTotal, getTotal } = useCart();
  const { t, isRTL } = useLanguage();
  const { inactiveProductIds } = useRefreshCartPrices();
  const hasInactive = inactiveProductIds.length > 0;
  

  const handleClearCart = () => {
    clearCart();
    toast.success(t('cart.cleared'));
  };

  const handleContinue = () => {
    if (hasInactive) {
      toast.error("يرجى إزالة المنتجات غير المتاحة قبل المتابعة");
      return;
    }
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <MerchantLayout hideHeader>
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center gap-3 py-4 px-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-xl transition-colors press-effect" aria-label={t('common.back')}>
              <ArrowRight className={cn("h-5 w-5", !isRTL && "rotate-180")} />
            </button>
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold flex-1">{t('cart.title')}</h1>
          </div>
        </header>
        <EmptyState type="cart" className="min-h-[60vh]" action={
          <Button onClick={() => navigate("/")} className="px-8 rounded-2xl bg-gradient-primary hover:opacity-90 shadow-glow press-effect">
            {t('common.browseProducts')}
          </Button>
        } />
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout hideHeader actionSlot={
      <CartActionSlot subtotal={getSubtotal()} addonsTotal={getAddonsTotal()} total={getTotal()} itemCount={items.length} onContinue={handleContinue} />
    }>
      <div className="pb-48 md:pb-8">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center gap-3 py-4 px-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-xl transition-colors press-effect">
              <ArrowRight className={cn("h-5 w-5", !isRTL && "rotate-180")} />
            </button>
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold flex-1">{t('cart.title')}</h1>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-destructive text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-destructive/10 transition-colors press-effect">
                  {t('cart.clear')}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('cart.clearCart')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('cart.clearConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('cart.clear')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>


        {items.some(item => item.addons.some(a => a.requires_deposit)) && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
              بعض الإضافات تتطلب دفع عربون عند تأكيد الطلب
            </span>
          </div>
        )}

        <div className="p-4 space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="bg-card rounded-2xl p-4 shadow-card hover-lift animate-slide-up" style={{ animationDelay: `${index * 75}ms` }}>
              <div className="flex gap-3">
                <div className="w-20 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0 shadow-sm">
                  <img src={item.product.images?.[0] || "/placeholder.svg"} alt={item.product.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2 leading-relaxed">{item.product.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-muted-foreground text-xs">
                      {t('cart.size')}: <span className="font-medium text-foreground">{item.selectedSize}</span>
                    </p>
                    {item.selectedColor && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>·</span>
                        {(() => {
                          const variant = item.product.variants?.find(v => v.id === item.selectedVariantId)
                            ?? item.product.variants?.find(v => v.color === item.selectedColor);
                          return variant?.color_hex ? (
                            <span
                              className="w-3 h-3 rounded-full border border-border/50 shadow-sm"
                              style={{ backgroundColor: variant.color_hex }}
                            />
                          ) : null;
                        })()}
                        <span className="font-medium text-foreground">{item.selectedColor}</span>
                      </span>
                    )}
                  </div>
                  {item.addons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.addons.map((addon) => (
                        <Badge key={addon.id} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">{addon.name}</Badge>
                      ))}
                    </div>
                  )}
                  {((item.designFiles?.length ?? 0) > 0 || (item.mockupFiles?.length ?? 0) > 0) && (
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                      {(item.designFiles?.length ?? 0) > 0 && <span className="flex items-center gap-1">📎 {item.designFiles!.length} تصميم</span>}
                      {(item.mockupFiles?.length ?? 0) > 0 && <span className="flex items-center gap-1">🖼️ {item.mockupFiles!.length} موكب</span>}
                    </div>
                  )}
                  {item.retailPrice > 0 && (
                    <p className="text-xs text-success mt-1 font-medium">{t('cart.retailPrice')}: {formatPrice(item.retailPrice)}</p>
                  )}
                  {item.discountCode && (item.discountAmount ?? 0) > 0 && (
                    <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-md">
                      <span className="font-mono">{item.discountCode}</span>
                      <span>−{formatPrice((item.discountAmount ?? 0) * item.quantity)}</span>
                    </div>
                  )}

                </div>
                <button onClick={() => removeItem(item.id)} className="w-9 h-9 rounded-xl text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors press-effect self-start">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <div className="flex items-center gap-1">
                  <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors press-effect">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-base">{item.quantity}</span>
                  <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors press-effect">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="font-bold text-price text-lg">
                  {formatPrice((item.product.merchant_price + item.addons.reduce((sum, a) => sum + a.price, 0)) * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block p-4">
          <CartActionSlot subtotal={getSubtotal()} addonsTotal={getAddonsTotal()} total={getTotal()} itemCount={items.length} onContinue={handleContinue} />
        </div>
      </div>
    </MerchantLayout>
  );
};

export default Cart;
