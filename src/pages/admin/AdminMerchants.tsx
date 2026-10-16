import { useState, useMemo, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminMerchants, formatWalletBalance, useToggleMerchantSuspension, useSettleMerchantBalance, useUpdateMerchantTier, useToggleMerchantHidden, useDeleteMerchant } from '@/hooks/useAdminMerchants';
import { useMerchantSettlementOrders } from '@/hooks/useAdminAccounting';
import { useAdminSettlementRequests, useUpdateSettlementRequest } from '@/hooks/useSettlementRequests';
import { UserX, UserCheck, Wallet, Phone, Users, Loader2, Download, Crown, Banknote, CheckCircle, XCircle, Hourglass, Eye, EyeOff, Trash2, Store, ExternalLink, Pencil, History } from 'lucide-react';
import { EditWalletModal } from '@/components/admin/EditWalletModal';
import { WalletHistoryModal } from '@/components/admin/WalletHistoryModal';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { AdminTableSearch } from '@/components/admin/AdminTableSearch';
import { exportToCSV, formatDateForExport } from '@/lib/exportUtils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

const tierColors: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  professional: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const AdminMerchants = () => {
  const { t, locale } = useLanguage();
  const { data: merchants, isLoading, error } = useAdminMerchants();
  const { toast } = useToast();
  const toggleSuspension = useToggleMerchantSuspension();
  const settleBalance = useSettleMerchantBalance();
  const updateTier = useUpdateMerchantTier();
  const toggleHidden = useToggleMerchantHidden();
  const deleteMerchant = useDeleteMerchant();
  const isMobile = useIsMobile();
  const { data: settlementRequests } = useAdminSettlementRequests();
  const updateSettlementRequest = useUpdateSettlementRequest();

  const tierLabels: Record<string, string> = {
    basic: t('admin.merchants2.tierBasic'),
    professional: t('admin.merchants2.tierProfessional'),
  };

  const [settlementDialog, setSettlementDialog] = useState<{ open: boolean; merchantId: string; merchantName: string; maxAmount: number }>({ open: false, merchantId: '', merchantName: '', maxAmount: 0 });
  const [settlementAmount, setSettlementAmount] = useState('');
  const [amountEditable, setAmountEditable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [tierChangeDialog, setTierChangeDialog] = useState<{ open: boolean; merchantId: string; merchantName: string; currentTier: string }>({ open: false, merchantId: '', merchantName: '', currentTier: '' });
  const [newTier, setNewTier] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; merchantId: string; merchantName: string }>({ open: false, merchantId: '', merchantName: '' });
  const [editWalletDialog, setEditWalletDialog] = useState<{ open: boolean; merchantId: string; merchantName: string; balance: number }>({ open: false, merchantId: '', merchantName: '', balance: 0 });
  const [historyDialog, setHistoryDialog] = useState<{ open: boolean; merchantId: string; merchantName: string }>({ open: false, merchantId: '', merchantName: '' });

  const { data: settlementOrders, isLoading: settlementOrdersLoading } = useMerchantSettlementOrders(settlementDialog.open ? settlementDialog.merchantId : null);

  const handleSearch = useCallback((query: string) => { setSearchQuery(query); }, []);

  const pendingSettlementMap = useMemo(() => {
    const map = new Map<string, number>();
    (settlementRequests || []).forEach((r) => map.set(r.merchant_id, Number(r.amount)));
    return map;
  }, [settlementRequests]);

  const filteredMerchants = useMemo(() => {
    if (!merchants) return [];
    let result = merchants;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(q) || m.phone?.toLowerCase().includes(q) || m.storeName?.toLowerCase().includes(q));
    }
    if (tierFilter !== 'all') {
      result = result.filter(m => (m.merchantTier || 'basic') === tierFilter);
    }
    if (!showHidden) {
      result = result.filter(m => !m.isHidden);
    }
    return [...result].sort((a, b) => {
      const aPending = pendingSettlementMap.has(a.id) ? 1 : 0;
      const bPending = pendingSettlementMap.has(b.id) ? 1 : 0;
      return bPending - aPending;
    });
  }, [merchants, searchQuery, tierFilter, showHidden, pendingSettlementMap]);

  const handleExport = useCallback(() => {
    if (!filteredMerchants) return;
    const exportData = filteredMerchants.map(m => ({
      name: m.name, phone: m.phone || '-',
      store_name: m.storeName || '-', store_link: m.storeLink || '-',
      tier: tierLabels[m.merchantTier || 'basic'] || tierLabels.basic,
      orders_count: m.ordersCount, wallet_balance: m.walletBalance,
      status: m.status === 'active' ? t('admin.merchants2.statusActive') : t('admin.merchants2.statusSuspended'),
      joined_at: formatDateForExport(m.joinedAt),
    }));
    exportToCSV(exportData, 'merchants', [
      { key: 'name', label: t('admin.merchants.name') },
      { key: 'phone', label: t('admin.merchants.phone') },
      { key: 'store_name', label: t('admin.merchants2.shopHeader') },
      { key: 'store_link', label: t('admin.merchants2.visitShop') },
      { key: 'tier', label: t('admin.merchants2.tierFilter') },
      { key: 'orders_count', label: t('admin.merchants2.ordersHeader') },
      { key: 'wallet_balance', label: t('admin.merchants2.walletHeader') },
      { key: 'status', label: t('admin.merchants.status') },
      { key: 'joined_at', label: t('admin.merchants2.joinedAt') },
    ]);
  }, [filteredMerchants, t, tierLabels]);

  const handleSuspend = (id: string, name: string, currentlyActive: boolean) => {
    toggleSuspension.mutate(
      { merchantId: id, suspend: currentlyActive },
      {
        onSuccess: () => toast({ title: currentlyActive ? t('admin.merchants2.deactivated') : t('admin.merchants2.activated'), description: name }),
        onError: (error) => toast({ title: t('admin.common.genericError'), description: error.message, variant: 'destructive' }),
      }
    );
  };

  const handleToggleHidden = (id: string, name: string, currentlyHidden: boolean) => {
    toggleHidden.mutate(
      { merchantId: id, hide: !currentlyHidden },
      {
        onSuccess: () => toast({ title: currentlyHidden ? t('admin.merchants2.unhidden') : t('admin.merchants2.hidden'), description: name }),
        onError: (error) => toast({ title: t('admin.common.genericError'), description: error.message, variant: 'destructive' }),
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteDialog.merchantId) return;
    deleteMerchant.mutate(deleteDialog.merchantId, {
      onSuccess: () => {
        toast({ title: t('admin.merchants2.deleted'), description: deleteDialog.merchantName });
        setDeleteDialog({ open: false, merchantId: '', merchantName: '' });
      },
      onError: (error) => toast({ title: t('admin.common.genericError'), description: error.message, variant: 'destructive' }),
    });
  };


  const handleOpenSettlement = (id: string, name: string, balance: number) => {
    setSettlementDialog({ open: true, merchantId: id, merchantName: name, maxAmount: balance });
    setSettlementAmount(balance.toString());
  };

  const handleSettleBalance = () => {
    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount <= 0) { toast({ title: t('admin.common.genericError'), description: t('admin.merchants2.enterValidAmount'), variant: 'destructive' }); return; }
    settleBalance.mutate(
      { merchantId: settlementDialog.merchantId, amount },
      {
        onSuccess: () => { toast({ title: t('admin.merchants2.settled'), description: `${amount.toLocaleString(locale)} ${t('common.currency')} • ${settlementDialog.merchantName}` }); setSettlementDialog({ open: false, merchantId: '', merchantName: '', maxAmount: 0 }); setSettlementAmount(''); },
        onError: (error) => toast({ title: t('admin.common.genericError'), description: error.message, variant: 'destructive' }),
      }
    );
  };

  const handleChangeTier = () => {
    if (!newTier) return;
    updateTier.mutate(
      { merchantId: tierChangeDialog.merchantId, tier: newTier },
      {
        onSuccess: () => { toast({ title: t('admin.merchants2.tierChanged'), description: `${tierChangeDialog.merchantName} → ${tierLabels[newTier] || newTier}` }); setTierChangeDialog({ open: false, merchantId: '', merchantName: '', currentTier: '' }); },
        onError: (error) => toast({ title: t('admin.common.genericError'), description: error.message, variant: 'destructive' }),
      }
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateStr));
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-foreground">{t('admin.merchants.title')}</h1><p className="text-muted-foreground mt-1">{t('admin.merchants2.subtitle')}</p></div>
        <Card className="border-destructive"><CardContent className="py-8 text-center"><p className="text-destructive">{t('admin.common.genericError')}</p></CardContent></Card>
      </div>
    );
  }

  const isEmpty = !isLoading && (!filteredMerchants || filteredMerchants.length === 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">{t('admin.merchants.title')}</h1><p className="text-muted-foreground mt-1">{t('admin.merchants2.subtitle')}</p></div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AdminTableSearch placeholder={t('admin.merchants2.searchPlaceholder')} onSearch={handleSearch} className="w-full sm:w-64" />
          <div className="flex gap-3">
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="flex-1 sm:w-40"><SelectValue placeholder={t('admin.merchants2.tierFilter')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.merchants2.allTiers')}</SelectItem>
                <SelectItem value="basic">{t('admin.merchants2.tierBasic')}</SelectItem>
                <SelectItem value="professional">{t('admin.merchants2.tierProfessional')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={showHidden ? 'default' : 'outline'} onClick={() => setShowHidden(v => !v)} size="sm" className="gap-2">
              {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {t('admin.merchants2.showHiddenToggle')}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={!filteredMerchants?.length}>
              <Download className="w-4 h-4 mx-2" />{t('admin.common.export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Settlement Requests */}
      {settlementRequests && settlementRequests.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-800 dark:text-amber-300">{t('admin.merchants2.pendingSettlementsTitle')} ({settlementRequests.length})</h3>
            </div>
            <div className="space-y-2">
              {settlementRequests.map((req) => {
                const merchant = merchants?.find(m => m.id === req.merchant_id);
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-background rounded-xl border">
                    <div>
                      <p className="font-medium text-sm">{merchant?.name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{formatWalletBalance(req.amount)} • {new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(req.created_at))}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        disabled={updateSettlementRequest.isPending}
                        onClick={() => {
                          updateSettlementRequest.mutate({ id: req.id, status: 'approved' }, {
                            onSuccess: () => {
                              toast({ title: t('admin.merchants2.approveRequest'), description: merchant?.name });
                              if (merchant) handleOpenSettlement(merchant.id, merchant.name, merchant.walletBalance);
                            },
                          });
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={updateSettlementRequest.isPending}
                        onClick={() => {
                          updateSettlementRequest.mutate({ id: req.id, status: 'rejected' }, {
                            onSuccess: () => toast({ title: t('admin.merchants2.rejectRequest'), description: merchant?.name }),
                          });
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merchants */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : isEmpty ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">{searchQuery ? t('admin.merchants2.noResultsFound') : t('admin.merchants2.noMerchants')}</h3>
            <p className="text-muted-foreground text-sm">{searchQuery ? t('admin.merchants2.noResultsHint') : t('admin.merchants2.noMerchantsHint')}</p>
          </div>
        </div>
      ) : isMobile ? (
        /* Mobile Cards */
        <div className="space-y-3">
          {filteredMerchants?.map((merchant) => {
            const pendingAmount = pendingSettlementMap.get(merchant.id);
            return (
            <Card key={merchant.id} className={cn('p-4 space-y-3', pendingAmount !== undefined && 'border-amber-300 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-900/10', merchant.isHidden && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Avatar className="h-12 w-12 shrink-0 border border-border">
                    {merchant.avatarUrl && <AvatarImage src={merchant.avatarUrl} alt={merchant.storeName || merchant.name} />}
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {(merchant.storeName || merchant.name || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      {merchant.storeName || <span className="text-muted-foreground italic font-normal text-sm">{t('admin.merchants2.shopNotSet')}</span>}
                      {pendingAmount !== undefined && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 animate-pulse gap-1">
                          <Hourglass className="w-3 h-3" />
                          {t('admin.merchants2.pendingSettlementBadge')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{merchant.name}</div>
                    {merchant.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Phone className="w-3 h-3" />{merchant.phone}
                      </div>
                    )}
                    {merchant.storeLink && (
                      <a href={merchant.storeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1 max-w-full truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{merchant.storeLink}</span>
                      </a>
                    )}
                    {pendingAmount !== undefined && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium">
                        {t('admin.merchants2.requestedAmount')}: {formatWalletBalance(pendingAmount)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge className={tierColors[merchant.merchantTier || 'basic'] || tierColors.basic}>
                    {tierLabels[merchant.merchantTier || 'basic'] || tierLabels.basic}
                  </Badge>
                  <Badge className={merchant.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}>
                    {merchant.status === 'active' ? t('admin.merchants2.statusActive') : t('admin.merchants2.statusSuspended')}
                  </Badge>
                  {merchant.isHidden && (
                    <Badge variant="outline" className="text-xs">{t('admin.merchants2.hiddenBadge')}</Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('admin.merchants2.ordersLabel')}</span>
                  <span className="font-semibold">{merchant.ordersCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('admin.merchants2.walletLabel')}</span>
                  <span className={cn('font-bold', merchant.walletBalance >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {formatWalletBalance(merchant.walletBalance)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.merchants2.joinedShort')}: {formatDate(merchant.joinedAt)}</div>
              <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
                <Button variant="outline" size="sm" onClick={() => handleOpenSettlement(merchant.id, merchant.name, merchant.walletBalance)} disabled={merchant.walletBalance <= 0} className="flex-1">
                  <Wallet className="w-4 h-4 mx-1" />{t('admin.merchants2.settle')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditWalletDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name, balance: merchant.walletBalance })}>
                  <Pencil className="w-4 h-4 mx-1" />تعديل الرصيد
                </Button>
                <Button variant="outline" size="sm" onClick={() => setHistoryDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name })}>
                  <History className="w-4 h-4 mx-1" />السجل
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setTierChangeDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name, currentTier: merchant.merchantTier || 'basic' }); setNewTier(merchant.merchantTier === 'professional' ? 'basic' : 'professional'); }} className="flex-1">
                  <Crown className="w-4 h-4 mx-1" />{t('admin.merchants2.tierShort')}
                </Button>
                <Button variant={merchant.status === 'active' ? 'destructive' : 'default'} size="sm" onClick={() => handleSuspend(merchant.id, merchant.name, merchant.status === 'active')} disabled={toggleSuspension.isPending}>
                  {merchant.status === 'active' ? <UserX className="w-4 h-4 mx-1" /> : <UserCheck className="w-4 h-4 mx-1" />}
                  {merchant.status === 'active' ? t('admin.merchants2.suspend') : t('admin.merchants2.activateShort')}
                </Button>
                {merchant.status === 'suspended' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleToggleHidden(merchant.id, merchant.name, merchant.isHidden)} disabled={toggleHidden.isPending}>
                      {merchant.isHidden ? <Eye className="w-4 h-4 mx-1" /> : <EyeOff className="w-4 h-4 mx-1" />}
                      {merchant.isHidden ? t('admin.merchants2.unhide') : t('admin.merchants2.hide')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name })}>
                      <Trash2 className="w-4 h-4 mx-1" />{t('admin.merchants2.delete')}
                    </Button>
                  </>
                )}
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
                  <TableHead className="font-semibold">{t('admin.merchants.name')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.merchants2.shopHeader')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.merchants.phone')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.merchants.tier')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.merchants2.ordersHeader')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.merchants2.walletHeader')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.merchants.status')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.merchants2.joinedAt')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.orders.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredMerchants?.map((merchant, index) => {
                    const pendingAmount = pendingSettlementMap.get(merchant.id);
                    return (
                    <TableRow key={merchant.id} className={cn(pendingAmount !== undefined ? 'bg-amber-50/40 dark:bg-amber-900/10' : index % 2 === 0 ? 'bg-card' : 'bg-muted/20', 'hover:bg-muted/50', merchant.isHidden && 'opacity-60')}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0 border border-border">
                            {merchant.avatarUrl && <AvatarImage src={merchant.avatarUrl} alt={merchant.storeName || merchant.name} />}
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                              {(merchant.storeName || merchant.name || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{merchant.storeName || merchant.name}</span>
                              {pendingAmount !== undefined && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 animate-pulse gap-1 cursor-default">
                                        <Hourglass className="w-3 h-3" />
                                        {t('admin.merchants2.pendingSettlementBadge')}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('admin.merchants2.requestedAmount')}: {formatWalletBalance(pendingAmount)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            {merchant.storeName && (
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">{merchant.name}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {merchant.storeLink ? (
                          <a href={merchant.storeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline max-w-[200px]">
                            <Store className="w-4 h-4 shrink-0" />
                            <span className="truncate">{merchant.storeLink}</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground/70 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>{merchant.phone ? <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{merchant.phone}</div> : <span className="text-muted-foreground/70">{t('admin.merchants2.phoneNotProvided')}</span>}</TableCell>
                      <TableCell><Badge className={tierColors[merchant.merchantTier || 'basic'] || tierColors.basic}>{tierLabels[merchant.merchantTier || 'basic'] || tierLabels.basic}</Badge></TableCell>
                      <TableCell className="font-semibold">{merchant.ordersCount}</TableCell>
                      <TableCell><span className={cn('font-bold', merchant.walletBalance >= 0 ? 'text-green-600' : 'text-red-600')}>{formatWalletBalance(merchant.walletBalance)}</span></TableCell>
                      <TableCell><Badge className={merchant.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}>{merchant.status === 'active' ? t('admin.merchants2.statusActive') : t('admin.merchants2.statusSuspended')}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(merchant.joinedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => handleOpenSettlement(merchant.id, merchant.name, merchant.walletBalance)} disabled={merchant.walletBalance <= 0}><Wallet className="w-4 h-4 mx-1" />{t('admin.merchants2.settle')}</Button>
                        <Button variant="outline" size="sm" onClick={() => setEditWalletDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name, balance: merchant.walletBalance })}><Pencil className="w-4 h-4 mx-1" />تعديل الرصيد</Button>
                        <Button variant="outline" size="sm" onClick={() => setHistoryDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name })}><History className="w-4 h-4 mx-1" />السجل</Button>
                        <Button variant="outline" size="sm" onClick={() => { setTierChangeDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name, currentTier: merchant.merchantTier || 'basic' }); setNewTier(merchant.merchantTier === 'professional' ? 'basic' : 'professional'); }}><Crown className="w-4 h-4 mx-1" />{t('admin.merchants2.changeTier')}</Button>
                        <Button variant={merchant.status === 'active' ? 'destructive' : 'default'} size="sm" onClick={() => handleSuspend(merchant.id, merchant.name, merchant.status === 'active')} disabled={toggleSuspension.isPending}>
                          {toggleSuspension.isPending ? <Loader2 className="w-4 h-4 mx-1 animate-spin" /> : merchant.status === 'active' ? <UserX className="w-4 h-4 mx-1" /> : <UserCheck className="w-4 h-4 mx-1" />}
                          {merchant.status === 'active' ? t('admin.merchants2.suspend') : t('admin.merchants2.activateShort')}
                        </Button>
                        {merchant.status === 'suspended' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleToggleHidden(merchant.id, merchant.name, merchant.isHidden)} disabled={toggleHidden.isPending}>
                              {merchant.isHidden ? <Eye className="w-4 h-4 mx-1" /> : <EyeOff className="w-4 h-4 mx-1" />}
                              {merchant.isHidden ? t('admin.merchants2.unhide') : t('admin.merchants2.hide')}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteDialog({ open: true, merchantId: merchant.id, merchantName: merchant.name })}>
                              <Trash2 className="w-4 h-4 mx-1" />{t('admin.merchants2.delete')}
                            </Button>
                          </>
                        )}
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

      {/* Settlement Dialog */}
      <Dialog open={settlementDialog.open} onOpenChange={(open) => { if (!open) { setSettlementDialog({ open: false, merchantId: '', merchantName: '', maxAmount: 0 }); setAmountEditable(false); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.merchants2.settleDialogTitle')}</DialogTitle>
            <DialogDescription>{t('admin.merchants2.settleDialogDesc', { name: settlementDialog.merchantName, max: formatWalletBalance(settlementDialog.maxAmount) })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('admin.merchants2.withdrawAmount')}</Label>
              <div className="flex gap-2">
                <Input id="amount" type="number" value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} max={settlementDialog.maxAmount} className="flex-1" disabled={!amountEditable} />
                <Button type="button" variant="outline" size="sm" onClick={() => { if (amountEditable) { setSettlementAmount(settlementDialog.maxAmount.toString()); setAmountEditable(false); } else { setAmountEditable(true); } }}>
                  {amountEditable ? t('admin.merchants2.resetAmount') : t('admin.merchants2.changeAmount')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.merchants2.deliveredOrders')}</Label>
              {settlementOrdersLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : settlementOrders && settlementOrders.length > 0 ? (
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {settlementOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={order.isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}>
                          {order.isPaid ? t('admin.merchants2.paid') : t('admin.merchants2.unpaid')}
                        </Badge>
                        <span className="font-mono text-xs">{order.order_number}</span>
                        <span className="text-muted-foreground truncate max-w-[100px]">{order.customer_name}</span>
                      </div>
                      <span className="font-semibold text-primary whitespace-nowrap">{order.net_profit.toLocaleString(locale)} {t('common.currency')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">{t('admin.merchants2.noDeliveredOrders')}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSettlementDialog({ open: false, merchantId: '', merchantName: '', maxAmount: 0 }); setAmountEditable(false); }}>{t('admin.common.cancel')}</Button>
            <Button onClick={handleSettleBalance} disabled={settleBalance.isPending}>{settleBalance.isPending && <Loader2 className="w-4 h-4 mx-2 animate-spin" />}{t('admin.merchants2.confirmSettle')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Change Dialog */}
      <Dialog open={tierChangeDialog.open} onOpenChange={(open) => !open && setTierChangeDialog({ open: false, merchantId: '', merchantName: '', currentTier: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.merchants2.tierChangeTitle')}</DialogTitle>
            <DialogDescription>{t('admin.merchants2.tierChangeDesc', { name: tierChangeDialog.merchantName, from: tierLabels[tierChangeDialog.currentTier] || tierChangeDialog.currentTier, to: tierLabels[newTier] || newTier })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.merchants2.newTier')}</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">{t('admin.merchants2.tierBasic')}</SelectItem>
                  <SelectItem value="professional">{t('admin.merchants2.tierProfessional')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierChangeDialog({ open: false, merchantId: '', merchantName: '', currentTier: '' })}>{t('admin.common.cancel')}</Button>
            <Button onClick={handleChangeTier} disabled={updateTier.isPending || newTier === tierChangeDialog.currentTier}>{updateTier.isPending && <Loader2 className="w-4 h-4 mx-2 animate-spin" />}{t('admin.merchants2.confirmTierChange')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, merchantId: '', merchantName: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.merchants2.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.merchants2.deleteConfirmDesc', { name: deleteDialog.merchantName })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMerchant.isPending}>{t('admin.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleteMerchant.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMerchant.isPending && <Loader2 className="w-4 h-4 mx-2 animate-spin" />}
              {t('admin.merchants2.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditWalletModal
        open={editWalletDialog.open}
        onOpenChange={(o) => setEditWalletDialog((d) => ({ ...d, open: o }))}
        merchantId={editWalletDialog.merchantId}
        merchantName={editWalletDialog.merchantName}
        currentBalance={editWalletDialog.balance}
      />
      <WalletHistoryModal
        open={historyDialog.open}
        onOpenChange={(o) => setHistoryDialog((d) => ({ ...d, open: o }))}
        merchantId={historyDialog.merchantId}
        merchantName={historyDialog.merchantName}
      />
    </div>
  );
};

export default AdminMerchants;

