-- =====================================================
-- PART 1: Populate stream_subjects table with all A/L streams
-- =====================================================

-- Clear existing data to ensure clean insert
DELETE FROM stream_subjects;

-- =====================================================
-- MATHS STREAM (Physical Science)
-- =====================================================
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('maths', 'Combined Mathematics', 'CM', true, 'mandatory', 1),
('maths', 'Physics', 'PHYS', true, 'mandatory', 2),
('maths', 'Chemistry', 'CHEM', false, 'optional', 3),
('maths', 'ICT', 'ICT', false, 'optional', 4),
('maths', 'Agricultural Science', 'AGRI', false, 'restricted', 5);

-- =====================================================
-- BIOLOGY STREAM (Biological Science)
-- =====================================================
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('biology', 'Biology', 'BIO', true, 'mandatory', 1),
('biology', 'Chemistry', 'CHEM', true, 'mandatory', 2),
('biology', 'Physics', 'PHYS', false, 'optional', 3),
('biology', 'Agricultural Science', 'AGRI', false, 'optional', 4),
('biology', 'ICT', 'ICT', false, 'restricted', 5);

-- =====================================================
-- COMMERCE STREAM
-- =====================================================
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('commerce', 'Accounting', 'ACC', false, 'core', 1),
('commerce', 'Business Studies', 'BS', false, 'core', 2),
('commerce', 'Economics', 'ECON', false, 'optional', 3),
('commerce', 'Business Statistics', 'BSTAT', false, 'optional', 4),
('commerce', 'ICT', 'ICT', false, 'optional', 5);

-- =====================================================
-- TECHNOLOGY STREAM
-- =====================================================
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('technology', 'Engineering Technology', 'ET', false, 'core', 1),
('technology', 'Science for Technology', 'SFT', false, 'core', 2),
('technology', 'Bio Systems Technology', 'BST', false, 'core', 3),
('technology', 'ICT', 'ICT', false, 'optional', 4);

-- =====================================================
-- ARTS STREAM - Core Academic Arts (Basket 1)
-- =====================================================
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('arts', 'Economics', 'ECON', false, 'core', 1),
('arts', 'Geography', 'GEO', false, 'core', 2),
('arts', 'Political Science', 'POL', false, 'core', 3),
('arts', 'Logic & Scientific Method', 'LOG', false, 'core', 4),
('arts', 'History', 'HIST', false, 'core', 5),
('arts', 'Sri Lankan History', 'SLHIST', false, 'core', 6),
('arts', 'Indian History', 'INHIST', false, 'core', 7),
('arts', 'European History', 'EUHIST', false, 'core', 8),
('arts', 'Modern World History', 'MWHIST', false, 'core', 9),
('arts', 'Mass Media & Communication', 'MMC', false, 'core', 10),
('arts', 'Home Economics', 'HE', false, 'core', 11);

-- =====================================================
-- ARTS STREAM - Religion / Civilization (Basket 2)
-- =====================================================
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('arts', 'Buddhism', 'BUD', false, 'religion', 20),
('arts', 'Buddhist Civilization', 'BUDC', false, 'religion', 21),
('arts', 'Hinduism', 'HIN', false, 'religion', 22),
('arts', 'Hindu Civilization', 'HINC', false, 'religion', 23),
('arts', 'Islam', 'ISL', false, 'religion', 24),
('arts', 'Islamic Civilization', 'ISLC', false, 'religion', 25),
('arts', 'Christianity', 'CHR', false, 'religion', 26),
('arts', 'Christian Civilization', 'CHRC', false, 'religion', 27),
('arts', 'Greek & Roman Civilization', 'GRC', false, 'religion', 28);

-- =====================================================
-- ARTS STREAM - Languages (Basket 3)
-- =====================================================
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('arts', 'Sinhala', 'SIN', false, 'language', 30),
('arts', 'Tamil', 'TAM', false, 'language', 31),
('arts', 'English', 'ENG', false, 'language', 32),
('arts', 'Pali', 'PAL', false, 'language', 33),
('arts', 'Sanskrit', 'SAN', false, 'language', 34),
('arts', 'Arabic', 'ARA', false, 'language', 35),
('arts', 'Hindi', 'HND', false, 'language', 36),
('arts', 'Japanese', 'JAP', false, 'language', 37),
('arts', 'Chinese', 'CHI', false, 'language', 38),
('arts', 'French', 'FRE', false, 'language', 39),
('arts', 'German', 'GER', false, 'language', 40),
('arts', 'Russian', 'RUS', false, 'language', 41);

-- =====================================================
-- ARTS STREAM - Aesthetic Subjects (Basket 4)
-- =====================================================
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('arts', 'Art', 'ART', false, 'aesthetic', 50),
('arts', 'Music (Eastern)', 'MUSE', false, 'aesthetic', 51),
('arts', 'Music (Western)', 'MUSW', false, 'aesthetic', 52),
('arts', 'Dancing (Eastern)', 'DANE', false, 'aesthetic', 53),
('arts', 'Dancing (Western)', 'DANW', false, 'aesthetic', 54),
('arts', 'Drama & Theatre', 'DRA', false, 'aesthetic', 55);

-- =====================================================
-- O/L SUBJECTS (Optional Categories)
-- =====================================================
-- Basket 1: Language/Literature/Arts
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('ol', 'Second Language (Sinhala)', 'SIN2', false, 'basket1', 1),
('ol', 'Second Language (Tamil)', 'TAM2', false, 'basket1', 2),
('ol', 'Literature (Sinhala)', 'SINLIT', false, 'basket1', 3),
('ol', 'Literature (Tamil)', 'TAMLIT', false, 'basket1', 4),
('ol', 'Literature (English)', 'ENGLIT', false, 'basket1', 5),
('ol', 'Art', 'ART', false, 'basket1', 6),
('ol', 'Music (Eastern)', 'MUSE', false, 'basket1', 7),
('ol', 'Music (Western)', 'MUSW', false, 'basket1', 8),
('ol', 'Dancing (Eastern)', 'DANE', false, 'basket1', 9),
('ol', 'Dancing (Western)', 'DANW', false, 'basket1', 10),
('ol', 'Drama & Theatre', 'DRA', false, 'basket1', 11);

-- Basket 2: Commerce/Technical/Science
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('ol', 'Commerce', 'COM', false, 'basket2', 20),
('ol', 'Business & Accounting Studies', 'BAS', false, 'basket2', 21),
('ol', 'Health & Physical Education', 'HPE', false, 'basket2', 22),
('ol', 'Agriculture & Food Technology', 'AFT', false, 'basket2', 23),
('ol', 'Aquatic Bio Resources Technology', 'ABRT', false, 'basket2', 24),
('ol', 'Home Economics', 'HE', false, 'basket2', 25);

-- Basket 3: ICT/Technical/Practical
INSERT INTO stream_subjects (stream, subject_name, subject_code, is_mandatory, basket, sort_order) VALUES
('ol', 'Information & Communication Technology', 'ICT', false, 'basket3', 30),
('ol', 'Design & Construction Technology', 'DCT', false, 'basket3', 31),
('ol', 'Design & Mechanical Technology', 'DMT', false, 'basket3', 32),
('ol', 'Electronic Technology', 'ELEC', false, 'basket3', 33),
('ol', 'Electrical, Electronic & IT Technology', 'EEIT', false, 'basket3', 34),
('ol', 'Food & Hospitality', 'FH', false, 'basket3', 35),
('ol', 'Tourism', 'TOU', false, 'basket3', 36);

-- =====================================================
-- PART 2: Create Analytics Views for Head of Ops
-- =====================================================

-- View for content overview with completion status
CREATE OR REPLACE VIEW content_overview AS
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
CREATE OR REPLACE VIEW creator_content_stats AS
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
CREATE OR REPLACE VIEW cmo_performance AS
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
CREATE OR REPLACE VIEW platform_financial_summary AS
SELECT
  COALESCE(SUM(pa.final_amount), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN pa.creator_id IS NOT NULL THEN pa.final_amount ELSE 0 END), 0) as referral_revenue,
  COALESCE(SUM(CASE WHEN pa.creator_id IS NULL THEN pa.final_amount ELSE 0 END), 0) as non_referral_revenue,
  COALESCE(SUM(CASE WHEN pa.created_at >= date_trunc('month', CURRENT_DATE) THEN pa.final_amount ELSE 0 END), 0) as this_month_revenue,
  COUNT(DISTINCT pa.user_id) as total_paid_users
FROM payment_attributions pa;