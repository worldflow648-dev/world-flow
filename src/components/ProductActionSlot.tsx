import { ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/hooks/useCatalogData";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProductActionSlotProps {
  merchantPrice: number;
  addonsTotal: number;
  total: number;
  onAddToCart: () => void;
  disabled?: boolean;
}

export function ProductActionSlot({ merchantPrice, addonsTotal, total, onAddToCart, disabled }: ProductActionSlotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="space-y-3 animate-slide-up">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-1.5 pb-2 overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('cart.merchantPrice')}</span>
            <span className="font-medium">{formatPrice(merchantPrice)}</span>
          </div>
          {addonsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('cart.addons')}</span>
              <span className="font-medium">{formatPrice(addonsTotal)}</span>
            </div>
          )}
          <div className="border-t border-border/30 pt-2" />
        </CollapsibleContent>

        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('cart.total')}</span>
              {addonsTotal > 0 && <span className="text-xs text-muted-foreground/70">{t('cart.includingAddons')}</span>}
              <div className={cn("w-5 h-5 rounded-full bg-secondary flex items-center justify-center transition-transform", isExpanded && "rotate-180")}>
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <span className="text-xl font-bold text-price">{formatPrice(total)}</span>
          </button>
        </CollapsibleTrigger>
      </Collapsible>

      <Button onClick={onAddToCart} disabled={disabled} className="w-full h-12 text-lg font-semibold rounded-xl bg-gradient-primary shadow-glow press-effect">
        {t('cart.addToCart')}
      </Button>
    </div>
  );
}
