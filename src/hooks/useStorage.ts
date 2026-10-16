import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UploadOptions {
  file: File;
  bucket: string;
  path?: string;
}

interface UploadResult {
  url: string;
  path: string;
}

export const useImageUpload = () => {
  return useMutation({
    mutationFn: async ({ file, bucket, path }: UploadOptions): Promise<UploadResult> => {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const fullPath = path ? `${path}/${fileName}` : fileName;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    },
  });
};

export const useMultiImageUpload = () => {
  return useMutation({
    mutationFn: async ({ 
      files, 
      bucket, 
      path 
    }: { 
      files: File[]; 
      bucket: string; 
      path?: string;
    }): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const fullPath = path ? `${path}/${fileName}` : fileName;

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fullPath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        results.push({
          url: urlData.publicUrl,
          path: data.path,
        });
      }

      return results;
    },
  });
};

export const useDeleteFile = () => {
  return useMutation({
    mutationFn: async ({ bucket, path }: { bucket: string; path: string }) => {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
    },
  });
};

// Utility to validate image files
export const validateImageFile = (file: File, maxSizeMB = 5): string | null => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!validTypes.includes(file.type)) {
    return 'نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, WebP, GIF';
  }

  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return `حجم الملف كبير جداً. الحد الأقصى: ${maxSizeMB}MB`;
  }

  return null;
};
