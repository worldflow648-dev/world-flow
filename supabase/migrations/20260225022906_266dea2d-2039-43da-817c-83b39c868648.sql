
-- Add image_url column to banners
ALTER TABLE public.banners ADD COLUMN image_url text;

-- Create banners storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);

-- Allow anyone to view banner images
CREATE POLICY "Banner images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- Allow admins to upload banner images
CREATE POLICY "Admins can upload banner images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update banner images
CREATE POLICY "Admins can update banner images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete banner images
CREATE POLICY "Admins can delete banner images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'::app_role));
