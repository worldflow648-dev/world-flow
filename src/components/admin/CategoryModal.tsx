import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Category } from '@/hooks/useAdminCategories';
import { Loader2, Package, Shirt, Coffee, Gift, Palette, Headphones, Watch, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (data: {
    name: string;
    name_en?: string;
    icon?: string;
    is_active: boolean;
  }) => void;
  isPending?: boolean;
}

const iconOptions = [
  { value: 'package', icon: Package, label: 'صندوق' },
  { value: 'shirt', icon: Shirt, label: 'ملابس' },
  { value: 'coffee', icon: Coffee, label: 'مشروبات' },
  { value: 'gift', icon: Gift, label: 'هدايا' },
  { value: 'palette', icon: Palette, label: 'فن' },
  { value: 'headphones', icon: Headphones, label: 'سماعات' },
  { value: 'watch', icon: Watch, label: 'ساعات' },
  { value: 'sparkles', icon: Sparkles, label: 'مميز' },
];

export function CategoryModal({
  open,
  onOpenChange,
  category,
  onSave,
  isPending = false,
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('package');
  const [isActive, setIsActive] = useState(true);

  const isEditMode = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setNameEn(category.name_en || '');
      setSelectedIcon(category.icon || 'package');
      setIsActive(category.is_active ?? true);
    } else {
      setName('');
      setNameEn('');
      setSelectedIcon('package');
      setIsActive(true);
    }
  }, [category, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      name_en: nameEn.trim() || undefined,
      icon: selectedIcon,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Arabic Name */}
          <div className="space-y-2">
            <Label htmlFor="name">اسم الفئة (عربي) *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ملابس رجالية"
              className="text-right"
              required
            />
          </div>

          {/* English Name */}
          <div className="space-y-2">
            <Label htmlFor="nameEn">اسم الفئة (إنجليزي)</Label>
            <Input
              id="nameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g., Men's Clothing"
              dir="ltr"
              className="text-left"
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-3">
            <Label>الأيقونة</Label>
            <div className="grid grid-cols-4 gap-2">
              {iconOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedIcon(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                      selectedIcon === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <IconComponent className={cn(
                      'w-5 h-5',
                      selectedIcon === option.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="text-xs text-muted-foreground">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div>
              <Label htmlFor="active" className="text-sm font-medium">نشطة</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                إظهار الفئة للتجار
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {isEditMode ? 'حفظ التغييرات' : 'إضافة الفئة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
