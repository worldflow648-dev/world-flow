import { useState, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calculator, Search, Download, Eye, TrendingUp, Users, FileText, Receipt, HandCoins, X, ArrowUpCircle, ArrowDownCircle, CalendarIcon,
} from 'lucide-react';
 import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   PieChart, Pie, Cell, Legend,
 } from 'recharts';
 import AccountingStatsCards from '@/components/admin/AccountingStatsCards';
 import OrderDetailModal from '@/components/admin/OrderDetailModal';
 import MerchantFinancialCard from '@/components/admin/MerchantFinancialCard';
import {
  useFinancialOverview, useMerchantFinancials, useOrdersFinancial,
  useTransactionLedger, useGovernorateRevenue, useDailyRevenue, useGovernorates,
  useMerchantSettlementOrders,
  useRevenueBreakdown, useAdminProfitBreakdown, useOutstandingBreakdown, useSettlementsBreakdown,
  type DeliveredOrderRow, type ExpenseRow, type OutstandingMerchantRow, type SettlementReceiptRow,
} from '@/hooks/useAdminAccounting';
import { useSettleMerchantBalance } from '@/hooks/useAdminMerchants';
import { useAdminSettlementReceipts } from '@/hooks/useSettlementReceipts';
import StatBreakdownDialog, { Pill, type StatCardKey } from '@/components/admin/StatBreakdownDialog';
import { statusConfig } from '@/types/orders';
import { exportToCSV } from '@/lib/exportUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
 
 const COLORS = ['hsl(142, 76%, 36%)', 'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(25, 95%, 53%)', 'hsl(346, 77%, 49%)', 'hsl(47, 96%, 53%)'];
 
 function formatPrice(price: number): string {
   return price.toLocaleString('ar-IQ');
 }
 
 function formatDate(dateString: string): string {
   return new Date(dateString).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
 }
 
 const AdminAccounting = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [orderMerchant, setOrderMerchant] = useState('all');
  const [orderGovernorate, setOrderGovernorate] = useState('all');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [txType, setTxType] = useState('all');
  const [txMerchant, setTxMerchant] = useState('all');
  const [txSearch, setTxSearch] = useState('');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const isMobile = useIsMobile();

  // Settlement dialog state
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementMerchant, setSettlementMerchant] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [amountEditable, setAmountEditable] = useState(false);
  const settleMutation = useSettleMerchantBalance();

  // Stat-card breakdown drawer
  const [breakdownCard, setBreakdownCard] = useState<StatCardKey | null>(null);
  const { data: revenueRows, isLoading: revenueLoading } = useRevenueBreakdown();
  const { data: profitData, isLoading: profitLoading } = useAdminProfitBreakdown();
  const { data: outstandingRows, isLoading: outstandingLoading } = useOutstandingBreakdown();
  const { data: settlementsBreakdown, isLoading: settlementsBreakdownLoading } = useSettlementsBreakdown();
 
   const { data: overview, isLoading: overviewLoading } = useFinancialOverview();
   const { data: merchants, isLoading: merchantsLoading } = useMerchantFinancials();
   const { data: orders, isLoading: ordersLoading } = useOrdersFinancial({
     status: orderStatus, merchantId: orderMerchant, governorate: orderGovernorate, search: orderSearch,
   });
  const { data: transactions, isLoading: txLoading } = useTransactionLedger({ type: txType, merchantId: txMerchant, dateFrom: txDateFrom || undefined, dateTo: txDateTo || undefined });

  // Client-side search filtering for transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!txSearch.trim()) return transactions;
    const q = txSearch.trim().toLowerCase();
    return transactions.filter(tx =>
      tx.merchant_name?.toLowerCase().includes(q) ||
      tx.order_number?.toLowerCase().includes(q) ||
      tx.description?.toLowerCase().includes(q)
    );
  }, [transactions, txSearch]);

  // Transaction summary stats
  const txSummary = useMemo(() => {
    const totalCredit = filteredTransactions.filter(t => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalDebit = filteredTransactions.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
    return { totalCredit, totalDebit, net: totalCredit - totalDebit, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const hasTxFilters = txSearch || txType !== 'all' || txMerchant !== 'all' || txDateFrom || txDateTo;

  const clearTxFilters = useCallback(() => {
    setTxSearch('');
    setTxType('all');
    setTxMerchant('all');
    setTxDateFrom('');
    setTxDateTo('');
  }, []);

  const handleExportTransactions = useCallback(() => {
    if (!filteredTransactions.length) return;
    const data = filteredTransactions.map(tx => ({
      date: formatDate(tx.created_at),
      merchant: tx.merchant_name,
      type: tx.type === 'credit' ? 'إيداع' : 'سحب',
      amount: tx.amount,
      description: tx.description || '',
      order_number: tx.order_number || '',
    }));
    exportToCSV(data, 'تقرير-المعاملات', [
      { key: 'date' as const, label: 'التاريخ', type: 'date' },
      { key: 'merchant' as const, label: 'التاجر' },
      { key: 'type' as const, label: 'النوع', type: 'badge' },
      { key: 'amount' as const, label: 'المبلغ', type: 'currency' },
      { key: 'description' as const, label: 'الوصف' },
      { key: 'order_number' as const, label: 'رقم الطلب' },
    ], { title: 'تقرير المعاملات' });
  }, [filteredTransactions]);
   const { data: governorateData } = useGovernorateRevenue();
   const { data: dailyData } = useDailyRevenue(30);
    const { data: governorates } = useGovernorates();
     const { data: settlements, isLoading: settlementsLoading } = useAdminSettlementReceipts();
     const { data: settlementOrders, isLoading: settlementOrdersLoading } = useMerchantSettlementOrders(settlementOpen ? settlementMerchant?.id || null : null);
    const filteredMerchants = merchants?.filter(m => m.name.toLowerCase().includes(merchantSearch.toLowerCase()));
 
   const handleExportOrders = () => {
     if (!orders) return;
     const data = orders.map(o => ({
       order_number: o.order_number, merchant_name: o.merchant_name || '', customer_name: o.customer_name,
       governorate: o.governorate, cost: o.total_wholesale_cost, price: o.final_retail_price,
       shipping: o.shipping_fee || 0, merchant_profit: o.net_profit,
       admin_profit: (o.final_retail_price || 0) - (o.total_wholesale_cost || 0) - (o.shipping_fee || 0) - (o.net_profit || 0),
       status: statusConfig[o.status as keyof typeof statusConfig]?.label || o.status, date: formatDate(o.created_at),
     }));
     exportToCSV(data, 'تقرير-الطلبات-المالي', [
       { key: 'order_number' as const, label: 'رقم الطلب' }, { key: 'merchant_name' as const, label: 'التاجر' },
       { key: 'customer_name' as const, label: 'العميل' }, { key: 'governorate' as const, label: 'المحافظة' },
       { key: 'cost' as const, label: 'التكلفة', type: 'currency' }, { key: 'price' as const, label: 'سعر البيع', type: 'currency' },
       { key: 'shipping' as const, label: 'الشحن', type: 'currency' }, { key: 'merchant_profit' as const, label: 'ربح التاجر', type: 'currency' },
       { key: 'admin_profit' as const, label: 'ربح الإدارة', type: 'currency' }, { key: 'status' as const, label: 'الحالة', type: 'badge' },
       { key: 'date' as const, label: 'التاريخ', type: 'date' },
     ], { title: 'تقرير الطلبات المالي' });
  };

  const handleOpenSettlement = (merchantId: string, merchantName: string, balance: number) => {
    setSettlementMerchant({ id: merchantId, name: merchantName, balance });
    setSettlementAmount(balance.toString());
    setAmountEditable(false);
    setSettlementOpen(true);
  };

  const handleSettleBalance = () => {
    if (!settlementMerchant) return;
    const amount = Number(settlementAmount);
    if (!amount || amount <= 0 || amount > settlementMerchant.balance) return;
    settleMutation.mutate(
      { merchantId: settlementMerchant.id, amount },
      {
        onSuccess: () => {
          toast.success(`تم تسوية ${amount.toLocaleString('ar-IQ')} د.ع لـ ${settlementMerchant.name}`);
          setSettlementOpen(false);
        },
        onError: (err: any) => {
          toast.error(err.message || 'فشلت عملية التسوية');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-primary/10 rounded-xl"><Calculator className="w-6 h-6 text-primary" /></div>
           <div>
             <h1 className="text-2xl font-bold">المحاسبة والتقارير المالية</h1>
             <p className="text-muted-foreground text-sm">تتبع الإيرادات والمصروفات وأرباح التجار</p>
           </div>
         </div>
         <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleExportOrders}>
           <Download className="w-4 h-4" />تصدير
         </Button>
       </div>
 
       <AccountingStatsCards data={overview} isLoading={overviewLoading} onCardClick={setBreakdownCard} />
 
       <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-1">
              <TrendingUp className="w-4 h-4" /><span className="hidden sm:inline">نظرة عامة</span>
            </TabsTrigger>
            <TabsTrigger value="merchants" className="gap-1">
              <Users className="w-4 h-4" /><span className="hidden sm:inline">التجار</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1">
              <FileText className="w-4 h-4" /><span className="hidden sm:inline">الطلبات</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1">
              <Receipt className="w-4 h-4" /><span className="hidden sm:inline">المعاملات</span>
            </TabsTrigger>
            <TabsTrigger value="settlements" className="gap-1">
              <HandCoins className="w-4 h-4" /><span className="hidden sm:inline">التسويات</span>
            </TabsTrigger>
          </TabsList>
 
         {/* Overview Tab */}
         <TabsContent value="overview" className="space-y-6 mt-6">
           <Card>
             <CardHeader><CardTitle>الإيرادات والأرباح (آخر 30 يوم)</CardTitle></CardHeader>
             <CardContent>
               {dailyData && dailyData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                   <AreaChart data={dailyData}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' })} />
                     <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                     <Tooltip formatter={(value: number) => `${formatPrice(value)} د.ع`} labelFormatter={(label) => formatDate(label)} />
                     <Area type="monotone" dataKey="revenue" name="الإيرادات" stackId="1" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.3} />
                     <Area type="monotone" dataKey="profit" name="الأرباح" stackId="2" stroke="hsl(221, 83%, 53%)" fill="hsl(221, 83%, 53%)" fillOpacity={0.3} />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-[200px] flex items-center justify-center text-muted-foreground">لا توجد بيانات متاحة</div>
               )}
             </CardContent>
           </Card>
 
           <div className="grid md:grid-cols-2 gap-6">
             <Card>
               <CardHeader><CardTitle>الإيرادات حسب المحافظة</CardTitle></CardHeader>
               <CardContent>
                 {governorateData && governorateData.length > 0 ? (
                   <ResponsiveContainer width="100%" height={250}>
                     <PieChart>
                       <Pie data={governorateData.slice(0, 6)} dataKey="revenue" nameKey="governorate" cx="50%" cy="50%" outerRadius={isMobile ? 60 : 80} label={isMobile ? undefined : ({ name }) => name}>
                         {governorateData.slice(0, 6).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                       </Pie>
                       <Tooltip formatter={(value: number) => `${formatPrice(value)} د.ع`} />
                       <Legend />
                     </PieChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="h-[250px] flex items-center justify-center text-muted-foreground">لا توجد بيانات متاحة</div>
                 )}
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader><CardTitle>أفضل التجار</CardTitle></CardHeader>
               <CardContent>
                 {merchantsLoading ? (
                   <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                 ) : merchants && merchants.length > 0 ? (
                   <div className="space-y-3">
                     {merchants.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map((merchant, index) => (
                       <div key={merchant.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                         <div className="flex items-center gap-3">
                           <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{index + 1}</span>
                           <span className="font-medium">{merchant.name}</span>
                         </div>
                         <span className="font-bold text-primary">{formatPrice(merchant.totalRevenue)} د.ع</span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="h-[200px] flex items-center justify-center text-muted-foreground">لا يوجد تجار</div>
                 )}
               </CardContent>
             </Card>
           </div>
         </TabsContent>
 
         {/* Merchants Tab */}
         <TabsContent value="merchants" className="space-y-4 mt-6">
           <div className="relative">
             <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input placeholder="بحث عن تاجر..." value={merchantSearch} onChange={(e) => setMerchantSearch(e.target.value)} className="pr-10" />
           </div>
           {merchantsLoading ? (
             <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
           ) : filteredMerchants && filteredMerchants.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {filteredMerchants.map((merchant) => <MerchantFinancialCard key={merchant.id} merchant={merchant} onSettle={handleOpenSettlement} />)}
             </div>
           ) : (
             <div className="text-center py-12 text-muted-foreground">لا يوجد تجار</div>
           )}
         </TabsContent>
 
         {/* Orders Tab */}
         <TabsContent value="orders" className="space-y-4 mt-6">
           <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative flex-1">
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input placeholder="بحث برقم الطلب أو اسم العميل..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="pr-10" />
             </div>
             <div className="flex flex-wrap gap-3">
               <Select value={orderStatus} onValueChange={setOrderStatus}>
                 <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="pending">قيد المراجعة</SelectItem>
                    <SelectItem value="processing">تمت الموافقة</SelectItem>
                    <SelectItem value="printed">تم التجهيز</SelectItem>
                    <SelectItem value="shipped">تم الشحن</SelectItem>
                    <SelectItem value="delivered">تم التسليم</SelectItem>
                    <SelectItem value="returned">راجع</SelectItem>
                    <SelectItem value="cancelled">مؤجل</SelectItem>
                 </SelectContent>
               </Select>
               <Select value={orderMerchant} onValueChange={setOrderMerchant}>
                 <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="التاجر" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">كل التجار</SelectItem>
                   {merchants?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                 </SelectContent>
               </Select>
               <Select value={orderGovernorate} onValueChange={setOrderGovernorate}>
                 <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="المحافظة" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">كل المحافظات</SelectItem>
                   {governorates?.map((g) => <SelectItem key={g.id} value={g.name_ar}>{g.name_ar}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
           </div>
 
           {ordersLoading ? (
             <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
           ) : orders && orders.length > 0 ? (
             isMobile ? (
               /* Mobile Order Cards */
               <div className="space-y-3">
                 {orders.map((order) => {
                   const adminProfit = (order.final_retail_price || 0) - (order.total_wholesale_cost || 0) - (order.net_profit || 0);
                   return (
                     <Card key={order.id} className="p-4 space-y-2">
                       <div className="flex items-start justify-between">
                         <span className="font-mono text-sm">{order.order_number}</span>
                         {order.status && (
                           <Badge className={`${statusConfig[order.status as keyof typeof statusConfig]?.bgClass} ${statusConfig[order.status as keyof typeof statusConfig]?.textClass}`}>
                             {statusConfig[order.status as keyof typeof statusConfig]?.label}
                           </Badge>
                         )}
                       </div>
                       <div className="grid grid-cols-2 gap-1 text-sm">
                         <div><span className="text-muted-foreground">التاجر: </span>{order.merchant_name}</div>
                         <div><span className="text-muted-foreground">العميل: </span>{order.customer_name}</div>
                         <div><span className="text-muted-foreground">التكلفة: </span><span className="text-red-600 dark:text-red-400">{formatPrice(order.total_wholesale_cost)}</span></div>
                         <div><span className="text-muted-foreground">السعر: </span><span className="font-medium">{formatPrice(order.final_retail_price)}</span></div>
                         <div><span className="text-muted-foreground">الربح: </span><span className="text-primary font-bold">{formatPrice(adminProfit)}</span></div>
                         <div><span className="text-muted-foreground">الشحن: </span>{formatPrice(order.shipping_fee || 0)}</div>
                       </div>
                       <Button variant="ghost" size="sm" onClick={() => setSelectedOrderId(order.id)} className="w-full mt-1">
                         <Eye className="w-4 h-4 ml-1" />عرض التفاصيل
                       </Button>
                     </Card>
                   );
                 })}
               </div>
             ) : (
               /* Desktop Table */
               <Card>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>الطلب</TableHead><TableHead>التاجر</TableHead><TableHead>العميل</TableHead>
                       <TableHead>التكلفة</TableHead><TableHead>السعر</TableHead><TableHead>الشحن</TableHead>
                       <TableHead>الربح</TableHead><TableHead>الحالة</TableHead><TableHead></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {orders.map((order) => {
                       const adminProfit = (order.final_retail_price || 0) - (order.total_wholesale_cost || 0) - (order.net_profit || 0);
                       return (
                         <TableRow key={order.id}>
                           <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                           <TableCell>{order.merchant_name}</TableCell>
                           <TableCell>{order.customer_name}</TableCell>
                           <TableCell className="text-red-600 dark:text-red-400">{formatPrice(order.total_wholesale_cost)}</TableCell>
                           <TableCell className="font-medium">{formatPrice(order.final_retail_price)}</TableCell>
                           <TableCell>{formatPrice(order.shipping_fee || 0)}</TableCell>
                           <TableCell className="text-primary font-bold">{formatPrice(adminProfit)}</TableCell>
                           <TableCell>
                             {order.status && (
                               <Badge className={`${statusConfig[order.status as keyof typeof statusConfig]?.bgClass} ${statusConfig[order.status as keyof typeof statusConfig]?.textClass}`}>
                                 {statusConfig[order.status as keyof typeof statusConfig]?.label}
                               </Badge>
                             )}
                           </TableCell>
                           <TableCell><Button variant="ghost" size="icon" onClick={() => setSelectedOrderId(order.id)}><Eye className="w-4 h-4" /></Button></TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               </Card>
             )
           ) : (
             <div className="text-center py-8 text-muted-foreground">لا توجد طلبات</div>
           )}
         </TabsContent>
 
          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4 mt-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <ArrowDownCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs text-muted-foreground">إجمالي الإيداعات</span>
                </div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(txSummary.totalCredit)} <span className="text-xs font-normal">د.ع</span></p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <ArrowUpCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs text-muted-foreground">إجمالي السحوبات</span>
                </div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatPrice(txSummary.totalDebit)} <span className="text-xs font-normal">د.ع</span></p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">الصافي</span>
                </div>
                <p className="text-lg font-bold text-primary">{formatPrice(txSummary.net)} <span className="text-xs font-normal">د.ع</span></p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">عدد المعاملات</span>
                </div>
                <p className="text-lg font-bold">{txSummary.count}</p>
              </Card>
            </div>

            {/* Filter Bar */}
            <Card className="p-3">
              <div className="flex flex-col gap-3">
                {/* Search + Export row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالتاجر، رقم الطلب، أو الوصف..."
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className="pr-10 pl-10"
                    />
                    {txSearch && (
                      <Button variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setTxSearch('')}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" className="gap-2 shrink-0" onClick={handleExportTransactions} disabled={!filteredTransactions.length}>
                    <Download className="w-4 h-4" />تصدير CSV
                  </Button>
                </div>
                {/* Dropdowns + Date range */}
                <div className="flex flex-wrap gap-3 items-center">
                  <Select value={txType} onValueChange={setTxType}>
                    <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="النوع" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأنواع</SelectItem>
                      <SelectItem value="credit">إيداع</SelectItem>
                      <SelectItem value="debit">سحب</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={txMerchant} onValueChange={setTxMerchant}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="التاجر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل التجار</SelectItem>
                      {merchants?.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input type="date" value={txDateFrom} onChange={(e) => setTxDateFrom(e.target.value)} className="pr-8 w-[150px] text-sm" placeholder="من تاريخ" />
                    </div>
                    <span className="text-muted-foreground text-sm">—</span>
                    <div className="relative">
                      <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input type="date" value={txDateTo} onChange={(e) => setTxDateTo(e.target.value)} className="pr-8 w-[150px] text-sm" placeholder="إلى تاريخ" />
                    </div>
                  </div>
                  {hasTxFilters && (
                    <Button variant="ghost" size="sm" onClick={clearTxFilters} className="gap-1 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />مسح الفلاتر
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {txLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filteredTransactions.length > 0 ? (
              isMobile ? (
                /* Mobile Transaction Cards */
                <div className="space-y-3">
                  {filteredTransactions.map((tx) => (
                    <Card key={tx.id} className={`p-4 space-y-2 border-r-4 ${tx.type === 'credit' ? 'border-r-emerald-500' : 'border-r-red-500'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{tx.merchant_name}</span>
                        {tx.type === 'credit' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 text-xs">إيداع</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 text-xs">سحب</Badge>
                        )}
                      </div>
                      <div className={`font-bold text-xl ${tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{formatPrice(Math.abs(tx.amount))} <span className="text-sm font-normal">د.ع</span>
                      </div>
                      {tx.order_number && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">رقم الطلب:</span>
                          <span className="font-mono text-xs font-medium">{tx.order_number}</span>
                        </div>
                      )}
                      {tx.description && <div className="text-xs text-muted-foreground">{tx.description}</div>}
                      <div className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</div>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Desktop Table */
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>التاريخ</TableHead>
                        <TableHead>التاجر</TableHead>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الوصف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((tx) => (
                        <TableRow key={tx.id} className={tx.type === 'credit' ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : 'bg-red-50/40 dark:bg-red-950/10'}>
                          <TableCell className="text-sm">{formatDate(tx.created_at)}</TableCell>
                          <TableCell className="font-medium">{tx.merchant_name}</TableCell>
                          <TableCell className="font-mono text-xs">{tx.order_number || '—'}</TableCell>
                          <TableCell>
                            {tx.type === 'credit' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">إيداع</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">سحب</Badge>
                            )}
                          </TableCell>
                          <TableCell className={`font-bold ${tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {tx.type === 'credit' ? '+' : '-'}{formatPrice(Math.abs(tx.amount))} د.ع
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[250px] truncate">{tx.description || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {hasTxFilters ? 'لا توجد نتائج مطابقة للفلاتر المحددة' : 'لا توجد معاملات'}
              </div>
            )}
           </TabsContent>

          {/* Settlements Tab */}
           <TabsContent value="settlements" className="space-y-4 mt-6">
             {settlementsLoading ? (
               <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
             ) : settlements && settlements.length > 0 ? (
               <>
                 {/* Summary Card */}
                 <Card className="p-4">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                         <HandCoins className="w-5 h-5 text-primary" />
                       </div>
                       <div>
                         <p className="text-sm text-muted-foreground">إجمالي التسويات</p>
                         <p className="text-xl font-bold text-primary">{formatPrice(settlements.reduce((s, r) => s + r.amount, 0))} د.ع</p>
                       </div>
                     </div>
                     <Badge variant="secondary" className="text-sm">{settlements.length} تسوية</Badge>
                   </div>
                 </Card>

                 {isMobile ? (
                   <div className="space-y-3">
                     {settlements.map((s) => (
                       <Card key={s.id} className="p-4 space-y-3">
                         <div className="flex items-start justify-between">
                           <div className="space-y-0.5">
                             <span className="font-medium">{s.merchant_name}</span>
                             <p className="text-[10px] font-mono text-muted-foreground">#{s.id.slice(0, 8).toUpperCase()}</p>
                           </div>
                           <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">✅ مكتملة</Badge>
                         </div>
                         <div className="text-primary font-bold text-lg">{formatPrice(s.amount)} د.ع</div>
                         {s.description && <div className="text-sm text-muted-foreground">{s.description}</div>}
                         <div className="flex items-center justify-between text-xs text-muted-foreground">
                           <span>{formatDate(s.created_at)}</span>
                           {s.settled_by_name && <span>بواسطة: {s.settled_by_name}</span>}
                         </div>
                       </Card>
                     ))}
                   </div>
                 ) : (
                   <Card>
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>رقم الإيصال</TableHead>
                           <TableHead>التاريخ</TableHead>
                           <TableHead>التاجر</TableHead>
                           <TableHead>المبلغ</TableHead>
                           <TableHead>الوصف</TableHead>
                           <TableHead>بواسطة</TableHead>
                           <TableHead>الحالة</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {settlements.map((s) => (
                           <TableRow key={s.id}>
                             <TableCell className="font-mono text-xs">#{s.id.slice(0, 8).toUpperCase()}</TableCell>
                             <TableCell>{formatDate(s.created_at)}</TableCell>
                             <TableCell className="font-medium">{s.merchant_name}</TableCell>
                             <TableCell className="text-primary font-bold">{formatPrice(s.amount)} د.ع</TableCell>
                             <TableCell className="text-muted-foreground">{s.description}</TableCell>
                             <TableCell className="text-muted-foreground">{s.settled_by_name || '—'}</TableCell>
                             <TableCell>
                               <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">مكتملة</Badge>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </Card>
                 )}
               </>
             ) : (
               <div className="text-center py-8 text-muted-foreground">لا توجد تسويات</div>
             )}
           </TabsContent>
        </Tabs>
 
        <OrderDetailModal orderId={selectedOrderId} open={!!selectedOrderId} onClose={() => setSelectedOrderId(null)} />

        {/* Stat card breakdown dialogs */}
        {breakdownCard === 'revenue' && (
          <StatBreakdownDialog<DeliveredOrderRow>
            open
            onClose={() => setBreakdownCard(null)}
            title="إجمالي الإيرادات"
            formula="Σ السعر النهائي للطلبات المُسلّمة"
            total={revenueRows?.reduce((s, r) => s + r.final_retail_price, 0) || 0}
            rows={revenueRows}
            isLoading={revenueLoading}
            rowKey={(r) => r.id}
            onRowClick={(r) => { setBreakdownCard(null); setSelectedOrderId(r.id); }}
            searchPlaceholder="بحث برقم الطلب أو العميل أو التاجر..."
            columns={[
              { key: 'order', label: 'رقم الطلب', className: 'font-mono text-xs', render: (r) => r.order_number, searchValue: (r) => r.order_number },
              { key: 'merchant', label: 'التاجر', render: (r) => r.merchant_name, searchValue: (r) => r.merchant_name },
              { key: 'customer', label: 'العميل', render: (r) => r.customer_name, searchValue: (r) => r.customer_name },
              { key: 'date', label: 'تاريخ التسليم', className: 'text-muted-foreground text-xs', render: (r) => formatDate(r.delivered_at || r.created_at) },
              { key: 'price', label: 'السعر', className: 'text-left font-bold text-emerald-600 dark:text-emerald-400', render: (r) => `${formatPrice(r.final_retail_price)} د.ع` },
            ]}
          />
        )}

        {breakdownCard === 'cost' && (
          <StatBreakdownDialog<DeliveredOrderRow>
            open
            onClose={() => setBreakdownCard(null)}
            title="التكاليف"
            formula="Σ سعر الجملة للطلبات المُسلّمة"
            total={revenueRows?.reduce((s, r) => s + r.total_wholesale_cost, 0) || 0}
            rows={revenueRows}
            isLoading={revenueLoading}
            rowKey={(r) => r.id}
            onRowClick={(r) => { setBreakdownCard(null); setSelectedOrderId(r.id); }}
            searchPlaceholder="بحث برقم الطلب أو العميل أو التاجر..."
            columns={[
              { key: 'order', label: 'رقم الطلب', className: 'font-mono text-xs', render: (r) => r.order_number, searchValue: (r) => r.order_number },
              { key: 'merchant', label: 'التاجر', render: (r) => r.merchant_name, searchValue: (r) => r.merchant_name },
              { key: 'customer', label: 'العميل', render: (r) => r.customer_name, searchValue: (r) => r.customer_name },
              { key: 'date', label: 'تاريخ التسليم', className: 'text-muted-foreground text-xs', render: (r) => formatDate(r.delivered_at || r.created_at) },
              { key: 'cost', label: 'سعر الجملة', className: 'text-left font-bold text-red-600 dark:text-red-400', render: (r) => `${formatPrice(r.total_wholesale_cost)} د.ع` },
            ]}
          />
        )}

        {breakdownCard === 'adminProfit' && profitData && (
          <StatBreakdownDialog<DeliveredOrderRow | ExpenseRow>
            open
            onClose={() => setBreakdownCard(null)}
            title="صافي ربح الإدارة"
            formula="الإيرادات − التكاليف − الشحن − أرباح التجار − المصروفات"
            total={profitData.totals.adminNetProfit}
            rows={[...profitData.orders, ...profitData.expenses] as any}
            isLoading={profitLoading}
            rowKey={(r) => 'order_number' in r ? `o-${r.id}` : `e-${r.id}`}
            onRowClick={(r) => { if ('order_number' in r) { setBreakdownCard(null); setSelectedOrderId(r.id); } }}
            searchPlaceholder="بحث..."
            beforeTable={
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3"><p className="text-xs text-muted-foreground">الإيرادات</p><p className="font-bold text-emerald-700 dark:text-emerald-300">+{formatPrice(profitData.totals.revenue)}</p></div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3"><p className="text-xs text-muted-foreground">التكاليف</p><p className="font-bold text-red-700 dark:text-red-300">−{formatPrice(profitData.totals.cost)}</p></div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3"><p className="text-xs text-muted-foreground">الشحن</p><p className="font-bold text-amber-700 dark:text-amber-300">−{formatPrice(profitData.totals.shipping)}</p></div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3"><p className="text-xs text-muted-foreground">أرباح التجار</p><p className="font-bold text-purple-700 dark:text-purple-300">−{formatPrice(profitData.totals.merchantEarnings)}</p></div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3"><p className="text-xs text-muted-foreground">المصروفات</p><p className="font-bold text-orange-700 dark:text-orange-300">−{formatPrice(profitData.totals.expenses)}</p></div>
              </div>
            }
            columns={[
              { key: 'type', label: 'النوع', render: (r) => 'order_number' in r ? <Pill tone="success">طلب</Pill> : <Pill tone="warning">مصروف</Pill>, searchValue: (r) => 'order_number' in r ? 'طلب order' : 'مصروف expense' },
              { key: 'ref', label: 'المرجع', className: 'font-mono text-xs', render: (r) => 'order_number' in r ? r.order_number : (r.category || '—'), searchValue: (r) => 'order_number' in r ? r.order_number : r.category },
              { key: 'detail', label: 'التفاصيل', render: (r) => 'order_number' in r ? `${r.merchant_name} • ${r.customer_name}` : (r.description || '—'), searchValue: (r) => 'order_number' in r ? `${r.merchant_name} ${r.customer_name}` : (r.description || '') },
              { key: 'date', label: 'التاريخ', className: 'text-muted-foreground text-xs', render: (r) => 'order_number' in r ? formatDate(r.delivered_at || r.created_at) : formatDate(r.expense_date) },
              { key: 'amount', label: 'الأثر على الربح', className: 'text-left font-bold', render: (r) => {
                if ('order_number' in r) {
                  const v = r.admin_profit;
                  return <span className={v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{v >= 0 ? '+' : ''}{formatPrice(v)} د.ع</span>;
                }
                return <span className="text-red-600 dark:text-red-400">−{formatPrice(r.amount)} د.ع</span>;
              }},
            ]}
          />
        )}

        {breakdownCard === 'outstanding' && (
          <StatBreakdownDialog<OutstandingMerchantRow>
            open
            onClose={() => setBreakdownCard(null)}
            title="مستحق للتجار"
            formula="أرباح التجار − إجمالي ما تم تسويته"
            total={outstandingRows?.reduce((s, r) => s + r.outstanding, 0) || 0}
            rows={outstandingRows}
            isLoading={outstandingLoading}
            rowKey={(r) => r.merchant_id}
            searchPlaceholder="بحث عن تاجر..."
            columns={[
              { key: 'merchant', label: 'التاجر', className: 'font-medium', render: (r) => r.merchant_name, searchValue: (r) => r.merchant_name },
              { key: 'earned', label: 'الأرباح المستحقة', className: 'text-emerald-600 dark:text-emerald-400 font-medium', render: (r) => `${formatPrice(r.earned)} د.ع` },
              { key: 'settled', label: 'تم تسويته', className: 'text-purple-600 dark:text-purple-400 font-medium', render: (r) => `${formatPrice(r.settled)} د.ع` },
              { key: 'outstanding', label: 'الرصيد', className: 'text-left font-bold', render: (r) => {
                if (r.outstanding < 0) return <span className="text-amber-600 dark:text-amber-400">{formatPrice(r.outstanding)} د.ع <Pill tone="warning">دفع زائد</Pill></span>;
                if (r.outstanding === 0) return <span className="text-muted-foreground">{formatPrice(0)} د.ع <Pill tone="success">مسوّى</Pill></span>;
                return <span className="text-amber-600 dark:text-amber-400 font-bold">+{formatPrice(r.outstanding)} د.ع</span>;
              }},
            ]}
          />
        )}

        {breakdownCard === 'settled' && (
          <StatBreakdownDialog<SettlementReceiptRow>
            open
            onClose={() => setBreakdownCard(null)}
            title="إجمالي ما تم تسويته"
            formula="Σ مبالغ إيصالات التسوية"
            total={settlementsBreakdown?.reduce((s, r) => s + r.amount, 0) || 0}
            rows={settlementsBreakdown}
            isLoading={settlementsBreakdownLoading}
            rowKey={(r) => r.id}
            searchPlaceholder="بحث عن تاجر أو وصف..."
            columns={[
              { key: 'date', label: 'التاريخ', className: 'text-muted-foreground text-xs whitespace-nowrap', render: (r) => formatDate(r.created_at) },
              { key: 'merchant', label: 'التاجر', className: 'font-medium', render: (r) => r.merchant_name, searchValue: (r) => r.merchant_name },
              { key: 'amount', label: 'المبلغ', className: 'text-purple-600 dark:text-purple-400 font-bold', render: (r) => `${formatPrice(r.amount)} د.ع` },
              { key: 'desc', label: 'الوصف', className: 'text-muted-foreground text-xs', render: (r) => r.description || '—', searchValue: (r) => r.description || '' },
              { key: 'by', label: 'بواسطة', className: 'text-xs', render: (r) => r.settled_by_name || '—' },
            ]}
          />
        )}

        {/* Settlement Dialog */}
        <Dialog open={settlementOpen} onOpenChange={(open) => { if (!open) { setSettlementOpen(false); setAmountEditable(false); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تسوية رصيد التاجر</DialogTitle>
              <DialogDescription>
                {settlementMerchant?.name} — الرصيد المتاح: {settlementMerchant ? settlementMerchant.balance.toLocaleString('ar-IQ') : 0} د.ع
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>المبلغ المراد تسويته (د.ع)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    max={settlementMerchant?.balance || 0}
                    min={1}
                    placeholder="أدخل المبلغ"
                    disabled={!amountEditable}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => { if (amountEditable) { setSettlementAmount((settlementMerchant?.balance || 0).toString()); setAmountEditable(false); } else { setAmountEditable(true); } }}>
                    {amountEditable ? 'إعادة تعيين' : 'تغيير المبلغ'}
                  </Button>
                </div>
              </div>
              {settlementMerchant && Number(settlementAmount) > settlementMerchant.balance && (
                <p className="text-sm text-destructive">المبلغ أكبر من الرصيد المتاح</p>
              )}

              {/* Merchant Orders */}
              <div className="space-y-2">
                <Label>طلبات التاجر المُسلّمة</Label>
                {settlementOrdersLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : settlementOrders && settlementOrders.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {settlementOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className={order.isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}>
                            {order.isPaid ? 'مدفوع' : 'غير مدفوع'}
                          </Badge>
                          <span className="font-mono text-xs">{order.order_number}</span>
                          <span className="text-muted-foreground truncate max-w-[100px]">{order.customer_name}</span>
                        </div>
                        <span className="font-semibold text-primary whitespace-nowrap">{order.net_profit.toLocaleString('ar-IQ')} د.ع</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">لا توجد طلبات مُسلّمة</p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setSettlementOpen(false); setAmountEditable(false); }}>إلغاء</Button>
              <Button
                onClick={handleSettleBalance}
                disabled={!settlementAmount || Number(settlementAmount) <= 0 || Number(settlementAmount) > (settlementMerchant?.balance || 0) || settleMutation.isPending}
              >
                {settleMutation.isPending ? 'جارٍ التسوية...' : 'تأكيد التسوية'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
   );
 };
 
 export default AdminAccounting;
