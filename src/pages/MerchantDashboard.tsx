import { useState } from 'react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useMerchantDashboard } from '@/hooks/useMerchantDashboard';
import { formatPrice } from '@/hooks/useCatalogData';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  TrendingUp, Package, Clock, CheckCircle2, Wallet, BarChart3,
  Flame, ArrowUpRight, User, Phone, Settings, HelpCircle, Store, Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
import { MerchantLayout } from '@/components/MerchantLayout';
import { SalesReportSection } from '@/components/merchant/SalesReportSection';


const MerchantDashboard = () => {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { t, language } = useLanguage();
  const now = new Date();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({ from: startOfWeek(now, { weekStartsOn: 6 }), to: now });
  const { stats, weeklyData, topProducts, salesReport, isLoading } = useMerchantDashboard(dateRange);
  const navigate = useNavigate();

  const dateLocale = language === 'ar' || language === 'ku' ? ar : enUS;
  const memberSince = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy', { locale: dateLocale }) : '';

  if (isLoading) {
    return (
      <MerchantLayout title={t('dashboard.title')} showSearch={false}>
        <main className="p-4 pb-24 md:pb-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </main>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout hideHeader>
      <PullToRefresh onRefresh={async () => {
        await queryClient.invalidateQueries({ queryKey: ['merchant-dashboard-orders'] });
        await queryClient.invalidateQueries({ queryKey: ['merchant-dashboard-wallet'] });
      }}>
        <main className="p-4 pb-24 md:pb-8 space-y-6">
          {/* Header for desktop */}
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          </div>

          {/* Profile Card */}
          <Card className="overflow-hidden rounded-2xl shadow-card border-0 animate-slide-up">
            <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
            <CardContent className="relative -mt-12 pb-4">
              <div className="flex justify-center mb-3">
                <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold">
                    {profile?.full_name?.charAt(0) || <User className="w-8 h-8" />}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-center space-y-1 mb-4">
                <h2 className="text-xl font-bold">{profile?.full_name || t('dashboard.theMerchant')}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {profile?.phone && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Phone className="w-3 h-3" />{profile.phone}</p>
                )}
                <div className="flex justify-center mt-2 gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <Store className="w-3 h-3" />{t('dashboard.certifiedMerchant')}
                  </span>
                  {profile?.merchant_tier && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                      {profile.merchant_tier === 'professional' ? t('dashboard.professionalTier') : t('dashboard.basicTier')}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center justify-center gap-1 mb-1"><Package className="w-4 h-4 text-primary" /><span className="text-lg font-bold">{stats.totalOrders}</span></div>
                  <p className="text-xs text-muted-foreground">{t('common.order')}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center justify-center gap-1 mb-1"><TrendingUp className="w-4 h-4 text-success" /><span className="text-lg font-bold">{stats.totalEarnings >= 1000 ? `${Math.round(stats.totalEarnings / 1000)}K` : stats.totalEarnings}</span></div>
                  <p className="text-xs text-muted-foreground">{t('dashboard.profit')}</p>
                </div>
                <button
                  onClick={() => navigate('/invoices')}
                  className="text-center p-3 rounded-xl transition-all active:scale-95 bg-primary/10 hover:bg-primary/20"
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Receipt className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs font-medium truncate text-primary">{t('dashboard.invoicesShort')}</p>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 active:scale-95 transition-all" aria-label={t('dashboard.accountShort')}>
                  <User className="w-5 h-5 text-primary" /><span className="text-xs font-medium">{t('dashboard.accountShort')}</span>
                </button>
                <button onClick={() => navigate('/settings')} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 active:scale-95 transition-all" aria-label={t('dashboard.settingsShort')}>
                  <Settings className="w-5 h-5 text-muted-foreground" /><span className="text-xs font-medium">{t('dashboard.settingsShort')}</span>
                </button>
                <button onClick={() => navigate('/help')} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 active:scale-95 transition-all" aria-label={t('dashboard.helpShort')}>
                  <HelpCircle className="w-5 h-5 text-muted-foreground" /><span className="text-xs font-medium">{t('dashboard.helpShort')}</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid - 4 cols on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 bg-gradient-primary text-white rounded-2xl shadow-glow border-0">
              <div className="flex items-center gap-2 mb-2"><Wallet className="h-5 w-5" /><span className="text-sm opacity-90">{t('dashboard.balance')}</span></div>
              <p className="text-2xl font-bold">{formatPrice(stats.walletBalance)}</p>
            </Card>
            <Card className="p-4 rounded-2xl shadow-card">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-5 w-5 text-success" /><span className="text-sm text-muted-foreground">{t('dashboard.earnings')}</span></div>
              <p className="text-2xl font-bold text-success">{formatPrice(stats.totalEarnings)}</p>
            </Card>
            <Card className="p-4 rounded-2xl shadow-card">
              <div className="flex items-center gap-2 mb-2"><Package className="h-5 w-5 text-primary" /><span className="text-sm text-muted-foreground">{t('dashboard.ordersLabel')}</span></div>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </Card>
            <Card className="p-4 rounded-2xl shadow-card">
              <div className="flex items-center gap-2 mb-2"><Clock className="h-5 w-5 text-amber-500" /><span className="text-sm text-muted-foreground">{t('dashboard.pendingLabel')}</span></div>
              <p className="text-2xl font-bold">{stats.pendingOrders}</p>
            </Card>
          </div>

          {/* Sales Report */}
          <SalesReportSection salesReport={salesReport} onDateRangeChange={setDateRange} />


          <Card className="p-4 rounded-2xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />{t('dashboard.orderStatus')}</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl"><p className="text-xl font-bold text-amber-700 dark:text-amber-400">{stats.pendingOrders}</p><p className="text-xs text-amber-600 dark:text-amber-500">{t('dashboard.waiting')}</p></div>
              <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl"><p className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats.processingOrders}</p><p className="text-xs text-blue-600 dark:text-blue-500">{t('dashboard.processingShort')}</p></div>
              <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-xl"><p className="text-xl font-bold text-green-700 dark:text-green-400">{stats.deliveredOrders}</p><p className="text-xs text-green-600 dark:text-green-500">{t('dashboard.completed')}</p></div>
              <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-xl"><p className="text-xl font-bold text-red-700 dark:text-red-400">{stats.cancelledOrders}</p><p className="text-xs text-red-600 dark:text-red-500">{t('dashboard.cancelledShort')}</p></div>
            </div>
          </Card>

          {/* Desktop: side-by-side chart + top products */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Chart */}
            <Card className="p-4 rounded-2xl shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />{t('dashboard.weeklyEarnings')}</h3>
              </div>
              <div className="h-48" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value: number) => [formatPrice(value), t('dashboard.profitTooltip')]} labelFormatter={(label) => label} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                    <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top Products */}
            {topProducts.length > 0 && (
              <Card className="p-4 rounded-2xl shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" />{t('dashboard.topSelling')}</h3>
                </div>
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm', index === 0 ? 'bg-gradient-primary text-white' : 'bg-muted text-muted-foreground')}>{index + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.orderCount} {t('common.order')}</p>
                      </div>
                      <span className="text-success font-bold text-sm">+{formatPrice(Math.round(product.revenue))}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Pending Earnings */}
          {stats.pendingEarnings > 0 && (
            <Card className="p-4 rounded-2xl shadow-card bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200 dark:border-amber-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" /></div>
                  <div><p className="text-sm text-amber-700 dark:text-amber-400">{t('dashboard.pendingEarnings')}</p><p className="text-xl font-bold text-amber-800 dark:text-amber-300">{formatPrice(stats.pendingEarnings)}</p></div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-amber-500" />
              </div>
            </Card>
          )}

          {/* Delivered Badge */}
          {stats.deliveredOrders > 0 && (
            <Card className="p-4 rounded-2xl shadow-card bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /></div>
                <div><p className="text-sm text-green-700 dark:text-green-400">{t('dashboard.deliveredOrdersBadge')}</p><p className="text-xl font-bold text-green-800 dark:text-green-300">{stats.deliveredOrders} {t('common.order')}</p></div>
              </div>
            </Card>
          )}
        </main>
      </PullToRefresh>
    </MerchantLayout>
  );
};

export default MerchantDashboard;
