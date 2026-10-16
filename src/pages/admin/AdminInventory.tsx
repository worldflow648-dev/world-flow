import { useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import AddProductModal from '@/components/admin/AddProductModal';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminProducts, getTotalStock, formatPrice, useDeleteProduct, AdminProduct } from '@/hooks/useAdminProducts';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/exportUtils';
import { AdminTableSearch } from '@/components/admin/AdminTableSearch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminInventory = () => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; productId: string; productName: string }>({ open: false, productId: '', productName: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const { data: products, isLoading, error } = useAdminProducts();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleEdit = (product: AdminProduct) => { setEditingProduct(product); setIsModalOpen(true); };

  const handleDelete = () => {
    deleteProduct.mutate(deleteConfirm.productId, {
      onSuccess: () => { toast({ title: t('admin.common.deleted'), description: `${deleteConfirm.productName}` }); setDeleteConfirm({ open: false, productId: '', productName: '' }); },
      onError: (error) => { toast({ title: t('admin.common.genericError'), description: error.message, variant: 'destructive' }); },
    });
  };

  const handleModalClose = (open: boolean) => { setIsModalOpen(open); if (!open) setEditingProduct(null); };

  const handleExport = useCallback(() => {
    if (!products) return;
    const exportData = products.map((product) => {
      const totalStock = getTotalStock(product.variants || []);
      return { name: product.name, category: product.category?.name || '-', stock: totalStock, merchant_price: product.merchant_price, wholesale_price: product.wholesale_price };
    });
    exportToCSV(exportData, 'inventory', [
      { key: 'name', label: t('admin.inventory.productName') },
      { key: 'category', label: t('admin.inventory.category') },
      { key: 'stock', label: t('admin.inventory.stock') },
      { key: 'merchant_price', label: t('admin.inventory.merchantPrice') },
      { key: 'wholesale_price', label: t('admin.inventory.wholesalePrice') },
    ]);
  }, [products, t]);

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: t('admin.inventory2.outOfStock'), color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    if (stock < 20) return { label: t('admin.inventory2.lowStock'), color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
    return { label: t('common.available'), color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
  };

  const filteredProducts = products?.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.name_en?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">{t('admin.common.genericError')}</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.inventory.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.inventory2.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AdminTableSearch placeholder={t('admin.inventory2.searchPlaceholder')} onSearch={setSearchQuery} className="w-full sm:w-56" />
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport} disabled={!products?.length} className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 ml-2 rtl:ml-2 ltr:mr-2" />
              {t('admin.common.export')}
            </Button>
            <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 ml-2 rtl:ml-2 ltr:mr-2" />
              {t('admin.inventory.addProduct')}
            </Button>
          </div>
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        isMobile ? (
          /* Mobile Cards */
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const totalStock = getTotalStock(product.variants || []);
              const stockStatus = getStockStatus(totalStock);
              const productImage = product.images?.[0] || '/placeholder.svg';
              return (
                <Card key={product.id} className="p-4">
                  <div className="flex gap-3">
                    <img src={productImage} alt={product.name} className="w-16 h-16 rounded-lg object-cover bg-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{product.category?.name || '-'}</Badge>
                        <Badge className={cn(stockStatus.color, 'text-xs')}>{totalStock} - {stockStatus.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-primary font-semibold">{formatPrice(product.merchant_price)}</span>
                        <span className="text-muted-foreground text-xs">{t('admin.inventory.wholesalePrice')}: {formatPrice(product.wholesale_price)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(product)} className="flex-1">
                      <Edit className="w-4 h-4 ml-1" />
                      {t('admin.common.edit')}
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteConfirm({ open: true, productId: product.id, productName: product.name })}>
                      <Trash2 className="w-4 h-4 ml-1" />
                      {t('admin.common.delete')}
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
                    <TableHead className="font-semibold">{t('admin.fields.image')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.inventory.productName')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.inventory.category')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.inventory.stock')}</TableHead>
                    <TableHead className="font-semibold">{t('admin.inventory.merchantPrice')}</TableHead>
                    <TableHead className="font-semibold bg-muted">
                      <span className="flex items-center gap-2">{t('admin.inventory.wholesalePrice')}</span>
                    </TableHead>
                    <TableHead className="font-semibold">{t('admin.orders.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => {
                    const totalStock = getTotalStock(product.variants || []);
                    const stockStatus = getStockStatus(totalStock);
                    const productImage = product.images?.[0] || '/placeholder.svg';
                    return (
                      <TableRow key={product.id} className={cn(index % 2 === 0 ? 'bg-card' : 'bg-muted/20', 'hover:bg-muted/50')}>
                        <TableCell><img src={productImage} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-muted" /></TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell><Badge variant="secondary">{product.category?.name || '-'}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{totalStock}</span>
                            <Badge className={stockStatus.color}>{stockStatus.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">{formatPrice(product.merchant_price)}</TableCell>
                        <TableCell className="bg-muted/50 font-medium text-muted-foreground">{formatPrice(product.wholesale_price)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm({ open: true, productId: product.id, productName: product.name })}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-card rounded-xl border border-border text-center py-8 text-muted-foreground">{t('admin.inventory2.noProducts')}</div>
      )}

      <AddProductModal open={isModalOpen} onOpenChange={handleModalClose} editProduct={editingProduct} />

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, productId: '', productName: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.common.confirmDeleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('admin.common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInventory;
