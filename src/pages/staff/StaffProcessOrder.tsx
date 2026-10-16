import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  Gift,
  Sparkles,
  MapPin,
  Phone,
  User,
  FileText,
  Loader2,
} from 'lucide-react';
import { downloadShippingLabel } from '@/lib/downloadShippingLabel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useStaffOrderItem, getWaitingTime, statusConfig, useUpdateOrderStatus, useReportOrderIssue } from '@/hooks/useStaffOrders';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const StaffProcessOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showMockup, setShowMockup] = useState(false);
  const [customIssue, setCustomIssue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const { t } = useLanguage();

  const { data: order, isLoading, error } = useStaffOrderItem(id);
  const updateStatus = useUpdateOrderStatus();
  const reportIssue = useReportOrderIssue();

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  // Error or not found state
  if (error || !order) {
    return (
      <div className="p-4 text-center">
        <p className="text-xl font-bold text-foreground">الطلب غير موجود</p>
        <Button onClick={() => navigate('/staff')} className="mt-4">
          العودة للقائمة
        </Button>
      </div>
    );
  }

  const status = statusConfig[order.orderStatus];
  const waitingTime = getWaitingTime(order.createdAt);

  const handleDownloadDesign = () => {
    const urls = order.designFileUrls.length > 0 ? order.designFileUrls : (order.designFileUrl ? [order.designFileUrl] : []);
    if (urls.length > 0) {
      urls.forEach((u) => window.open(u, '_blank'));
      toast({
        title: 'جاري التحميل',
        description: `يتم فتح ${urls.length} ملف تصميم...`,
      });
    } else {
      toast({
        title: 'لا يوجد ملف',
        description: 'لم يتم رفع ملف تصميم لهذا الطلب',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadLabel = () => {
    downloadShippingLabel({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      governorate: order.customerGovernorate,
      address: order.customerAddress,
      productName: order.productName,
      size: order.size,
      color: order.color,
      quantity: order.quantity,
    });
    toast({
      title: 'جاري التحميل',
      description: 'يتم تحميل صورة البوليسة...',
    });
  };

  const handleMarkProcessed = () => {
    if (!order) return;
    
    const nextStatus = order.orderStatus === 'pending' ? 'processing' : 'printed';
    
    updateStatus.mutate(
      { orderId: order.orderId, newStatus: nextStatus },
      {
        onSuccess: () => {
          toast({
            title: 'تم التحديث',
            description: nextStatus === 'processing' 
              ? 'تم نقل الطلب إلى قيد المعالجة'
              : 'تم تأكيد الطباعة',
          });
          navigate('/staff');
        },
        onError: (error) => {
          toast({
            title: 'خطأ',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleReportIssue = (issueType: string) => {
    if (!order) return;

    reportIssue.mutate(
      { orderId: order.orderId, issueType, urgency },
      {
        onSuccess: () => {
          toast({
            title: 'تم الإبلاغ',
            description: `تم تسجيل المشكلة: ${issueType}`,
          });
          setShowIssueDialog(false);
          setUrgency('medium');
        },
        onError: (error) => {
          toast({
            title: 'خطأ',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="p-4 space-y-4 pb-60 overflow-x-hidden max-w-full">
      {/* Back Button & Order ID */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/staff')}>
          <ArrowRight className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{order.orderNumber}</h1>
          <div className="flex items-center gap-2">
            <Badge className={cn(status.bgColor, status.color)}>{status.label}</Badge>
            {order.merchantTier && (
              <Badge variant="outline" className="text-xs">
                {order.merchantTier === 'professional' ? '⭐ محترف' : order.merchantTier === 'basic' ? 'عادي' : order.merchantTier}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Waiting Time Alert */}
      {waitingTime.isOverdue && (
        <Card className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <p className="font-bold">طلب متأخر!</p>
              <p className="text-sm">{waitingTime.text}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Gift Wrapping Alert */}
      {order.hasGiftWrapping && (
        <Card className="bg-purple-600 text-white p-4">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8" />
            <div>
              <p className="font-bold text-lg">يتطلب تغليف احترافي</p>
              <p className="text-purple-100 text-sm">لا تنسَ إضافة التغليف قبل الشحن</p>
            </div>
          </div>
        </Card>
      )}

      {/* Special Print Alert */}
      {order.hasSpecialPrint && (
        <Card className="bg-indigo-600 text-white p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            <div>
              <p className="font-bold text-lg">طباعة خاصة</p>
              <p className="text-indigo-100 text-sm">تأكد من إعدادات الطباعة الخاصة</p>
            </div>
          </div>
        </Card>
      )}

      {/* Deposit Info Card */}
      {order.depositAmount > 0 && (
        <Card className="p-4 border-2 border-amber-300 dark:border-amber-700">
          <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2">
            💰 العربون
          </h2>
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">مبلغ العربون</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{order.depositAmount.toLocaleString('ar-IQ')} د.ع</p>
            </div>
            {order.depositReceiptUrl && (
              <a href={order.depositReceiptUrl} target="_blank" rel="noopener noreferrer">
                <img src={order.depositReceiptUrl} alt="Receipt" className="w-full h-40 object-cover rounded-lg border-2 border-border" />
              </a>
            )}
            <div className="flex items-center justify-between">
              <Badge className={cn(
                order.depositVerified 
                  ? 'bg-green-600 text-white' 
                  : 'bg-amber-500 text-white'
              )}>
                {order.depositVerified ? '✓ تم التحقق' : 'بانتظار التحقق'}
              </Badge>
              {!order.depositVerified && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    const { error } = await supabase
                      .from('orders')
                      .update({ deposit_verified: true })
                      .eq('id', order.orderId);
                    if (!error) {
                      toast({ title: 'تم التحقق', description: 'تم تأكيد العربون بنجاح' });
                      queryClient.invalidateQueries({ queryKey: ['staff-order-item', id] });
                    }
                  }}
                >
                  تحقق من العربون
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Merchant Payment Card */}
      {order.merchantPaymentAmount > 0 && (
        <Card className="p-4 border-2 border-red-300 dark:border-red-700">
          <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2">
            💸 دفعة التاجر (ربح سالب)
          </h2>
          <div className="space-y-3">
            <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">المبلغ المطلوب</p>
              <p className="text-2xl font-bold text-destructive">{order.merchantPaymentAmount.toLocaleString('ar-IQ')} د.ع</p>
            </div>
            {order.merchantPaymentReceiptUrl && (
              <a href={order.merchantPaymentReceiptUrl} target="_blank" rel="noopener noreferrer">
                <img src={order.merchantPaymentReceiptUrl} alt="Payment Receipt" className="w-full h-40 object-cover rounded-lg border-2 border-border" />
              </a>
            )}
            <div className="flex items-center justify-between">
              <Badge className={cn(
                order.merchantPaymentVerified 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-500 text-white'
              )}>
                {order.merchantPaymentVerified ? '✓ تم التحقق' : 'بانتظار التحقق'}
              </Badge>
              {!order.merchantPaymentVerified && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    const { error } = await supabase
                      .from('orders')
                      .update({ merchant_payment_verified: true })
                      .eq('id', order.orderId);
                    if (!error) {
                      toast({ title: 'تم التحقق', description: 'تم تأكيد دفعة التاجر بنجاح' });
                      queryClient.invalidateQueries({ queryKey: ['staff-order-item', id] });
                    }
                  }}
                >
                  تحقق من الدفعة
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Product Details - NO PRICES */}
      <Card className="p-4">
        <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          تفاصيل المنتج
        </h2>
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">اسم المنتج</p>
            <p className="text-xl font-bold text-foreground">{order.productName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-3 border-2 border-primary/20">
              <p className="text-sm text-muted-foreground">المقاس</p>
              <p className="text-3xl font-bold text-primary">{order.size}</p>
            </div>
            <div className="bg-card rounded-lg p-3 border-2 border-border">
              <p className="text-sm text-muted-foreground">اللون</p>
              <p className="text-3xl font-bold text-foreground">{order.color || 'غير محدد'}</p>
            </div>
          </div>
          {order.quantity > 1 && (
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3 border-2 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-600 dark:text-amber-400">الكمية المطلوبة</p>
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{order.quantity} قطع</p>
            </div>
          )}
        </div>
      </Card>

      {/* Merchant Notes */}
      {order.merchantNotes && (
        <Card className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700 p-4">
          <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            ملاحظات التاجر
          </h3>
          <p className="text-amber-900 dark:text-amber-200 font-medium text-lg break-all whitespace-pre-wrap">{order.merchantNotes}</p>
        </Card>
      )}

      {/* Print Assets Section */}
      <Card className="p-4">
        <h2 className="font-bold text-lg text-foreground mb-4">ملفات الطباعة</h2>

        {(() => {
          const designs = order.designFileUrls.length > 0 ? order.designFileUrls : (order.designFileUrl ? [order.designFileUrl] : []);
          const mockups = order.mockupFileUrls.length > 0 ? order.mockupFileUrls : (order.mockupFileUrl ? [order.mockupFileUrl] : []);
          return (
            <>
              <Button
                className="w-full h-14 text-lg mb-3 bg-primary hover:bg-primary/90"
                onClick={handleDownloadDesign}
                disabled={designs.length === 0}
              >
                <Download className="w-6 h-6 ml-2" />
                {designs.length > 0
                  ? `تحميل ${designs.length} تصميم (PNG عالي الدقة)`
                  : 'لا يوجد ملف تصميم'}
              </Button>

              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => setShowMockup(true)}
                disabled={mockups.length === 0}
              >
                <Eye className="w-5 h-5 ml-2" />
                {mockups.length > 0
                  ? `عرض ${mockups.length} موكب (موضع الطباعة)`
                  : 'لا توجد معاينة'}
              </Button>
            </>
          );
        })()}
      </Card>

      {/* Shipping Info */}
      <Card className="p-4">
        <h2 className="font-bold text-lg text-foreground mb-4">معلومات الشحن</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{order.customerName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium" dir="ltr">{order.customerPhone}</span>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <span className="font-bold text-primary">{order.customerGovernorate}</span>
              <p className="text-muted-foreground">{order.customerAddress}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-card border-t-2 border-border p-4 space-y-3 md:bottom-0">
        {/* Print Shipping Label */}
        <Button
          variant="outline"
          className="w-full h-12 text-base border-2"
          onClick={handleDownloadLabel}
        >
          <Download className="w-5 h-5 ml-2" />
          تحميل الصورة
        </Button>

        <div className="grid grid-cols-2 gap-3">
          {/* Report Issue */}
          <Button
            variant="destructive"
            className="h-14 text-base"
            onClick={() => setShowIssueDialog(true)}
          >
            <AlertTriangle className="w-5 h-5 ml-2" />
            إبلاغ عن مشكلة
          </Button>

          {/* Mark as Processed */}
          <Button
            className="h-14 text-base bg-green-600 hover:bg-green-700"
            onClick={handleMarkProcessed}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? (
              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 ml-2" />
            )}
            {order?.orderStatus === 'pending' ? 'بدء المعالجة' : 'تم التجهيز'}
          </Button>
        </div>
      </div>

      {/* Mockup Dialog */}
      <Dialog open={showMockup} onOpenChange={setShowMockup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>معاينة موضع الطباعة</DialogTitle>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {(order.mockupFileUrls.length > 0 ? order.mockupFileUrls : (order.mockupFileUrl ? [order.mockupFileUrl] : [])).map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Mockup ${i + 1}`}
                className="w-full h-auto rounded-lg"
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            هذه الصورة توضح مكان وضع التصميم على المنتج
          </p>
        </DialogContent>
      </Dialog>

      {/* Issue Report Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={(open) => { setShowIssueDialog(open); if (!open) { setShowCustomInput(false); setCustomIssue(''); setUrgency('medium'); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>الإبلاغ عن مشكلة</DialogTitle>
            <DialogDescription>اختر نوع المشكلة</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Urgency selector */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t('staff.reportIssue.urgency.title')}</p>
              <ToggleGroup
                type="single"
                value={urgency}
                onValueChange={(v) => v && setUrgency(v as 'low' | 'medium' | 'high')}
                className="w-full grid grid-cols-3 gap-2"
              >
                <ToggleGroupItem
                  value="low"
                  className="h-11 border-2 data-[state=on]:bg-emerald-500/10 data-[state=on]:border-emerald-500 data-[state=on]:text-emerald-600 dark:data-[state=on]:text-emerald-400"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2" />
                  {t('staff.reportIssue.urgency.low')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="medium"
                  className="h-11 border-2 data-[state=on]:bg-amber-500/10 data-[state=on]:border-amber-500 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" />
                  {t('staff.reportIssue.urgency.medium')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="high"
                  className="h-11 border-2 data-[state=on]:bg-destructive/10 data-[state=on]:border-destructive data-[state=on]:text-destructive"
                >
                  <span className="w-2 h-2 rounded-full bg-destructive ml-2" />
                  {t('staff.reportIssue.urgency.high')}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Button
              variant="outline"
              className="w-full h-14 justify-start text-right border-2"
              onClick={() => handleReportIssue('نفاذ المخزون')}
            >
              <span className="text-2xl ml-3">📦</span>
              نفاذ المخزون - المقاس غير متوفر
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-start text-right border-2"
              onClick={() => handleReportIssue('ملف التصميم تالف')}
            >
              <span className="text-2xl ml-3">🖼️</span>
              ملف التصميم تالف أو غير واضح
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 justify-start text-right border-2"
              onClick={() => handleReportIssue('مشكلة في الطباعة')}
            >
              <span className="text-2xl ml-3">🖨️</span>
              مشكلة في الطباعة
            </Button>
            {showCustomInput ? (
              <div className="space-y-3">
                <Textarea
                  value={customIssue}
                  onChange={(e) => setCustomIssue(e.target.value)}
                  placeholder="صف المشكلة هنا..."
                  className="min-h-[100px] text-right"
                  dir="rtl"
                />
                <Button
                  className="w-full h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={() => {
                    if (customIssue.trim()) {
                      handleReportIssue(customIssue.trim());
                    }
                  }}
                  disabled={!customIssue.trim() || reportIssue.isPending}
                >
                  {reportIssue.isPending ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : null}
                  إرسال البلاغ
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-14 justify-start text-right border-2"
                onClick={() => setShowCustomInput(true)}
              >
                <span className="text-2xl ml-3">❓</span>
                مشكلة أخرى
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowIssueDialog(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffProcessOrder;
