-- Phase 1: Database Schema Updates

-- 1.1 Create Commission Tiers Table (Admin-Editable 4-tier system)
CREATE TABLE public.commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_level INTEGER NOT NULL UNIQUE,
  tier_name TEXT NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  monthly_user_threshold INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default 4 tiers based on MONTHLY users
INSERT INTO public.commission_tiers (tier_level, tier_name, commission_rate, monthly_user_threshold) VALUES
(1, 'Base', 8.00, 0),
(2, 'Tier 2', 12.00, 100),
(3, 'Tier 3', 15.00, 250),
(4, 'Tier 4', 18.00, 500);

-- Enable RLS
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;

-- Anyone can read tiers (for display purposes)
CREATE POLICY "Anyone can view commission tiers"
ON public.commission_tiers FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage commission tiers"
ON public.commission_tiers FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 1.2 Create Platform Settings Table
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.platform_settings (setting_key, setting_value) VALUES
('minimum_payout_lkr', '10000'),
('withdrawal_fee_percent', '3');

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 1.3 Create Messages Table (Lovable Inbox)
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id uuid NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('creator', 'cmo', 'headops', 'student', 'all')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast unread message queries
CREATE INDEX idx_messages_recipient_unread ON public.messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_messages_recipient_type ON public.messages(recipient_type);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (recipient_id = auth.uid() OR sender_id = auth.uid());

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (recipient_id = auth.uid());

-- Admins can send messages
CREATE POLICY "Admins can insert messages"
ON public.messages FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 1.4 Create Creator Onboarding Progress Table
CREATE TABLE public.creator_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  completed_at TIMESTAMPTZ,
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_onboarding ENABLE ROW LEVEL SECURITY;

-- Creators can view/update their own onboarding
CREATE POLICY "Users can view their own onboarding"
ON public.creator_onboarding FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own onboarding"
ON public.creator_onboarding FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own onboarding"
ON public.creator_onboarding FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all onboarding"
ON public.creator_onboarding FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_commission_tiers_updated_at
BEFORE UPDATE ON public.commission_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();