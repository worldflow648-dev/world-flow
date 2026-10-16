import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { CalendarIcon, TrendingUp, Package, DollarSign, Check } from 'lucide-react';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/hooks/useCatalogData';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SalesReport } from '@/hooks/useMerchantDashboard';

type Preset = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

interface Props {
  salesReport: SalesReport;
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

const presetRange = (preset: Exclude<Preset, 'custom'>): { from: Date; to: Date } => {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'thisWeek':
      return { from: startOfWeek(now, { weekStartsOn: 6 }), to: endOfWeek(now, { weekStartsOn: 6 }) };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': {
      const m = subMonths(now, 1);
      return { from: startOfMonth(m), to: endOfMonth(m) };
    }
  }
};

export const SalesReportSection = ({ salesReport, onDateRangeChange }: Props) => {
  const { t } = useLanguage();
  const [activePreset, setActivePreset] = useState<Preset>('thisWeek');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customOpen, setCustomOpen] = useState(false);

  const presets: { key: Exclude<Preset, 'custom'>; label: string }[] = [
    { key: 'today', label: t('dashboard.today') || 'اليوم' },
    { key: 'yesterday', label: t('dashboard.yesterday') || 'أمس' },
    { key: 'thisWeek', label: t('dashboard.thisWeek') || 'هذا الأسبوع' },
    { key: 'thisMonth', label: t('dashboard.thisMonth') || 'هذا الشهر' },
    { key: 'lastMonth', label: t('dashboard.lastMonth') || 'الشهر الماضي' },
  ];

  const handlePreset = (preset: Exclude<Preset, 'custom'>) => {
    setActivePreset(preset);
    onDateRangeChange(presetRange(preset));
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      setActivePreset('custom');
      onDateRangeChange({ from: startOfDay(customFrom), to: endOfDay(customTo) });
      setCustomOpen(false);
    }
  };

  const activeRange = activePreset === 'custom'
    ? (customFrom && customTo ? { from: customFrom, to: customTo } : null)
    : presetRange(activePreset);

  const rangeLabel = activeRange
    ? `${format(activeRange.from, 'yyyy/MM/dd')} — ${format(activeRange.to, 'yyyy/MM/dd')}`
    : '';

  return (
    <Card className="p-4 rounded-2xl shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('dashboard.salesReport')}
        </h3>
        {rangeLabel && (
          <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md">
            {rangeLabel}
          </span>
        )}
      </div>

      {/* Segmented preset selector */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-xl">
        {presets.map(p => {
          const active = activePreset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={cn(
                'flex-1 min-w-[70px] px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                active
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          );
        })}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex-1 min-w-[70px] px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1',
                activePreset === 'custom'
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CalendarIcon className="h-3 w-3" />
              {t('dashboard.customDate') || 'مخصص'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 space-y-3" align="end">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t('dashboard.from') || 'من'}
              </p>
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={setCustomFrom}
                className="p-0 pointer-events-auto"
              />
            </div>
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t('dashboard.to') || 'إلى'}
              </p>
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={setCustomTo}
                disabled={customFrom ? { before: customFrom } : undefined}
                className="p-0 pointer-events-auto"
              />
            </div>
            <Button
              size="sm"
              className="w-full gap-1"
              disabled={!customFrom || !customTo}
              onClick={applyCustom}
            >
              <Check className="h-3 w-3" />
              {t('common.apply') || 'تطبيق'}
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-lg font-bold">{salesReport.ordersCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('dashboard.ordersCount')}</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="text-lg font-bold">{salesReport.revenue >= 1000 ? `${Math.round(salesReport.revenue / 1000)}K` : salesReport.revenue}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('dashboard.revenue')}</p>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-lg font-bold">{salesReport.profit >= 1000 ? `${Math.round(salesReport.profit / 1000)}K` : salesReport.profit}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('dashboard.profit')}</p>
        </div>
      </div>

      {/* Chart */}
      {salesReport.chartData.length > 0 && (
        <div className="h-48" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesReport.chartData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), t('dashboard.profit')]}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', direction: 'rtl' }}
              />
              <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
