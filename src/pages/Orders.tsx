import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, ShoppingBag, Loader2, Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/EmptyState';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useMerchantOrders, useOrderStatusSubscription } from '@/hooks/useMerchantOrders';
import { useMerchantExpiredReturnsMap } from '@/hooks/useMerchantOrderReturn';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { MerchantLayout } from '@/components/MerchantLayout';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'pending' | 'processing' | 'printed' | 'shipped' | 'delivered' | 'returned' | 'resent' | 'cancelled';

const Orders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useMerchantOrders();
  const { data: expiredReturnsMap } = useMerchantExpiredReturnsMap();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useOrderStatusSubscription();

  const filterTabs: { key: FilterTab; label: string; emoji: string }[] = [
    { key: 'all', label: t('orders.filterAll'), emoji: '📦' },
    { key: 'pending', label: t('orders.filterPending'), emoji: '⏳' },
    { key: 'processing', label: t('orders.filterProcessing'), emoji: '✅' },
    { key: 'printed', label: t('orders.filterPrinted'), emoji: '📋' },
    { key: 'shipped', label: t('orders.filterShipped'), emoji: '🚚' },
    { key: 'delivered', label: t('orders.filterDelivered'), emoji: '📬' },
    { key: 'returned', label: t('orders.filterReturned'), emoji: '🔄' },
    { key: 'resent', label: t('orders.filterResent'), emoji: '📨' },
    { key: 'cancelled', label: t('orders.filterCancelled'), emoji: '⏸️' },
  ];

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
  }, [queryClient]);

  const statusFiltered = activeFilter === 'all' ? orders 
    : orders.filter(o => o.status === activeFilter);

  const filteredOrders = searchQuery.trim()
    ? statusFiltered.filter(o => o.order_number?.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : statusFiltered;

  const hasOrders = orders.length > 0;

  return (
    <MerchantLayout hideHeader>
      <div className="pb-24 md:pb-8 overflow-x-hidden">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center gap-2 py-4 px-4">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">{t('orders.title')}</h1>
          </div>

          {hasOrders && (
            <div className="relative px-4 pb-2">
              <Search className="absolute start-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('orders.searchPlaceholder')} className="ps-10 h-10 rounded-xl bg-card border-border/50" />
            </div>
          )}

          {hasOrders && (
            <div className="flex gap-2 px-4 pb-3 flex-nowrap overflow-x-auto hide-scrollbar">
              {filterTabs.map((tab) => (
                <button key={tab.key} onClick={() => setActiveFilter(tab.key)} className={cn(
                  'flex items-center justify-center py-1.5 px-3 rounded-2xl text-xs font-medium whitespace-nowrap transition-all duration-300 press-effect',
                  activeFilter === tab.key ? 'bg-gradient-primary text-white shadow-glow' : 'bg-card text-muted-foreground shadow-card hover:text-foreground'
                )}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <PullToRefresh onRefresh={handleRefresh} className="min-h-[60vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="w-16 h-16 rounded-full bg-gradient-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-muted-foreground">{t('orders.loading')}</p>
            </div>
          ) : hasOrders ? (
            <div className="p-4 space-y-4">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <div key={order.id} className="animate-slide-up" style={{ animationDelay: `${index * 75}ms` }}>
                    <OrderCard order={order} expiredReturn={expiredReturnsMap?.get(order.id) ?? null} />
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">{t('orders.noOrdersInCategory')}</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState type="orders" className="min-h-[60vh]" action={
              <Button onClick={() => navigate('/')} className="rounded-2xl px-6 py-3 bg-gradient-primary hover:opacity-90 shadow-glow press-effect">
                <ShoppingBag className="h-4 w-4 me-2" />
                {t('common.browseProducts')}
              </Button>
            } />
          )}
        </PullToRefresh>
      </div>
    </MerchantLayout>
  );
};

export default Orders;
