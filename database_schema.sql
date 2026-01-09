-- ============================================
-- ZEN NOTES DATABASE SCHEMA
-- Generated: 2024-12-31
-- ============================================

-- ============================================
-- CUSTOM TYPES / ENUMS
-- ============================================

CREATE TYPE app_role AS ENUM ('super_admin', 'content_admin', 'support_admin', 'student', 'cmo', 'content_creator', 'creator');

-- ============================================
-- TABLES
-- ============================================

-- Access Codes Table
CREATE TABLE public.access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'starter'::text,
  status TEXT NOT NULL DEFAULT 'unused'::text,
  grade TEXT,
  stream TEXT,
  medium TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  duration_days INTEGER DEFAULT 365,
  activation_limit INTEGER DEFAULT 1,
  activations_used INTEGER DEFAULT 0,
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID,
  created_by UUID,
  bound_email TEXT,
  bound_device TEXT,
  ip_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CMO Payouts Table
CREATE TABLE public.cmo_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cmo_id UUID,
  payout_month TEXT,
  total_paid_users INTEGER DEFAULT 0,
  base_commission_amount NUMERIC DEFAULT 0,
  bonus_amount NUMERIC DEFAULT 0,
  amount NUMERIC,
  total_commission NUMERIC,
  status TEXT DEFAULT 'pending'::text,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CMO Profiles Table
CREATE TABLE public.cmo_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  display_name TEXT,
  referral_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Content Table
CREATE TABLE public.content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  tier_required TEXT DEFAULT 'starter'::text,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator Payouts Table
CREATE TABLE public.creator_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID,
  payout_month TEXT,
  paid_users_count INTEGER DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending'::text,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator Profiles Table
CREATE TABLE public.creator_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cmo_id UUID,
  display_name TEXT,
  referral_code TEXT NOT NULL,
  monthly_paid_users INTEGER DEFAULT 0,
  lifetime_paid_users INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Discount Codes Table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  discount_percent INTEGER DEFAULT 10,
  creator_id UUID,
  usage_count INTEGER DEFAULT 0,
  paid_conversions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Download Logs Table
CREATE TABLE public.download_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  note_id UUID,
  file_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enrollments Table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_code_id UUID,
  grade TEXT,
  stream TEXT,
  medium TEXT,
  tier TEXT NOT NULL DEFAULT 'starter'::text,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  upgrade_celebrated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notes Table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_size INTEGER,
  min_tier TEXT DEFAULT 'starter'::text,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment Attributions Table
CREATE TABLE public.payment_attributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  creator_id UUID,
  amount NUMERIC,
  tier TEXT,
  order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  device_fingerprint TEXT,
  max_devices INTEGER DEFAULT 3,
  is_locked BOOLEAN DEFAULT false,
  abuse_flags INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Site Settings Table
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stream Subjects Table
CREATE TABLE public.stream_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  basket TEXT,
  is_mandatory BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subjects Table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  grade TEXT,
  stream TEXT,
  medium TEXT,
  streams JSONB DEFAULT '[]'::jsonb,
  subject_code TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Topics Table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Upgrade Requests Table
CREATE TABLE public.upgrade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enrollment_id UUID,
  current_tier TEXT,
  requested_tier TEXT NOT NULL,
  amount NUMERIC,
  receipt_url TEXT,
  reference_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending'::text,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Attributions Table
CREATE TABLE public.user_attributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  creator_id UUID,
  discount_code_id UUID,
  referral_source TEXT DEFAULT 'link'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Roles Table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Sessions Table
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Subjects Table
CREATE TABLE public.user_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  enrollment_id UUID,
  subject_1 TEXT,
  subject_2 TEXT,
  subject_3 TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function: set_creator_role
CREATE OR REPLACE FUNCTION public.set_creator_role(_user_id uuid, _cmo_id uuid DEFAULT NULL::uuid, _display_name text DEFAULT NULL::text, _referral_code text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_creator_id UUID;
  discount_code_str TEXT;
BEGIN
  -- Insert creator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Generate referral code if not provided
  IF _referral_code IS NULL THEN
    _referral_code := 'CRT' || UPPER(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;

  -- Create or update creator profile and get the ID
  INSERT INTO public.creator_profiles (user_id, cmo_id, display_name, referral_code, is_active)
  VALUES (_user_id, _cmo_id, _display_name, _referral_code, true)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.creator_profiles.display_name),
    cmo_id = COALESCE(EXCLUDED.cmo_id, public.creator_profiles.cmo_id)
  RETURNING id INTO new_creator_id;

  -- Generate a discount code for this creator (10% discount by default)
  discount_code_str := 'DC' || UPPER(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  
  INSERT INTO public.discount_codes (code, discount_percent, creator_id, is_active)
  VALUES (discount_code_str, 10, new_creator_id, true)
  ON CONFLICT (code) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'creator_id', new_creator_id,
    'referral_code', _referral_code,
    'discount_code', discount_code_str
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: validate_access_code
CREATE OR REPLACE FUNCTION public.validate_access_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  access_code_record RECORD;
BEGIN
  SELECT * INTO access_code_record
  FROM public.access_codes
  WHERE code = UPPER(_code)
  AND status = 'unused'
  AND (valid_until IS NULL OR valid_until > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access code');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', access_code_record.id,
    'tier', access_code_record.tier,
    'grade', access_code_record.grade,
    'stream', access_code_record.stream
  );
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmo_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

-- Access Codes Policies
CREATE POLICY "Anyone can read access codes" ON public.access_codes FOR SELECT USING (true);
CREATE POLICY "Authenticated can update access codes" ON public.access_codes FOR UPDATE TO authenticated USING (true);

-- CMO Payouts Policies
CREATE POLICY "Anyone can read cmo payouts" ON public.cmo_payouts FOR SELECT USING (true);

-- CMO Profiles Policies
CREATE POLICY "Anyone can read cmo profiles" ON public.cmo_profiles FOR SELECT USING (true);

-- Content Policies
CREATE POLICY "Anyone can read content metadata" ON public.content FOR SELECT USING (true);

-- Creator Payouts Policies
CREATE POLICY "Creators can view own payouts" ON public.creator_payouts FOR SELECT 
USING (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

-- Creator Profiles Policies
CREATE POLICY "Anyone can read creator profiles" ON public.creator_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own creator profile" ON public.creator_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own creator profile" ON public.creator_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Discount Codes Policies
CREATE POLICY "Anyone can read discount codes" ON public.discount_codes FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert discount codes" ON public.discount_codes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Creators can update own discount codes" ON public.discount_codes FOR UPDATE TO authenticated 
USING (creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

-- Download Logs Policies
CREATE POLICY "Users can create download logs" ON public.download_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own download logs" ON public.download_logs FOR SELECT USING (auth.uid() = user_id);

-- Enrollments Policies
CREATE POLICY "Users can insert own enrollment" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollment" ON public.enrollments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own enrollment" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);

-- Notes Policies
CREATE POLICY "Anyone can read active notes" ON public.notes FOR SELECT USING (is_active = true);

-- Payment Attributions Policies
CREATE POLICY "Anyone can insert payment attribution" ON public.payment_attributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Profiles Policies
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

-- Site Settings Policies
CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can modify site_settings" ON public.site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stream Subjects Policies
CREATE POLICY "Anyone can read stream subjects" ON public.stream_subjects FOR SELECT USING (true);

-- Subjects Policies
CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT USING (true);

-- Topics Policies
CREATE POLICY "Anyone can read topics" ON public.topics FOR SELECT USING (true);

-- Upgrade Requests Policies
CREATE POLICY "Users can create upgrade requests" ON public.upgrade_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own upgrade requests" ON public.upgrade_requests FOR SELECT USING (auth.uid() = user_id);

-- User Attributions Policies
CREATE POLICY "Anyone can insert user attribution" ON public.user_attributions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own attributions" ON public.user_attributions FOR SELECT USING (auth.uid() = user_id);

-- User Roles Policies
CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- User Sessions Policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);

-- User Subjects Policies
CREATE POLICY "Users can insert own subjects" ON public.user_subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON public.user_subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subjects" ON public.user_subjects FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for updated_at on enrollments
CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on notes
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on site_settings
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on upgrade_requests
CREATE TRIGGER update_upgrade_requests_updated_at
  BEFORE UPDATE ON public.upgrade_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on user_subjects
CREATE TRIGGER update_user_subjects_updated_at
  BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on access_codes
CREATE TRIGGER update_access_codes_updated_at
  BEFORE UPDATE ON public.access_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
