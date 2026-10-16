import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useResendReturn, useAdminResendReturn } from '@/hooks/useOrderReturns';
import { useAdminGovernorates } from '@/hooks/useAdminGovernorates';
import { toast } from '@/hooks/use-toast';
import { Send, Printer, Download, AlertTriangle, UserCog, Tag, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { downloadShippingLabel } from '@/lib/downloadShippingLabel';
import { useLanguage } from '@/contexts/LanguageContext';
import { computeDiscount } from '@/lib/utils';

interface ResendReturnModalProps {
  returnId: string;
  orderId?: string;
  orderNumber: string;
  open: boolean;
  onClose: () => void;
  /** Extra invalidation: caller may pass additional query keys to refresh after success */
  onSuccess?: () => void;
  /** 'admin' enables the admin second-resend flow (reverses wholesale charge). */
  mode?: 'merchant' | 'admin';
  /** Wholesale amount that was charged on the expired return (for admin banner). */
  chargedAmount?: number | null;
}

const ResendReturnModal = ({ returnId, orderId, orderNumber, open, onClose, onSuccess, mode = 'merchant', chargedAmount }: ResendReturnModalProps) => {
  const { t, dir, locale } = useLanguage();
  const [form, setForm] = useState({
    resent_to_name: '',
    resent_to_phone: '',
    resent_to_phone2: '',
    resent_to_governorate: '',
    resent_to_region: '',
    resent_to_landmark: '',
    new_retail_price: '',
  });
  const [orderInfo, setOrderInfo] = useState<{
    status?: string;
    final_retail_price?: number;
    customer_name?: string;
    customer_phone?: string;
    governorate?: string;
    region?: string;
    merchant_id?: string;
    items?: Array<{ product_id?: string | null; product_name: string; size: string; color?: string | null; quantity: number }>;
  } | null>(null);
  const [merchantProfile, setMerchantProfile] = useState<{ full_name?: string; phone?: string | null } | null>(null);

  // Discount coupon state
  const [discountCode, setDiscountCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);

  const resend = useResendReturn();
  const adminResend = useAdminResendReturn();
  const isAdminMode = mode === 'admin';
  const activeMutation = isAdminMode ? adminResend : resend;
  const { data: governorates } = useAdminGovernorates();

  useEffect(() => {
    if (!open || !orderId) return;
    (async () => {
      const { data: order } = await supabase
        .from('orders')
        .select('status, final_retail_price, customer_name, customer_phone, governorate, region, merchant_id')
        .eq('id', orderId)
        .single();
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, product_name, size, color, quantity')
        .eq('order_id', orderId);
      setOrderInfo({ ...(order || {}), items: items || [] });
      // For admin mode pre-fill: load the merchant's own contact info.
      if (isAdminMode && order?.merchant_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', order.merchant_id)
          .single();
        setMerchantProfile(profile ?? null);
      }
    })();
  }, [open, orderId, isAdminMode]);

  // Reset discount when modal closes.
  useEffect(() => {
    if (!open) {
      setDiscountCode('');
      setAppliedCode('');
      setDiscountAmount(0);
    }
  }, [open]);

  // Base price the discount applies to: new entered price, or current order price.
  const basePrice = useMemo(() => {
    const entered = form.new_retail_price ? Number(form.new_retail_price) : 0;
    if (entered > 0) return entered;
    return Number(orderInfo?.final_retail_price || 0);
  }, [form.new_retail_price, orderInfo?.final_retail_price]);

  // If the base price changes after a coupon is applied, re-clamp the discount.
  useEffect(() => {
    if (appliedCode && discountAmount > basePrice) {
      setDiscountAmount(basePrice);
    }
  }, [basePrice, appliedCode, discountAmount]);

  const finalAfterDiscount = Math.max(basePrice - discountAmount, 0);

  const handleApplyDiscount = async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) return;
    if (basePrice <= 0) {
      toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.invalidPrice'), variant: 'destructive' });
      return;
    }
    setIsValidatingDiscount(true);
    try {
      const { data: row, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();
      if (error || !row) {
        toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.discountInvalid'), variant: 'destructive' });
        return;
      }
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.discountExpired'), variant: 'destructive' });
        return;
      }
      if (row.max_uses && (row.used_count || 0) >= row.max_uses) {
        toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.discountUsedUp'), variant: 'destructive' });
        return;
      }
      if (row.min_order_value && basePrice < Number(row.min_order_value)) {
        toast({
          title: t('orders.resend.errorTitle'),
          description: t('orders.resend.discountMinOrder').replace('{amount}', Number(row.min_order_value).toLocaleString(locale === 'en' ? 'en-US' : 'ar-IQ')),
          variant: 'destructive',
        });
        return;
      }
      if (row.scope === 'product' && row.product_id) {
        const matches = (orderInfo?.items || []).some(i => i.product_id === row.product_id);
        if (!matches) {
          toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.discountWrongProduct'), variant: 'destructive' });
          return;
        }
      }
      const amount = computeDiscount(basePrice, { discount_type: row.discount_type, discount_value: Number(row.discount_value) });
      if (amount <= 0) {
        toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.discountInvalid'), variant: 'destructive' });
        return;
      }
      setDiscountAmount(amount);
      setAppliedCode(row.code);
      toast({ title: t('orders.resend.discountApplied') });
    } catch {
      toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.discountInvalid'), variant: 'destructive' });
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setAppliedCode('');
    setDiscountAmount(0);
    setDiscountCode('');
  };

  const handleUseMerchantAddress = () => {
    if (!merchantProfile) return;
    setForm(p => ({
      ...p,
      resent_to_name: merchantProfile.full_name || p.resent_to_name,
      resent_to_phone: merchantProfile.phone || p.resent_to_phone,
    }));
    toast({ title: t('orders.resend.useMerchantAddress'), description: merchantProfile.full_name || '' });
  };

  const wasPrinted = orderInfo?.status && ['printed', 'shipped', 'delivered', 'returned', 'resent'].includes(orderInfo.status);

  const handleDownloadLabel = () => {
    if (!orderInfo) return;
    const item = orderInfo.items?.[0];
    downloadShippingLabel({
      orderNumber,
      customerName: form.resent_to_name || orderInfo.customer_name || '',
      customerPhone: form.resent_to_phone || orderInfo.customer_phone || '',
      governorate: form.resent_to_governorate || orderInfo.governorate || '',
      address: form.resent_to_region || orderInfo.region || '',
      productName: item?.product_name || '',
      size: item?.size || '',
      color: item?.color || undefined,
      quantity: item?.quantity || 1,
    });
    toast({ title: t('orders.resend.downloadingTitle'), description: t('orders.resend.downloadingBody') });
  };

  const handleSave = () => {
    if (!form.resent_to_name || !form.resent_to_phone || !form.resent_to_governorate) {
      toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.requiredFields'), variant: 'destructive' });
      return;
    }
    const newPrice = form.new_retail_price ? Number(form.new_retail_price) : null;
    if (form.new_retail_price && (isNaN(newPrice!) || newPrice! <= 0)) {
      toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.invalidPrice'), variant: 'destructive' });
      return;
    }

    activeMutation.mutate(
      {
        returnId,
        data: {
          resent_to_name: form.resent_to_name,
          resent_to_phone: form.resent_to_phone,
          resent_to_phone2: form.resent_to_phone2,
          resent_to_governorate: form.resent_to_governorate,
          resent_to_region: form.resent_to_region,
          resent_to_landmark: form.resent_to_landmark,
          new_retail_price: newPrice,
          discount_code: appliedCode || null,
          discount_amount: appliedCode ? discountAmount : null,
          discount_base_price: appliedCode ? basePrice : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: t('orders.resend.successTitle'), description: t('orders.resend.successBody').replace('{order}', orderNumber) });
          setForm({ resent_to_name: '', resent_to_phone: '', resent_to_phone2: '', resent_to_governorate: '', resent_to_region: '', resent_to_landmark: '', new_retail_price: '' });
          onSuccess?.();
          onClose();
        },
        onError: () => {
          toast({ title: t('orders.resend.errorTitle'), description: t('orders.resend.errorBody'), variant: 'destructive' });
        },
      }
    );
  };

  const govLabel = (g: { name_ar: string; name_en?: string | null }) =>
    locale === 'en' ? (g.name_en || g.name_ar) : g.name_ar;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {isAdminMode ? t('orders.resend.adminTitle') : t('orders.resend.title')} — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        {isAdminMode && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-900 dark:text-amber-200 leading-relaxed">
              {t('orders.resend.adminBanner').replace(
                '{amount}',
                Number(chargedAmount || 0).toLocaleString(locale === 'en' ? 'en-US' : 'ar-IQ')
              )}
            </p>
          </div>
        )}

        {isAdminMode && merchantProfile && (
          <Button type="button" size="sm" variant="outline" className="w-full gap-2" onClick={handleUseMerchantAddress}>
            <UserCog className="w-4 h-4" />
            {t('orders.resend.useMerchantAddress')}
          </Button>
        )}

        <div className="space-y-4">
          {/* Print status + download */}
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4 text-muted-foreground" />
              <span>{t('orders.resend.printStatus')}:</span>
              {wasPrinted ? (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {t('orders.resend.printed')}
                </Badge>
              ) : (
                <Badge variant="secondary">{t('orders.resend.notPrinted')}</Badge>
              )}
            </div>
            {wasPrinted && (
              <Button type="button" size="sm" variant="outline" className="w-full gap-2" onClick={handleDownloadLabel} disabled={!orderInfo}>
                <Download className="w-4 h-4" />
                {t('orders.resend.downloadLabel')}
              </Button>
            )}
          </div>

          <div>
            <Label>{t('orders.resend.newCustomerName')} *</Label>
            <Input value={form.resent_to_name} onChange={e => setForm(p => ({ ...p, resent_to_name: e.target.value }))} />
          </div>
          <div>
            <Label>{t('orders.resend.phone')} *</Label>
            <Input value={form.resent_to_phone} onChange={e => setForm(p => ({ ...p, resent_to_phone: e.target.value }))} />
          </div>
          <div>
            <Label>{t('orders.resend.phone2')}</Label>
            <Input value={form.resent_to_phone2} onChange={e => setForm(p => ({ ...p, resent_to_phone2: e.target.value }))} />
          </div>
          <div>
            <Label>{t('orders.resend.governorate')} *</Label>
            <Select value={form.resent_to_governorate} onValueChange={v => setForm(p => ({ ...p, resent_to_governorate: v }))}>
              <SelectTrigger><SelectValue placeholder={t('orders.resend.selectGovernorate')} /></SelectTrigger>
              <SelectContent>
                {governorates?.map(g => (
                  <SelectItem key={g.id} value={g.name_ar}>{govLabel(g)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('orders.resend.region')}</Label>
            <Input value={form.resent_to_region} onChange={e => setForm(p => ({ ...p, resent_to_region: e.target.value }))} />
          </div>
          <div>
            <Label>{t('orders.resend.landmark')}</Label>
            <Input value={form.resent_to_landmark} onChange={e => setForm(p => ({ ...p, resent_to_landmark: e.target.value }))} />
          </div>
          <div>
            <Label>{t('orders.resend.newPrice')}</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder={
                orderInfo?.final_retail_price
                  ? t('orders.resend.currentPrice').replace('{price}', Number(orderInfo.final_retail_price).toLocaleString(locale === 'en' ? 'en-US' : 'ar-IQ'))
                  : t('orders.resend.optional')
              }
              value={form.new_retail_price}
              onChange={e => setForm(p => ({ ...p, new_retail_price: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('orders.resend.keepCurrentPrice')}</p>
          </div>

          {/* Discount coupon */}
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4" />
              {t('orders.resend.discountCode')}
            </Label>
            {appliedCode ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-mono">
                    {appliedCode}
                  </Badge>
                  <span className="text-sm text-emerald-900 dark:text-emerald-200 truncate">
                    -{discountAmount.toLocaleString(locale === 'en' ? 'en-US' : 'ar-IQ')}
                  </span>
                </div>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={removeDiscount}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder={t('orders.resend.enterDiscountCode')}
                  className="font-mono"
                  dir="ltr"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyDiscount}
                  disabled={isValidatingDiscount || !discountCode.trim()}
                  className="whitespace-nowrap"
                >
                  {isValidatingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : t('orders.resend.apply')}
                </Button>
              </div>
            )}
            {(appliedCode || basePrice > 0) && (
              <p className="text-xs text-muted-foreground">
                {t('orders.resend.finalAfterDiscount')}:{' '}
                <span className="font-semibold text-foreground">
                  {finalAfterDiscount.toLocaleString(locale === 'en' ? 'en-US' : 'ar-IQ')}
                </span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t('orders.resend.cancel')}</Button>
          <Button onClick={handleSave} disabled={activeMutation.isPending}>
            {activeMutation.isPending ? t('orders.resend.submitting') : t('orders.resend.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResendReturnModal;
