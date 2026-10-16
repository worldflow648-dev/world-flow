import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCreateBanner, useUpdateBanner, type Banner, type BannerInsert } from '@/hooks/useAdminBanners';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner?: Banner | null;
}

const DEFAULT_FORM: BannerInsert = {
  title: '',
  subtitle: '',
  cta_text: '',
  link: '/search',
  bg_gradient: 'from-indigo-600 via-violet-600 to-purple-700',
  icon: 'sparkles',
  image_url: null,
  is_active: true,
  sort_order: 0,
};

export default function BannerModal({ open, onOpenChange, banner }: Props) {
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const isEditing = !!banner;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<BannerInsert>(DEFAULT_FORM);

  useEffect(() => {
    if (banner) {
      setForm({
        title: banner.title,
        subtitle: banner.subtitle,
        cta_text: banner.cta_text,
        link: banner.link,
        bg_gradient: banner.bg_gradient,
        icon: banner.icon,
        image_url: banner.image_url,
        is_active: banner.is_active,
        sort_order: banner.sort_order,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [banner, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      setForm(f => ({ ...f, image_url: publicUrl }));
      toast.success('تم رفع الصورة');
    } catch {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setForm(f => ({ ...f, image_url: null }));
  };

  const handleSubmit = async () => {
    if (!form.image_url) {
      toast.error('الصورة مطلوبة');
      return;
    }
    try {
      const payload: BannerInsert = {
        ...form,
        title: form.title ?? '',
        subtitle: form.subtitle ?? '',
        cta_text: form.cta_text ?? '',
      };
      if (isEditing) {
        await updateBanner.mutateAsync({ id: banner!.id, updates: payload });
        toast.success('تم تحديث البنر');
      } else {
        await createBanner.mutateAsync(payload);
        toast.success('تم إضافة البنر');
      }
      onOpenChange(false);
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const isPending = createBanner.isPending || updateBanner.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل البنر' : 'إضافة بنر جديد'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="flex items-center gap-1 mb-2">
              <ImageIcon className="w-4 h-4" />
              صورة البنر *
            </Label>
            {form.image_url ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={form.image_url} alt="Banner" className="w-full aspect-video object-cover" />
                <button
                  onClick={removeImage}
                  className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm">{uploading ? 'جاري الرفع...' : 'اضغط لرفع صورة'}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <p className="text-xs text-muted-foreground mt-1">يفضّل نسبة 16:9</p>
          </div>

          <div>
            <Label>العنوان (اختياري)</Label>
            <Input
              value={form.title || ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="اتركه فارغاً لعرض الصورة فقط"
            />
          </div>

          <div>
            <Label>الوصف (اختياري)</Label>
            <Input
              value={form.subtitle || ''}
              onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
            />
          </div>

          <div>
            <Label>نص الزر (اختياري)</Label>
            <Input
              value={form.cta_text || ''}
              onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))}
              placeholder="مثال: تسوّق الآن"
            />
          </div>

          <div>
            <Label>الرابط عند الضغط (اختياري)</Label>
            <Input
              value={form.link || ''}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              placeholder="/search"
              dir="ltr"
            />
          </div>

          <div>
            <Label>الترتيب</Label>
            <Input
              type="number"
              value={form.sort_order ?? 0}
              onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>مفعّل</Label>
            <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={isPending || uploading}>
            {isPending ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
