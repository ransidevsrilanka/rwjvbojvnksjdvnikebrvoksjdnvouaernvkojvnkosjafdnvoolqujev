-- Fix overly permissive RLS policies identified by linter

-- 1. Fix "Anyone can insert payments" - should be service role only or authenticated with conditions
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;
CREATE POLICY "Service can insert payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  -- Only allow through edge functions (service role) or admin
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR
  auth.uid() = user_id
);

-- 2. Fix "Authenticated can insert discount codes" - should be creator/admin only
DROP POLICY IF EXISTS "Authenticated can insert discount codes" ON public.discount_codes;
CREATE POLICY "Creators and admins can insert discount codes" 
ON public.discount_codes 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'creator')
);

-- 3. Fix "Authenticated can update access codes" - should be admin only  
DROP POLICY IF EXISTS "Authenticated can update access codes" ON public.access_codes;
-- Already fixed in previous migration

-- 4. Fix "Service can update payments" - should be more restrictive
DROP POLICY IF EXISTS "Service can update payments" ON public.payments;
CREATE POLICY "Service and admin can update payments" 
ON public.payments 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);