-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This ensures RLS policies are respected for the querying user

-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS content_overview;
DROP VIEW IF EXISTS creator_content_stats;
DROP VIEW IF EXISTS cmo_performance;
DROP VIEW IF EXISTS platform_financial_summary;

-- View for content overview with completion status
CREATE VIEW content_overview WITH (security_invoker = true) AS
SELECT 
  s.id as subject_id,
  s.name as subject_name,
  s.grade,
  s.stream,
  s.medium,
  COUNT(DISTINCT t.id) as topic_count,
  COUNT(DISTINCT n.id) as note_count,
  s.is_active
FROM subjects s
LEFT JOIN topics t ON t.subject_id = s.id AND t.is_active = true
LEFT JOIN notes n ON n.topic_id = t.id AND n.is_active = true
GROUP BY s.id, s.name, s.grade, s.stream, s.medium, s.is_active;

-- View for creator content contributions
CREATE VIEW creator_content_stats WITH (security_invoker = true) AS
SELECT 
  cp.id as creator_id,
  cp.user_id,
  cp.display_name,
  cp.referral_code,
  cp.is_active,
  cp.cmo_id,
  COALESCE(cp.monthly_paid_users, 0) as monthly_users,
  COALESCE(cp.lifetime_paid_users, 0) as lifetime_users,
  COALESCE(cp.available_balance, 0) as available_balance,
  COUNT(DISTINCT n.id) as notes_uploaded,
  (SELECT COUNT(*) FROM user_attributions ua WHERE ua.creator_id = cp.id) as total_referrals
FROM creator_profiles cp
LEFT JOIN notes n ON n.created_by = cp.user_id
GROUP BY cp.id, cp.user_id, cp.display_name, cp.referral_code, cp.is_active, cp.cmo_id, 
         cp.monthly_paid_users, cp.lifetime_paid_users, cp.available_balance;

-- View for CMO performance tracking
CREATE VIEW cmo_performance WITH (security_invoker = true) AS
SELECT 
  cmo.id as cmo_id,
  cmo.user_id,
  cmo.display_name,
  cmo.referral_code,
  cmo.is_active,
  cmo.is_head_ops,
  COUNT(DISTINCT cp.id) as creators_count,
  COALESCE(SUM(cp.lifetime_paid_users), 0) as total_paid_users,
  COALESCE(SUM(cp.monthly_paid_users), 0) as monthly_paid_users,
  (SELECT COALESCE(SUM(pa.final_amount), 0) 
   FROM payment_attributions pa 
   JOIN creator_profiles cp2 ON pa.creator_id = cp2.id 
   WHERE cp2.cmo_id = cmo.id) as total_revenue_generated
FROM cmo_profiles cmo
LEFT JOIN creator_profiles cp ON cp.cmo_id = cmo.id
GROUP BY cmo.id, cmo.user_id, cmo.display_name, cmo.referral_code, cmo.is_active, cmo.is_head_ops;

-- View for platform financial summary (read-only for Head of Ops)
CREATE VIEW platform_financial_summary WITH (security_invoker = true) AS
SELECT
  COALESCE(SUM(pa.final_amount), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN pa.creator_id IS NOT NULL THEN pa.final_amount ELSE 0 END), 0) as referral_revenue,
  COALESCE(SUM(CASE WHEN pa.creator_id IS NULL THEN pa.final_amount ELSE 0 END), 0) as non_referral_revenue,
  COALESCE(SUM(CASE WHEN pa.created_at >= date_trunc('month', CURRENT_DATE) THEN pa.final_amount ELSE 0 END), 0) as this_month_revenue,
  COUNT(DISTINCT pa.user_id) as total_paid_users
FROM payment_attributions pa;