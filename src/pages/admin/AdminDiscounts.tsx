 import { useState } from 'react';
 import { Plus, Tag, Copy, Trash2, Search, Store, Package, RefreshCw } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { Card } from '@/components/ui/card';
 import { Switch } from '@/components/ui/switch';
 import {
   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
 } from '@/components/ui/select';
 import {
   Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
 } from '@/components/ui/table';
 import {
   AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
   AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import { useToast } from '@/hooks/use-toast';
 import { useDiscountCodes, DiscountCode } from '@/hooks/useDiscountCodes';
import CreateDiscountModal from '@/components/admin/CreateDiscountModal';
import ExtendDiscountModal from '@/components/admin/ExtendDiscountModal';
 import StatCard from '@/components/admin/StatCard';
 import { format } from 'date-fns';
 import { ar } from 'date-fns/locale';
 import { useIsMobile } from '@/hooks/use-mobile';
 
 const AdminDiscounts = () => {
   const { toast } = useToast();
  const { discountCodes, isLoading, stats, createCode, isCreating, toggleCode, deleteCode, extendCode, isExtending } = useDiscountCodes();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [extendTarget, setExtendTarget] = useState<DiscountCode | null>(null);

  const isCodeRevivable = (code: DiscountCode) => {
    const isExpired = !!code.expires_at && new Date(code.expires_at) <= new Date();
    const isDepleted = !!code.max_uses && code.used_count >= code.max_uses;
    return isExpired || isDepleted;
  };
 
   const filteredCodes = discountCodes.filter(code => {
     const matchesSearch = code.code.toLowerCase().includes(search.toLowerCase());
     const isExpired = code.expires_at && new Date(code.expires_at) <= new Date();
     const isDepleted = code.max_uses && code.used_count >= code.max_uses;
     const isActive = code.is_active && !isExpired && !isDepleted;
     const matchesStatus = statusFilter === 'all' ||
       (statusFilter === 'active' && isActive) ||
       (statusFilter === 'inactive' && !code.is_active) ||
       (statusFilter === 'expired' && isExpired);
     const matchesScope = scopeFilter === 'all' || code.scope === scopeFilter;
     return matchesSearch && matchesStatus && matchesScope;
   });
 
   const copyToClipboard = (code: string) => {
     navigator.clipboard.writeText(code);
     toast({ title: 'تم النسخ', description: `تم نسخ الكود ${code}` });
   };
 
   const getCodeStatus = (code: DiscountCode) => {
     const isExpired = code.expires_at && new Date(code.expires_at) <= new Date();
     const isDepleted = code.max_uses && code.used_count >= code.max_uses;
     if (!code.is_active) return { label: 'متوقف', variant: 'secondary' as const };
     if (isExpired) return { label: 'منتهي', variant: 'destructive' as const };
     if (isDepleted) return { label: 'مستنفد', variant: 'outline' as const };
     return { label: 'نشط', variant: 'default' as const };
   };

   const formatPrice = (value: number) => new Intl.NumberFormat('ar-IQ').format(value) + ' د.ع';
   const formatDiscountValue = (code: DiscountCode) => code.discount_type === 'percentage' ? `${code.discount_value}%` : formatPrice(code.discount_value);
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
             <Tag className="w-5 h-5 text-primary" />
           </div>
           <div>
             <h1 className="text-2xl font-bold">أكواد الخصم</h1>
             <p className="text-sm text-muted-foreground">إدارة أكواد الخصم والعروض</p>
           </div>
         </div>
         <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
           <Plus className="w-4 h-4 ml-2" />
           إنشاء كود جديد
         </Button>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <StatCard title="إجمالي الأكواد" value={stats.total.toString()} icon={Tag} />
         <StatCard title="نشط" value={stats.active.toString()} icon={Tag} />
         <StatCard title="مرات الاستخدام" value={stats.totalUsed.toString()} icon={Tag} />
         <StatCard title="منتهي" value={stats.expired.toString()} icon={Tag} />
       </div>
 
       {/* Filters */}
       <div className="flex flex-col sm:flex-row gap-3">
         <div className="relative flex-1">
           <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <Input placeholder="بحث بالكود..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
         </div>
         <div className="flex gap-3">
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="flex-1 sm:w-[140px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">كل الحالات</SelectItem>
               <SelectItem value="active">نشط</SelectItem>
               <SelectItem value="inactive">متوقف</SelectItem>
               <SelectItem value="expired">منتهي</SelectItem>
             </SelectContent>
           </Select>
           <Select value={scopeFilter} onValueChange={setScopeFilter}>
             <SelectTrigger className="flex-1 sm:w-[140px]"><SelectValue placeholder="النطاق" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">كل النطاقات</SelectItem>
               <SelectItem value="store">كل المتجر</SelectItem>
               <SelectItem value="product">منتج محدد</SelectItem>
             </SelectContent>
           </Select>
         </div>
       </div>
 
       {/* Content */}
       {isLoading ? (
         <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
       ) : filteredCodes.length === 0 ? (
         <div className="bg-card rounded-xl border border-border text-center py-8 text-muted-foreground">لا توجد أكواد خصم</div>
       ) : isMobile ? (
         /* Mobile Cards */
         <div className="space-y-3">
           {filteredCodes.map((code) => {
             const status = getCodeStatus(code);
             return (
               <Card key={code.id} className="p-4 space-y-3">
                 <div className="flex items-start justify-between">
                   <div>
                     <span className="font-mono font-bold text-primary text-lg">{code.code}</span>
                     <div className="text-sm font-semibold mt-1">{formatDiscountValue(code)}</div>
                   </div>
                   <Badge variant={status.variant}>{status.label}</Badge>
                 </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {code.scope === 'store' ? (
                      <><Store className="w-4 h-4" /><span>كل المتجر</span></>
                    ) : (() => {
                      const list = code.products && code.products.length > 0 ? code.products : (code.product ? [code.product] : []);
                      const first = list[0];
                      const extra = list.length - 1;
                      return (
                        <>
                          <Package className="w-4 h-4" />
                          <span className="truncate">{first?.name || 'منتج محذوف'}</span>
                          {extra > 0 && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">+{extra}</span>}
                        </>
                      );
                    })()}
                  </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">الاستخدام: {code.used_count}{code.max_uses && ` / ${code.max_uses}`}</span>
                   {code.expires_at && <span className="text-muted-foreground text-xs">{format(new Date(code.expires_at), 'dd MMM yyyy', { locale: ar })}</span>}
                 </div>
                 <div className="flex items-center justify-between pt-2 border-t border-border">
                   <div className="flex items-center gap-2">
                     <span className="text-sm text-muted-foreground">نشط</span>
                     <Switch checked={code.is_active} onCheckedChange={(checked) => toggleCode({ id: code.id, is_active: checked })} />
                   </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(code.code)}><Copy className="w-4 h-4" /></Button>
                      {isCodeRevivable(code) && (
                        <Button variant="ghost" size="icon" onClick={() => setExtendTarget(code)} className="text-primary hover:text-primary"><RefreshCw className="w-4 h-4" /></Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(code.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                 </div>
               </Card>
             );
           })}
         </div>
       ) : (
         /* Desktop Table */
         <div className="bg-card rounded-xl border border-border overflow-hidden">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead className="text-right">الكود</TableHead>
                 <TableHead className="text-right">الخصم</TableHead>
                 <TableHead className="text-right">النطاق</TableHead>
                 <TableHead className="text-right">الاستخدام</TableHead>
                 <TableHead className="text-right">الانتهاء</TableHead>
                 <TableHead className="text-right">الحالة</TableHead>
                 <TableHead className="text-right">نشط</TableHead>
                 <TableHead className="text-right">إجراءات</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {filteredCodes.map((code) => {
                 const status = getCodeStatus(code);
                 return (
                   <TableRow key={code.id}>
                     <TableCell><span className="font-mono font-bold text-primary">{code.code}</span></TableCell>
                     <TableCell><span className="font-semibold">{formatDiscountValue(code)}</span></TableCell>
                      <TableCell>
                        {code.scope === 'store' ? (
                          <div className="flex items-center gap-2"><Store className="w-4 h-4 text-muted-foreground" /><span>كل المتجر</span></div>
                        ) : (() => {
                          const list = code.products && code.products.length > 0 ? code.products : (code.product ? [code.product] : []);
                          const first = list[0];
                          const extra = list.length - 1;
                          const tooltip = list.map(p => p.name).join('، ');
                          return (
                            <div className="flex items-center gap-2" title={tooltip}>
                              {first?.images?.[0] ? <img src={first.images[0]} alt={first.name} className="w-8 h-8 rounded-lg object-cover" /> : <Package className="w-4 h-4 text-muted-foreground" />}
                              <span className="truncate max-w-[100px]">{first?.name || 'منتج محذوف'}</span>
                              {extra > 0 && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">+{extra}</span>}
                            </div>
                          );
                        })()}
                      </TableCell>
                     <TableCell><span className="text-muted-foreground">{code.used_count}{code.max_uses && ` / ${code.max_uses}`}</span></TableCell>
                     <TableCell>{code.expires_at ? <span className="text-sm text-muted-foreground">{format(new Date(code.expires_at), 'dd MMM yyyy', { locale: ar })}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                     <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                     <TableCell><Switch checked={code.is_active} onCheckedChange={(checked) => toggleCode({ id: code.id, is_active: checked })} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(code.code)}><Copy className="w-4 h-4" /></Button>
                          {isCodeRevivable(code) && (
                            <Button variant="ghost" size="icon" onClick={() => setExtendTarget(code)} className="text-primary hover:text-primary"><RefreshCw className="w-4 h-4" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(code.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                   </TableRow>
                 );
               })}
             </TableBody>
           </Table>
         </div>
       )}
 
      <CreateDiscountModal open={createModalOpen} onOpenChange={setCreateModalOpen} onSubmit={async (data) => { await createCode(data); }} isLoading={isCreating} />

      <ExtendDiscountModal
        code={extendTarget}
        onClose={() => setExtendTarget(null)}
        onExtend={extendCode}
        isLoading={isExtending}
      />
 
       <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>حذف كود الخصم</AlertDialogTitle>
             <AlertDialogDescription>هل أنت متأكد من حذف هذا الكود؟ لا يمكن التراجع.</AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter className="gap-2">
             <AlertDialogCancel>إلغاء</AlertDialogCancel>
             <AlertDialogAction onClick={() => { if (deleteConfirmId) { deleteCode(deleteConfirmId); setDeleteConfirmId(null); } }} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 };
 
 export default AdminDiscounts;
