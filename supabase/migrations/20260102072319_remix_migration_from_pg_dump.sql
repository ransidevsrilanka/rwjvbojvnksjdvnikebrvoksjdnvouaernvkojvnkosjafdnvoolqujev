CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'cmo',
    'creator',
    'user',
    'student',
    'super_admin',
    'content_admin',
    'support_admin',
    'content_creator'
);


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: set_creator_role(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_creator_role(_user_id uuid, _cmo_id uuid DEFAULT NULL::uuid, _display_name text DEFAULT NULL::text, _referral_code text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_access_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_access_code(_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


SET default_table_access_method = heap;

--
-- Name: access_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    tier text DEFAULT 'starter'::text NOT NULL,
    status text DEFAULT 'unused'::text NOT NULL,
    grade text,
    stream text,
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    activated_by uuid,
    activated_at timestamp with time zone,
    medium text,
    duration_days integer DEFAULT 365,
    activation_limit integer DEFAULT 1,
    activations_used integer DEFAULT 0,
    created_by uuid,
    bound_email text,
    bound_device text,
    ip_history jsonb DEFAULT '[]'::jsonb
);


--
-- Name: cmo_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cmo_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cmo_id uuid,
    amount numeric(10,2),
    total_commission numeric(10,2),
    status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payout_month text,
    total_paid_users integer DEFAULT 0,
    base_commission_amount numeric(10,2) DEFAULT 0,
    bonus_amount numeric(10,2) DEFAULT 0
);


--
-- Name: cmo_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cmo_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    referral_code text,
    is_active boolean DEFAULT true
);


--
-- Name: content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_id uuid,
    title text NOT NULL,
    description text,
    file_path text,
    file_type text,
    tier_required text DEFAULT 'starter'::text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: creator_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid,
    payout_month text,
    paid_users_count integer DEFAULT 0,
    commission_amount numeric(10,2) DEFAULT 0,
    status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: creator_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    referral_code text NOT NULL,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lifetime_paid_users integer DEFAULT 0,
    is_active boolean DEFAULT true,
    cmo_id uuid,
    monthly_paid_users integer DEFAULT 0,
    available_balance numeric DEFAULT 0,
    total_withdrawn numeric DEFAULT 0
);


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount_percent integer DEFAULT 10,
    creator_id uuid,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    paid_conversions integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: download_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.download_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    note_id uuid,
    file_name text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    access_code_id uuid,
    grade text,
    stream text,
    tier text DEFAULT 'starter'::text NOT NULL,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    medium text,
    upgrade_celebrated boolean DEFAULT false,
    payment_order_id text
);


--
-- Name: join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reference_number text NOT NULL,
    tier text DEFAULT 'starter'::text NOT NULL,
    grade text,
    stream text,
    medium text,
    subject_1 text,
    subject_2 text,
    subject_3 text,
    amount numeric NOT NULL,
    receipt_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    admin_notes text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    ref_creator text,
    discount_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_id uuid,
    title text NOT NULL,
    description text,
    file_url text,
    file_size integer,
    min_tier text DEFAULT 'starter'::text,
    view_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_attributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_attributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    creator_id uuid,
    amount numeric(10,2),
    tier text,
    order_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    enrollment_id uuid,
    original_amount numeric,
    discount_applied numeric DEFAULT 0,
    final_amount numeric,
    creator_commission_rate numeric,
    creator_commission_amount numeric,
    payment_month text,
    payment_type text DEFAULT 'card'::text
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id text NOT NULL,
    user_id uuid,
    amount numeric,
    currency text DEFAULT 'LKR'::text,
    status text DEFAULT 'pending'::text,
    payment_id text,
    tier text,
    enrollment_id uuid,
    payment_method text DEFAULT 'card'::text,
    ref_creator text,
    discount_code text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    full_name text,
    device_fingerprint text,
    max_devices integer DEFAULT 3,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_locked boolean DEFAULT false,
    abuse_flags integer DEFAULT 0
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stream_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stream_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream text NOT NULL,
    subject_name text NOT NULL,
    subject_code text NOT NULL,
    is_mandatory boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    basket text,
    sort_order integer DEFAULT 0
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    grade text,
    stream text,
    subject_code text,
    icon text,
    color text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    streams jsonb DEFAULT '[]'::jsonb,
    medium text,
    sort_order integer DEFAULT 0
);


--
-- Name: topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid,
    name text NOT NULL,
    description text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0
);


--
-- Name: upgrade_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upgrade_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enrollment_id uuid,
    current_tier text,
    requested_tier text NOT NULL,
    amount numeric(10,2),
    receipt_url text,
    status text DEFAULT 'pending'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reference_number text,
    admin_notes text
);


--
-- Name: user_attributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_attributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    creator_id uuid,
    discount_code_id uuid,
    referral_source text DEFAULT 'link'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_fingerprint text,
    ip_address text,
    user_agent text,
    is_active boolean DEFAULT true,
    last_seen_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enrollment_id uuid,
    subject_1 text,
    subject_2 text,
    subject_3 text,
    is_confirmed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_locked boolean DEFAULT false,
    locked_at timestamp with time zone
);


--
-- Name: withdrawal_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    method_type text NOT NULL,
    bank_name text,
    account_number text,
    account_holder_name text,
    branch_name text,
    crypto_type text,
    wallet_address text,
    network text,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT withdrawal_methods_method_type_check CHECK ((method_type = ANY (ARRAY['bank'::text, 'crypto'::text])))
);


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    withdrawal_method_id uuid,
    amount numeric NOT NULL,
    fee_percent numeric DEFAULT 3 NOT NULL,
    fee_amount numeric NOT NULL,
    net_amount numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    admin_notes text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    receipt_url text,
    CONSTRAINT withdrawal_requests_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT withdrawal_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'paid'::text])))
);


--
-- Name: access_codes access_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_code_key UNIQUE (code);


--
-- Name: access_codes access_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_codes
    ADD CONSTRAINT access_codes_pkey PRIMARY KEY (id);


--
-- Name: cmo_payouts cmo_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cmo_payouts
    ADD CONSTRAINT cmo_payouts_pkey PRIMARY KEY (id);


--
-- Name: cmo_profiles cmo_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cmo_profiles
    ADD CONSTRAINT cmo_profiles_pkey PRIMARY KEY (id);


--
-- Name: cmo_profiles cmo_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cmo_profiles
    ADD CONSTRAINT cmo_profiles_user_id_key UNIQUE (user_id);


--
-- Name: content content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content
    ADD CONSTRAINT content_pkey PRIMARY KEY (id);


--
-- Name: creator_payouts creator_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payouts
    ADD CONSTRAINT creator_payouts_pkey PRIMARY KEY (id);


--
-- Name: creator_profiles creator_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_pkey PRIMARY KEY (id);


--
-- Name: creator_profiles creator_profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: creator_profiles creator_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_user_id_key UNIQUE (user_id);


--
-- Name: discount_codes discount_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_key UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: download_logs download_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: join_requests join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_pkey PRIMARY KEY (id);


--
-- Name: join_requests join_requests_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_reference_number_key UNIQUE (reference_number);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: payment_attributions payment_attributions_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attributions
    ADD CONSTRAINT payment_attributions_order_id_key UNIQUE (order_id);


--
-- Name: payment_attributions payment_attributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attributions
    ADD CONSTRAINT payment_attributions_pkey PRIMARY KEY (id);


--
-- Name: payments payments_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_key UNIQUE (order_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: site_settings site_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_key UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: stream_subjects stream_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_subjects
    ADD CONSTRAINT stream_subjects_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: upgrade_requests upgrade_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upgrade_requests
    ADD CONSTRAINT upgrade_requests_pkey PRIMARY KEY (id);


--
-- Name: user_attributions user_attributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_attributions
    ADD CONSTRAINT user_attributions_pkey PRIMARY KEY (id);


--
-- Name: user_attributions user_attributions_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_attributions
    ADD CONSTRAINT user_attributions_user_id_unique UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_subjects user_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subjects
    ADD CONSTRAINT user_subjects_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_methods withdrawal_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_methods
    ADD CONSTRAINT withdrawal_methods_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: cmo_profiles_referral_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cmo_profiles_referral_code_unique ON public.cmo_profiles USING btree (referral_code) WHERE (referral_code IS NOT NULL);


--
-- Name: withdrawal_methods_bank_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX withdrawal_methods_bank_unique ON public.withdrawal_methods USING btree (creator_id, account_number) WHERE ((method_type = 'bank'::text) AND (account_number IS NOT NULL));


--
-- Name: withdrawal_methods_crypto_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX withdrawal_methods_crypto_unique ON public.withdrawal_methods USING btree (creator_id, wallet_address) WHERE ((method_type = 'crypto'::text) AND (wallet_address IS NOT NULL));


--
-- Name: access_codes update_access_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_access_codes_updated_at BEFORE UPDATE ON public.access_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: enrollments update_enrollments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: join_requests update_join_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON public.join_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: upgrade_requests update_upgrade_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_upgrade_requests_updated_at BEFORE UPDATE ON public.upgrade_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_subjects update_user_subjects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_subjects_updated_at BEFORE UPDATE ON public.user_subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cmo_payouts cmo_payouts_cmo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cmo_payouts
    ADD CONSTRAINT cmo_payouts_cmo_id_fkey FOREIGN KEY (cmo_id) REFERENCES public.cmo_profiles(id);


--
-- Name: content content_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content
    ADD CONSTRAINT content_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id);


--
-- Name: creator_payouts creator_payouts_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_payouts
    ADD CONSTRAINT creator_payouts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id);


--
-- Name: creator_profiles creator_profiles_cmo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_cmo_id_fkey FOREIGN KEY (cmo_id) REFERENCES public.cmo_profiles(id);


--
-- Name: download_logs download_logs_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.download_logs
    ADD CONSTRAINT download_logs_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id);


--
-- Name: enrollments enrollments_access_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_access_code_id_fkey FOREIGN KEY (access_code_id) REFERENCES public.access_codes(id);


--
-- Name: notes notes_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id);


--
-- Name: payment_attributions payment_attributions_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attributions
    ADD CONSTRAINT payment_attributions_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id);


--
-- Name: payment_attributions payment_attributions_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_attributions
    ADD CONSTRAINT payment_attributions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);


--
-- Name: payments payments_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);


--
-- Name: topics topics_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: upgrade_requests upgrade_requests_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upgrade_requests
    ADD CONSTRAINT upgrade_requests_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);


--
-- Name: user_attributions user_attributions_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_attributions
    ADD CONSTRAINT user_attributions_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id);


--
-- Name: user_attributions user_attributions_discount_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_attributions
    ADD CONSTRAINT user_attributions_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id);


--
-- Name: user_subjects user_subjects_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subjects
    ADD CONSTRAINT user_subjects_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id);


--
-- Name: withdrawal_methods withdrawal_methods_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_methods
    ADD CONSTRAINT withdrawal_methods_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;


--
-- Name: withdrawal_requests withdrawal_requests_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;


--
-- Name: withdrawal_requests withdrawal_requests_withdrawal_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_withdrawal_method_id_fkey FOREIGN KEY (withdrawal_method_id) REFERENCES public.withdrawal_methods(id);


--
-- Name: cmo_payouts Admins can delete cmo payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete cmo payouts" ON public.cmo_payouts FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: enrollments Admins can insert enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert enrollments" ON public.enrollments FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: payment_attributions Admins can insert payment attributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert payment attributions" ON public.payment_attributions FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: user_attributions Admins can insert user attributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user attributions" ON public.user_attributions FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: user_subjects Admins can insert user_subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user_subjects" ON public.user_subjects FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: cmo_payouts Admins can manage cmo payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cmo payouts" ON public.cmo_payouts USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: cmo_profiles Admins can manage cmo_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cmo_profiles" ON public.cmo_profiles USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: site_settings Admins can manage site_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage site_settings" ON public.site_settings USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: user_roles Admins can manage user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user_roles" ON public.user_roles USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: join_requests Admins can update all join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all join requests" ON public.join_requests FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: upgrade_requests Admins can update all upgrade requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all upgrade requests" ON public.upgrade_requests FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: creator_profiles Admins can update creator profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update creator profiles" ON public.creator_profiles FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: enrollments Admins can update enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update enrollments" ON public.enrollments FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: withdrawal_requests Admins can update withdrawal requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update withdrawal requests" ON public.withdrawal_requests FOR UPDATE USING ((public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: enrollments Admins can view all enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: join_requests Admins can view all join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all join requests" ON public.join_requests FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: payment_attributions Admins can view all payment attributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all payment attributions" ON public.payment_attributions FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: payments Admins can view all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: upgrade_requests Admins can view all upgrade requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all upgrade requests" ON public.upgrade_requests FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: withdrawal_requests Admins can view all withdrawal requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests FOR SELECT USING ((public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'content_admin'::public.app_role) OR public.has_role(auth.uid(), 'support_admin'::public.app_role)));


--
-- Name: payment_attributions Anyone can insert payment attribution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert payment attribution" ON public.payment_attributions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: payments Anyone can insert payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert payments" ON public.payments FOR INSERT WITH CHECK (true);


--
-- Name: user_attributions Anyone can insert user attribution; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert user attribution" ON public.user_attributions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: access_codes Anyone can read access codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read access codes" ON public.access_codes FOR SELECT USING (true);


--
-- Name: notes Anyone can read active notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active notes" ON public.notes FOR SELECT USING ((is_active = true));


--
-- Name: cmo_payouts Anyone can read cmo payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read cmo payouts" ON public.cmo_payouts FOR SELECT USING (true);


--
-- Name: cmo_profiles Anyone can read cmo profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read cmo profiles" ON public.cmo_profiles FOR SELECT USING (true);


--
-- Name: content Anyone can read content metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read content metadata" ON public.content FOR SELECT USING (true);


--
-- Name: creator_profiles Anyone can read creator profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read creator profiles" ON public.creator_profiles FOR SELECT USING (true);


--
-- Name: discount_codes Anyone can read discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read discount codes" ON public.discount_codes FOR SELECT USING (true);


--
-- Name: site_settings Anyone can read site_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: stream_subjects Anyone can read stream subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read stream subjects" ON public.stream_subjects FOR SELECT USING (true);


--
-- Name: subjects Anyone can read subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT USING (true);


--
-- Name: topics Anyone can read topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read topics" ON public.topics FOR SELECT USING (true);


--
-- Name: discount_codes Authenticated can insert discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert discount codes" ON public.discount_codes FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: access_codes Authenticated can update access codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can update access codes" ON public.access_codes FOR UPDATE TO authenticated USING (true);


--
-- Name: cmo_profiles CMOs can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CMOs can update own profile" ON public.cmo_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: payment_attributions CMOs can view payment attributions for their creators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CMOs can view payment attributions for their creators" ON public.payment_attributions FOR SELECT USING ((creator_id IN ( SELECT cp.id
   FROM (public.creator_profiles cp
     JOIN public.cmo_profiles cmo ON ((cp.cmo_id = cmo.id)))
  WHERE (cmo.user_id = auth.uid()))));


--
-- Name: user_attributions CMOs can view user attributions for their creators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CMOs can view user attributions for their creators" ON public.user_attributions FOR SELECT USING ((creator_id IN ( SELECT cp.id
   FROM (public.creator_profiles cp
     JOIN public.cmo_profiles cmo ON ((cp.cmo_id = cmo.id)))
  WHERE (cmo.user_id = auth.uid()))));


--
-- Name: withdrawal_methods Creators can delete own withdrawal methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can delete own withdrawal methods" ON public.withdrawal_methods FOR DELETE USING ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: withdrawal_methods Creators can insert own withdrawal methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can insert own withdrawal methods" ON public.withdrawal_methods FOR INSERT WITH CHECK ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: withdrawal_requests Creators can insert own withdrawal requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can insert own withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: discount_codes Creators can update own discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can update own discount codes" ON public.discount_codes FOR UPDATE TO authenticated USING ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: withdrawal_methods Creators can update own withdrawal methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can update own withdrawal methods" ON public.withdrawal_methods FOR UPDATE USING ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: payment_attributions Creators can view own payment attributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view own payment attributions" ON public.payment_attributions FOR SELECT USING ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: creator_payouts Creators can view own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view own payouts" ON public.creator_payouts FOR SELECT USING ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: user_attributions Creators can view own user attributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view own user attributions" ON public.user_attributions FOR SELECT USING ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: withdrawal_methods Creators can view own withdrawal methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view own withdrawal methods" ON public.withdrawal_methods FOR SELECT USING ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: withdrawal_requests Creators can view own withdrawal requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view own withdrawal requests" ON public.withdrawal_requests FOR SELECT USING ((creator_id IN ( SELECT creator_profiles.id
   FROM public.creator_profiles
  WHERE (creator_profiles.user_id = auth.uid()))));


--
-- Name: payments Service can update payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update payments" ON public.payments FOR UPDATE USING (true);


--
-- Name: download_logs Users can create download logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create download logs" ON public.download_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: join_requests Users can create join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create join requests" ON public.join_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: upgrade_requests Users can create upgrade requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create upgrade requests" ON public.upgrade_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: creator_profiles Users can insert own creator profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own creator profile" ON public.creator_profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: enrollments Users can insert own enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own enrollment" ON public.enrollments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_subjects Users can insert own subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own subjects" ON public.user_subjects FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: creator_profiles Users can update own creator profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own creator profile" ON public.creator_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: enrollments Users can update own enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own enrollment" ON public.enrollments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: join_requests Users can update own join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own join requests" ON public.join_requests FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_subjects Users can update own subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own subjects" ON public.user_subjects FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_attributions Users can view own attributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own attributions" ON public.user_attributions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: download_logs Users can view own download logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own download logs" ON public.download_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: enrollments Users can view own enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own enrollment" ON public.enrollments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: join_requests Users can view own join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own join requests" ON public.join_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payments Users can view own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_subjects Users can view own subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subjects" ON public.user_subjects FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: upgrade_requests Users can view own upgrade requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own upgrade requests" ON public.upgrade_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: access_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: cmo_payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cmo_payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: cmo_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cmo_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

--
-- Name: creator_payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: creator_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: download_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: join_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_attributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_attributions ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: stream_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stream_subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

--
-- Name: upgrade_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: user_attributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_attributions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: withdrawal_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: withdrawal_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;