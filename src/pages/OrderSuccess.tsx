import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, MapPin, Phone, ClipboardList, ArrowLeft, ArrowRight, Sparkles, Plus, Landmark } from 'lucide-react';
import { useMerchantOrderById } from '@/hooks/useMerchantOrders';
import { useGovernorates, formatPrice } from '@/hooks/useCatalogData';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfettiCelebration } from '@/components/ConfettiCelebration';
import { MerchantLayout } from '@/components/MerchantLayout';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const LIFECYCLE_KEYS = ['pending', 'processing', 'shipped', 'delivered'] as const;

const OrderSuccess = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useMerchantOrderById(orderId || '');
  const { data: governorates } = useGovernorates();
  const { t, isRTL } = useLanguage();
  const [showContent, setShowContent] = useState(false);

  const steps = LIFECYCLE_KEYS.map(key => ({ key, label: t(`status.${key}`) }));

  useEffect(() => {
    if (!orderId) { navigate('/'); return; }
    const id = setTimeout(() => setShowContent(true), 150);
    return () => clearTimeout(id);
  }, [orderId, navigate]);

  const copyOrderNumber = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number);
      toast({ title: t('orderSuccess.copied'), description: t('orderSuccess.copiedDesc', { number: order.order_number }) });
    }
  };

  if (!orderId) return null;

  if (isLoading) {
    return (
      <MerchantLayout hideHeader>
        <div className="p-4 space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </MerchantLayout>
    );
  }

  if (!order) {
    return (
      <MerchantLayout hideHeader>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{t('orderSuccess.notFound')}</p>
            <Button onClick={() => navigate('/')}>{t('orderSuccess.backToHome')}</Button>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  const governorateName = governorates?.find(g => g.id === order.governorate)?.name_ar || order.governorate;
  const currentStepIndex = steps.findIndex(s => s.key === (order.status || 'pending'));
  const BackArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <MerchantLayout hideHeader>
      <div className="pb-32">
        <ConfettiCelebration isActive={true} particleCount={30} duration={3000} />

        {/* ── Compact Success Header ── */}
        <div className={cn(
          "pt-10 pb-6 text-center",
          showContent ? "animate-slide-up" : "opacity-0"
        )}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 mb-3">
            <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center shadow-sm">
              <Check className="h-5 w-5 text-success-foreground" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-lg font-bold text-foreground">{t('orderSuccess.confirmed')} 🎉</h1>
          <p className="text-xs text-muted-foreground mt-1">{t('orderSuccess.contactSoon')}</p>
        </div>

        <div className="px-4 space-y-3">

          {/* ── Order Number + Status Row ── */}
          <div className={cn(
            "flex items-center justify-between bg-card rounded-xl p-3 border border-border/60 shadow-card",
            showContent ? "animate-slide-up" : "opacity-0"
          )} style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground tracking-wide">{order.order_number}</span>
              <button onClick={copyOrderNumber}
                className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <OrderStatusBadge status={order.status || 'pending'} />
          </div>

          {/* ── Stepper ── */}
          <div className={cn(
            "bg-card rounded-xl p-3 border border-border/60 shadow-card",
            showContent ? "animate-slide-up" : "opacity-0"
          )} style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-3 right-5 left-5 h-[2px] bg-border" />
              <div className={cn(
                "absolute top-3 h-[2px] bg-success transition-all duration-500",
                isRTL ? "right-5" : "left-5"
              )} style={{ width: `${currentStepIndex >= 0 ? (currentStepIndex / (steps.length - 1)) * (100 - 10) : 0}%` }} />

              {steps.map((step, i) => {
                const done = i < currentStepIndex;
                const active = i === currentStepIndex;
                return (
                  <div key={step.key} className="relative flex flex-col items-center z-10">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                      done && "bg-success text-success-foreground",
                      active && "bg-success text-success-foreground ring-[3px] ring-success/20",
                      !done && !active && "bg-secondary text-muted-foreground"
                    )}>
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={cn(
                      "text-[10px] mt-1 whitespace-nowrap",
                      (done || active) ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Unified Details Card ── */}
          <div className={cn(
            "bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden",
            showContent ? "animate-slide-up" : "opacity-0"
          )} style={{ animationDelay: "0.2s" }}>

            {/* Items */}
            <div className="p-4 space-y-3">
              <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                {t('orderSuccess.orderSummary')}
              </h3>
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/30">
                    <img src={item.product_image || '/placeholder.svg'} alt={item.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{item.product_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t('orderSuccess.size')}: {item.size} • {t('orderSuccess.quantity')}: {item.quantity}
                    </p>
                    {item.addons && Array.isArray(item.addons) && (item.addons as any[]).length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {(item.addons as any[]).map((addon: any, ai: number) => {
                          const label = typeof addon === 'string'
                            ? addon
                            : [addon?.addonName || addon?.name, addon?.optionName || addon?.option_name || addon?.option]
                                .filter(Boolean).join(' · ');
                          if (!label) return null;
                          return (
                            <span key={ai} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-price flex-shrink-0">{formatPrice(item.retail_price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Profit */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between rounded-xl bg-success/8 border border-success/20 px-3.5 py-2.5">
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-success" />
                  {t('orderSuccess.netProfit')}
                </span>
                <span className="text-lg font-bold text-success">+{formatPrice(order.net_profit)}</span>
              </div>
            </div>

            <Separator />

            {/* Delivery */}
            <div className="p-4 space-y-2.5">
              <h3 className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                {t('orderSuccess.deliveryDetails')}
              </h3>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {order.customer_name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'}
                  </span>
                </div>
                <span className="font-bold text-sm">{order.customer_name}</span>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{governorateName}{order.region ? ` - ${order.region}` : ''}</span>
                </div>
                {order.landmark && (
                  <div className="flex items-center gap-2">
                    <Landmark className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{order.landmark}</span>
                  </div>
                )}
                <a href={`tel:+964${order.customer_phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span dir="ltr">+964 {order.customer_phone}</span>
                </a>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className={cn("space-y-2.5 pt-1", showContent ? "animate-slide-up" : "opacity-0")} style={{ animationDelay: "0.3s" }}>
            <Button
              onClick={() => navigate('/orders')}
              className="w-full h-12 rounded-xl bg-success hover:bg-success/90 text-success-foreground gap-2 shadow-sm"
            >
              <ClipboardList className="h-4.5 w-4.5" />
              {t('orderSuccess.trackOrder')}
              <BackArrow className="h-4 w-4 opacity-60" />
            </Button>

            <Button variant="outline" onClick={() => navigate('/')}
              className="w-full h-11 rounded-xl border-2 gap-2">
              <Plus className="h-4 w-4" />
              {t('orderSuccess.newOrder')}
            </Button>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default OrderSuccess;
