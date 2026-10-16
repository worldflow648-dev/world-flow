import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Gift, ToggleLeft, ToggleRight, Loader2, Globe, Layers, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminAddons, useUpdateAddon, useDeleteAddon, AdminAddon } from '@/hooks/useAdminAddons';
import { useAllAddonScopes } from '@/hooks/useAddonScopes';
import AddonModal from '@/components/admin/AddonModal';
import { formatPrice } from '@/hooks/useCatalogData';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminAddons = () => {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const { data: addons, isLoading } = useAdminAddons();
  const { data: allScopes = [] } = useAllAddonScopes();
  const updateAddon = useUpdateAddon();
  const deleteAddon = useDeleteAddon();
  const isMobile = useIsMobile();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editAddon, setEditAddon] = useState<AdminAddon | null>(null);
  const [initialTab, setInitialTab] = useState<'details' | 'options' | 'visibility'>('details');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState<AdminAddon | null>(null);

  const scopeSummary = useMemo(() => {
    const map = new Map<string, { type: 'general' | 'category' | 'product'; count: number }>();
    for (const s of allScopes) {
      const cur = map.get(s.addon_id);
      if (!cur) map.set(s.addon_id, { type: s.scope_type, count: 1 });
      else map.set(s.addon_id, { type: cur.type === s.scope_type ? cur.type : 'product', count: cur.count + 1 });
    }
    return map;
  }, [allScopes]);

  const renderScopeBadge = (addonId: string) => {
    const info = scopeSummary.get(addonId);
    if (!info) {
      return (
        <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted" onClick={() => handleEditScope(addonId)}>
          <Globe className="w-3 h-3" /> عامة
        </Badge>
      );
    }
    if (info.type === 'category') {
      return (
        <Badge variant="outline" className="gap-1 cursor-pointer bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20" onClick={() => handleEditScope(addonId)}>
          <Layers className="w-3 h-3" /> {info.count} صنف
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 cursor-pointer bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20" onClick={() => handleEditScope(addonId)}>
        <Package className="w-3 h-3" /> {info.count} منتج
      </Badge>
    );
  };

  const handleAdd = () => { setEditAddon(null); setInitialTab('details'); setModalOpen(true); };
  const handleEdit = (addon: AdminAddon) => { setEditAddon(addon); setInitialTab('details'); setModalOpen(true); };
  const handleEditScope = (addonId: string) => {
    const addon = addons?.find(a => a.id === addonId);
    if (addon) { setEditAddon(addon); setInitialTab('visibility'); setModalOpen(true); }
  };

  const handleToggleActive = (addon: AdminAddon) => {
    updateAddon.mutate(
      { id: addon.id, is_active: !addon.is_active },
      {
        onSuccess: () => toast({ title: t('admin.common2.success'), description: addon.is_active ? t('admin.addons3.deactivatedToast') : t('admin.addons3.activatedToast') }),
        onError: (error) => toast({ title: t('admin.common2.error'), description: error.message, variant: 'destructive' }),
      }
    );
  };

  const handleDeleteClick = (addon: AdminAddon) => { setAddonToDelete(addon); setDeleteDialogOpen(true); };
  const handleConfirmDelete = () => {
    if (addonToDelete) {
      deleteAddon.mutate(addonToDelete.id, {
        onSuccess: () => { toast({ title: t('admin.common2.success'), description: t('admin.addons3.deletedToast') }); setDeleteDialogOpen(false); setAddonToDelete(null); },
        onError: (error) => toast({ title: t('admin.common2.error'), description: error.message, variant: 'destructive' }),
      });
    }
  };

  const activeAddons = addons?.filter(a => a.is_active) || [];
  const inactiveAddons = addons?.filter(a => !a.is_active) || [];

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.addons3.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.addons3.subtitle')}</p>
        </div>
        <Button onClick={handleAdd} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          {t('admin.addons3.addNew')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.addons3.totalAddons')}</p>
                <p className="text-2xl font-bold">{addons?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <ToggleRight className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.addons3.activeAddons')}</p>
                <p className="text-2xl font-bold">{activeAddons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <ToggleLeft className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('admin.addons3.inactiveAddons')}</p>
                <p className="text-2xl font-bold">{inactiveAddons.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.addons3.addonsList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : addons && addons.length > 0 ? (
            isMobile ? (
              <div className="space-y-3">
                {addons.map((addon) => (
                  <div key={addon.id} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        <span className="font-medium">{addon.name}</span>
                      </div>
                      <Badge
                        variant={addon.is_active ? 'default' : 'secondary'}
                        className={addon.is_active ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}
                      >
                        {addon.is_active ? t('admin.addons3.active') : t('admin.addons3.inactive')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-primary">{formatPrice(addon.price)}</span>
                      <div className="flex items-center gap-2">
                        {renderScopeBadge(addon.id)}
                        {addon.options && addon.options.length > 0 && (
                          <Badge variant="outline" className="bg-secondary">{t('admin.addons3.optionsCount', { count: addon.options.length })}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(addon)} disabled={updateAddon.isPending} className="flex-1">
                        {addon.is_active ? <><ToggleRight className="w-4 h-4 ml-1 text-green-600" /> {t('admin.addons3.disable')}</> : <><ToggleLeft className="w-4 h-4 ml-1" /> {t('admin.addons3.enable')}</>}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(addon)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(addon)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.addons3.name')}</TableHead>
                    <TableHead>{t('admin.addons3.nameEn')}</TableHead>
                    <TableHead>{t('admin.addons3.price')}</TableHead>
                    <TableHead>{t('admin.addons3.subOptions')}</TableHead>
                    <TableHead>الظهور</TableHead>
                    <TableHead>{t('admin.common2.status')}</TableHead>
                    <TableHead className="text-end">{t('admin.common2.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addons.map((addon) => (
                    <TableRow key={addon.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-primary" />
                          {addon.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground" dir="ltr">{addon.name_en || '-'}</TableCell>
                      <TableCell className="font-bold text-primary">{formatPrice(addon.price)}</TableCell>
                      <TableCell>
                        {addon.options && addon.options.length > 0 ? (
                          <Badge variant="outline" className="bg-secondary">{t('admin.addons3.optionsCount', { count: addon.options.length })}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{renderScopeBadge(addon.id)}</TableCell>
                      <TableCell>
                        <Badge variant={addon.is_active ? 'default' : 'secondary'} className={addon.is_active ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}>
                          {addon.is_active ? t('admin.addons3.active') : t('admin.addons3.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleToggleActive(addon)} disabled={updateAddon.isPending}>
                            {addon.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(addon)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(addon)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <div className="text-center py-12">
              <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl font-bold text-foreground">{t('admin.addons3.noAddons')}</p>
              <p className="text-muted-foreground mt-1">{t('admin.addons3.noAddonsHint')}</p>
              <Button onClick={handleAdd} className="mt-4">
                <Plus className="w-4 h-4 ml-2" />
                {t('admin.addons3.addFirst')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddonModal open={modalOpen} onOpenChange={setModalOpen} editAddon={editAddon} initialTab={initialTab} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.addons3.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.addons3.deleteDescription', { name: addonToDelete?.name || '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('admin.common2.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteAddon.isPending}>
              {deleteAddon.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {t('admin.common2.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAddons;
