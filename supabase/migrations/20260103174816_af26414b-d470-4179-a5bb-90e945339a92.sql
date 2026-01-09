-- Fix security definer views by recreating them with security_invoker = true
-- This makes the views use the permissions of the querying user, not the creator

-- Recreate creator_analytics view with SECURITY INVOKER
DROP VIEW IF EXISTS public.creator_analytics;
CREATE VIEW public.creator_analytics 
WITH (security_invoker = true)
AS
SELECT 
  cp.id,
  cp.user_id,
  cp.display_name,
  cp.referral_code,
  cp.cmo_id,
  cp.is_active,
  cp.created_at,
  cp.total_withdrawn,
  cp.available_balance,
  cmo.display_name AS cmo_name,
  COALESCE(cp.lifetime_paid_users, 0) AS lifetime_paid_users,
  CASE 
    WHEN COALESCE(cp.lifetime_paid_users, 0) >= 500 THEN 0.12 
    ELSE 0.08 
  END AS commission_rate,
  COALESCE((
    SELECT COUNT(*) FROM public.payment_attributions pa 
    WHERE pa.creator_id = cp.id 
    AND pa.created_at >= date_trunc('month', CURRENT_DATE)
  ), 0) AS monthly_paid_users,
  COALESCE((
    SELECT SUM(creator_commission_amount) FROM public.payment_attributions pa 
    WHERE pa.creator_id = cp.id
  ), 0) AS total_commission_earned,
  (SELECT COUNT(*) FROM public.discount_codes dc WHERE dc.creator_id = cp.id) AS discount_code_count,
  (SELECT COUNT(*) FROM public.user_attributions ua WHERE ua.creator_id = cp.id) AS total_referred_users
FROM public.creator_profiles cp
LEFT JOIN public.cmo_profiles cmo ON cp.cmo_id = cmo.id;

-- Recreate cmo_analytics view with SECURITY INVOKER
DROP VIEW IF EXISTS public.cmo_analytics;
CREATE VIEW public.cmo_analytics 
WITH (security_invoker = true)
AS
SELECT 
  cmo.id,
  cmo.user_id,
  cmo.display_name,
  cmo.referral_code,
  cmo.is_active,
  cmo.created_at,
  (SELECT COUNT(*) FROM public.creator_profiles cp WHERE cp.cmo_id = cmo.id) AS creators_count,
  COALESCE((
    SELECT SUM(COALESCE(cp.lifetime_paid_users, 0)) 
    FROM public.creator_profiles cp 
    WHERE cp.cmo_id = cmo.id
  ), 0) AS total_lifetime_paid_users,
  COALESCE((
    SELECT COUNT(*) FROM public.payment_attributions pa
    JOIN public.creator_profiles cp ON pa.creator_id = cp.id
    WHERE cp.cmo_id = cmo.id
    AND pa.created_at >= date_trunc('month', CURRENT_DATE)
  ), 0) AS monthly_paid_users,
  COALESCE((
    SELECT SUM(pa.final_amount) FROM public.payment_attributions pa
    JOIN public.creator_profiles cp ON pa.creator_id = cp.id
    WHERE cp.cmo_id = cmo.id
  ), 0) AS total_revenue_generated,
  COALESCE((
    SELECT SUM(COALESCE(cp.available_balance, 0)) 
    FROM public.creator_profiles cp 
    WHERE cp.cmo_id = cmo.id
  ), 0) * 0.03 AS pending_commission,
  COALESCE((
    SELECT COUNT(*) FROM public.payment_attributions pa
    JOIN public.creator_profiles cp ON pa.creator_id = cp.id
    WHERE cp.cmo_id = cmo.id
    AND pa.created_at >= date_trunc('year', CURRENT_DATE)
  ), 0) AS annual_paid_users
FROM public.cmo_profiles cmo;

-- Recreate platform_stats view with SECURITY INVOKER
DROP VIEW IF EXISTS public.platform_stats;
CREATE VIEW public.platform_stats 
WITH (security_invoker = true)
AS
SELECT 
  (SELECT COUNT(*) FROM public.cmo_profiles) AS total_cmos,
  (SELECT COUNT(*) FROM public.creator_profiles) AS total_creators,
  (SELECT COUNT(*) FROM public.user_attributions) AS total_attributed_users,
  COALESCE((SELECT SUM(COALESCE(lifetime_paid_users, 0)) FROM public.creator_profiles), 0) AS total_paid_users_all_time,
  COALESCE((SELECT SUM(COALESCE(available_balance, 0)) FROM public.creator_profiles), 0) AS total_creator_balances,
  COALESCE((SELECT SUM(final_amount) FROM public.payment_attributions), 0) AS total_revenue,
  COALESCE((
    SELECT SUM(final_amount) FROM public.payment_attributions 
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
  ), 0) AS this_month_revenue;

-- Re-grant access
GRANT SELECT ON public.creator_analytics TO authenticated;
GRANT SELECT ON public.cmo_analytics TO authenticated;
GRANT SELECT ON public.platform_stats TO authenticated;