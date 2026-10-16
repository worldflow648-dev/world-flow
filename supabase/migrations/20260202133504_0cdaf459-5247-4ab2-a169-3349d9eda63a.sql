-- Add is_suspended column to profiles for merchant management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- Create storage bucket for design files
INSERT INTO storage.buckets (id, name, public)
VALUES ('designs', 'designs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for design uploads - merchants can upload their own designs
CREATE POLICY "Authenticated users can upload designs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'designs' AND auth.role() = 'authenticated');

-- RLS policy for viewing designs - authenticated users can view
CREATE POLICY "Authenticated users can view designs"
ON storage.objects FOR SELECT
USING (bucket_id = 'designs' AND auth.role() = 'authenticated');

-- RLS policy for deleting own designs
CREATE POLICY "Users can delete own designs"
ON storage.objects FOR DELETE
USING (bucket_id = 'designs' AND auth.uid()::text = (storage.foldername(name))[1]);