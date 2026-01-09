-- PART 1: Fix Subject System - Add RLS policies for admin operations

-- Add admin policies for subjects table
CREATE POLICY "Admins can insert subjects"
ON public.subjects FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

CREATE POLICY "Admins can update subjects"
ON public.subjects FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

CREATE POLICY "Admins can delete subjects"
ON public.subjects FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

-- Add admin policies for topics table
CREATE POLICY "Admins can insert topics"
ON public.topics FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

CREATE POLICY "Admins can update topics"
ON public.topics FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

CREATE POLICY "Admins can delete topics"
ON public.topics FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

-- Add admin policies for notes table
CREATE POLICY "Admins can insert notes"
ON public.notes FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

CREATE POLICY "Admins can update notes"
ON public.notes FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

CREATE POLICY "Admins can delete notes"
ON public.notes FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

-- Add admin policies for content table
CREATE POLICY "Admins can insert content"
ON public.content FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

CREATE POLICY "Admins can update content"
ON public.content FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

CREATE POLICY "Admins can delete content"
ON public.content FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'content_admin')
);

-- PART 4: Referral-Based Premium Unlock System
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  referral_count integer DEFAULT 0,
  unlocked_at timestamp with time zone,
  unlocked_tier text,
  expires_at timestamp with time zone,
  is_claimed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral rewards"
ON referral_rewards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage referral rewards"
ON referral_rewards FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_referral_rewards_updated_at
BEFORE UPDATE ON referral_rewards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- PART 6: Head of Ops Role
ALTER TABLE cmo_profiles ADD COLUMN IF NOT EXISTS is_head_ops boolean DEFAULT false;

-- Create Head of Ops approval requests table
CREATE TABLE public.head_ops_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  request_type text NOT NULL, -- 'remove_cmo', 'remove_creator', 'enforce_deadline', 'escalate'
  target_id uuid,
  target_type text, -- 'cmo', 'creator', 'user'
  details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE head_ops_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Head of Ops can view own requests"
ON head_ops_requests FOR SELECT
USING (auth.uid() = requester_id);

CREATE POLICY "Head of Ops can create requests"
ON head_ops_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cmo_profiles 
    WHERE user_id = auth.uid() AND is_head_ops = true
  )
);

CREATE POLICY "Admins can manage head ops requests"
ON head_ops_requests FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

CREATE TRIGGER update_head_ops_requests_updated_at
BEFORE UPDATE ON head_ops_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- PART 7: Business Phase System
CREATE TABLE public.business_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_phase integer DEFAULT 1 CHECK (current_phase >= 1 AND current_phase <= 3),
  phase_name text NOT NULL DEFAULT 'Pre-Launch',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- Insert default phase
INSERT INTO business_phases (current_phase, phase_name) VALUES (1, 'Pre-Launch');

ALTER TABLE business_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read business phases"
ON business_phases FOR SELECT
USING (true);

CREATE POLICY "Admins can manage business phases"
ON business_phases FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- CMO Target definitions
CREATE TABLE public.cmo_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase integer NOT NULL,
  creators_target integer NOT NULL,
  users_per_creator_target integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

INSERT INTO cmo_targets (phase, creators_target, users_per_creator_target) VALUES
  (1, 50, 20),
  (2, 100, 50),
  (3, 180, 100);

ALTER TABLE cmo_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cmo targets"
ON cmo_targets FOR SELECT
USING (true);

CREATE POLICY "Admins can manage cmo targets"
ON cmo_targets FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- PART 5: Download settings for site_settings
INSERT INTO site_settings (key, value)
VALUES ('download_settings', '{"globalEnabled": true, "disabledUsers": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add disabled_downloads column to profiles for per-user download control
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS downloads_disabled boolean DEFAULT false;