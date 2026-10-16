import { Check } from 'lucide-react';
import { OrderStatus } from '@/types/orders';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrderTimelineProps {
  status: OrderStatus;
}

export function OrderTimeline({ status }: OrderTimelineProps) {
  const { t } = useLanguage();

  const steps: { status: OrderStatus; label: string }[] = [
    { status: 'pending', label: t('status.pending') },
    { status: 'processing', label: t('status.processing') },
    { status: 'printed', label: t('status.printed') },
    { status: 'shipped', label: t('status.shipped') },
    { status: 'delivered', label: t('status.delivered') },
  ];

  const statusOrder: Record<OrderStatus, number> = {
    pending: 0, processing: 1, printed: 2, shipped: 3, delivered: 4, returned: -1, cancelled: -1, resent: -1,
  };

  const currentIndex = statusOrder[status];

  if (status === 'cancelled') return <div className="text-center py-4 text-red-600 dark:text-red-400 font-medium">{t('status.orderCancelled')}</div>;
  if (status === 'returned') return <div className="text-center py-4 text-orange-600 dark:text-orange-400 font-medium">{t('status.orderReturned')}</div>;
  if (status === 'resent') return <div className="text-center py-4 text-cyan-600 dark:text-cyan-400 font-medium">{t('status.orderResent')}</div>;

  // Half-step inset so the line aligns with the first/last circle centers
  const insetPct = 100 / steps.length / 2; // e.g. 10% for 5 steps
  // Progress fills the inner span (between first & last circle centers)
  const progressPct = currentIndex > 0
    ? (currentIndex / (steps.length - 1)) * 100
    : 0;

  return (
    <div className="py-4">
      <div className="flex items-start relative">
        {/* Background line */}
        <div
          className="absolute top-4 h-0.5 bg-muted"
          style={{ left: `${insetPct}%`, right: `${insetPct}%` }}
        />
        {/* Active progress line — uses inset-based span so it works in both LTR and RTL */}
        <div
          className="absolute top-4 h-0.5 bg-primary transition-all duration-500"
          style={{
            left: `${insetPct}%`,
            right: `${insetPct}%`,
            clipPath: `inset(0 ${100 - progressPct}% 0 0)`,
          }}
        />

        {steps.map((step, index) => {
          const isDeliveredFinal = status === 'delivered' && index === currentIndex;
          const isCompleted = index < currentIndex || isDeliveredFinal;
          const isCurrent = index === currentIndex && !isDeliveredFinal;
          const isPending = index > currentIndex;
          return (
            <div key={step.status} className="relative flex flex-col items-center z-10 flex-1">
              <div className={cn(
                'w-8 h-8 shrink-0 rounded-full flex items-center justify-center border-2 transition-all',
                isCompleted && 'bg-primary border-primary text-primary-foreground',
                isCurrent && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20',
                isPending && 'bg-background border-muted text-muted-foreground'
              )}>
                {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs font-medium">{index + 1}</span>}
              </div>
              <span className={cn(
                'text-xs mt-2.5 font-medium text-center leading-tight max-w-[64px]',
                (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
