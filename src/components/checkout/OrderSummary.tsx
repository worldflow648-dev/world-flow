import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Loader2, Tag, Crown, Upload, CheckCircle2, Image, Phone } from "lucide-react";
import { useCart, CartItem } from "@/contexts/CartContext";
import { formatPrice, useGovernorates } from "@/hooks/useCatalogData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerData } from "./CustomerForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMerchantTierDiscount, calculateTierDiscount } from "@/hooks/useTierDiscounts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { CreditCard } from "lucide-react";
import { computeDiscount } from "@/lib/utils";

interface OrderSummaryProps {
  customerData: CustomerData;
  shippingFee: number;
  onConfirm: (discountInfo: { code: string; amount: number; tierDiscountAmount: number; depositAmount: number; depositReceiptFile: File | null; merchantPaymentAmount: number; merchantPaymentReceiptFile: File | null }) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

function ProductRow({ item }: { item: CartItem }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <img src={item.product.images?.[0] || "/placeholder.svg"} alt={item.product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{t('cart.size')}: {item.selectedSize}</span>
          <span className="text-xs text-muted-foreground">×{item.quantity}</span>
        </div>
        {item.addons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.addons.map((addon) => <Badge key={addon.id} variant="secondary" className="text-xs px-1.5 py-0">{addon.name}</Badge>)}
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderSummary({ customerData, shippingFee, onConfirm, onBack, isSubmitting = false }: OrderSummaryProps) {
  const { items, getTotal } = useCart();
  const { data: governorates } = useGovernorates();
  const { t } = useLanguage();
  const [discountCode, setDiscountCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCode, setAppliedCode] = useState('');
  const [depositReceiptFile, setDepositReceiptFile] = useState<File | null>(null);
  const [depositPreviewUrl, setDepositPreviewUrl] = useState<string | null>(null);
  const [merchantPaymentReceiptFile, setMerchantPaymentReceiptFile] = useState<File | null>(null);
  const [merchantPaymentPreviewUrl, setMerchantPaymentPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const merchantPaymentFileInputRef = useRef<HTMLInputElement>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const { discountPercent, discountFixed, discountType, tierName, hasDiscount: hasTierDiscount } = useMerchantTierDiscount();
  const { data: appSettings } = useAppSettings();
  const qiCardNumber = appSettings?.qi_card_number;
  const qiCardName = appSettings?.qi_card_name;
  const asiacellPhone = appSettings?.asiacell_phone_number;
  const asiacellName = appSettings?.asiacell_holder_name;
  const governorateName = governorates?.find(g => g.id === customerData.governorate)?.name_ar || customerData.governorate;

  const totalCost = getTotal();
  const tierDiscountAmount = calculateTierDiscount(totalCost, discountType, discountPercent, discountFixed);
  const totalCostAfterTier = totalCost - tierDiscountAmount;
  const customerPrice = items.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
  const perItemDiscountTotal = items.reduce((sum, item) => sum + (item.discountAmount ?? 0) * item.quantity, 0);
  const finalCustomerPrice = customerPrice - perItemDiscountTotal - discountAmount;
  const netProfit = finalCustomerPrice - totalCostAfterTier;


  // Calculate deposit amount from addons that require deposit
  const depositAmount = items.reduce((sum, item) => {
    return sum + item.addons
      .filter((addon: any) => addon.requires_deposit)
      .reduce((addonSum: number, addon: any) => addonSum + (addon.deposit_price || addon.price || 0), 0) * item.quantity;
  }, 0);

  // Aggregate which addons triggered the deposit (for clarity in the UI)
  const depositAddonBreakdown = (() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    items.forEach((item) => {
      item.addons
        .filter((addon: any) => addon.requires_deposit)
        .forEach((addon: any) => {
          const name = addon.name_ar || addon.name || addon.name_en || 'إضافة';
          const unit = addon.deposit_price || addon.price || 0;
          const existing = map.get(name);
          if (existing) {
            existing.qty += item.quantity;
            existing.total += unit * item.quantity;
          } else {
            map.set(name, { name, qty: item.quantity, total: unit * item.quantity });
          }
        });
    });
    return Array.from(map.values());
  })();

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsValidating(true);
    try {
      const { data: codes, error } = await supabase
        .from('discount_codes')
        .select('*, discount_code_products(product_id)')
        .eq('code', discountCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      if (error || !codes) { toast.error(t('checkout.discountInvalid')); return; }
      if (codes.expires_at && new Date(codes.expires_at) < new Date()) { toast.error(t('checkout.discountExpired')); return; }
      if (codes.max_uses && (codes.used_count || 0) >= codes.max_uses) { toast.error(t('checkout.discountUsedUp')); return; }
      const linked: string[] = (codes as any).discount_code_products?.map((r: any) => r.product_id) || [];
      if (linked.length > 0 || (codes as any).product_id) {
        toast.error(t('checkout.codeIsProductSpecific') || 'هذا كود مخصص لمنتج معين — طبّقه من صفحة المنتج');
        return;
      }
      if (codes.min_order_value && customerPrice < codes.min_order_value) { toast.error(t('checkout.discountMinOrder', { amount: formatPrice(codes.min_order_value) })); return; }
      const discount = computeDiscount(customerPrice, codes);
      setDiscountAmount(discount);
      setAppliedCode(codes.code);
      toast.success(t('checkout.discountApplied', { value: codes.discount_type === 'percentage' ? codes.discount_value + '%' : formatPrice(codes.discount_value) }));
    } catch { toast.error(t('checkout.discountError')); } finally { setIsValidating(false); }
  };


  const removeDiscount = () => { setDiscountAmount(0); setAppliedCode(''); setDiscountCode(''); };
  const merchantPaymentAmount = netProfit < 0 ? Math.abs(netProfit) : 0;
  const handleConfirm = () => { onConfirm({ code: appliedCode, amount: discountAmount, tierDiscountAmount, depositAmount, depositReceiptFile, merchantPaymentAmount, merchantPaymentReceiptFile }); };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('product.pngOnly'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً (الحد 5MB)');
      return;
    }
    setDepositReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setDepositPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setDepositReceiptFile(null);
    setDepositPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMerchantPaymentReceipt = () => {
    setMerchantPaymentReceiptFile(null);
    setMerchantPaymentPreviewUrl(null);
    if (merchantPaymentFileInputRef.current) merchantPaymentFileInputRef.current.value = '';
  };

  const handleMerchantPaymentReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(t('product.pngOnly')); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الملف كبير جداً (الحد 5MB)'); return; }
    setMerchantPaymentReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setMerchantPaymentPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Validation: block checkout when retail prices are invalid
  const allowBelowCost = appSettings?.allow_below_cost_pricing !== 'false';
  const zeroPriceItems = items.filter((item) => !item.retailPrice || item.retailPrice <= 0);
  const belowCostItems = !allowBelowCost
    ? items.filter((item) => item.retailPrice > 0 && item.retailPrice < item.product.merchant_price)
    : [];
  const hasZeroPriceItem = zeroPriceItems.length > 0;
  const belowCostBlocked = belowCostItems.length > 0;
  const merchantPaymentMissingReceipt = merchantPaymentAmount > 0 && !merchantPaymentReceiptFile;
  const canConfirm = !hasZeroPriceItem && !belowCostBlocked && !merchantPaymentMissingReceipt;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-center mb-4">{t('checkout.orderSummary')}</h2>

      <div className="bg-card rounded-2xl p-4 shadow-card">
        <h3 className="font-semibold text-sm mb-3 text-muted-foreground">{t('checkout.deliveryDetails')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.name')}</span><span className="font-medium">{customerData.name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('checkout.governorate')}:</span><span className="font-medium">{governorateName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('checkout.region')}:</span><span className="font-medium">{customerData.region}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.landmarkLabel')}</span><span className="font-medium">{customerData.landmark}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.phone')}</span><span className="font-medium" dir="ltr">+964 {customerData.phone1}</span></div>
          {customerData.phone2 && <div className="flex justify-between"><span className="text-muted-foreground">{t('checkout.phone2')}:</span><span className="font-medium" dir="ltr">+964 {customerData.phone2}</span></div>}
          {customerData.notes && <div className="flex justify-between"><span className="text-muted-foreground">{t('checkout.notes')}:</span><span className="font-medium text-right max-w-[200px]">{customerData.notes}</span></div>}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-card">
        <h3 className="font-semibold text-sm mb-2 text-muted-foreground">{t('checkout.productsSection')}</h3>
        <div className="divide-y divide-border">{items.map((item) => <ProductRow key={item.id} item={item} />)}</div>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-card">
        <h3 className="font-semibold text-sm mb-1 text-muted-foreground flex items-center gap-2"><Tag className="w-4 h-4" />{t('checkout.discountCode')}</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          {t('checkout.storewideCodeOnly') || 'الأكواد العامة فقط. أكواد المنتجات المحددة تُطبَّق من صفحة المنتج.'}
        </p>
        {appliedCode ? (
          <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 p-3 rounded-xl">
            <div><span className="font-mono font-bold text-green-700 dark:text-green-400">{appliedCode}</span><span className="text-sm text-green-600 dark:text-green-400 mr-2">(-{formatPrice(discountAmount)})</span></div>
            <Button variant="ghost" size="sm" onClick={removeDiscount} className="text-destructive">{t('common.remove')}</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} placeholder={t('checkout.enterDiscountCode')} className="font-mono" dir="ltr" />
            <Button onClick={handleApplyDiscount} disabled={isValidating || !discountCode.trim()} variant="outline" size="sm" className="whitespace-nowrap">
              {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.apply')}
            </Button>
          </div>
        )}
        {perItemDiscountTotal > 0 && (
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">{t('checkout.productDiscounts') || 'خصومات على منتجات'}</p>
            {items.filter(i => (i.discountAmount ?? 0) > 0 && i.discountCode).map(i => (
              <div key={i.id} className="flex justify-between text-xs">
                <span className="truncate max-w-[70%]"><span className="font-mono text-green-700 dark:text-green-400">{i.discountCode}</span> · {i.product.name}</span>
                <span className="font-bold text-green-700 dark:text-green-400">-{formatPrice((i.discountAmount ?? 0) * i.quantity)}</span>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
        <h3 className="font-semibold text-sm mb-3 text-muted-foreground">{t('checkout.financialDetails')}</h3>
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{t('checkout.totalCostWholesale')}</span><span className="text-sm text-muted-foreground">{formatPrice(totalCost)}</span></div>
        {tierDiscountAmount > 0 && (
          <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
            <span className="text-sm flex items-center gap-1"><Crown className="w-3.5 h-3.5" />{t('checkout.tierDiscountLabel', { tier: tierName === 'professional' ? t('checkout.tierProfessional') : t('checkout.tierBasic') })}</span>
            <span className="text-sm font-bold">-{formatPrice(tierDiscountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{t('checkout.shippingFee')}</span><span className="text-sm text-muted-foreground">{formatPrice(shippingFee)}</span></div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between items-center"><span className="text-sm font-medium">{t('checkout.customerSellingPrice')}</span><span className="text-base font-bold text-primary">{formatPrice(customerPrice + shippingFee)}</span></div>
        {perItemDiscountTotal > 0 && <div className="flex justify-between items-center text-green-600 dark:text-green-400"><span className="text-sm">{t('checkout.productDiscounts') || 'خصومات المنتجات'}</span><span className="text-sm font-bold">-{formatPrice(perItemDiscountTotal)}</span></div>}
        {discountAmount > 0 && <div className="flex justify-between items-center text-green-600 dark:text-green-400"><span className="text-sm">{t('checkout.discount')}</span><span className="text-sm font-bold">-{formatPrice(discountAmount)}</span></div>}

        <div className="h-px bg-border my-2" />
        <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/30 -mx-4 px-4 py-3 rounded-xl">
          <span className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-green-600" />{t('checkout.netProfit')}</span>
          <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{netProfit >= 0 ? '+' : ''}{formatPrice(netProfit)}</span>
        </div>
      </div>

      {/* Deposit Required Section */}
      {depositAmount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 shadow-card border border-amber-200 dark:border-amber-800">
          <h3 className="font-semibold text-sm mb-2 text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {t('checkout.depositRequired')}
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-2 leading-relaxed bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-2">
            {t('checkout.depositSeparateFromProfit')}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
            {t('checkout.depositInstructions')}
          </p>
          <div className="bg-amber-100 dark:bg-amber-900/40 rounded-xl p-3 mb-3 text-center">
            <span className="text-xs text-amber-600 dark:text-amber-400">{t('checkout.depositAmount')}</span>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{formatPrice(depositAmount)}</p>
          </div>
          {depositAddonBreakdown.length > 0 && (
            <div className="bg-amber-100/40 dark:bg-amber-900/20 rounded-xl p-3 mb-3 border border-amber-200/60 dark:border-amber-800/60">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">{t('checkout.depositRequiredFor')}</p>
              <ul className="space-y-1">
                {depositAddonBreakdown.map((entry) => (
                  <li key={entry.name} className="flex justify-between items-center text-xs text-amber-700 dark:text-amber-400">
                    <span>{entry.name} <span className="text-amber-600/70 dark:text-amber-500/70">×{entry.qty}</span></span>
                    <span className="font-mono font-semibold">{formatPrice(entry.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {qiCardNumber && (
            <div className="bg-amber-100/60 dark:bg-amber-900/20 rounded-xl p-3 mb-3 flex items-center gap-3 border border-amber-200 dark:border-amber-800">
              <CreditCard className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-amber-800 dark:text-amber-300 font-semibold">الإيداع على بطاقة Qi:</p>
                <p className="font-mono text-amber-900 dark:text-amber-200 tracking-wider text-base" dir="ltr">{qiCardNumber}</p>
                {qiCardName && <p className="text-amber-700 dark:text-amber-400">{qiCardName}</p>}
              </div>
            </div>
          )}
          {asiacellPhone && (
            <div className="bg-amber-100/60 dark:bg-amber-900/20 rounded-xl p-3 mb-3 flex items-center gap-3 border border-amber-200 dark:border-amber-800">
              <Phone className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-amber-800 dark:text-amber-300 font-semibold">تحويل آسيا سيل:</p>
                <p className="font-mono text-amber-900 dark:text-amber-200 tracking-wider text-base" dir="ltr">{asiacellPhone}</p>
                {asiacellName && <p className="text-amber-700 dark:text-amber-400">{asiacellName}</p>}
              </div>
            </div>
          )}
          
          {depositPreviewUrl ? (
            <div className="relative">
              <div className="rounded-xl overflow-hidden border-2 border-green-300 dark:border-green-700">
                <img src={depositPreviewUrl} alt="Receipt" className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage(depositPreviewUrl)} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">{t('checkout.receiptUploaded')}</span>
                <Button variant="ghost" size="sm" onClick={removeReceipt} className="mr-auto text-destructive text-xs">{t('common.remove')}</Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-dashed border-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="w-5 h-5 ml-2" />
              {t('checkout.uploadReceipt')}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleReceiptUpload}
          />
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
            {t('checkout.uploadReceiptLater')}
          </p>
        </div>
      )}

      {/* Merchant Payment Required Section */}
      {merchantPaymentAmount > 0 && (
        <div className="bg-destructive/10 rounded-2xl p-4 shadow-card border border-destructive/30">
          <h3 className="font-semibold text-sm mb-3 text-destructive flex items-center gap-2">
            <Upload className="w-4 h-4" />
            دفعة مطلوبة (الربح سالب)
          </h3>
          <p className="text-sm text-destructive/80 mb-3">
            سعر البيع أقل من التكلفة. يجب دفع الفرق ورفع وصل الدفع.
          </p>
          <div className="bg-destructive/15 rounded-xl p-3 mb-3 text-center">
            <span className="text-xs text-destructive/70">المبلغ المطلوب</span>
            <p className="text-2xl font-bold text-destructive">{formatPrice(merchantPaymentAmount)}</p>
          </div>
          {qiCardNumber && (
            <div className="bg-destructive/10 rounded-xl p-3 mb-3 flex items-center gap-3 border border-destructive/20">
              <CreditCard className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="text-sm">
                <p className="text-destructive font-semibold">الدفع على بطاقة Qi:</p>
                <p className="font-mono text-destructive tracking-wider text-base" dir="ltr">{qiCardNumber}</p>
                {qiCardName && <p className="text-destructive/80">{qiCardName}</p>}
              </div>
            </div>
          )}
          {asiacellPhone && (
            <div className="bg-destructive/10 rounded-xl p-3 mb-3 flex items-center gap-3 border border-destructive/20">
              <Phone className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="text-sm">
                <p className="text-destructive font-semibold">تحويل آسيا سيل:</p>
                <p className="font-mono text-destructive tracking-wider text-base" dir="ltr">{asiacellPhone}</p>
                {asiacellName && <p className="text-destructive/80">{asiacellName}</p>}
              </div>
            </div>
          )}
          
          {merchantPaymentPreviewUrl ? (
            <div className="relative">
              <div className="rounded-xl overflow-hidden border-2 border-green-300 dark:border-green-700">
                <img src={merchantPaymentPreviewUrl} alt="Receipt" className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage(merchantPaymentPreviewUrl)} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">{t('checkout.receiptUploaded')}</span>
                <Button variant="ghost" size="sm" onClick={removeMerchantPaymentReceipt} className="mr-auto text-destructive text-xs">{t('common.remove')}</Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-dashed border-2 border-destructive/40 text-destructive"
              onClick={() => merchantPaymentFileInputRef.current?.click()}
            >
              <Image className="w-5 h-5 ml-2" />
              رفع وصل الدفع
            </Button>
          )}
          <input
            ref={merchantPaymentFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleMerchantPaymentReceiptUpload}
          />
          <p className="text-xs text-destructive/60 mt-2 text-center">
            {t('checkout.uploadReceiptLater')}
          </p>
        </div>
      )}

      {!canConfirm && (hasZeroPriceItem || belowCostBlocked || merchantPaymentMissingReceipt) && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 space-y-2">
          {hasZeroPriceItem && (
            <div className="text-sm text-destructive">
              <p className="font-semibold mb-1">يجب تحديد سعر البيع لكل منتج:</p>
              <ul className="list-disc pr-5 space-y-0.5">
                {zeroPriceItems.map((item) => (
                  <li key={item.id}>{item.product.name}</li>
                ))}
              </ul>
              <p className="text-xs mt-2 text-destructive/80">
                احذف المنتج من السلة وأعد إضافته من صفحة المنتج لتحديد السعر.
              </p>
            </div>
          )}
          {belowCostBlocked && (
            <div className="text-sm text-destructive">
              <p className="font-semibold mb-1">سعر البيع أقل من تكلفة التاجر:</p>
              <ul className="list-disc pr-5 space-y-0.5">
                {belowCostItems.map((item) => (
                  <li key={item.id}>{item.product.name}</li>
                ))}
              </ul>
            </div>
          )}
          {merchantPaymentMissingReceipt && (
            <p className="text-sm text-destructive font-medium">
              يجب رفع وصل دفع المبلغ المطلوب قبل تأكيد الطلب.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl">{t('common.previous')}</Button>
        <Button onClick={handleConfirm} disabled={isSubmitting || !canConfirm} className="flex-1 h-12 rounded-xl bg-gradient-to-l from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white disabled:opacity-70">
          {isSubmitting ? (<><Loader2 className="h-4 w-4 ml-2 animate-spin" />{t('checkout.confirming')}</>) : t('checkout.confirmOrder')}
        </Button>
      </div>
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/95 border-none">
          {zoomedImage && <img src={zoomedImage} alt="Receipt fullscreen" className="max-w-full max-h-[90vh] object-contain mx-auto" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
