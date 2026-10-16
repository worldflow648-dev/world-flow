import { useState } from 'react';
import { 
  Plus, Pencil, Trash2, Loader2, Package, Shirt, Coffee, Gift, Palette, Headphones, Watch, Sparkles,
  GripVertical, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAdminCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useToggleCategoryStatus, Category,
} from '@/hooks/useAdminCategories';
import { CategoryModal } from '@/components/admin/CategoryModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package, shirt: Shirt, coffee: Coffee, gift: Gift,
  palette: Palette, headphones: Headphones, watch: Watch, sparkles: Sparkles,
};

const AdminCategories = () => {
  const { t, dir } = useLanguage();
  const { data: categories, isLoading } = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const toggleStatus = useToggleCategoryStatus();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleOpenCreate = () => { setEditingCategory(null); setModalOpen(true); };
  const handleOpenEdit = (category: Category) => { setEditingCategory(category); setModalOpen(true); };

  const handleSave = (data: { name: string; name_en?: string; icon?: string; is_active: boolean; }) => {
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, ...data },
        {
          onSuccess: () => { toast.success(t('admin.categories3.updatedSuccess')); setModalOpen(false); },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createCategory.mutate(data, {
        onSuccess: () => { toast.success(t('admin.categories3.addedSuccess')); setModalOpen(false); },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleOpenDelete = (category: Category) => { setCategoryToDelete(category); setDeleteDialogOpen(true); };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    deleteCategory.mutate(categoryToDelete.id, {
      onSuccess: () => {
        toast.success(t('admin.categories3.deletedSuccess'));
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleToggleStatus = (category: Category) => {
    toggleStatus.mutate(
      { id: category.id, is_active: !category.is_active },
      {
        onSuccess: () => {
          toast.success(category.is_active ? t('admin.categories3.deactivated') : t('admin.categories3.activated'));
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" dir={dir}>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6" dir={dir}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.categories3.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.categories3.categoriesCount', { count: categories?.length || 0 })}
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('admin.categories3.addCategory')}
        </Button>
      </div>

      <div className="space-y-3">
        {categories?.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-2">{t('admin.categories3.noCategories')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('admin.categories3.noCategoriesHint')}
            </p>
            <Button onClick={handleOpenCreate} variant="outline">
              <Plus className="w-4 h-4 ml-2" />
              {t('admin.categories3.addFirst')}
            </Button>
          </Card>
        ) : (
          categories?.map((category, index) => {
            const IconComponent = iconMap[category.icon || 'package'] || Package;
            return (
              <Card
                key={category.id}
                className={cn(
                  'p-4 flex items-center gap-4 transition-all',
                  !category.is_active && 'opacity-60'
                )}
              >
                <div className="text-muted-foreground cursor-grab hover:text-foreground">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  category.is_active ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <IconComponent className={cn(
                    'w-6 h-6',
                    category.is_active ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{category.name}</h3>
                    {!category.is_active && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {t('admin.categories3.disabled')}
                      </span>
                    )}
                  </div>
                  {category.name_en && (
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {category.name_en}
                    </p>
                  )}
                </div>
                <div className="text-center px-3">
                  <span className="text-xs text-muted-foreground block">{t('admin.categories3.orderLabel')}</span>
                  <span className="font-bold text-foreground">{index + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleStatus(category)}
                    className={cn('h-9 w-9', category.is_active ? 'text-success' : 'text-muted-foreground')}
                    disabled={toggleStatus.isPending}
                  >
                    {category.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(category)} className="h-9 w-9 text-muted-foreground hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(category)} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <CategoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        category={editingCategory}
        onSave={handleSave}
        isPending={createCategory.isPending || updateCategory.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.categories3.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.categories3.deleteDescription', { name: categoryToDelete?.name || '' })}
              <br />
              <span className="text-destructive">
                {t('admin.categories3.deleteWarning')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="flex-1 m-0">{t('admin.common2.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="flex-1 m-0 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.common2.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCategories;
