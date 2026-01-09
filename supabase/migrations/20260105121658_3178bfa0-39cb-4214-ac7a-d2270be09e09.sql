-- Fix messages RLS policy to allow admin insert
DROP POLICY IF EXISTS "Admins can send messages" ON public.messages;

CREATE POLICY "Admins can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Add tier protection columns to creator_profiles
ALTER TABLE public.creator_profiles
ADD COLUMN IF NOT EXISTS tier_protection_until TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS current_tier_level INTEGER DEFAULT 2;

-- Update existing creators to have protection until column set
UPDATE public.creator_profiles
SET tier_protection_until = created_at + INTERVAL '30 days'
WHERE tier_protection_until IS NULL;