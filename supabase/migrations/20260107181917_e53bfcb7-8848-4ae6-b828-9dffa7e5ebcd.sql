-- Fix 1: Remove duplicate messaging INSERT policy
DROP POLICY IF EXISTS "Admins can insert messages" ON public.messages;

-- Fix 2: Fix overly permissive RLS policies
-- Update access_codes UPDATE policy to require admin role
DROP POLICY IF EXISTS "Admins can update access codes" ON public.access_codes;
CREATE POLICY "Admins can update access codes" 
ON public.access_codes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- ======================================================
-- QUIZZES & FLASHCARDS SYSTEM TABLES
-- ======================================================

-- Question Bank (reusable questions)
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'short_answer')),
  question_text TEXT NOT NULL,
  options JSONB, -- For MCQ: ["option1", "option2", "option3", "option4"]
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  min_tier TEXT DEFAULT 'starter' CHECK (min_tier IN ('starter', 'standard', 'lifetime')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  question_ids UUID[] NOT NULL, -- Array of question_bank IDs
  time_limit_minutes INTEGER,
  pass_percentage INTEGER DEFAULT 60,
  min_tier TEXT DEFAULT 'starter' CHECK (min_tier IN ('starter', 'standard', 'lifetime')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz Attempts
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- {question_id: answer}
  score INTEGER,
  total_questions INTEGER,
  passed BOOLEAN,
  time_taken_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Flashcard Sets
CREATE TABLE public.flashcard_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  card_count INTEGER DEFAULT 0,
  min_tier TEXT DEFAULT 'starter' CHECK (min_tier IN ('starter', 'standard', 'lifetime')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Flashcards
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Flashcard Progress (spaced repetition)
CREATE TABLE public.flashcard_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  ease_factor DECIMAL(3,2) DEFAULT 2.50,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review_at TIMESTAMPTZ DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  UNIQUE(user_id, flashcard_id)
);

-- ======================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ======================================================
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;

-- ======================================================
-- QUESTION BANK POLICIES
-- ======================================================
-- Admins can manage questions
CREATE POLICY "Admins can manage question_bank"
ON public.question_bank
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin'))
);

-- Enrolled users can view active questions based on tier
CREATE POLICY "Enrolled users can view questions by tier"
ON public.question_bank
FOR SELECT
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = auth.uid() 
    AND e.is_active = true
    AND (
      min_tier = 'starter' OR
      (min_tier = 'standard' AND e.tier IN ('standard', 'lifetime')) OR
      (min_tier = 'lifetime' AND e.tier = 'lifetime')
    )
  )
);

-- ======================================================
-- QUIZZES POLICIES  
-- ======================================================
-- Admins can manage quizzes
CREATE POLICY "Admins can manage quizzes"
ON public.quizzes
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin'))
);

-- Enrolled users can view active quizzes based on tier
CREATE POLICY "Enrolled users can view quizzes by tier"
ON public.quizzes
FOR SELECT
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = auth.uid() 
    AND e.is_active = true
    AND (
      min_tier = 'starter' OR
      (min_tier = 'standard' AND e.tier IN ('standard', 'lifetime')) OR
      (min_tier = 'lifetime' AND e.tier = 'lifetime')
    )
  )
);

-- ======================================================
-- QUIZ ATTEMPTS POLICIES
-- ======================================================
-- Users can manage their own attempts
CREATE POLICY "Users can manage own quiz attempts"
ON public.quiz_attempts
FOR ALL
USING (user_id = auth.uid());

-- Admins can view all attempts
CREATE POLICY "Admins can view all quiz attempts"
ON public.quiz_attempts
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- ======================================================
-- FLASHCARD SETS POLICIES
-- ======================================================
-- Admins can manage flashcard sets
CREATE POLICY "Admins can manage flashcard_sets"
ON public.flashcard_sets
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin'))
);

-- Enrolled users can view active flashcard sets based on tier
CREATE POLICY "Enrolled users can view flashcard_sets by tier"
ON public.flashcard_sets
FOR SELECT
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = auth.uid() 
    AND e.is_active = true
    AND (
      min_tier = 'starter' OR
      (min_tier = 'standard' AND e.tier IN ('standard', 'lifetime')) OR
      (min_tier = 'lifetime' AND e.tier = 'lifetime')
    )
  )
);

-- ======================================================
-- FLASHCARDS POLICIES
-- ======================================================
-- Admins can manage flashcards
CREATE POLICY "Admins can manage flashcards"
ON public.flashcards
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'content_admin'))
);

-- Enrolled users can view flashcards from accessible sets
CREATE POLICY "Enrolled users can view flashcards"
ON public.flashcards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.flashcard_sets fs
    JOIN public.enrollments e ON e.user_id = auth.uid() AND e.is_active = true
    WHERE fs.id = flashcards.set_id
    AND fs.is_active = true
    AND (
      fs.min_tier = 'starter' OR
      (fs.min_tier = 'standard' AND e.tier IN ('standard', 'lifetime')) OR
      (fs.min_tier = 'lifetime' AND e.tier = 'lifetime')
    )
  )
);

-- ======================================================
-- FLASHCARD PROGRESS POLICIES
-- ======================================================
-- Users can manage their own progress
CREATE POLICY "Users can manage own flashcard progress"
ON public.flashcard_progress
FOR ALL
USING (user_id = auth.uid());

-- ======================================================
-- TRIGGERS FOR UPDATED_AT
-- ======================================================
CREATE TRIGGER update_question_bank_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flashcard_sets_updated_at
  BEFORE UPDATE ON public.flashcard_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ======================================================
-- FUNCTION TO UPDATE FLASHCARD COUNT
-- ======================================================
CREATE OR REPLACE FUNCTION public.update_flashcard_set_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.flashcard_sets 
    SET card_count = card_count + 1 
    WHERE id = NEW.set_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.flashcard_sets 
    SET card_count = card_count - 1 
    WHERE id = OLD.set_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_flashcard_count_trigger
  AFTER INSERT OR DELETE ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_flashcard_set_count();