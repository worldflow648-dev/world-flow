import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Upload, Check, AlertCircle, Gift, Printer, TrendingUp, Image as ImageIcon, X, Tag, Loader2 } from "lucide-react";
import { useProductById, getTotalStock } from "@/hooks/useProducts";
import { useAddons, formatPrice, ProductAddonOption } from "@/hooks/useCatalogData";
import { useAllAddonScopes, resolveAddonsForProduct } from "@/hooks/useAddonScopes";
import { useCart, CartItemAddon } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductActionSlot } from "@/components/ProductActionSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageGallery } from "@/components/ImageGallery";
import { TrustBadges } from "@/components/TrustBadges";
import { MerchantLayout } from "@/components/MerchantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { cn, computeDiscount } from "@/lib/utils";
import { toast } from "sonner";


const addonIcons: Record<string, React.ReactNode> = {
  wrapping: <Gift className="h-4 w-4" />,
  printing: <Printer className="h-4 w-4" />,
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const { data: product, isLoading, error } = useProductById(id || "");
  const { data: allAddons = [] } = useAddons();
  const { data: allScopes = [] } = useAllAddonScopes();
  const { data: appSettings } = useAppSettings();
  const allowBelowCost = (appSettings?.allow_below_cost_pricing ?? 'true') === 'true';

  
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedAddonOptions, setSelectedAddonOptions] = useState<Record<string, ProductAddonOption | null>>({});
  const [designFiles, setDesignFiles] = useState<File[]>([]);
  const [mockupFiles, setMockupFiles] = useState<File[]>([]);
  const [designPreviews, setDesignPreviews] = useState<string[]>([]);
  const [mockupPreviews, setMockupPreviews] = useState<string[]>([]);
  const [retailPrice, setRetailPrice] = useState<string>("");
  const [discountCodeInput, setDiscountCodeInput] = useState<string>("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; unitAmount: number } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);


  // Distinct sizes available on this product (dedup by size).
  const uniqueSizeVariants = useMemo(
    () => Array.from(new Map((product?.variants || []).map(v => [v.size, v])).values()),
    [product?.variants]
  );

  // Auto-select the size when there's only one option (so the picker can stay hidden).
  useEffect(() => {
    if (uniqueSizeVariants.length === 1 && !selectedSize) {
      setSelectedSize(uniqueSizeVariants[0].size);
    }
  }, [uniqueSizeVariants, selectedSize]);
  
  
  const designInputRef = useRef<HTMLInputElement>(null);
  const mockupInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <MerchantLayout hideHeader>
        <div className="pb-64 md:pb-8">
          <header className="sticky top-0 z-40 glass border-b border-border/50">
            <div className="flex items-center gap-3 py-4 px-4">
              <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-secondary rounded-full transition-colors">
                <ArrowRight className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold flex-1">{t('product.details')}</h1>
            </div>
          </header>
          <div className="p-4 space-y-4">
            <Skeleton className="aspect-square rounded-3xl skeleton-shimmer" />
            <div className="flex gap-2">
              <Skeleton className="w-16 h-16 rounded-xl skeleton-shimmer" />
              <Skeleton className="w-16 h-16 rounded-xl skeleton-shimmer" />
              <Skeleton className="w-16 h-16 rounded-xl skeleton-shimmer" />
            </div>
            <Skeleton className="h-24 rounded-2xl skeleton-shimmer" />
            <Skeleton className="h-32 rounded-2xl skeleton-shimmer" />
          </div>
        </div>
      </MerchantLayout>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('product.notFound')}</p>
      </div>
    );
  }

  const totalStock = getTotalStock(product);
  const addons = resolveAddonsForProduct(allAddons, allScopes, product.id, product.category_id);
  // Variants matching the chosen size (may include multiple colors).
  const sizeVariants = product.variants?.filter((v) => v.size === selectedSize) || [];
  // Distinct colors available for the chosen size (excluding null/empty).
  const colorOptions = Array.from(
    new Map(sizeVariants.filter(v => v.color).map(v => [v.color, v])).values()
  );
  const requiresColorChoice = colorOptions.length > 1;
  // Auto-select the only color when there's exactly one (after size pick).
  if (selectedSize && colorOptions.length === 1 && selectedColor !== colorOptions[0].color) {
    queueMicrotask(() => setSelectedColor(colorOptions[0].color));
  }
  // Resolve final variant: prefer color match, fall back to first variant for that size.
  const selectedVariant = sizeVariants.find(v =>
    selectedColor ? v.color === selectedColor : true
  ) || sizeVariants[0];
  
  const calculateAddonsTotal = () => {
    return addons.filter((addon) => selectedAddons.includes(addon.id)).reduce((sum, addon) => {
      const selectedOption = selectedAddonOptions[addon.id];
      if (selectedOption) return sum + (selectedOption.price !== null ? selectedOption.price : addon.price);
      return sum + addon.price;
    }, 0);
  };

  const calculateTotal = () => product.merchant_price + calculateAddonsTotal();

  const calculateProfit = () => {
    const numRetailPrice = parseInt(retailPrice.replace(/,/g, ""), 10) || 0;
    return numRetailPrice - calculateTotal();
  };

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons((prev) => {
      const newAddons = prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId];
      if (!newAddons.includes(addonId)) {
        setSelectedAddonOptions(prev => { const updated = { ...prev }; delete updated[addonId]; return updated; });
      }
      return newAddons;
    });
  };

  const handleOptionSelect = (addonId: string, option: ProductAddonOption) => {
    setSelectedAddonOptions(prev => ({ ...prev, [addonId]: option }));
  };

  const isPrintingEnabled = () => addons.some(addon => selectedAddons.includes(addon.id) && addon.name.includes('طباعة'));

  const hasUnselectedRequiredOptions = () => {
    return addons.some(addon => {
      const isSelected = selectedAddons.includes(addon.id);
      const hasOptions = addon.options && addon.options.length > 0;
      const hasSelectedOption = selectedAddonOptions[addon.id];
      return isSelected && hasOptions && !hasSelectedOption;
    });
  };

  const handleDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.type !== "image/png") {
        toast.error(t('product.pngOnly'));
        return false;
      }
      return true;
    });
    if (validFiles.length > 0) {
      setDesignFiles(prev => [...prev, ...validFiles]);
      setDesignPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
    }
    e.target.value = '';
  };

  const removeDesignAt = (idx: number) => {
    setDesignPreviews(prev => {
      const url = prev[idx];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
    setDesignFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMockupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setMockupFiles(prev => [...prev, ...files]);
      setMockupPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    }
    e.target.value = '';
  };

  const removeMockupAt = (idx: number) => {
    setMockupPreviews(prev => {
      const url = prev[idx];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
    setMockupFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRetailPriceChange = (value: string) => {
    setRetailPrice(value);
    // Recompute discount amount if a coupon is already applied.
    if (appliedDiscount) {
      // Keep code but require re-apply after price change so amount stays correct.
      setAppliedDiscount(null);
      toast.info(t('product.reapplyDiscount') || 'يرجى إعادة تطبيق كود الخصم بعد تغيير السعر');
    }
  };

  const handleApplyDiscount = async () => {
    const code = discountCodeInput.trim().toUpperCase();
    if (!code) return;
    const numRetailPrice = parseInt(retailPrice.replace(/,/g, ""), 10) || 0;
    if (numRetailPrice <= 0) {
      toast.error(t('product.enterRetailPriceFirst') || 'أدخل سعر البيع أولاً');
      return;
    }
    setValidatingCode(true);
    try {
      const { data: codeRow, error } = await supabase
        .from('discount_codes')
        .select('*, discount_code_products(product_id)')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();
      if (error || !codeRow) { toast.error(t('checkout.discountInvalid') || 'كود غير صالح'); return; }
      if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) { toast.error(t('checkout.discountExpired') || 'الكود منتهي'); return; }
      if (codeRow.max_uses && (codeRow.used_count || 0) >= codeRow.max_uses) { toast.error(t('checkout.discountUsedUp') || 'انتهت مرات استخدام الكود'); return; }
      const linked: string[] = (codeRow.discount_code_products || []).map((r: any) => r.product_id);
      if (linked.length === 0 && !(codeRow as any).product_id) {
        toast.error(t('product.codeIsStorewide') || 'هذا كود عام — طبّقه في صفحة الدفع، وليس على منتج واحد');
        return;
      }
      const isForThis = linked.includes(product.id) || (codeRow as any).product_id === product.id;
      if (!isForThis) {
        toast.error(t('product.codeNotForThisProduct') || 'الكود غير صالح لهذا المنتج');
        return;
      }
      if (codeRow.min_order_value && numRetailPrice < codeRow.min_order_value) {
        toast.error(t('checkout.discountMinOrder', { amount: formatPrice(codeRow.min_order_value) }) || `الحد الأدنى ${formatPrice(codeRow.min_order_value)}`);
        return;
      }
      const unitAmount = computeDiscount(numRetailPrice, codeRow as any);
      setAppliedDiscount({ code, unitAmount });
      toast.success(t('checkout.discountApplied', { value: codeRow.discount_type === 'percentage' ? codeRow.discount_value + '%' : formatPrice(codeRow.discount_value) }) || `تم تطبيق الخصم`);
    } catch {
      toast.error(t('checkout.discountError') || 'خطأ في الكود');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) { toast.error(t('product.loginRequired')); navigate("/auth"); return; }
    if (!selectedSize) { toast.error(t('product.selectSizeFirst')); return; }
    if (requiresColorChoice && !selectedColor) { toast.error(t('product.selectColorFirst')); return; }
    if (hasUnselectedRequiredOptions()) { toast.error(t('product.selectOptionsFirst')); return; }
    if (isPrintingEnabled() && (designFiles.length === 0 || mockupFiles.length === 0)) { toast.error(t('product.uploadDesignFirst')); return; }
    const numRetailPrice = parseInt(retailPrice.replace(/,/g, ""), 10) || 0;
    if (retailPrice.trim() === '') { toast.error(t('product.enterRetailPrice')); return; }
    if (!allowBelowCost && numRetailPrice < calculateTotal()) { toast.error(t('product.priceTooLow', { amount: formatPrice(calculateTotal()) })); return; }
    

    const cartAddons: CartItemAddon[] = addons.filter((addon) => selectedAddons.includes(addon.id)).map((addon) => {
      const selectedOption = selectedAddonOptions[addon.id];
      const effectivePrice = selectedOption?.price !== null && selectedOption?.price !== undefined ? selectedOption.price : addon.price;
      return { id: addon.id, name: selectedOption ? `${addon.name} (${selectedOption.name})` : addon.name, price: effectivePrice, optionId: selectedOption?.id, optionName: selectedOption?.name, requires_deposit: addon.requires_deposit || false, deposit_price: addon.deposit_price || 0 };
    });

    addItem({
      product,
      selectedSize,
      selectedColor: selectedVariant?.color ?? null,
      selectedVariantId: selectedVariant?.id ?? null,
      quantity: 1,
      addons: cartAddons,
      designFiles: designFiles.length > 0 ? designFiles : undefined,
      mockupFiles: mockupFiles.length > 0 ? mockupFiles : undefined,
      retailPrice: numRetailPrice,
      discountCode: appliedDiscount?.code,
      discountAmount: appliedDiscount?.unitAmount ?? 0,
    });
    toast.success(t('product.addedToCart'));
    navigate("/cart");
  };


  const profit = calculateProfit();
  const productImages = product.images || [];

  return (
    <MerchantLayout
      hideHeader
      actionSlot={
        <ProductActionSlot
          merchantPrice={product.merchant_price}
          addonsTotal={calculateAddonsTotal()}
          total={calculateTotal()}
          onAddToCart={handleAddToCart}
          disabled={!selectedSize || (requiresColorChoice && !selectedColor) || hasUnselectedRequiredOptions() || (isPrintingEnabled() && (designFiles.length === 0 || mockupFiles.length === 0)) || retailPrice.trim() === ''}
        />
      }
    >
      <div className="pb-48 md:pb-8">
        {/* Header */}
        <header className="sticky top-0 z-40 glass border-b border-border/50">
          <div className="flex items-center gap-3 py-4 px-4">
            <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-secondary rounded-full transition-colors">
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold flex-1">{t('product.details')}</h1>
          </div>
        </header>

        {/* Product Image Gallery */}
        <div className="px-4 mt-4">
          <ImageGallery images={productImages} alt={product.name} />
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-4">
          {/* Title & Badges */}
          <div className="bg-card rounded-2xl p-4 shadow-card animate-slide-up border border-border/50">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold leading-tight">{product.name}</h2>
              <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-0 font-bold text-base px-3">
                {formatPrice(product.merchant_price)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">{totalStock} {t('product.piecesAvailable')}</span>
              </div>
            </div>
          </div>

          <TrustBadges className="animate-slide-up" />

          {/* Size/Color Selection — hidden entirely when there's nothing to choose */}
          {(uniqueSizeVariants.length > 1 || colorOptions.length > 0) && (
          <div className="bg-card rounded-2xl p-4 shadow-card animate-slide-up border border-border/50" style={{ animationDelay: "0.1s" }}>
            {uniqueSizeVariants.length > 1 && (
              <>
                <h3 className="font-semibold mb-3">{t('product.chooseSize')}</h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueSizeVariants.map((variant) => {
                    // Total stock across colors for this size (null = unlimited).
                    const sameSize = (product.variants || []).filter(v => v.size === variant.size);
                    const sizeStock = sameSize.some(v => v.stock_level === null)
                      ? Infinity
                      : sameSize.reduce((s, v) => s + (v.stock_level || 0), 0);
                    const isAvailable = sizeStock > 0;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => { if (isAvailable) { setSelectedSize(variant.size); setSelectedColor(null); } }}
                        disabled={!isAvailable}
                        className={cn(
                          "px-4 py-2.5 rounded-xl transition-all min-w-[70px] font-medium press-effect",
                          selectedSize === variant.size ? "bg-primary text-primary-foreground shadow-float" : "bg-secondary/70 hover:bg-secondary text-foreground",
                          !isAvailable && "opacity-40 cursor-not-allowed bg-muted"
                        )}
                      >
                        <span className="block text-sm">{variant.size}</span>
                        <span className={cn("block text-[10px] mt-0.5", selectedSize === variant.size ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {Number.isFinite(sizeStock) ? (isAvailable ? `${sizeStock} ${t('product.piecesShort')}` : t('product.soldOut')) : t('product.inStock')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Color Selection (shown when chosen size has any colors) */}
            {selectedSize && colorOptions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50 animate-slide-up">
                <h3 className="font-semibold mb-3">
                  {t('product.chooseColor')} {requiresColorChoice && <span className="text-destructive">*</span>}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((variant) => {
                    const isSelected = selectedColor === variant.color;
                    const stock = variant.stock_level;
                    const available = stock === null || (stock ?? 0) > 0;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => available && setSelectedColor(variant.color)}
                        disabled={!available}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl transition-all font-medium press-effect border-2",
                          isSelected ? "border-primary bg-primary/5" : "border-transparent bg-secondary/70 hover:bg-secondary",
                          !available && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {variant.color_hex && (
                          <span
                            className="w-5 h-5 rounded-full border border-border/50 shadow-sm"
                            style={{ backgroundColor: variant.color_hex }}
                          />
                        )}
                        <span className="text-sm">{variant.color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Add-ons */}
          {addons.length > 0 && (
            <div className="bg-card rounded-2xl p-4 shadow-card animate-slide-up border border-border/50" style={{ animationDelay: "0.15s" }}>
              <h3 className="font-semibold mb-3">{t('product.optionalAddons')}</h3>
              <div className="space-y-0 divide-y divide-border/50">
                {addons.map((addon) => (
                  <div key={addon.id}>
                    <div className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", selectedAddons.includes(addon.id) ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
                          {addonIcons[addon.id] || (addon.name.includes('طباعة') ? <Printer className="h-4 w-4" /> : <Gift className="h-4 w-4" />)}
                        </div>
                        <div>
                          <span className="font-medium block">{addon.name}</span>
                          <span className="text-sm text-price font-bold">+{formatPrice(addon.price)}</span>
                        </div>
                      </div>
                      <Switch checked={selectedAddons.includes(addon.id)} onCheckedChange={() => handleAddonToggle(addon.id)} />
                    </div>
                    {addon.options && addon.options.length > 0 && selectedAddons.includes(addon.id) && (
                      <div className="pb-3 pr-13 animate-slide-up">
                        <p className="text-sm text-muted-foreground mb-2 mr-13">{t('product.chooseOption')}</p>
                        <div className="flex flex-wrap gap-2 mr-13">
                          {addon.options.map((option) => {
                            const isSelected = selectedAddonOptions[addon.id]?.id === option.id;
                            return (
                              <button key={option.id} onClick={() => handleOptionSelect(addon.id, option)}
                                className={cn("py-2.5 px-4 rounded-xl font-medium transition-all press-effect", isSelected ? "bg-primary text-primary-foreground shadow-float" : "bg-secondary/70 hover:bg-secondary text-foreground")}
                              >
                                <span className="block">{option.name}</span>
                                {option.price !== null && option.price !== addon.price && (
                                  <span className={cn("block text-xs mt-0.5", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>{formatPrice(option.price)}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Design Upload */}
          {isPrintingEnabled() && (
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border/50 animate-scale-in origin-top space-y-5">
              <h3 className="font-semibold">{t('product.uploadDesign')}</h3>

              {/* Design files (PNG) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('product.designPNG')}</span>
                  <span className="text-xs text-muted-foreground">{designFiles.length} {t('product.filesCount')}</span>
                </div>
                <input ref={designInputRef} type="file" accept="image/png" multiple onChange={handleDesignUpload} className="hidden" />
                {designFiles.length === 0 ? (
                  <button onClick={() => designInputRef.current?.click()}
                    className="w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group press-effect border-border hover:border-primary/50 hover:bg-secondary/50"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 bg-secondary text-muted-foreground">
                      <Upload className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-muted-foreground text-center px-2 font-medium">
                      {t('product.tapToUpload')}
                    </span>
                  </button>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {designPreviews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary/50 group">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeDesignAt(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => designInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 flex flex-col items-center justify-center gap-1 transition-all press-effect"
                    >
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">{t('product.addMore')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mockup files */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('product.mockupReference')}</span>
                  <span className="text-xs text-muted-foreground">{mockupFiles.length} {t('product.filesCount')}</span>
                </div>
                <input ref={mockupInputRef} type="file" accept="image/*" multiple onChange={handleMockupUpload} className="hidden" />
                {mockupFiles.length === 0 ? (
                  <button onClick={() => mockupInputRef.current?.click()}
                    className="w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group press-effect border-border hover:border-primary/50 hover:bg-secondary/50"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 bg-secondary text-muted-foreground">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-muted-foreground text-center px-2 font-medium">
                      {t('product.tapToUpload')}
                    </span>
                  </button>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {mockupPreviews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary/50 group">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeMockupAt(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => mockupInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 flex flex-col items-center justify-center gap-1 transition-all press-effect"
                    >
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">{t('product.addMore')}</span>
                    </button>
                  </div>
                )}
              </div>

              {(designFiles.length === 0 || mockupFiles.length === 0) && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-slide-up">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t('product.uploadBothImages')}
                </p>
              )}
            </div>
          )}


          {/* Retail Price */}
          <div className="bg-card rounded-2xl p-4 shadow-card animate-slide-up border border-border/50" style={{ animationDelay: "0.25s" }}>
            <h3 className="font-semibold mb-3">{t('product.retailPrice')} <span className="text-destructive">*</span></h3>
            <div className="relative">
              <Input type="text" inputMode="numeric" placeholder={t('product.enterRetailPricePlaceholder')} value={retailPrice} onChange={(e) => handleRetailPriceChange(e.target.value)}
                className="pl-16 h-12 rounded-xl text-lg font-medium bg-secondary/50 border-0 focus-visible:ring-primary"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{t('common.currency')}</span>
            </div>
            {!allowBelowCost && (
              <p className="text-xs text-muted-foreground mt-2">{t('product.minPrice')}: {formatPrice(calculateTotal())}</p>
            )}
            {profit !== 0 && (parseInt(retailPrice.replace(/,/g, ""), 10) || 0) > 0 && (
              <div className={cn("flex items-center gap-2 mt-3 p-3 rounded-xl animate-scale-in", profit > 0 ? "bg-gradient-to-l from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 shadow-glow-success" : "bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30")}>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", profit > 0 ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-amber-100 dark:bg-amber-900/50")}>
                  {profit > 0 ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                </div>
                <div>
                  <span className={cn("text-xs block", profit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{profit > 0 ? t('product.expectedProfit') : t('product.payDifference')}</span>
                  <span className={cn("font-bold", profit > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>{formatPrice(Math.abs(profit))}</span>
                </div>
              </div>
            )}
          </div>

          {/* Discount Code (product-specific) */}
          <div className="bg-card rounded-2xl p-4 shadow-card animate-slide-up border border-border/50" style={{ animationDelay: "0.28s" }}>
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              {t('product.discountCode') || 'كود خصم لهذا المنتج'}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t('product.discountCodeHint') || 'أدخل كود خصم مخصص لهذا المنتج فقط. الأكواد العامة تُطبَّق في صفحة الدفع.'}
            </p>
            {appliedDiscount ? (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 p-3 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="font-mono font-bold text-green-700 dark:text-green-400">{appliedDiscount.code}</span>
                  <span className="text-sm text-green-600 dark:text-green-400 truncate">
                    -{formatPrice(appliedDiscount.unitAmount)} / {t('product.perUnit') || 'قطعة'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setAppliedDiscount(null); setDiscountCodeInput(''); }} className="text-destructive shrink-0">
                  {t('common.remove') || 'إزالة'}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                  placeholder={t('checkout.enterDiscountCode') || 'أدخل الكود'}
                  className="font-mono h-11 rounded-xl bg-secondary/50 border-0 focus-visible:ring-primary"
                  dir="ltr"
                />
                <Button
                  onClick={handleApplyDiscount}
                  disabled={validatingCode || !discountCodeInput.trim()}
                  variant="outline"
                  className="h-11 rounded-xl whitespace-nowrap"
                >
                  {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : (t('common.apply') || 'تطبيق')}
                </Button>
              </div>
            )}
          </div>



          {/* Desktop: show action inline */}
          <div className="hidden md:block">
            <ProductActionSlot
              merchantPrice={product.merchant_price}
              addonsTotal={calculateAddonsTotal()}
              total={calculateTotal()}
              onAddToCart={handleAddToCart}
              disabled={!selectedSize || hasUnselectedRequiredOptions() || (isPrintingEnabled() && (designFiles.length === 0 || mockupFiles.length === 0)) || retailPrice.trim() === ''}
            />
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default ProductDetail;
