import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUpdateProfile, useUploadAvatar } from '@/hooks/useUpdateProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';

export function EditProfileModal({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess?: () => void; }) {
  const { profile, user, role } = useAuth();
  const { updateProfile, isUpdating } = useUpdateProfile();
  const { uploadAvatar, isUploading } = useUploadAvatar();
  const { t } = useLanguage();
  const isMerchant = role === 'merchant';

  const profileSchema = z.object({
    full_name: z.string().trim().min(2, t('profile.fullNameShort')).max(50, t('profile.fullNameLong')),
    phone: z.string().trim().regex(/^07\d{9}$/, t('profile.phoneInvalid')).optional().or(z.literal('')),
    store_name: z.string().trim().max(100).optional().or(z.literal('')),
    store_link: z.string().trim().url().optional().or(z.literal('')),
  });
  type ProfileFormData = z.infer<typeof profileSchema>;

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      store_name: (profile as any)?.store_name || '',
      store_link: (profile as any)?.store_link || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        store_name: (profile as any)?.store_name || '',
        store_link: (profile as any)?.store_link || '',
      });
      setAvatarPreview(null);
      setSelectedFile(null);
    }
  }, [open, profile, reset]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type) || file.size > 2 * 1024 * 1024) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: ProfileFormData) => {
    let success = true;
    if (selectedFile) { const url = await uploadAvatar(selectedFile); if (!url) success = false; }
    if (isDirty || !selectedFile) {
      const updateData: any = { full_name: data.full_name, phone: data.phone || undefined };
      if (isMerchant) {
        updateData.store_name = data.store_name || undefined;
        updateData.store_link = data.store_link || undefined;
      }
      const result = await updateProfile(updateData);
      if (!result) success = false;
    }
    if (success) { onOpenChange(false); onSuccess?.(); }
  };

  const isLoading = isUpdating || isUploading;
  const hasChanges = isDirty || selectedFile !== null;
  const currentAvatar = avatarPreview || profile?.avatar_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-center">{t('profile.editProfile')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-background shadow-elevated">
                <AvatarImage src={currentAvatar || undefined} />
                <AvatarFallback className="bg-gradient-primary text-white text-2xl font-bold">{profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading}
                className={cn("absolute -bottom-1 -left-1 w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed")}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
            <p className="text-xs text-muted-foreground">{t('profile.avatarHint')}</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <FloatingInput id="full_name" label={t('auth.fullName')} {...register('full_name')} disabled={isLoading} />
              {errors.full_name && <p className="text-xs text-destructive px-1">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1">
              <FloatingInput id="phone" label={t('auth.phone')} dir="ltr" className="text-left" placeholder="07XXXXXXXXX" {...register('phone')} disabled={isLoading} />
              {errors.phone && <p className="text-xs text-destructive px-1">{errors.phone.message}</p>}
            </div>
            {isMerchant && (
              <>
                <div className="space-y-1">
                  <FloatingInput id="store_name" label={t('profile.storeName')} placeholder={t('profile.storeNamePlaceholder')} {...register('store_name')} disabled={isLoading} />
                  {errors.store_name && <p className="text-xs text-destructive px-1">{errors.store_name.message}</p>}
                </div>
                <div className="space-y-1">
                  <FloatingInput id="store_link" label={t('profile.storeLink')} dir="ltr" className="text-left" placeholder={t('profile.storeLinkPlaceholder')} {...register('store_link')} disabled={isLoading} />
                  {errors.store_link && <p className="text-xs text-destructive px-1">{errors.store_link.message}</p>}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isLoading}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !hasChanges}>
              {isLoading ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" />{t('profile.saving')}</>) : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
