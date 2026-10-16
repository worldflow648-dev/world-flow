import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderReturns, useUpdateReturnDeadline, useExpireReturn, useChargeMerchantWholesale, type OrderReturn } from '@/hooks/useOrderReturns';
import ResendReturnModal from '@/components/orders/ResendReturnModal';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { RotateCcw, Send, Clock, AlertTriangle, CheckCircle, XCircle, Search, CalendarClock, Wallet, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';

function getDaysRemaining(deadlineAt: string): number {
  const now = new Date();
  const deadline = new Date(deadlineAt);
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function canChargeWholesale(ret: { status: string; resent_at: string | null; wholesale_settled: boolean; order_total_wholesale_cost?: number }): boolean {
  if (ret.wholesale_settled) return false;
  if (!ret.order_total_wholesale_cost || ret.order_total_wholesale_cost <= 0) return false;
  if (ret.status !== 'resent' || !ret.resent_at) return false;
  return daysSince(ret.resent_at) >= 7;
}

const AdminReturns = () => {
  const { t, locale, dir } = useLanguage();
  const { data: returns, isLoading } = useOrderReturns();
  const updateDeadline = useUpdateReturnDeadline();
  const expireReturn = useExpireReturn();
  const chargeWholesale = useChargeMerchantWholesale();
  const isMobile = useIsMobile();

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    pending: { label: t('admin.returns2.pending'), icon: Clock, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    resent: { label: t('admin.returns2.resent'), icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
    expired: { label: t('admin.returns2.expired'), icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  };

  const currency = t('common.currency');
  const fmt = (n: number) => `${Number(n).toLocaleString(locale)} ${currency}`;

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [resendModal, setResendModal] = useState<{ open: boolean; returnId: string; orderId: string; orderNumber: string }>({ open: false, returnId: '', orderId: '', orderNumber: '' });
  const [editingDeadline, setEditingDeadline] = useState<{ id: string; days: number } | null>(null);
  const [chargeConfirm, setChargeConfirm] = useState<OrderReturn | null>(null);
  const [expireConfirm, setExpireConfirm] = useState<OrderReturn | null>(null);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!returns) return [];
    let list = returns;
    if (filter !== 'all') list = list.filter(r => r.status === filter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        r.order_number?.toLowerCase().includes(s) ||
        r.customer_name?.toLowerCase().includes(s) ||
        r.merchant_name?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [returns, filter, search]);

  const stats = useMemo(() => {
    if (!returns) return { total: 0, pending: 0, resent: 0, expired: 0 };
    return {
      total: returns.length,
      pending: returns.filter(r => r.status === 'pending').length,
      resent: returns.filter(r => r.status === 'resent').length,
      expired: returns.filter(r => r.status === 'expired').length,
    };
  }, [returns]);

  const handleDeadlineSave = (ret: OrderReturn) => {
    if (!editingDeadline) return;
    updateDeadline.mutate(
      { returnId: ret.id, deadlineDays: editingDeadline.days, createdAt: ret.created_at },
      {
        onSuccess: () => {
          toast({ title: t('admin.returns2.deadlineUpdated') });
          setEditingDeadline(null);
        },
      }
    );
  };

  const handleExpire = (ret: OrderReturn) => {
    const wholesale = Number(ret.order_total_wholesale_cost || 0);
    const canCharge = !ret.wholesale_settled && wholesale > 0;
    expireReturn.mutate(
      { returnId: ret.id, chargeWholesale: canCharge, wholesaleSettled: ret.wholesale_settled },
      {
        onSuccess: (res) => {
          if (res?.charged) {
            toast({
              title: t('admin.returns2.statusUpdatedAndCharged'),
              description: fmt(Number(res.amount)),
            });
          } else if (ret.wholesale_settled) {
            toast({ title: t('admin.returns2.statusUpdated'), description: t('admin.returns2.preCharged') });
          } else {
            toast({ title: t('admin.returns2.statusUpdated') });
          }
          setExpireConfirm(null);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : t('admin.returns2.executionFailed');
          toast({ title: t('admin.common.genericError'), description: msg, variant: 'destructive' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const renderReturnRow = (ret: OrderReturn) => {
    const days = getDaysRemaining(ret.deadline_at);
    const isUrgent = ret.status === 'pending' && days <= 3 && days > 0;
    const isOverdue = ret.status === 'pending' && days <= 0;
    const cfg = statusConfig[ret.status];
    const StatusIcon = cfg.icon;

    return (
      <TableRow key={ret.id} className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : isUrgent ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
        <TableCell className="font-medium">{ret.order_number}</TableCell>
        <TableCell>{ret.customer_name}</TableCell>
        <TableCell>{ret.merchant_name}</TableCell>
        <TableCell>
          <Badge className={cfg.color} variant="secondary">
            <StatusIcon className="w-3 h-3 mx-1" />
            {cfg.label}
          </Badge>
        </TableCell>
        <TableCell>
          {ret.status === 'pending' ? (
            <div className="flex items-center gap-1">
              {editingDeadline?.id === ret.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="w-16 h-8"
                    value={editingDeadline.days}
                    onChange={e => setEditingDeadline({ id: ret.id, days: Number(e.target.value) })}
                    min={1}
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleDeadlineSave(ret)}>✓</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDeadline(null)}>✕</Button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1 hover:underline cursor-pointer"
                  onClick={() => setEditingDeadline({ id: ret.id, days: ret.deadline_days })}
                >
                  {isOverdue ? (
                    <span className="text-destructive font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {t('admin.returns2.deadlineExpired')}</span>
                  ) : (
                    <span className={isUrgent ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                      {t('admin.returns2.daysRemaining', { days })}
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : ret.status === 'resent' ? (
            <span className="text-muted-foreground text-sm">{t('admin.returns2.sentOn', { date: new Date(ret.resent_at!).toLocaleDateString(locale) })}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {ret.status === 'resent' && ret.resent_to_name && (
            <span className="text-sm">{ret.resent_to_name}</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewOrderId(ret.order_id)}>
              <Eye className="w-3 h-3" /> {t('admin.returns2.details')}
            </Button>
            {ret.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1"
                  onClick={() => setResendModal({ open: true, returnId: ret.id, orderId: ret.order_id, orderNumber: ret.order_number || '' })}
                >
                  <Send className="w-3 h-3" /> {t('admin.returns2.resend')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setExpireConfirm(ret)}>
                  {t('admin.returns2.expireDeadline')}
                </Button>
              </>
            )}
            {canChargeWholesale(ret) && (
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => setChargeConfirm(ret)}>
                <Wallet className="w-3 h-3" /> {t('admin.returns2.chargeWholesale')}
              </Button>
            )}
            {ret.wholesale_settled && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                <Wallet className="w-3 h-3 mx-1" />
                {t('admin.returns2.chargedAmount', { amount: fmt(Number(ret.wholesale_charge_amount || 0)) })}
              </Badge>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderReturnCard = (ret: OrderReturn) => {
    const days = getDaysRemaining(ret.deadline_at);
    const isUrgent = ret.status === 'pending' && days <= 3 && days > 0;
    const isOverdue = ret.status === 'pending' && days <= 0;
    const cfg = statusConfig[ret.status];
    const StatusIcon = cfg.icon;

    return (
      <Card key={ret.id} className={isOverdue ? 'border-destructive' : isUrgent ? 'border-amber-400' : ''}>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <Badge className={cfg.color} variant="secondary">
              <StatusIcon className="w-3 h-3 mx-1" />
              {cfg.label}
            </Badge>
            <span className="font-bold text-sm">{ret.order_number}</span>
          </div>

          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">{t('admin.returns2.customer')}:</span> {ret.customer_name}</p>
            <p><span className="text-muted-foreground">{t('admin.returns2.merchant')}:</span> {ret.merchant_name}</p>
            {ret.status === 'pending' && (
              <p className="flex items-center gap-1">
                <CalendarClock className="w-4 h-4" />
                {isOverdue ? (
                  <span className="text-destructive font-bold">{t('admin.returns2.deadlineExpired')}</span>
                ) : (
                  <span className={isUrgent ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                    {t('admin.returns2.daysRemainingWithLimit', { days, limit: ret.deadline_days })}
                  </span>
                )}
              </p>
            )}
            {ret.status === 'resent' && ret.resent_to_name && (
              <p><span className="text-muted-foreground">{t('admin.returns2.sentTo')}:</span> {ret.resent_to_name}</p>
            )}
          </div>

          {ret.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 gap-1"
                onClick={() => setResendModal({ open: true, returnId: ret.id, orderId: ret.order_id, orderNumber: ret.order_number || '' })}
              >
                <Send className="w-3 h-3" /> {t('admin.returns2.resend')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setExpireConfirm(ret)}>
                {t('admin.returns2.expireDeadline')}
              </Button>
            </div>
          )}
          {canChargeWholesale(ret) && (
            <Button size="sm" variant="destructive" className="w-full gap-1 mt-2" onClick={() => setChargeConfirm(ret)}>
              <Wallet className="w-3 h-3" /> {t('admin.returns2.chargeFromMerchant')}
            </Button>
          )}
          {ret.wholesale_settled && (
            <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Wallet className="w-3 h-3 mx-1" />
              {t('admin.returns2.chargedAmount', { amount: fmt(Number(ret.wholesale_charge_amount || 0)) })}
            </Badge>
          )}
          <Button size="sm" variant="outline" className="w-full gap-1 mt-2" onClick={() => setViewOrderId(ret.order_id)}>
            <Eye className="w-3 h-3" /> {t('admin.returns2.details')}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <RotateCcw className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{t('admin.returns2.title')}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">{t('admin.returns2.total')}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{stats.pending}</p><p className="text-sm text-muted-foreground">{t('admin.returns2.pending')}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{stats.resent}</p><p className="text-sm text-muted-foreground">{t('admin.returns2.resent')}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{stats.expired}</p><p className="text-sm text-muted-foreground">{t('admin.returns2.expired')}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            placeholder={t('admin.returns2.searchPlaceholder')}
            className={dir === 'rtl' ? 'pr-10' : 'pl-10'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.returns2.filterAll')}</SelectItem>
            <SelectItem value="pending">{t('admin.returns2.pending')}</SelectItem>
            <SelectItem value="resent">{t('admin.returns2.resent')}</SelectItem>
            <SelectItem value="expired">{t('admin.returns2.expired')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RotateCcw className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('admin.returns2.noReturns')}</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map(renderReturnCard)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.returns2.orderNumber')}</TableHead>
                  <TableHead>{t('admin.returns2.customer')}</TableHead>
                  <TableHead>{t('admin.returns2.merchant')}</TableHead>
                  <TableHead>{t('admin.returns2.status')}</TableHead>
                  <TableHead>{t('admin.returns2.deadline')}</TableHead>
                  <TableHead>{t('admin.returns2.sentTo')}</TableHead>
                  <TableHead>{t('admin.returns2.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(renderReturnRow)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ResendReturnModal
        returnId={resendModal.returnId}
        orderId={resendModal.orderId}
        orderNumber={resendModal.orderNumber}
        open={resendModal.open}
        onClose={() => setResendModal({ open: false, returnId: '', orderId: '', orderNumber: '' })}
      />

      <OrderDetailModal
        orderId={viewOrderId}
        open={!!viewOrderId}
        onClose={() => setViewOrderId(null)}
      />

      <AlertDialog open={!!chargeConfirm} onOpenChange={(o) => !o && setChargeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.returns2.chargeFromMerchant')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.returns2.chargeDescription', {
                amount: fmt(Number(chargeConfirm?.order_total_wholesale_cost || 0)),
                merchant: chargeConfirm?.merchant_name || '',
                order: chargeConfirm?.order_number || '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('admin.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!chargeConfirm) return;
                chargeWholesale.mutate(chargeConfirm.id, {
                  onSuccess: (amount) => {
                    toast({ title: t('admin.returns2.chargedSuccess'), description: fmt(Number(amount)) });
                    setChargeConfirm(null);
                  },
                  onError: (err: unknown) => {
                    const msg = err instanceof Error ? err.message : t('admin.returns2.chargedFailed');
                    toast({ title: t('admin.common.genericError'), description: msg, variant: 'destructive' });
                  },
                });
              }}
              disabled={chargeWholesale.isPending}
            >
              {chargeWholesale.isPending ? t('admin.returns2.chargingInProgress') : t('admin.returns2.chargeConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!expireConfirm} onOpenChange={(o) => !o && setExpireConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.returns2.expireTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                if (!expireConfirm) return null;
                const wholesale = Number(expireConfirm.order_total_wholesale_cost || 0);
                if (expireConfirm.wholesale_settled) return t('admin.returns2.expireOnly');
                if (wholesale <= 0) return t('admin.returns2.expireNoWholesale');
                return t('admin.returns2.expireWithCharge', { amount: fmt(wholesale) });
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('admin.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => expireConfirm && handleExpire(expireConfirm)}
              disabled={expireReturn.isPending}
            >
              {expireReturn.isPending ? t('admin.returns2.executingInProgress') : t('admin.returns2.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReturns;
