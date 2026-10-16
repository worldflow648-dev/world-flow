import { useState } from 'react';
import { useAdminBanners, useDeleteBanner, useUpdateBanner, type Banner } from '@/hooks/useAdminBanners';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import BannerModal from '@/components/admin/BannerModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminBanners = () => {
  const { t, dir } = useLanguage();
  const { data: banners, isLoading, isError } = useAdminBanners();
  const deleteBanner = useDeleteBanner();
  const updateBanner = useUpdateBanner();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateBanner.mutateAsync({ id: banner.id, updates: { is_active: !banner.is_active } });
      toast.success(banner.is_active ? t('admin.banners3.deactivated') : t('admin.banners3.activated'));
    } catch { toast.error(t('admin.common2.error')); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBanner.mutateAsync(deleteId);
      toast.success(t('admin.banners3.deletedToast'));
      setDeleteId(null);
    } catch { toast.error(t('admin.common2.error')); }
  };

  if (isError) return <div className="p-6 text-center text-destructive">{t('admin.banners3.loadFailed')}</div>;

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.banners3.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('admin.banners3.subtitle')}</p>
        </div>
        <Button onClick={() => { setEditingBanner(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 ml-2" />
          {t('admin.banners3.addBanner')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !banners?.length ? (
        <div className="text-center py-12 text-muted-foreground">{t('admin.banners3.noBannersHint')}</div>
      ) : isMobile ? (
        <div className="space-y-3">
          {banners.map(b => (
            <Card key={b.id} className="p-4 space-y-3">
              {b.image_url ? (
                <img src={b.image_url} alt="" className="w-full aspect-video object-cover rounded-lg" />
              ) : (
                <div className={`w-full aspect-video rounded-lg bg-gradient-to-l ${b.bg_gradient}`} />
              )}
              <div className="flex items-center justify-between">
                <Badge variant={b.is_active ? 'default' : 'secondary'}>
                  {b.is_active ? t('admin.common2.enabled') : t('admin.common2.disabled')}
                </Badge>
                <span className="text-xs text-muted-foreground">{t('admin.banners3.orderLabel')}: {b.sort_order}</span>
              </div>
              {b.link && <div className="text-xs text-muted-foreground truncate" dir="ltr">{b.link}</div>}
              <div className="flex gap-1 justify-end">
                <Button size="icon" variant="ghost" onClick={() => handleToggleActive(b)}>
                  {b.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditingBanner(b); setIsModalOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(b.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.common2.preview')}</TableHead>
              <TableHead>{t('admin.common2.status')}</TableHead>
              <TableHead>{t('admin.common2.order')}</TableHead>
              <TableHead>{t('admin.common2.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map(b => (
              <TableRow key={b.id}>
                <TableCell>
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="w-32 h-16 object-cover rounded-lg" />
                  ) : (
                    <div className={`w-32 h-16 rounded-lg bg-gradient-to-l ${b.bg_gradient}`} />
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={b.is_active ? 'default' : 'secondary'}>
                    {b.is_active ? t('admin.common2.enabled') : t('admin.common2.disabled')}
                  </Badge>
                </TableCell>
                <TableCell>{b.sort_order}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleToggleActive(b)}>
                      {b.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingBanner(b); setIsModalOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(b.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}


      <BannerModal open={isModalOpen} onOpenChange={setIsModalOpen} banner={editingBanner} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.banners3.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.banners3.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.common2.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t('admin.common2.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBanners;
