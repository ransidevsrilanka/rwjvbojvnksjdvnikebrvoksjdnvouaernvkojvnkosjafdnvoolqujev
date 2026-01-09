-- Create upgrade-receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('upgrade-receipts', 'upgrade-receipts', false);

-- Policy: Users can upload their own receipts (folder per user ID)
CREATE POLICY "Users can upload upgrade receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'upgrade-receipts' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own receipts
CREATE POLICY "Users can view own upgrade receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'upgrade-receipts' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy: Admins can view all upgrade receipts
CREATE POLICY "Admins can view all upgrade receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'upgrade-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can delete upgrade receipts
CREATE POLICY "Admins can delete upgrade receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'upgrade-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);