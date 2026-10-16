import { useState, useCallback } from 'react';
import { X, Loader2, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateImageFile } from '@/hooks/useStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  bucket?: string;
  pathPrefix?: string;
  className?: string;
}

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 5,
  bucket = 'products',
  pathPrefix,
  className,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remainingSlots = maxImages - images.length;

      if (remainingSlots <= 0) {
        toast.error(`الحد الأقصى ${maxImages} صور`);
        return;
      }

      const filesToProcess = fileArray.slice(0, remainingSlots);
      setIsUploading(true);
      const newUrls: string[] = [];

      for (const file of filesToProcess) {
        const error = validateImageFile(file, maxSizeMB);
        if (error) {
          toast.error(error);
          continue;
        }

        try {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const fullPath = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;

          const { data, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fullPath, file, { cacheControl: '3600', upsert: false });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
          newUrls.push(urlData.publicUrl);
        } catch (err: any) {
          console.error('Upload failed:', err);
          toast.error(`فشل رفع ${file.name}: ${err?.message || 'خطأ'}`);
        }
      }

      if (newUrls.length > 0) {
        onImagesChange([...images, ...newUrls]);
        toast.success(`تم رفع ${newUrls.length} صورة`);
      }

      setIsUploading(false);
    },
    [images, maxImages, maxSizeMB, bucket, pathPrefix, onImagesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  };

  const removeImage = async (index: number) => {
    const url = images[index];
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);

    // Best-effort: remove from storage if it's in our bucket
    try {
      const marker = `/storage/v1/object/public/${bucket}/`;
      const idx = url.indexOf(marker);
      if (idx >= 0) {
        const path = url.slice(idx + marker.length);
        await supabase.storage.from(bucket).remove([path]);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
            >
              <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                  رئيسية
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
            isUploading && 'pointer-events-none opacity-50'
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleInputChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">جاري الرفع...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <ImagePlus className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                اسحب الصور هنا أو انقر للاختيار
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP حتى {maxSizeMB}MB
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {images.length}/{maxImages} صور
              </p>
            </>
          )}
        </label>
      )}
    </div>
  );
}
