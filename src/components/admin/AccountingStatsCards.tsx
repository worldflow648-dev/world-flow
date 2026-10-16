import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, Wallet, CreditCard, Package } from 'lucide-react';
import type { StatCardKey } from './StatBreakdownDialog';

interface FinancialOverview {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  merchantEarnings: number;
  adminNetProfit: number;
  outstandingBalance: number;
  totalSettled: number;
  totalShipping: number;
}

interface AccountingStatsCardsProps {
  data: FinancialOverview | undefined;
  isLoading: boolean;
  onCardClick?: (key: StatCardKey) => void;
}

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}K`;
  return amount.toLocaleString('ar-IQ');
}

const AccountingStatsCards = ({ data, isLoading, onCardClick }: AccountingStatsCardsProps) => {
  const stats: Array<{
    key: StatCardKey;
    title: string;
    value: number;
    icon: typeof DollarSign;
    color: string;
    bgColor: string;
  }> = [
    { key: 'revenue', title: 'إجمالي الإيرادات', value: data?.totalRevenue || 0, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { key: 'cost', title: 'التكاليف', value: data?.totalCost || 0, icon: Package, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    { key: 'adminProfit', title: 'صافي ربح الإدارة', value: data?.adminNetProfit || 0, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    { key: 'outstanding', title: 'مستحق للتجار', value: data?.outstandingBalance || 0, icon: Wallet, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
    { key: 'settled', title: 'تم التسوية', value: data?.totalSettled || 0, icon: CreditCard, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-8 w-24" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const isClickable = !!onCardClick;
        const isNegative = stat.value < 0;
        return (
          <Card
            key={stat.key}
            onClick={isClickable ? () => onCardClick!(stat.key) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick!(stat.key); } } : undefined}
            className={`overflow-hidden transition-all ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                  <p className={`text-lg font-bold ${isNegative ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                    {formatCurrency(stat.value)}
                    <span className="text-xs font-normal text-muted-foreground mr-1">د.ع</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AccountingStatsCards;
