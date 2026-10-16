import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  BarChart3,
  AlertTriangle,
  Package,
  ShieldAlert,
  CalendarIcon,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import StatCard from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAdminDashboard, formatPrice } from '@/hooks/useAdminDashboard';
import { useAdminIssues } from '@/hooks/useAdminIssues';
import { useAttendanceWarnings } from '@/hooks/useAttendance';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DateRange } from 'react-day-picker';

const StatCardSkeleton = () => (
  <div className="bg-card rounded-xl border border-border shadow-sm p-6">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl" />
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const activeRange =
    chartPeriod === 'custom' && dateRange?.from && dateRange?.to
      ? { from: dateRange.from, to: dateRange.to }
      : null;
  const { stats, chart, lowStock } = useAdminDashboard(activeRange);
  const { data: issues } = useAdminIssues();
  const issuesCount = issues?.length || 0;
  const { pendingCount: attendancePending, absentCount: attendanceAbsent } = useAttendanceWarnings();

  const dashboardStats = stats.data;
  const chartData = chart.data;
  const displayChartData =
    chartPeriod === 'custom'
      ? chartData?.customData || []
      : chartPeriod === 'weekly'
      ? chartData?.weeklyData || []
      : chartData?.monthlyData || [];

  const hasChartData = displayChartData.some(d => d.sales > 0 || d.profit > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('admin.dashboard2.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {stats.isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title={t('admin.dashboard2.totalSales')}
              value={formatPrice(dashboardStats?.totalSales || 0)}
              icon={DollarSign}
              iconColor="text-primary"
              iconBgColor="bg-primary/10"
            />
            <StatCard
              title={t('admin.dashboard2.netProfit')}
              value={formatPrice(dashboardStats?.netProfit || 0)}
              icon={TrendingUp}
              iconColor="text-green-600"
              iconBgColor="bg-green-500/10"
            />
            <StatCard
              title={t('admin.dashboard.pendingOrders')}
              value={t('admin.dashboard2.pendingOrdersValue', { count: dashboardStats?.pendingOrders || 0 })}
              subtitle={
                (dashboardStats?.pendingOrdersOverdue || 0) > 0
                  ? t('admin.dashboard2.pendingOverdue', { count: dashboardStats?.pendingOrdersOverdue || 0 })
                  : undefined
              }
              icon={Clock}
              iconColor={(dashboardStats?.pendingOrdersOverdue || 0) > 0 ? 'text-red-600' : 'text-amber-600'}
              iconBgColor={(dashboardStats?.pendingOrdersOverdue || 0) > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'}
              warning={(dashboardStats?.pendingOrdersOverdue || 0) > 0}
            />
            <StatCard
              title={t('admin.dashboard2.activeMerchants')}
              value={t('admin.dashboard2.activeMerchantsValue', { count: dashboardStats?.activeMerchants || 0 })}
              icon={Users}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-500/10"
            />
            <div onClick={() => navigate('/admin/orders?filter=needs_verification')} className="cursor-pointer">
              <StatCard
                title={t('admin.dashboard2.needsVerification')}
                value={t('admin.dashboard2.needsVerificationValue', { count: dashboardStats?.needsVerification || 0 })}
                icon={ShieldAlert}
                iconColor={(dashboardStats?.needsVerification || 0) > 0 ? 'text-orange-600' : 'text-muted-foreground'}
                iconBgColor={(dashboardStats?.needsVerification || 0) > 0 ? 'bg-orange-500/10' : 'bg-muted/10'}
                warning={(dashboardStats?.needsVerification || 0) > 0}
              />
            </div>
            <div onClick={() => navigate('/admin/issues')} className="cursor-pointer">
              <StatCard
                title={t('admin.dashboard2.openIssues')}
                value={t('admin.dashboard2.openIssuesValue', { count: issuesCount })}
                icon={AlertTriangle}
                iconColor={issuesCount > 0 ? 'text-red-600' : 'text-muted-foreground'}
                iconBgColor={issuesCount > 0 ? 'bg-red-500/10' : 'bg-muted/10'}
                warning={issuesCount > 0}
              />
            </div>
          </>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStock.data && lowStock.data.length > 0 && (
        <Alert variant="destructive" className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">{t('admin.dashboard2.lowStockTitle')}</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">{t('admin.dashboard2.lowStockDesc')}</p>
            <div className="flex flex-wrap gap-2">
              {lowStock.data.slice(0, 5).map(p => (
                <span key={p.id} className="inline-flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs px-2 py-1 rounded-full">
                  <Package className="w-3 h-3" />
                  {p.name} ({p.stock})
                </span>
              ))}
              {lowStock.data.length > 5 && (
                <span className="text-xs text-orange-600">{t('admin.dashboard2.lowStockMore', { count: lowStock.data.length - 5 })}</span>
              )}
            </div>
            <button onClick={() => navigate('/admin/inventory')} className="text-xs mt-2 underline text-orange-700 dark:text-orange-400">
              {t('admin.dashboard2.viewInventory')}
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Attendance Warning Alert */}
      {(attendancePending > 0 || attendanceAbsent > 0) && (
        <Alert
          variant={attendanceAbsent > 0 ? 'destructive' : 'default'}
          className={attendanceAbsent === 0 ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20' : ''}
        >
          <Clock className="h-4 w-4" />
          <AlertTitle className="font-bold">{t('admin.dashboard2.attendanceTitle')}</AlertTitle>
          <AlertDescription className="mt-2 space-y-1">
            {attendancePending > 0 && (
              <p className={attendanceAbsent === 0 ? 'text-amber-700 dark:text-amber-300' : ''}>
                {t('admin.dashboard2.attendancePending', { count: attendancePending })}
              </p>
            )}
            {attendanceAbsent > 0 && (
              <p>{t('admin.dashboard2.attendanceAbsent', { count: attendanceAbsent })}</p>
            )}
            <button onClick={() => navigate('/admin/attendance')} className="text-xs mt-2 underline">
              {t('admin.dashboard2.viewAttendance')}
            </button>
          </AlertDescription>
        </Alert>
      )}
      {/* Sales Chart */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">{t('admin.dashboard2.salesPerformance')}</h2>
          <div className="flex gap-2">
            <Button
              variant={chartPeriod === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartPeriod('weekly')}
            >
              {t('admin.dashboard2.weekly')}
            </Button>
            <Button
              variant={chartPeriod === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartPeriod('monthly')}
            >
              {t('admin.dashboard2.monthly')}
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={chartPeriod === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  className={cn('gap-2', !dateRange?.from && 'text-muted-foreground')}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, 'yyyy/MM/dd')} - ${format(dateRange.to, 'yyyy/MM/dd')}`
                    : 'اختر الفترة'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) {
                      setChartPeriod('custom');
                      setCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  captionLayout="dropdown-buttons"
                  fromYear={2020}
                  toYear={new Date().getFullYear() + 1}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            {chartPeriod === 'custom' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateRange(undefined);
                  setChartPeriod('weekly');
                }}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                إعادة تعيين
              </Button>
            )}
          </div>
        </div>


        <div className="h-80">
          {chart.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="w-full h-full" />
            </div>
          ) : !hasChartData ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <BarChart3 className="w-16 h-16 mb-4" />
              <p className="text-lg">{t('admin.dashboard2.noChartData')}</p>
              <p className="text-sm">{t('admin.dashboard2.noChartDataDesc')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number, name: string) => [
                    formatPrice(value),
                    name === 'sales' ? t('admin.dashboard2.sales') : t('admin.dashboard2.profits'),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        {hasChartData && (
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">{t('admin.dashboard2.sales')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">{t('admin.dashboard2.profits')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
