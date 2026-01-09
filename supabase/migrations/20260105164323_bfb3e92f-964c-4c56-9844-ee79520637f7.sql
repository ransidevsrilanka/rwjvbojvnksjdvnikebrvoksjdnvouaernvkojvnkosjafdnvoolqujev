-- Fix 1: Add INSERT policy for access_codes (admins only)
CREATE POLICY "Admins can insert access codes" 
ON public.access_codes 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- Fix 2: Create 'notes' storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', false)
ON CONFLICT (id) DO NOTHING;

-- Fix 3: Storage policies for notes bucket
-- Allow admins to upload notes
CREATE POLICY "Admins can upload notes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'notes' AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin'))
  )
);

-- Allow admins to update notes
CREATE POLICY "Admins can update storage notes"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'notes' AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin'))
  )
);

-- Allow admins to delete notes from storage
CREATE POLICY "Admins can delete storage notes"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'notes' AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin'))
  )
);

-- Allow authenticated users with active enrollment to read notes
CREATE POLICY "Enrolled users can read notes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'notes' AND
  (
    EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin'))
  )
);

-- Fix 4: Add DELETE policy for access_codes (admins)
CREATE POLICY "Admins can delete access codes" 
ON public.access_codes 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);