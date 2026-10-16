  import { useEffect, useState } from 'react';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from '@/components/ui/dialog';
  import { Badge } from '@/components/ui/badge';
  import { Button } from '@/components/ui/button';
  import { Separator } from '@/components/ui/separator';
  import { Skeleton } from '@/components/ui/skeleton';
  import { useOrderDetails } from '@/hooks/useAdminAccounting';
  import { statusConfig } from '@/types/orders';
import { Package, MapPin, Phone, User, Pencil, Download, Send } from 'lucide-react';
import AdminEditOrderModal from './AdminEditOrderModal';
import ResendReturnModal from '@/components/orders/ResendReturnModal';
import { downloadShippingLabel } from '@/lib/downloadShippingLabel';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
 
 interface OrderDetailModalProps {
   orderId: string | null;
   open: boolean;
   onClose: () => void;
 }
 
 function formatPrice(price: number): string {
   return price.toLocaleString('ar-IQ');
 }
 
const OrderDetailModal = ({ orderId, open, onClose }: OrderDetailModalProps) => {
  const { data: order, isLoading, isError } = useOrderDetails(orderId);
  const { t } = useLanguage();
  const [editOpen, setEditOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [resendOpen, setResendOpen] = useState(false);
  const [returnRow, setReturnRow] = useState<{
    id: string;
    status: string;
    resent_at: string | null;
    wholesale_charge_amount: number | null;
    original_customer_name: string | null;
    original_customer_phone: string | null;
    original_customer_phone2: string | null;
    original_governorate: string | null;
    original_region: string | null;
    original_landmark: string | null;
    resent_to_name: string | null;
    resent_to_phone: string | null;
    resent_to_phone2: string | null;
    resent_to_governorate: string | null;
    resent_to_region: string | null;
    resent_to_landmark: string | null;
  } | null>(null);
  const [adminResendUsed, setAdminResendUsed] = useState(false);
  const [adminResendOpen, setAdminResendOpen] = useState(false);

  const isEditable = order?.status === 'pending' || order?.status === 'processing';

  useEffect(() => {
    if (!open || !order) {
      setReturnRow(null);
      setAdminResendUsed(false);
      return;
    }
    (async () => {
      // Fetch all return rows for this order so we can show the original
      // buyer snapshot regardless of current status, and pick the best row
      // (pending → resent → expired, then newest) for the resend button.
      const { data } = await supabase
        .from('order_returns')
        .select('id, status, created_at, resent_at, wholesale_charge_amount, original_customer_name, original_customer_phone, original_customer_phone2, original_governorate, original_region, original_landmark, resent_to_name, resent_to_phone, resent_to_phone2, resent_to_governorate, resent_to_region, resent_to_landmark')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });
      const rows = (data ?? []) as Array<any>;
      if (rows.length === 0) {
        setReturnRow(null);
      } else {
        const priority = (s: string) => (s === 'pending' ? 0 : s === 'resent' ? 1 : 2);
        const best = [...rows].sort((a, b) => priority(a.status) - priority(b.status))[0];
        setReturnRow(best ? {
          id: best.id,
          status: best.status,
          resent_at: best.resent_at ?? null,
          wholesale_charge_amount: best.wholesale_charge_amount ?? null,
          original_customer_name: best.original_customer_name ?? null,
          original_customer_phone: best.original_customer_phone ?? null,
          original_customer_phone2: best.original_customer_phone2 ?? null,
          original_governorate: best.original_governorate ?? null,
          original_region: best.original_region ?? null,
          original_landmark: best.original_landmark ?? null,
          resent_to_name: best.resent_to_name ?? null,
          resent_to_phone: best.resent_to_phone ?? null,
          resent_to_phone2: best.resent_to_phone2 ?? null,
          resent_to_governorate: best.resent_to_governorate ?? null,
          resent_to_region: best.resent_to_region ?? null,
          resent_to_landmark: best.resent_to_landmark ?? null,
        } : null);
      }

      // Detect whether an admin resend has already happened (reversal credit).
      const { data: tx } = await supabase
        .from('wallet_transactions')
        .select('id, description')
        .eq('order_id', order.id)
        .eq('type', 'credit')
        .ilike('description', 'Reversal: admin resend%')
        .limit(1);
      setAdminResendUsed((tx?.length ?? 0) > 0);
    })();
  }, [open, order?.id, order?.status]);
 
   const calculateAdminProfit = () => {
     if (!order) return 0;
     // Platform margin = what merchant paid us − what we paid supplier.
     // Shipping is passed through to the courier and merchant profit is separate.
     return (order.total_merchant_cost || 0) - (order.total_wholesale_cost || 0);
   };
 
   return (
     <>
     <Dialog open={open} onOpenChange={onClose}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                تفاصيل الطلب {order?.order_number}
              </DialogTitle>
              {order && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const firstItem = order.items?.[0];
                    downloadShippingLabel({
                      orderNumber: order.order_number,
                      customerName: order.customer_name,
                      customerPhone: order.customer_phone,
                      governorate: order.governorate,
                      address: order.region || '',
                      productName: firstItem?.product_name || '',
                      size: firstItem?.size || '',
                      color: firstItem?.color || undefined,
                      quantity: firstItem?.quantity,
                    });
                  }}>
                    <Download className="w-4 h-4 ml-1" />
                    تحميل الصورة
                  </Button>
                  {isEditable && (
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil className="w-4 h-4 ml-1" />
                      تعديل
                    </Button>
                  )}
                  {order.status === 'returned' && returnRow?.status === 'pending' && (
                    <Button size="sm" onClick={() => setResendOpen(true)} className="gap-1">
                      <Send className="w-4 h-4" />
                      {t('orders.resend.cta')}
                    </Button>
                  )}
                  {returnRow?.status === 'expired' && returnRow?.resent_at && !adminResendUsed && (
                    <Button size="sm" variant="secondary" onClick={() => setAdminResendOpen(true)} className="gap-1">
                      <Send className="w-4 h-4" />
                      {t('orders.resend.adminCta')}
                    </Button>
                  )}
                  {returnRow?.status === 'expired' && returnRow?.resent_at && adminResendUsed && (
                    <span className="text-xs text-muted-foreground">{t('orders.resend.adminResendDone')}</span>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
 
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <p className="text-center text-destructive py-8">حدث خطأ أثناء تحميل بيانات الطلب</p>
        ) : order ? (
           <div className="space-y-6">
             {/* Customer Info */}
             {(() => {
               const r = returnRow;
               const hasResentTo = !!(r?.resent_at && r?.resent_to_name);
               const hasOriginal = !!(r?.resent_at && r?.original_customer_name);
               const currentDiffersFromResentTo = hasResentTo && (
                 order.customer_name !== r!.resent_to_name ||
                 order.customer_phone !== r!.resent_to_phone ||
                 order.governorate !== r!.resent_to_governorate
               );
               const currentLabel = hasResentTo
                 ? (currentDiffersFromResentTo ? t('orders.currentBuyer') : t('orders.resentToBuyer'))
                 : null;

               return (
                 <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                   {currentLabel && (
                     <div className="-mt-1 mb-1">
                       <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2 py-0.5">
                         {currentLabel}
                       </span>
                     </div>
                   )}
                   <div className="flex items-center gap-2 text-sm">
                     <User className="w-4 h-4 text-muted-foreground" />
                     <span className="font-medium">{order.customer_name}</span>
                     {order.status && (
                       <Badge className={`mr-auto ${statusConfig[order.status as keyof typeof statusConfig]?.bgClass} ${statusConfig[order.status as keyof typeof statusConfig]?.textClass}`}>
                         {statusConfig[order.status as keyof typeof statusConfig]?.label}
                       </Badge>
                     )}
                   </div>
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                     <Phone className="w-4 h-4" />
                     <span dir="ltr">{order.customer_phone}</span>
                   </div>
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                     <MapPin className="w-4 h-4" />
                     <span>{order.governorate} {order.region && `- ${order.region}`}</span>
                   </div>
                   <div className="text-sm text-muted-foreground">
                     التاجر: <span className="font-medium text-foreground">{order.merchant_name}</span>
                   </div>

                   {hasResentTo && currentDiffersFromResentTo && (
                     <div className="mt-3 pt-3 border-t border-dashed border-border/60 space-y-2">
                       <div>
                         <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                           {t('orders.resentToBuyer')}
                         </span>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <User className="w-4 h-4" />
                         <span className="font-medium text-foreground/80">{r!.resent_to_name}</span>
                       </div>
                       {r!.resent_to_phone && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <Phone className="w-4 h-4" />
                           <span dir="ltr">{r!.resent_to_phone}</span>
                         </div>
                       )}
                       {(r!.resent_to_governorate || r!.resent_to_region) && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <MapPin className="w-4 h-4" />
                           <span>{r!.resent_to_governorate || ''} {r!.resent_to_region && `- ${r!.resent_to_region}`}</span>
                         </div>
                       )}
                     </div>
                   )}

                   {hasOriginal && (
                     <div className="mt-3 pt-3 border-t border-dashed border-border/60 space-y-2">
                       <div>
                         <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                           {t('orders.originalBuyer')}
                         </span>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <User className="w-4 h-4" />
                         <span className="font-medium text-foreground/80">{r!.original_customer_name}</span>
                       </div>
                       {r!.original_customer_phone && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <Phone className="w-4 h-4" />
                           <span dir="ltr">{r!.original_customer_phone}</span>
                         </div>
                       )}
                       {(r!.original_governorate || r!.original_region) && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <MapPin className="w-4 h-4" />
                           <span>{r!.original_governorate || ''} {r!.original_region && `- ${r!.original_region}`}</span>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               );
             })()}
 
             {/* Order Items */}
             <div>
               <h3 className="font-semibold mb-3">المنتجات</h3>
               <div className="space-y-3">
                 {order.items?.map((item) => (
                   <div key={item.id} className="border rounded-lg p-3">
                     <div className="flex gap-3">
                       {item.product_image && (
                         <img
                           src={item.product_image}
                           alt={item.product_name}
                           className="w-16 h-16 object-cover rounded-lg"
                         />
                       )}
                       <div className="flex-1">
                         <p className="font-medium">{item.product_name}</p>
                         <p className="text-sm text-muted-foreground">
                           {item.color && `${item.color} / `}{item.size} × {item.quantity}
                         </p>
                         <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                           <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 text-center">
                             <p className="text-muted-foreground">تكلفة الجملة</p>
                             <p className="font-bold text-red-600 dark:text-red-400">
                               {formatPrice(item.wholesale_price * item.quantity)}
                             </p>
                           </div>
                           <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-2 text-center">
                             <p className="text-muted-foreground">سعر التاجر</p>
                             <p className="font-bold text-amber-600 dark:text-amber-400">
                               {formatPrice(item.merchant_price * item.quantity)}
                             </p>
                           </div>
                           <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2 text-center">
                             <p className="text-muted-foreground">سعر البيع</p>
                             <p className="font-bold text-emerald-600 dark:text-emerald-400">
                               {formatPrice(item.retail_price * item.quantity)}
                             </p>
                           </div>
                         </div>
                          {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              إضافات: {item.addons.map((a: any) => {
                                const label = [a?.addonName || a?.name, a?.optionName || a?.option_name].filter(Boolean).join(' · ');
                                return `${label || 'إضافة'} (+${formatPrice(a?.price || 0)})`;
                              }).join(', ')}
                            </div>
                          )}
                          {(() => {
                            const designs: string[] = (item.design_file_urls && item.design_file_urls.length > 0)
                              ? item.design_file_urls
                              : (item.design_file_url ? [item.design_file_url] : []);
                            const mockups: string[] = (item.mockup_file_urls && item.mockup_file_urls.length > 0)
                              ? item.mockup_file_urls
                              : (item.mockup_file_url ? [item.mockup_file_url] : []);
                            if (designs.length === 0 && mockups.length === 0) return null;
                            return (
                              <div className="mt-3 space-y-3">
                                {designs.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">التصاميم ({designs.length})</p>
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
                                    <p className="text-xs text-muted-foreground mb-2">الموكب ({mockups.length})</p>
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
                            );
                          })()}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
 
             <Separator />
 
             {/* Financial Summary */}
             <div className="bg-muted/30 rounded-lg p-4 space-y-3">
               <h3 className="font-semibold">ملخص الحساب</h3>
               
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">تكلفة الجملة (للإدارة):</span>
                   <span className="font-medium text-red-600 dark:text-red-400">
                     {formatPrice(order.total_wholesale_cost)} د.ع
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">سعر التاجر (مادفعه التاجر):</span>
                   <span className="font-medium text-amber-600 dark:text-amber-400">
                     {formatPrice(order.total_merchant_cost)} د.ع
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">سعر البيع النهائي:</span>
                   <span className="font-medium">{formatPrice(order.final_retail_price)} د.ع</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-muted-foreground">رسوم الشحن:</span>
                   <span className="font-medium">{formatPrice(order.shipping_fee || 0)} د.ع</span>
                 </div>
               </div>
 
               <Separator />
 
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground">ربح التاجر:</span>
                   <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                     {formatPrice(order.net_profit)} د.ع ✅
                   </span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground">ربح الإدارة:</span>
                   <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                     {formatPrice(calculateAdminProfit())} د.ع 💰
                   </span>
                 </div>
               </div>
 
              {/* Discount Info */}
              {order.discount_amount && order.discount_amount > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">كود الخصم:</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {order.discount_code || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">مبلغ الخصم:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        -{formatPrice(order.discount_amount)} د.ع
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Deposit Info */}
              {(order as any).deposit_amount > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">مبلغ العربون:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {formatPrice((order as any).deposit_amount)} د.ع
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">حالة العربون:</span>
                      <Badge variant={(order as any).deposit_verified ? 'default' : 'secondary'}>
                        {(order as any).deposit_verified ? '✓ تم التحقق' : 'بانتظار التحقق'}
                      </Badge>
                    </div>
                    {(order as any).deposit_receipt_url && (
                      <img src={(order as any).deposit_receipt_url} alt="Receipt" className="w-full h-32 object-cover rounded-lg border mt-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage((order as any).deposit_receipt_url)} />
                    )}
                  </div>
                </>
               )}

              {/* Merchant Payment Info */}
              {(order as any).merchant_payment_amount > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">دفعة التاجر (ربح سالب):</span>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {formatPrice((order as any).merchant_payment_amount)} د.ع
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">حالة الدفعة:</span>
                      <Badge variant={(order as any).merchant_payment_verified ? 'default' : 'destructive'}>
                        {(order as any).merchant_payment_verified ? '✓ تم التحقق' : 'بانتظار التحقق'}
                      </Badge>
                    </div>
                    {(order as any).merchant_payment_receipt_url && (
                      <img src={(order as any).merchant_payment_receipt_url} alt="Payment Receipt" className="w-full h-32 object-cover rounded-lg border mt-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setZoomedImage((order as any).merchant_payment_receipt_url)} />
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold">المجموع للعميل:</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(order.final_retail_price + (order.shipping_fee || 0))} د.ع
                </span>
              </div>
             </div>
           </div>
         ) : (
           <p className="text-center text-muted-foreground py-8">لم يتم العثور على الطلب</p>
         )}
       </DialogContent>
     </Dialog>

     {order && (
       <AdminEditOrderModal
         orderId={order.id}
         initialData={{
           customer_name: order.customer_name,
           customer_phone: order.customer_phone,
           customer_phone2: (order as any).customer_phone2 || '',
           governorate: order.governorate,
           region: order.region || '',
           landmark: (order as any).landmark || '',
           final_retail_price: order.final_retail_price,
         }}
         open={editOpen}
         onClose={() => setEditOpen(false)}
       />
      )}

      {order && returnRow && (
        <ResendReturnModal
          returnId={returnRow.id}
          orderId={order.id}
          orderNumber={order.order_number}
          open={resendOpen}
          onClose={() => setResendOpen(false)}
        />
      )}

      {order && returnRow && (
        <ResendReturnModal
          mode="admin"
          chargedAmount={returnRow.wholesale_charge_amount ?? 0}
          returnId={returnRow.id}
          orderId={order.id}
          orderNumber={order.order_number}
          open={adminResendOpen}
          onClose={() => setAdminResendOpen(false)}
        />
      )}

      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/95 border-none">
          {zoomedImage && <img src={zoomedImage} alt="Receipt fullscreen" className="max-w-full max-h-[90vh] object-contain mx-auto" />}
        </DialogContent>
      </Dialog>
     </>
   );
 };
 
 export default OrderDetailModal;