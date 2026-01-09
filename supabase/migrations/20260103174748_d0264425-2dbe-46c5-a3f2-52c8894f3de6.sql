-- Create creator_analytics view
CREATE OR REPLACE VIEW public.creator_analytics AS
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

-- Create cmo_analytics view
CREATE OR REPLACE VIEW public.cmo_analytics AS
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

-- Create platform_stats view
CREATE OR REPLACE VIEW public.platform_stats AS
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

-- Create RPC function for creator monthly data (last N months)
CREATE OR REPLACE FUNCTION public.get_creator_monthly_data(p_creator_id uuid, p_months int DEFAULT 6)
RETURNS TABLE (
  month text,
  earnings numeric,
  referrals bigint,
  conversions bigint
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(month_start, 'Mon') as month,
    COALESCE(SUM(pa.creator_commission_amount), 0::numeric) as earnings,
    COALESCE((
      SELECT COUNT(*) FROM user_attributions ua 
      WHERE ua.creator_id = p_creator_id 
      AND ua.created_at >= month_start 
      AND ua.created_at < month_start + interval '1 month'
    ), 0::bigint) as referrals,
    COUNT(pa.id)::bigint as conversions
  FROM generate_series(
    date_trunc('month', CURRENT_DATE - ((p_months - 1) || ' months')::interval),
    date_trunc('month', CURRENT_DATE),
    '1 month'::interval
  ) AS month_start
  LEFT JOIN payment_attributions pa ON 
    pa.creator_id = p_creator_id AND
    pa.created_at >= month_start AND
    pa.created_at < month_start + interval '1 month'
  GROUP BY month_start
  ORDER BY month_start;
END;
$$;

-- Create RPC function for CMO monthly data
CREATE OR REPLACE FUNCTION public.get_cmo_monthly_data(p_cmo_id uuid, p_months int DEFAULT 6)
RETURNS TABLE (
  month text,
  creators bigint,
  paid_users bigint,
  revenue numeric
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(month_start, 'Mon') as month,
    (
      SELECT COUNT(*) FROM creator_profiles cp 
      WHERE cp.cmo_id = p_cmo_id 
      AND cp.created_at < month_start + interval '1 month'
    )::bigint as creators,
    COALESCE((
      SELECT COUNT(*) FROM payment_attributions pa
      JOIN creator_profiles cp ON pa.creator_id = cp.id
      WHERE cp.cmo_id = p_cmo_id
      AND pa.created_at >= month_start 
      AND pa.created_at < month_start + interval '1 month'
    ), 0::bigint) as paid_users,
    COALESCE((
      SELECT SUM(pa.final_amount) FROM payment_attributions pa
      JOIN creator_profiles cp ON pa.creator_id = cp.id
      WHERE cp.cmo_id = p_cmo_id
      AND pa.created_at >= month_start 
      AND pa.created_at < month_start + interval '1 month'
    ), 0::numeric) as revenue
  FROM generate_series(
    date_trunc('month', CURRENT_DATE - ((p_months - 1) || ' months')::interval),
    date_trunc('month', CURRENT_DATE),
    '1 month'::interval
  ) AS month_start
  ORDER BY month_start;
END;
$$;

-- Create RPC for admin dashboard stats (single query instead of many)
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE (
  total_students bigint,
  total_creators bigint,
  active_enrollments bigint,
  total_codes bigint,
  active_codes bigint,
  total_subjects bigint,
  pending_upgrades bigint,
  pending_join_requests bigint,
  pending_withdrawals bigint,
  total_revenue numeric,
  this_month_revenue numeric,
  last_month_revenue numeric,
  starter_count bigint,
  standard_count bigint,
  lifetime_count bigint,
  card_payments numeric,
  bank_payments numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  non_student_ids uuid[];
  current_month_start timestamp;
  last_month_start timestamp;
BEGIN
  -- Get non-student user IDs
  SELECT ARRAY_AGG(user_id) INTO non_student_ids
  FROM user_roles 
  WHERE role IN ('admin', 'super_admin', 'content_admin', 'support_admin', 'creator', 'cmo');
  
  current_month_start := date_trunc('month', CURRENT_DATE);
  last_month_start := date_trunc('month', CURRENT_DATE - interval '1 month');
  
  RETURN QUERY
  SELECT
    -- Total students (active enrollments excluding non-students)
    (SELECT COUNT(DISTINCT e.user_id) FROM enrollments e 
     WHERE e.is_active = true 
     AND (non_student_ids IS NULL OR e.user_id != ALL(COALESCE(non_student_ids, ARRAY[]::uuid[]))))::bigint,
    -- Total creators
    (SELECT COUNT(*) FROM creator_profiles)::bigint,
    -- Active enrollments
    (SELECT COUNT(*) FROM enrollments WHERE is_active = true)::bigint,
    -- Total codes
    (SELECT COUNT(*) FROM access_codes)::bigint,
    -- Active codes
    (SELECT COUNT(*) FROM access_codes WHERE status = 'active')::bigint,
    -- Total subjects
    (SELECT COUNT(*) FROM subjects)::bigint,
    -- Pending upgrades
    (SELECT COUNT(*) FROM upgrade_requests WHERE status = 'pending')::bigint,
    -- Pending join requests
    (SELECT COUNT(*) FROM join_requests WHERE status = 'pending')::bigint,
    -- Pending withdrawals
    (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending')::bigint,
    -- Total revenue
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions), 0::numeric),
    -- This month revenue
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions WHERE created_at >= current_month_start), 0::numeric),
    -- Last month revenue
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions WHERE created_at >= last_month_start AND created_at < current_month_start), 0::numeric),
    -- Tier counts
    (SELECT COUNT(*) FROM enrollments WHERE is_active = true AND tier = 'starter')::bigint,
    (SELECT COUNT(*) FROM enrollments WHERE is_active = true AND tier = 'standard')::bigint,
    (SELECT COUNT(*) FROM enrollments WHERE is_active = true AND tier = 'lifetime')::bigint,
    -- Payment methods
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions WHERE payment_type = 'card'), 0::numeric),
    COALESCE((SELECT SUM(final_amount) FROM payment_attributions WHERE payment_type = 'bank'), 0::numeric);
END;
$$;

-- Grant access to views for authenticated users
GRANT SELECT ON public.creator_analytics TO authenticated;
GRANT SELECT ON public.cmo_analytics TO authenticated;
GRANT SELECT ON public.platform_stats TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_creator_monthly_data(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cmo_monthly_data(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;