import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Package, Clock, AlertTriangle, CheckCircle, Gift, Sparkles, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PullToRefresh } from '@/components/PullToRefresh';
import {
  useStaffOrders,
  useStaffStats,
  useStaffCompletedOrders,
  getWaitingTime,
  statusConfig,
  StaffOrderItem,
  CompletedOrderItem,
} from '@/hooks/useStaffOrders';
import { cn } from '@/lib/utils';

type TierFilter = 'all' | 'basic' | 'professional';

const StaffJobQueue = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const { data: orders = [], isLoading: ordersLoading } = useStaffOrders();
  const { data: completedOrders = [], isLoading: completedLoading } = useStaffCompletedOrders();
  const { data: stats, isLoading: statsLoading } = useStaffStats();

  const filteredOrders = tierFilter === 'all' ? orders : orders.filter(o => o.merchantTier === tierFilter);
  const filteredCompleted = tierFilter === 'all' ? completedOrders : completedOrders.filter(o => o.merchantTier === tierFilter);

  const basicCount = orders.filter(o => o.merchantTier === 'basic' || !o.merchantTier).length;
  const proCount = orders.filter(o => o.merchantTier === 'professional').length;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['staff-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['staff-completed-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] }),
    ]);
  };

  const handleOrderClick = (order: StaffOrderItem) => {
    navigate(`/staff/order/${order.id}`);
  };

  const OrderCard = ({ order }: { order: StaffOrderItem }) => {
    const waitingTime = getWaitingTime(order.createdAt);
    const status = statusConfig[order.orderStatus];

    return (
      <Card
        className="p-4 cursor-pointer active:scale-[0.98] transition-transform border-2 border-border hover:border-primary/50"
        onClick={() => handleOrderClick(order)}
      >
        <div className="flex items-start justify-between mb-3">
          {/* Order ID - Large */}
          <div>
            <span className="text-2xl font-bold text-foreground">{order.orderNumber}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">{order.merchantName}</p>
              {order.merchantTier === 'professional' && (
                <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  محترف
                </Badge>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <Badge className={cn(status.bgColor, status.color, 'text-sm px-3 py-1')}>
            {status.label}
          </Badge>
        </div>

        {/* Product Info */}
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <p className="font-semibold text-foreground text-lg">{order.productName}</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-muted-foreground font-medium">
              المقاس: <span className="text-primary font-bold">{order.size}</span>
            </span>
            {order.color && (
              <span className="text-muted-foreground">
                اللون: <span className="font-medium">{order.color}</span>
              </span>
            )}
            {order.quantity > 1 && (
              <span className="text-muted-foreground">
                الكمية: <span className="font-bold text-primary">{order.quantity}</span>
              </span>
            )}
          </div>
        </div>

        {/* Add-ons Indicators */}
        {(order.hasGiftWrapping || order.hasSpecialPrint) && (
          <div className="flex gap-2 mb-3">
            {order.hasGiftWrapping && (
              <Badge className="bg-purple-600 text-white flex items-center gap-1">
                <Gift className="w-3 h-3" />
                تغليف
              </Badge>
            )}
            {order.hasSpecialPrint && (
              <Badge className="bg-indigo-600 text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                طباعة خاصة
              </Badge>
            )}
          </div>
        )}

        {/* Deposit Badge */}
        {order.depositAmount && order.depositAmount > 0 && (
          <div className="flex gap-2 mb-3">
            <Badge className={cn(
              order.depositVerified 
                ? 'bg-green-600 text-white' 
                : 'bg-amber-500 text-white',
              'flex items-center gap-1'
            )}>
              {order.depositVerified ? '✓ العربون مؤكد' : '⏳ العربون بانتظار التحقق'}
            </Badge>
          </div>
        )}

        {/* Waiting Time */}
        <div className="flex items-center gap-2">
          <Clock className={cn('w-4 h-4', waitingTime.isOverdue ? 'text-red-600' : 'text-muted-foreground')} />
          <span
            className={cn(
              'text-sm font-medium',
              waitingTime.isOverdue ? 'text-red-600' : 'text-muted-foreground'
            )}
          >
            {waitingTime.text}
          </span>
          {waitingTime.isOverdue && (
            <AlertTriangle className="w-4 h-4 text-red-600 mr-auto" />
          )}
        </div>
      </Card>
    );
  };

  // Completed order card component
  const CompletedOrderCard = ({ order }: { order: CompletedOrderItem }) => {
    const status = statusConfig[order.orderStatus];
    const completedDate = new Date(order.completedAt).toLocaleDateString('ar-IQ', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Card className="p-4 border-2 border-border opacity-80">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-xl font-bold text-foreground">{order.orderNumber}</span>
            <p className="text-sm text-muted-foreground mt-0.5">{order.merchantName}</p>
          </div>
          <Badge className={cn(status.bgColor, status.color, 'text-sm px-3 py-1')}>
            {status.label}
          </Badge>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <p className="font-medium text-foreground">{order.productName}</p>
          <div className="flex items-center gap-4 mt-1 text-sm">
            <span className="text-muted-foreground">
              المقاس: <span className="font-medium">{order.size}</span>
            </span>
            {order.color && (
              <span className="text-muted-foreground">
                اللون: <span className="font-medium">{order.color}</span>
              </span>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          أُنجز في: {completedDate}
        </div>
      </Card>
    );
  };

  const OrderCardSkeleton = () => (
    <Card className="p-4 border-2 border-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <div className="bg-muted/50 rounded-lg p-3 mb-3">
        <Skeleton className="h-6 w-48 mb-2" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </Card>
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
      <div className="p-4 space-y-4">
        {/* Daily Stats - Motivation Counter */}
        <Card className="bg-gradient-to-l from-green-600 to-green-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-green-100 text-sm">أنجزت اليوم</p>
                {statsLoading ? (
                  <Skeleton className="h-9 w-20 bg-white/20" />
                ) : (
                  <p className="text-3xl font-bold">{stats?.processedToday || 0} طلب</p>
                )}
              </div>
            </div>
            <div className="text-left">
              {statsLoading ? (
                <Skeleton className="h-5 w-16 bg-white/20" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-green-100">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">متبقي: {stats?.pendingCount || 0}</span>
                  </div>
                  {(stats?.issuesCount || 0) > 0 && (
                    <div className="flex items-center gap-2 text-yellow-300 mt-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">مشاكل: {stats?.issuesCount}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Tier Filter — Full-width segmented control */}
        <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-lg">
          {([
            { value: 'all' as TierFilter, label: 'الكل', count: orders.length },
            { value: 'basic' as TierFilter, label: 'عادي', count: basicCount },
            { value: 'professional' as TierFilter, label: 'محترف', count: proCount },
          ]).map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setTierFilter(value)}
              className={cn(
                'h-11 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                tierFilter === value
                  ? value === 'professional'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {value === 'professional' && <Crown className="w-4 h-4" />}
              {label}
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                tierFilter === value
                  ? value === 'professional'
                    ? 'bg-white/25'
                    : 'bg-muted'
                  : 'bg-muted-foreground/10'
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Tabs for filtering */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="pending" className="text-base font-medium">
              قائمة الانتظار ({filteredOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-base font-medium">
              المنجزة ({filteredCompleted.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {ordersLoading ? (
              <>
                <OrderCardSkeleton />
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </>
            ) : filteredOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-bold text-foreground">لا توجد طلبات معلقة</p>
                <p className="text-muted-foreground mt-1">أحسنت! أنجزت جميع المهام</p>
              </Card>
            ) : (
              filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-3">
            {completedLoading ? (
              <>
                <OrderCardSkeleton />
                <OrderCardSkeleton />
                <OrderCardSkeleton />
              </>
            ) : filteredCompleted.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-bold text-foreground">لا توجد طلبات منجزة</p>
                <p className="text-muted-foreground mt-1">ستظهر الطلبات المنجزة هنا (آخر 7 أيام)</p>
              </Card>
            ) : (
              filteredCompleted.map((order) => (
                <CompletedOrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefresh>
  );
};

export default StaffJobQueue;
