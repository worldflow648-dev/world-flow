import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminOrders, useBulkUpdateOrderStatus, useUpdateOrderStatus, useToggleOrderHidden, useDeleteOrder, formatPrice } from '@/hooks/useAdminOrders';
import { Eye, EyeOff, Truck, CheckCircle, XCircle, Clock, Package, Printer, RotateCcw, Download, AlertTriangle, ChevronDown, ShieldAlert, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminTableSearch } from '@/components/admin/AdminTableSearch';
import { exportToCSV, formatDateForExport } from '@/lib/exportUtils';
import { toast } from 'sonner';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Database } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOrderStatusLabel } from '@/lib/adminLabels';
import { useGovernorates } from '@/hooks/useCatalogData';

type OrderStatus = Database['public']['Enums']['order_status'];
const dangerousStatuses: OrderStatus[] = ['delivered', 'returned', 'cancelled'];

const statusColors: Record<OrderStatus, { color: string; icon: typeof Clock }> = {
  pending: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  processing: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  printed: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Printer },
  shipped: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
  delivered: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  returned: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: RotateCcw },
  cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  resent: { color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Send },
};

const allStatuses: OrderStatus[] = ['pending', 'processing', 'printed', 'shipped', 'delivered', 'returned', 'cancelled', 'resent'];

const AdminOrders = () => {
  const { data: orders = [], isLoading } = useAdminOrders();
  const { data: governorates = [] } = useGovernorates();
  const govLabel = useCallback((raw: string | null | undefined): string => {
    if (!raw) return '';
    const v = raw.trim().toLowerCase();
    const match = governorates.find(
      (g: any) =>
        g.name_ar?.toLowerCase() === v ||
        g.name_en?.toLowerCase() === v ||
        g.name?.toLowerCase() === v
    );
    return (match as any)?.name_ar || raw;
  }, [governorates]);
  const bulkUpdate = useBulkUpdateOrderStatus();
  const updateStatus = useUpdateOrderStatus();
  const toggleHidden = useToggleOrderHidden();
  const deleteOrder = useDeleteOrder();
  const { t, locale } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const initialStatusFilter = searchParams.get('filter') === 'needs_verification' ? 'needs_verification' : 'all';
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ open: boolean; orderId: string; newStatus: OrderStatus }>({ open: false, orderId: '', newStatus: 'pending' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: '' });
  const isMobile = useIsMobile();

  // Localized status config (label from i18n + static color/icon)
  const statusConfig = useMemo(() => {
    const cfg = {} as Record<OrderStatus, { label: string; color: string; icon: typeof Clock }>;
    (Object.keys(statusColors) as OrderStatus[]).forEach((s) => {
      cfg[s] = { label: getOrderStatusLabel(s, t), ...statusColors[s] };
    });
    return cfg;
  }, [t]);


  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam) {
      setViewOrderId(orderIdParam);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('orderId');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const needsVerification = useCallback((order: typeof orders[0]) => {
    return ((order.deposit_amount || 0) > 0 && !order.deposit_verified) ||
           ((order.merchant_payment_amount || 0) > 0 && !order.merchant_payment_verified);
  }, []);

  const handleSearch = useCallback((query: string) => { setSearchQuery(query); }, []);

  const filteredOrders = useMemo(() => {
    let result = orders;
    // Hidden view: only show hidden orders. Otherwise hide them from default lists.
    if (statusFilter === 'hidden') {
      result = result.filter(o => o.is_hidden);
    } else {
      result = result.filter(o => !o.is_hidden);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(q) ||
          order.customer_name.toLowerCase().includes(q) ||
          order.merchant?.full_name?.toLowerCase().includes(q) ||
          order.governorate.toLowerCase().includes(q) ||
          govLabel(order.governorate).toLowerCase().includes(q)
      );
    }
    if (tierFilter !== 'all') {
      result = result.filter(order => order.merchant_tier === tierFilter);
    }
    if (statusFilter === 'needs_verification') {
      result = result.filter(needsVerification);
    } else if (statusFilter !== 'all' && statusFilter !== 'hidden') {
      result = result.filter(order => order.status === statusFilter);
    }
    return result;
  }, [orders, searchQuery, tierFilter, statusFilter, needsVerification]);

  const pendingOrders = useMemo(() => filteredOrders.filter(o => o.status === 'pending'), [filteredOrders]);

  // Status KPI counts (from full orders list, excluding hidden)
  const statusCounts = useMemo(() => {
    const visible = orders.filter(o => !o.is_hidden);
    const counts = {} as Record<OrderStatus, number>;
    allStatuses.forEach(s => { counts[s] = 0; });
    visible.forEach(o => {
      if (o.status && counts[o.status as OrderStatus] !== undefined) {
        counts[o.status as OrderStatus]++;
      }
    });
    return { total: visible.length, ...counts };
  }, [orders]);

  const handleExport = useCallback(() => {
    const exportData = filteredOrders.map((order) => ({
      order_number: order.order_number,
      customer_name: order.customer_name,
      merchant_name: order.merchant?.full_name || '-',
      governorate: govLabel(order.governorate),
      total: order.final_retail_price,
      status: statusConfig[order.status || 'pending']?.label || order.status,
      created_at: formatDateForExport(order.created_at),
    }));
    exportToCSV(exportData, 'orders', [
      { key: 'order_number', label: t('admin.orders.orderNumber') },
      { key: 'customer_name', label: t('admin.orders2.customer') },
      { key: 'merchant_name', label: t('admin.orders2.merchant') },
      { key: 'governorate', label: t('admin.orders2.governorate') },
      { key: 'total', label: t('admin.orders2.total'), type: 'currency' },
      { key: 'status', label: t('admin.orders.status'), type: 'badge' },
      { key: 'created_at', label: t('admin.orders.date'), type: 'date' },
    ], { title: 'الطلبات' });
  }, [filteredOrders, statusConfig, t, govLabel]);

  const isOverdue = (createdAt: string, status: OrderStatus | null) => {
    if (status !== 'pending') return false;
    const hoursDiff = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateString));
  };

  const toggleSelection = (id: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === pendingOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(pendingOrders.map(o => o.id)));
    }
  };

  const handleBulkProcess = async () => {
    if (selectedOrders.size === 0) return;
    try {
      await bulkUpdate.mutateAsync({ orderIds: Array.from(selectedOrders), status: 'processing' });
      toast.success(t('admin.orders2.bulkSuccess', { count: selectedOrders.size }));
      setSelectedOrders(new Set());
    } catch {
      toast.error(t('admin.orders2.bulkFail'));
    }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (dangerousStatuses.includes(newStatus)) {
      setStatusConfirm({ open: true, orderId, newStatus });
    } else {
      applyStatusChange(orderId, newStatus);
    }
  };

  const applyStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
      toast.success(t('admin.orders2.statusUpdated', { status: statusConfig[newStatus].label }));
    } catch {
      toast.error(t('admin.orders2.statusUpdateFail'));
    }
  };

  const handleToggleHidden = async (orderId: string, currentlyHidden: boolean) => {
    try {
      await toggleHidden.mutateAsync({ orderId, hidden: !currentlyHidden });
      toast.success(t(currentlyHidden ? 'admin.orders2.unhideSuccess' : 'admin.orders2.hideSuccess'));
    } catch {
      toast.error(t('admin.orders2.hideFail'));
    }
  };

  const handleDeleteOrder = async () => {
    const id = deleteConfirm.orderId;
    setDeleteConfirm({ open: false, orderId: '' });
    try {
      await deleteOrder.mutateAsync(id);
      toast.success(t('admin.orders2.deleteSuccess'));
    } catch {
      toast.error(t('admin.orders2.deleteFail'));
    }
  };

  const requestDelete = (orderId: string, status: OrderStatus | null) => {
    if (status === 'delivered') {
      toast.error(t('admin.orders2.cannotDeleteDelivered'));
      return;
    }
    setDeleteConfirm({ open: true, orderId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.orders.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.orders2.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
           <AdminTableSearch placeholder={t('admin.orders2.searchPlaceholder')} onSearch={handleSearch} className="w-full sm:w-64" />
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:w-[160px]">
                <SelectValue placeholder={t('admin.orders2.orderStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.orders2.allStatuses')}</SelectItem>
                <SelectItem value="needs_verification">
                  <span className="flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
                    {t('admin.orders2.needsVerification')}
                  </span>
                </SelectItem>
                {allStatuses.map(s => (
                  <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                ))}
                <SelectItem value="hidden">
                  <span className="flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    {t('admin.orders2.hidden')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="flex-1 sm:w-[140px]">
                <SelectValue placeholder={t('admin.orders2.merchantTier')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.orders2.allTiers')}</SelectItem>
                <SelectItem value="basic">{t('admin.orders2.tierBasic')}</SelectItem>
                <SelectItem value="professional">{t('admin.orders2.tierProfessional')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={filteredOrders.length === 0}>
              <Download className="w-4 h-4 ml-2" />
              {t('admin.common.export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-3">
        {(() => {
          const totalActive = statusFilter === 'all';
          const TotalIcon = Package;
          return (
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'bg-card rounded-xl border shadow-sm p-3 text-start transition hover:shadow-md hover:border-primary/40',
                totalActive ? 'border-primary ring-2 ring-primary/30' : 'border-border'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <TotalIcon className="w-4 h-4" />
                </div>
                <span className="text-xs text-muted-foreground truncate">{t('admin.orders2.allStatuses')}</span>
              </div>
              <div className="text-xl font-bold text-foreground">{statusCounts.total}</div>
            </button>
          );
        })()}
        {allStatuses.map((s) => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'bg-card rounded-xl border shadow-sm p-3 text-start transition hover:shadow-md hover:border-primary/40',
                active ? 'border-primary ring-2 ring-primary/30' : 'border-border'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', cfg.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-muted-foreground truncate">{cfg.label}</span>
              </div>
              <div className="text-xl font-bold text-foreground">{statusCounts[s]}</div>
            </button>
          );
        })}
      </div>



      {/* Bulk Action Bar */}
      {selectedOrders.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between animate-slide-up">
          <span className="font-medium text-primary">{t('admin.orders2.bulkSelected', { count: selectedOrders.size })}</span>
          <Button onClick={handleBulkProcess} disabled={bulkUpdate.isPending} size="sm">
            {bulkUpdate.isPending ? t('admin.common.updating') : t('admin.orders2.bulkProcess')}
          </Button>
        </div>
      )}

      {/* Orders */}
      {filteredOrders.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm text-center py-16">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg">
            {searchQuery ? t('admin.orders2.noSearchResults') : t('admin.orders2.noOrders')}
          </p>
        </div>
      ) : isMobile ? (
        /* Mobile Cards */
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const status = order.status ? statusConfig[order.status] : statusConfig.pending;
            const overdue = isOverdue(order.created_at, order.status);
            return (
              <Card
                key={order.id}
                className={cn('p-4 space-y-3', overdue && 'ring-2 ring-red-500/50')}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-medium text-sm">{order.order_number}</span>
                    {order.merchant_tier === 'professional' && (
                      <Badge variant="outline" className="text-xs border-primary text-primary mr-2">PRO</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge className={status.color}>{status.label}</Badge>
                    {overdue && (
                      <Badge className="bg-red-500 text-white text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {t('admin.orders2.overdue')}
                      </Badge>
                    )}
                    {needsVerification(order) && (
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        {t('admin.orders2.verify')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('admin.orders2.customer')}: </span>
                    <span className="font-medium">{order.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('admin.orders2.merchant')}: </span>
                    <span>{order.merchant?.full_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('admin.orders2.governorate')}: </span>
                    <span>{govLabel(order.governorate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('admin.orders2.total')}: </span>
                    <span className="font-semibold text-primary">{formatPrice(order.final_retail_price)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setViewOrderId(order.id)} className="flex-1">
                    <Eye className="w-4 h-4 ml-1" />
                    {t('admin.orders2.view')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        {t('admin.orders2.changeStatus')}
                        <ChevronDown className="w-4 h-4 mr-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {allStatuses.filter(s => s !== order.status).map(s => (
                        <DropdownMenuItem key={s} onClick={() => handleStatusChange(order.id, s)} disabled={updateStatus.isPending}>
                          <Badge className={cn(statusConfig[s].color, 'ml-2')}>{statusConfig[s].label}</Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleHidden(order.id, order.is_hidden)}
                    disabled={toggleHidden.isPending}
                    className="flex-1"
                  >
                    {order.is_hidden ? <Eye className="w-4 h-4 ml-1" /> : <EyeOff className="w-4 h-4 ml-1" />}
                    {t(order.is_hidden ? 'admin.orders2.unhide' : 'admin.orders2.hide')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestDelete(order.id, order.status)}
                    disabled={deleteOrder.isPending || order.status === 'delivered'}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    {t('admin.orders2.delete')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Desktop Table */
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox checked={pendingOrders.length > 0 && selectedOrders.size === pendingOrders.length} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="text-start font-semibold">{t('admin.orders.orderNumber')}</TableHead>
                  <TableHead className="text-start font-semibold">{t('admin.orders2.customer')}</TableHead>
                  <TableHead className="text-start font-semibold">{t('admin.orders2.merchant')}</TableHead>
                  <TableHead className="text-start font-semibold">{t('admin.orders2.governorate')}</TableHead>
                  <TableHead className="text-start font-semibold">{t('admin.orders2.total')}</TableHead>
                  <TableHead className="text-start font-semibold">{t('admin.orders.status')}</TableHead>
                  <TableHead className="text-start font-semibold">{t('admin.orders.date')}</TableHead>
                  <TableHead className="text-start font-semibold">{t('admin.orders.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order, index) => {
                  const status = order.status ? statusConfig[order.status] : statusConfig.pending;
                  const overdue = isOverdue(order.created_at, order.status);
                  const isPending = order.status === 'pending';
                  return (
                    <TableRow
                      key={order.id}
                      className={cn(
                        index % 2 === 0 ? 'bg-card' : 'bg-muted/20',
                        'hover:bg-muted/50',
                        overdue && 'ring-2 ring-red-500/50 bg-red-50 dark:bg-red-950/20'
                      )}
                    >
                      <TableCell>
                        {isPending ? <Checkbox checked={selectedOrders.has(order.id)} onCheckedChange={() => toggleSelection(order.id)} /> : <div className="w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.merchant?.full_name || '-'}
                          {order.merchant_tier === 'professional' && <Badge variant="outline" className="text-xs border-primary text-primary">PRO</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{govLabel(order.governorate)}</TableCell>
                      <TableCell className="font-semibold text-primary">{formatPrice(order.final_retail_price)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={status.color}>{status.label}</Badge>
                          {overdue && <Badge className="bg-red-500 text-white text-xs gap-1"><AlertTriangle className="w-3 h-3" />{t('admin.orders2.overdue')}</Badge>}
                          {needsVerification(order) && <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs gap-1"><ShieldAlert className="w-3 h-3" />{t('admin.orders2.verify')}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewOrderId(order.id)}>
                            <Eye className="w-4 h-4 ml-1" />{t('admin.orders2.view')}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="px-2"><ChevronDown className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {allStatuses.filter(s => s !== order.status).map(s => (
                                <DropdownMenuItem key={s} onClick={() => handleStatusChange(order.id, s)} disabled={updateStatus.isPending}>
                                  <Badge className={cn(statusConfig[s].color, 'ml-2')}>{statusConfig[s].label}</Badge>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleHidden(order.id, order.is_hidden)}
                            disabled={toggleHidden.isPending}
                            title={t(order.is_hidden ? 'admin.orders2.unhide' : 'admin.orders2.hide')}
                          >
                            {order.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => requestDelete(order.id, order.status)}
                            disabled={deleteOrder.isPending || order.status === 'delivered'}
                            className="text-destructive hover:text-destructive"
                            title={order.status === 'delivered' ? t('admin.orders2.cannotDeleteDelivered') : t('admin.orders2.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <OrderDetailModal orderId={viewOrderId} open={!!viewOrderId} onClose={() => setViewOrderId(null)} />

      <AlertDialog open={statusConfirm.open} onOpenChange={(open) => !open && setStatusConfirm({ open: false, orderId: '', newStatus: 'pending' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.orders2.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.orders2.confirmDesc', { status: statusConfig[statusConfirm.newStatus].label })}
              {statusConfirm.newStatus === 'delivered' && t('admin.orders2.confirmDelivered')}
              {statusConfirm.newStatus === 'cancelled' && t('admin.orders2.confirmCancelled')}
              {statusConfirm.newStatus === 'returned' && t('admin.orders2.confirmReturned')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                applyStatusChange(statusConfirm.orderId, statusConfirm.newStatus);
                setStatusConfirm({ open: false, orderId: '', newStatus: 'pending' });
              }}
              className={statusConfirm.newStatus === 'cancelled' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {t('admin.common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, orderId: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.orders2.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.orders2.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.orders2.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminOrders;
