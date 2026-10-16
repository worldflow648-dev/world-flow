import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyRevenue, useGovernorateRevenue, useMerchantFinancials } from '@/hooks/useAdminAccounting';
import { useOrdersByStatus, useOrdersTrend } from '@/hooks/useAdminGraphs';
import { getOrderStatusLabel } from '@/lib/adminLabels';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(38, 92%, 50%)',
  processing: 'hsl(217, 91%, 60%)',
  printed: 'hsl(239, 84%, 67%)',
  shipped: 'hsl(271, 91%, 65%)',
  delivered: 'hsl(142, 71%, 45%)',
  returned: 'hsl(25, 95%, 53%)',
  cancelled: 'hsl(0, 84%, 60%)',
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)',
  'hsl(217, 91%, 60%)',
  'hsl(271, 91%, 65%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(25, 95%, 53%)',
  'hsl(190, 90%, 50%)',
  'hsl(330, 80%, 60%)',
  'hsl(160, 60%, 45%)',
];

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
      <CardContent><Skeleton className="h-[280px] w-full" /></CardContent>
    </Card>
  );
}

const AdminGraphs = () => {
  const { t, dir, locale } = useLanguage();
  const { data: dailyRevenue, isLoading: loadingRevenue } = useDailyRevenue(30);
  const { data: ordersByStatus, isLoading: loadingStatus } = useOrdersByStatus();
  const { data: govRevenue, isLoading: loadingGov } = useGovernorateRevenue();
  const { data: merchants, isLoading: loadingMerchants } = useMerchantFinancials();
  const { data: ordersTrend, isLoading: loadingTrend } = useOrdersTrend(30);

  const formatPrice = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString(locale);
  };

  const topMerchants = merchants
    ?.sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10) || [];

  const statusData = ordersByStatus?.map(s => ({
    name: getOrderStatusLabel(s.status as any, t),
    value: s.count,
    status: s.status,
  })) || [];

  return (
    <div className="space-y-6" dir={dir}>
      <h1 className="text-2xl font-bold text-foreground">{t('admin.graphs2.title')}</h1>

      <div className="grid grid-cols-1 gap-6">
        {loadingRevenue ? <ChartSkeleton /> : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.graphs2.revenueOverTime')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPrice} className="fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => formatPrice(v)} labelFormatter={l => l} />
                  <Area type="monotone" dataKey="revenue" name={t('admin.graphs2.revenue')} stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" name={t('admin.graphs2.profit')} stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%, 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingStatus ? <ChartSkeleton /> : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.graphs2.ordersByStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {loadingTrend ? <ChartSkeleton /> : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.graphs2.ordersTrend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ordersTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" name={t('admin.graphs2.orderCount')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {loadingGov ? <ChartSkeleton /> : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.graphs2.revenueByGovernorate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(300, (govRevenue?.length || 0) * 40)}>
                <BarChart data={govRevenue || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatPrice} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="governorate" tick={{ fontSize: 11 }} width={100} className="fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Bar dataKey="revenue" name={t('admin.graphs2.revenue')} fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {loadingMerchants ? <ChartSkeleton /> : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.graphs2.topMerchants')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(300, topMerchants.length * 40)}>
                <BarChart data={topMerchants} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatPrice} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} className="fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Bar dataKey="totalRevenue" name={t('admin.graphs2.revenue')} fill="hsl(271, 91%, 65%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminGraphs;
