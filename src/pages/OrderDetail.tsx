import { useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, MapPin, Copy, TrendingUp, Package, Sparkles, Clock, Share2, Upload, Image, CheckCircle2, Loader2, Wallet, AlertTriangle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import ResendReturnModal from '@/components/orders/ResendReturnModal';
import { useMerchantOrderById } from '@/hooks/useMerchantOrders';
import { useMerchantOrderReturn } from '@/hooks/useMerchantOrderReturn';
import { formatPrice, useGovernorates } from '@/hooks/useCatalogData';
import { PullToRefresh } from '@/components/PullToRefresh';
import { MerchantLayout } from '@/components/MerchantLayout';
import { useQueryClient } from '@tanstack/react-query';
import { formatRelativeTime } from '@/types/orders';
import { useImageUpload } from '@/hooks/useStorage';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useMerchantOrderById(orderId || '');
  const { data: orderReturn } = useMerchantOrderReturn(orderId);
  const { data: governorates } = useGovernorates();
  const queryClient = useQueryClient();
  const uploadImage = useImageUpload();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const merchantPaymentFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isUploadingMerchantPayment, setIsUploadingMerchantPayment] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [resendOpen, setResendOpen] = useState(false);

  const governorateName = governorates?.find(g => g.id === order?.governorate)?.name_ar || order?.governorate;

  const handleCopyOrderNumber = () => {
    if (order) { navigator.clipboard.writeText(order.order_number); toast.success('تم نسخ رقم الطلب'); }
  };

  const handleShare = async () => {
    if (order && navigator.share) {
      try { await navigator.share({ title: `طلب ${order.order_number}`, text: `تفاصيل الطلب ${order.order_number} - ${order.customer_name}` }); }
      catch { handleCopyOrderNumber(); }
    } else { handleCopyOrderNumber(); }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;
    if (!file.type.startsWith('image/')) { toast.error('يرجى اختيار صورة'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الملف كبير جداً (الحد 5MB)'); return; }
    setIsUploadingReceipt(true);
    try {
      const result = await uploadImage.mutateAsync({ file, bucket: 'designs', path: `deposits/${Date.now()}` });
      const { error } = await supabase.from('orders').update({ deposit_receipt_url: result.url }).eq('id', order.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['merchant-order', orderId] });
      toast.success(t('checkout.receiptUploaded'));
    } catch {
      toast.error('حدث خطأ أثناء رفع الوصل');
    } finally {
      setIsUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMerchantPaymentReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;
    if (!file.type.startsWith('image/')) { toast.error('يرجى اختيار صورة'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الملف كبير جداً (الحد 5MB)'); return; }
    setIsUploadingMerchantPayment(true);
    try {
      const result = await uploadImage.mutateAsync({ file, bucket: 'designs', path: `merchant-payments/${Date.now()}` });
      const { error } = await supabase.from('orders').update({ merchant_payment_receipt_url: result.url } as any).eq('id', order.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['merchant-order', orderId] });
      toast.success('تم رفع وصل الدفع بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء رفع الوصل');
    } finally {
      setIsUploadingMerchantPayment(false);
      if (merchantPaymentFileInputRef.current) merchantPaymentFileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <MerchantLayout hideHeader>
        <div className="pb-8" dir="rtl">
          <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
            <div className="flex items-center gap-3 py-4 px-4">
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}><ArrowRight className="h-5 w-5" /></Button>
              <Skeleton className="h-6 w-32" />
            </div>
          </header>
          <div className="p-4 space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </MerchantLayout>
    );
  }

  if (error || !order) {
    return (
      <MerchantLayout hideHeader>
        <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
          <div className="text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">لم يتم العثور على الطلب</h2>
            <Button onClick={() => navigate('/orders')}>العودة للطلبات</Button>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <>
    <MerchantLayout hideHeader>
      <div className="pb-8" dir="rtl">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center justify-between py-4 px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}><ArrowRight className="h-5 w-5" /></Button>
              <div>
                <h1 className="text-lg font-bold">{order.order_number}</h1>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelativeTime(new Date(order.created_at))}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={handleCopyOrderNumber}><Copy className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </header>

        <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries({ queryKey: ['merchant-order', orderId] }); }}>
          <div className="p-4 space-y-4">
            {orderReturn?.status === 'expired' && (
              <Card className="shadow-card border border-destructive/40 bg-destructive/5 animate-slide-up">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="font-bold text-destructive text-base">
                        {orderReturn.resent_at ? t('orders.returnedAfterResendTitle') : t('orders.transferredTitle')}
                      </h3>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {orderReturn.resent_at ? t('orders.returnedAfterResendBody') : t('orders.transferredBody')}
                      </p>
                      {orderReturn.wholesale_charge_amount && orderReturn.wholesale_charge_amount > 0 && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Wallet className="h-4 w-4 text-destructive" />
                            <span className="text-muted-foreground">{t('orders.transferredAmount')}:</span>
                            <span className="font-bold text-destructive">{formatPrice(orderReturn.wholesale_charge_amount)}</span>
                          </div>
                          {orderReturn.wholesale_charged_at && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{t('orders.transferredDate')}:</span>
                              <span className="font-medium">{new Date(orderReturn.wholesale_charged_at).toLocaleDateString('ar-IQ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card border-0 animate-slide-up">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />حالة الطلب</h3>
                  <OrderStatusBadge status={order.status} pulse={order.status === 'pending'} />
                </div>
                <OrderTimeline status={order.status} />

                {order.status === 'returned' && orderReturn?.status === 'pending' && (
                  <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <p className="text-sm text-foreground/80 leading-relaxed">{t('orders.resend.ctaHint')}</p>
                    <Button className="w-full gap-2" onClick={() => setResendOpen(true)}>
                      <Send className="h-4 w-4" />
                      {t('orders.resend.cta')}
                    </Button>
                  </div>
                )}
                {order.status === 'resent' && orderReturn?.status === 'resent' && (
                  <div className="mt-4 rounded-xl border bg-muted/30 p-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {t('orders.resend.alreadyResent')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '50ms' }}>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-4">بيانات الزبون</h3>
                {(() => {
                  const r = orderReturn;
                  const hasResentTo = !!(r?.resent_at && r?.resent_to_name);
                  const hasOriginal = !!(r?.resent_at && r?.original_customer_name);
                  const currentDiffersFromResentTo = hasResentTo && (
                    order.customer_name !== r!.resent_to_name ||
                    order.customer_phone !== r!.resent_to_phone ||
                    order.governorate !== r!.resent_to_governorate
                  );
                  // The "current" card is the order row. We always show it.
                  // We label it differently depending on whether it equals the
                  // resent-to recipient or has been edited again afterwards.
                  const currentLabel = hasResentTo
                    ? (currentDiffersFromResentTo ? t('orders.currentBuyer') : t('orders.resentToBuyer'))
                    : null;

                  const resentToGovName = hasResentTo
                    ? (governorates?.find(g => g.id === r!.resent_to_governorate)?.name_ar || r!.resent_to_governorate)
                    : null;
                  const originalGovName = hasOriginal
                    ? (governorates?.find(g => g.id === r!.original_governorate)?.name_ar || r!.original_governorate)
                    : null;

                  return (
                    <>
                      {currentLabel && (
                        <div className="mb-3 -mt-1">
                          <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2 py-0.5">
                            {currentLabel}
                          </span>
                        </div>
                      )}
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">الاسم:</span><span className="font-medium">{order.customer_name}</span></div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">الهاتف:</span>
                          <a href={`tel:+964${order.customer_phone}`} className="font-medium flex items-center gap-1.5 text-primary" dir="ltr"><Phone className="h-4 w-4" />+964 {order.customer_phone}</a>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">العنوان:</span>
                          <span className="font-medium text-left flex items-center gap-1"><MapPin className="h-4 w-4 text-primary flex-shrink-0" />{governorateName}، {order.region || '-'}</span>
                        </div>
                        {order.landmark && <div className="flex justify-between"><span className="text-muted-foreground">النقطة الدالة:</span><span className="font-medium">{order.landmark}</span></div>}
                      </div>
                      <Button className="w-full mt-4" variant="outline" asChild>
                        <a href={`tel:+964${order.customer_phone}`}><Phone className="h-4 w-4 ml-2" />اتصال بالزبون</a>
                      </Button>

                      {hasResentTo && currentDiffersFromResentTo && (
                        <div className="mt-5 pt-4 border-t border-dashed border-border/60">
                          <div className="mb-3">
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                              {t('orders.resentToBuyer')}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex justify-between"><span>الاسم:</span><span className="font-medium text-foreground/80">{r!.resent_to_name}</span></div>
                            {r!.resent_to_phone && (
                              <div className="flex justify-between items-center">
                                <span>الهاتف:</span>
                                <span className="font-medium text-foreground/80" dir="ltr">+964 {r!.resent_to_phone}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-start">
                              <span>العنوان:</span>
                              <span className="font-medium text-foreground/80 text-left">{resentToGovName}{r!.resent_to_region ? `، ${r!.resent_to_region}` : ''}</span>
                            </div>
                            {r!.resent_to_landmark && (
                              <div className="flex justify-between"><span>النقطة الدالة:</span><span className="font-medium text-foreground/80">{r!.resent_to_landmark}</span></div>
                            )}
                          </div>
                        </div>
                      )}

                      {hasOriginal && (
                        <div className="mt-5 pt-4 border-t border-dashed border-border/60">
                          <div className="mb-3">
                            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                              {t('orders.originalBuyer')}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex justify-between"><span>الاسم:</span><span className="font-medium text-foreground/80">{r!.original_customer_name}</span></div>
                            {r!.original_customer_phone && (
                              <div className="flex justify-between items-center">
                                <span>الهاتف:</span>
                                <span className="font-medium text-foreground/80" dir="ltr">+964 {r!.original_customer_phone}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-start">
                              <span>العنوان:</span>
                              <span className="font-medium text-foreground/80 text-left">{originalGovName}{r!.original_region ? `، ${r!.original_region}` : ''}</span>
                            </div>
                            {r!.original_landmark && (
                              <div className="flex justify-between"><span>النقطة الدالة:</span><span className="font-medium text-foreground/80">{r!.original_landmark}</span></div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Package className="h-4 w-4 text-primary" />المنتجات ({order.items.length})</h3>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="bg-muted/30 rounded-xl p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 shadow-sm">
                          <img src={item.product_image || '/placeholder.svg'} alt={item.product_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-1">{item.product_name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{item.size}</Badge>
                            {item.color && <Badge variant="outline" className="text-xs">{item.color}</Badge>}
                            <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                          </div>
                          {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(item.addons as any[]).map((addon: any, i: number) => {
                                const label = typeof addon === 'string'
                                  ? addon
                                  : [addon?.addonName || addon?.name, addon?.optionName || addon?.option_name || addon?.option]
                                      .filter(Boolean).join(' · ');
                                if (!label) return null;
                                return (
                                  <Badge key={i} variant="secondary" className="text-xs bg-primary/10 text-primary">{label}</Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-primary">{formatPrice(item.retail_price)}</p>
                          <p className="text-xs text-muted-foreground">التكلفة: {formatPrice(item.merchant_price)}</p>
                        </div>
                      </div>
                      {(() => {
                        const designs = (item.design_file_urls && item.design_file_urls.length > 0)
                          ? item.design_file_urls
                          : (item.design_file_url ? [item.design_file_url] : []);
                        const mockups = (item.mockup_file_urls && item.mockup_file_urls.length > 0)
                          ? item.mockup_file_urls
                          : (item.mockup_file_url ? [item.mockup_file_url] : []);
                        if (designs.length === 0 && mockups.length === 0) return null;
                        return (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Image className="h-3 w-3" /> ملفات الطباعة
                            </p>
                            <div className="space-y-3">
                              {designs.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1">التصاميم ({designs.length})</p>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {designs.map((url, i) => (
                                      <img key={i} src={url} alt="تصميم"
                                        className="w-full aspect-square object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setZoomedImage(url)} />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {mockups.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1">الموكب ({mockups.length})</p>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {mockups.map((url, i) => (
                                      <img key={i} src={url} alt="موكب"
                                        className="w-full aspect-square object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setZoomedImage(url)} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '150ms' }}>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />التفاصيل المالية</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">التكلفة (جملة):</span><span className="font-medium">{formatPrice(order.total_merchant_cost)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">التوصيل:</span><span className="font-medium">{formatPrice(order.shipping_fee || 0)}</span></div>
                  <div className="h-px bg-border/50" />
                  <div className="flex justify-between"><span className="text-muted-foreground">الإجمالي:</span><span className="font-medium">{formatPrice(order.total_merchant_cost + (order.shipping_fee || 0))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">سعر الزبون:</span><span className="font-bold text-primary">{formatPrice((order.final_retail_price || 0) + (order.shipping_fee || 0))}</span></div>
                  {(order as any).deposit_amount > 0 && (
                    <>
                      <div className="h-px bg-border/50" />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">العربون:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatPrice((order as any).deposit_amount)}</span>
                          <Badge variant={(order as any).deposit_verified ? 'default' : 'secondary'} className="text-xs">
                            {(order as any).deposit_verified ? '✓ تم التحقق' : 'بانتظار التحقق'}
                          </Badge>
                        </div>
                      </div>
                      {(order as any).deposit_receipt_url ? (
                        <img src={(order as any).deposit_receipt_url} alt="Receipt" className="w-full h-24 object-cover rounded-xl border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage((order as any).deposit_receipt_url)} />
                      ) : (
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed border-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingReceipt}
                          >
                            {isUploadingReceipt ? (
                              <><Loader2 className="h-4 w-4 ml-2 animate-spin" />{t('checkout.confirming')}</>
                            ) : (
                              <><Upload className="h-4 w-4 ml-2" />{t('checkout.uploadReceipt')}</>
                            )}
                          </Button>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
                        </div>
                      )}
                    </>
                  )}
                  {/* Merchant Payment Section */}
                  {(order as any).merchant_payment_amount > 0 && (
                    <>
                      <div className="h-px bg-border/50" />
                      <div className="flex justify-between items-center">
                        <span className="text-destructive font-medium">دفعة مطلوبة (ربح سالب):</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-destructive">{formatPrice((order as any).merchant_payment_amount)}</span>
                          <Badge variant={(order as any).merchant_payment_verified ? 'default' : 'destructive'} className="text-xs">
                            {(order as any).merchant_payment_verified ? '✓ تم التحقق' : 'بانتظار التحقق'}
                          </Badge>
                        </div>
                      </div>
                      {(order as any).merchant_payment_receipt_url ? (
                        <img src={(order as any).merchant_payment_receipt_url} alt="Payment Receipt" className="w-full h-24 object-cover rounded-xl border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage((order as any).merchant_payment_receipt_url)} />
                      ) : (
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed border-2 border-destructive/40 text-destructive"
                            onClick={() => merchantPaymentFileInputRef.current?.click()}
                            disabled={isUploadingMerchantPayment}
                          >
                            {isUploadingMerchantPayment ? (
                              <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جاري الرفع...</>
                            ) : (
                              <><Upload className="h-4 w-4 ml-2" />رفع وصل الدفع</>
                            )}
                          </Button>
                          <input ref={merchantPaymentFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleMerchantPaymentReceiptUpload} />
                        </div>
                      )}
                    </>
                  )}
                  <div className="h-px bg-border/50" />
                  <div className="flex justify-between items-center bg-gradient-success/10 -mx-6 px-6 py-4 rounded-xl">
                    <span className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-success" />صافي الربح</span>
                    <span className={cn('font-bold text-xl', order.net_profit >= 0 ? 'text-success' : 'text-destructive')}>
                      {order.net_profit >= 0 ? '+' : ''}{formatPrice(order.net_profit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.estimated_delivery && (
              <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-xl py-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
                📅 التوصيل المتوقع: <span className="font-medium text-foreground">{new Date(order.estimated_delivery).toLocaleDateString('ar-IQ')}</span>
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>
    </MerchantLayout>

    <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/95 border-none">
        {zoomedImage && <img src={zoomedImage} alt="Receipt fullscreen" className="max-w-full max-h-[90vh] object-contain mx-auto" />}
      </DialogContent>
    </Dialog>

    {orderReturn?.id && order && (
      <ResendReturnModal
        returnId={orderReturn.id}
        orderId={order.id}
        orderNumber={order.order_number}
        open={resendOpen}
        onClose={() => setResendOpen(false)}
      />
    )}
    </>
  );
};

export default OrderDetail;
