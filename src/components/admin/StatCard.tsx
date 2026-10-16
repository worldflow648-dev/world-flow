import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  warning?: boolean;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  trend,
  warning = false,
}: StatCardProps) => {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p
            className={cn(
              'text-2xl font-bold',
              warning ? 'text-red-600' : 'text-foreground'
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.positive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-xs text-muted-foreground">من الأسبوع الماضي</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconBgColor)}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
