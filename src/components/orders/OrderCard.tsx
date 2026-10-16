import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, Phone, Sparkles, TrendingUp, Clock, XCircle, ExternalLink, Wallet } from 'lucide-react';
import type { MerchantOrderReturn } from '@/hooks/useMerchantOrderReturn';
import { MerchantOrder, useCancelOrder } from '@/hooks/useMerchantOrders';
import { formatPrice, useGovernorates } from '@/hooks/useCatalogData';
import { formatRelativeTime } from '@/types/orders';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Badge } from '@/components/ui/badge';
import { OrderTimeline } from './OrderTimeline';
import { CancelOrderModal } from './CancelOrderModal';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: MerchantOrder;
  expiredReturn?: MerchantOrderReturn | null;
}

export function OrderCard({ order, expiredReturn }: OrderCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const { data: governorates } = useGovernorates();
  const cancelOrder = useCancelOrder();
  const { t } = useLanguage();
  const governorateName = governorates?.find(g => g.id === order.governorate)?.name_ar || order.governorate;

  const handleCancelOrder = () => {
    cancelOrder.mutate(order.id, {
      onSuccess: () => { toast.success(t('orders.cancelSuccess')); setCancelModalOpen(false); },
      onError: (error) => { toast.error(error.message || t('orders.cancelError')); },
    });
  };

  const firstItem = order.items[0];
  const remainingCount = order.items.length - 1;

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden transition-all border border-border/40">
      <div className="p-3 cursor-pointer space-y-2" onClick={() => navigate(`/order/${order.id}`)}>
        {/* Row 1: Order number + status + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold flex items-center gap-1">{order.order_number}<ExternalLink className="h-3 w-3 text-muted-foreground" /></span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-3 w-3" />{formatRelativeTime(new Date(order.created_at))}</span>
          </div>
          <OrderStatusBadge status={order.status} pulse={order.status === 'pending'} />
        </div>

        {/* Transferred-to-merchant red banner (return expired & charged) */}
        {expiredReturn && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-[11px] font-bold">
            <Wallet className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">
              {t('orders.transferredBadge')}
              {expiredReturn.wholesale_charge_amount && expiredReturn.wholesale_charge_amount > 0
                ? ` — ${formatPrice(expiredReturn.wholesale_charge_amount)}`
                : ''}
            </span>
          </div>
        )}

        {/* Row 2: Item summary */}
        {firstItem && (
          <div className="text-sm text-foreground truncate">
            <span className="font-medium">{firstItem.product_name}</span>
            <span className="text-muted-foreground"> {firstItem.size} × {firstItem.quantity}</span>
            {remainingCount > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1.5 align-middle">{t('orders.moreProducts', { count: String(remainingCount) })}</Badge>}
          </div>
        )}

        {/* Row 3: Customer + phone + location */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><span className="font-medium text-foreground">{order.customer_name}</span></span>
          <a href={`tel:+964${order.customer_phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-0.5 text-primary hover:underline" dir="ltr"><Phone className="h-3 w-3" />{order.customer_phone}</a>
          <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{governorateName}</span>
        </div>

        {/* Row 4: Price + profit */}
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <span className="text-xs text-muted-foreground">{t('orders.customerPrice')}: <span className="font-semibold text-foreground">{formatPrice((order.final_retail_price || 0) + (order.shipping_fee || 0))}</span></span>
          <span className={cn('text-sm font-bold', order.net_profit >= 0 ? 'text-success' : 'text-destructive')}>{order.net_profit >= 0 ? '+' : ''}{formatPrice(order.net_profit)}</span>
        </div>
      </div>

      <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="w-full py-3.5 border-t border-border/50 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors press-effect">
        {isExpanded ? t('orders.hideDetails') : t('orders.showDetails')}
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', isExpanded && 'rotate-180')} />
      </button>

      {isExpanded && (
        <div className="border-t border-border/50 p-4 bg-muted/20 space-y-4 animate-slide-up">
          <div>
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{t('orders.orderStatus')}</h4>
            <OrderTimeline status={order.status} />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-3">{t('orders.customerDetails')}</h4>
            <div className="bg-card rounded-2xl p-4 space-y-3 text-sm shadow-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.name')}</span><span className="font-medium">{order.customer_name}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('orders.phone')}</span><a href={`tel:+964${order.customer_phone}`} className="font-medium flex items-center gap-1.5 text-primary hover:underline" dir="ltr"><Phone className="h-4 w-4" />+964 {order.customer_phone}</a></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.address')}</span><span className="font-medium text-left">{governorateName}، {order.region || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.landmarkLabel')}</span><span className="font-medium">{order.landmark || '-'}</span></div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-3">{t('orders.financialDetails')}</h4>
            <div className="bg-card rounded-2xl p-4 space-y-3 text-sm shadow-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.costWholesale')}</span><span className="font-medium">{formatPrice(order.total_merchant_cost)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.shipping')}</span><span className="font-medium">{formatPrice(order.shipping_fee || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.totalLabel')}</span><span className="font-medium">{formatPrice(order.total_merchant_cost + (order.shipping_fee || 0))}</span></div>
              <div className="h-px bg-border/50 my-1" />
              <div className="flex justify-between"><span className="text-muted-foreground">{t('orders.customerPrice')}</span><span className="font-bold text-primary">{formatPrice((order.final_retail_price || 0) + (order.shipping_fee || 0))}</span></div>
              {(order as any).deposit_amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('checkout.depositAmount')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatPrice((order as any).deposit_amount)}</span>
                    <Badge variant={(order as any).deposit_verified ? 'default' : 'secondary'} className="text-xs">
                      {(order as any).deposit_verified ? t('checkout.depositVerified') : t('checkout.depositAwaitingVerification')}
                    </Badge>
                  </div>
                </div>
              )}
              {(order as any).merchant_payment_amount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-destructive font-medium">دفعة مطلوبة:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-destructive">{formatPrice((order as any).merchant_payment_amount)}</span>
                    <Badge variant={(order as any).merchant_payment_verified ? 'default' : 'destructive'} className="text-xs">
                      {(order as any).merchant_payment_verified ? '✓ تم التحقق' : 'بانتظار التحقق'}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="flex justify-between bg-gradient-success/10 -mx-4 px-4 py-3 rounded-xl mt-2">
                <span className="font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" />{t('orders.netProfitLabel')}</span>
                <span className={cn('font-bold text-lg', order.net_profit >= 0 ? 'text-success' : 'text-destructive')}>{order.net_profit >= 0 ? '+' : ''}{formatPrice(order.net_profit)}</span>
              </div>
            </div>
          </div>
          {order.estimated_delivery && <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-xl py-3">📅 {t('orders.estimatedDelivery')} <span className="font-medium text-foreground">{new Date(order.estimated_delivery).toLocaleDateString('ar-IQ')}</span></div>}
          {order.status === 'pending' && (
            <Button variant="outline" className="w-full mt-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelModalOpen(true)}>
              <XCircle className="w-4 h-4 ml-2" />{t('orders.cancelOrder')}
            </Button>
          )}
        </div>
      )}

      <CancelOrderModal open={cancelModalOpen} onOpenChange={setCancelModalOpen} orderNumber={order.order_number} onConfirm={handleCancelOrder} isPending={cancelOrder.isPending} />
    </div>
  );
}
