import { Clock, Package, Truck, CheckCircle, XCircle, Printer, RotateCcw, Send } from 'lucide-react';
import { OrderStatus, statusConfig } from '@/types/orders';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  pulse?: boolean;
}

const iconMap = {
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Printer,
  RotateCcw,
  Send,
};

export function OrderStatusBadge({ status, className, pulse }: OrderStatusBadgeProps) {
  const config = statusConfig[status];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap] || Package;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold shadow-sm',
        config.bgClass,
        config.textClass,
        pulse && status === 'pending' && 'animate-pulse-subtle',
        className
      )}
    >
      <IconComponent className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
