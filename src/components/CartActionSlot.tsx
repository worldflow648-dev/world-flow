import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/hooks/useCatalogData";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CartActionSlotProps {
  subtotal: number;
  addonsTotal: number;
  total: number;
  itemCount: number;
  onContinue: () => void;
}

const ESTIMATED_SHIPPING_FEE = 5000;

export function CartActionSlot({ subtotal, addonsTotal, total, itemCount, onContinue }: CartActionSlotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();
  const estimatedTotal = total + ESTIMATED_SHIPPING_FEE;

  return (
    <div className="space-y-3 animate-slide-up">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-1.5 pb-2 overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('cart.products')} ({itemCount})</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          {addonsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cart.addons')}</span>
              <span className="font-medium">{formatPrice(addonsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('cart.estimatedShipping')}</span>
            <span className="font-medium">{formatPrice(ESTIMATED_SHIPPING_FEE)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 leading-snug">
            {t('cart.shippingEstimateHint')}
          </p>
          <div className="border-t border-border/30 pt-2" />
        </CollapsibleContent>

        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('cart.totalWithCount', { count: itemCount })}
              </span>
              <div className={cn(
                "w-5 h-5 rounded-full bg-secondary flex items-center justify-center transition-transform",
                isExpanded && "rotate-180"
              )}>
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground bg-secondary/70 px-1.5 py-0.5 rounded-md">
                {t('cart.estimatedTag')}
              </span>
              <span className="text-xl font-bold text-price">{formatPrice(estimatedTotal)}</span>
            </div>
          </button>
        </CollapsibleTrigger>
      </Collapsible>

      <Button
        onClick={onContinue}
        className="w-full h-12 text-lg font-semibold rounded-xl bg-gradient-primary shadow-glow press-effect"
      >
        {t('cart.continue')}
      </Button>
    </div>
  );
}
