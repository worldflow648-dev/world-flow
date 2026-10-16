import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProfileUpdateData {
  full_name: string;
  phone?: string;
  store_name?: string;
  store_link?: string;
}

export function useUpdateProfile() {
  const { user, refreshProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProfile = async (data: ProfileUpdateData): Promise<boolean> => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    setIsUpdating(true);
    try {
      const updateData: Record<string, unknown> = {
        full_name: data.full_name.trim(),
        phone: data.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (data.store_name !== undefined) updateData.store_name = data.store_name?.trim() || null;
      if (data.store_link !== undefined) updateData.store_link = data.store_link?.trim() || null;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('تم تحديث الملف الشخصي بنجاح');
      return true;
    } catch (error) {
      toast.error('فشل تحديث الملف الشخصي');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateProfile, isUpdating };
}

export function useUploadAvatar() {
  const { user, refreshProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP');
      return null;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return null;
    }

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Get old avatar path to delete later
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = extractPathFromUrl(profile.avatar_url);
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      await refreshProfile();
      toast.success('تم تحديث الصورة الشخصية بنجاح');
      return publicUrl;
    } catch (error) {
      toast.error('فشل رفع الصورة');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAvatar, isUploading };
}

// Helper to extract file path from storage URL
function extractPathFromUrl(url: string): string | null {
  try {
    const match = url.match(/avatars\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
