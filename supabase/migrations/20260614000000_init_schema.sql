-- Migrations/20260614000000_init_schema.sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLES DEFINITION
-- =========================================================================

-- users (profile table linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  phone_number TEXT,
  college TEXT,
  course TEXT,
  year_of_study TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- device_registrations
CREATE TABLE IF NOT EXISTS public.device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_model TEXT,
  os_version TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT,
  start_date DATE,
  end_date DATE,
  manually_granted BOOLEAN DEFAULT FALSE,
  granted_by TEXT,
  price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- content (notes & lectures info)
CREATE TABLE IF NOT EXISTS public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  chapter TEXT,
  topic TEXT,
  pdf_path TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  topic TEXT,
  chapter TEXT,
  total_marks INT,
  time_limit INT, -- in seconds
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- quiz_questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_option TEXT CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  explanation TEXT
);

-- quiz_attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INT,
  total INT,
  answers JSONB,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- comments (discussion forums)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE SET NULL,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  body TEXT,
  sent_by TEXT,
  target TEXT DEFAULT 'all', -- 'all' or 'subscribed'
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- study_tasks (personal to-do lists)
CREATE TABLE IF NOT EXISTS public.study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  chapter_tag TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  due_date DATE,
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. AUTOMATIC USER CREATION TRIGGER
-- =========================================================================

-- Trigger function to automatically insert new auth signups into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, subscription_status, phone_number, college, course, year_of_study)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    'inactive',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'course',
    new.raw_user_meta_data->>'year_of_study'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;

-- 3.1 users policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3.2 device_registrations policies
CREATE POLICY "Users can read own device registrations" ON public.device_registrations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device registration" ON public.device_registrations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3.3 subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3.4 content policies
CREATE POLICY "Users can read published content" ON public.content
  FOR SELECT TO authenticated USING (is_published = true);

-- 3.5 quizzes policies
CREATE POLICY "Users can read published quizzes" ON public.quizzes
  FOR SELECT TO authenticated USING (is_published = true);

-- 3.6 quiz_questions policies
CREATE POLICY "Users can read quiz questions" ON public.quiz_questions
  FOR SELECT TO authenticated USING (true);

-- 3.7 quiz_attempts policies
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts" ON public.quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3.8 comments policies
CREATE POLICY "Users can read comments" ON public.comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comments" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3.9 notifications policies
CREATE POLICY "Users can view notifications" ON public.notifications
  FOR SELECT TO authenticated USING (true);

-- 3.10 study_tasks policies
CREATE POLICY "Users can view own tasks" ON public.study_tasks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.study_tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.study_tasks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.study_tasks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================================
-- 4. STORAGE SETUP & POLICIES (acca-pdfs)
-- =========================================================================

-- Insert the acca-pdfs bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'acca-pdfs', 
  'acca-pdfs', 
  false, 
  52428800, -- 50MB
  '{"application/pdf"}'
)
ON CONFLICT (id) DO NOTHING;

-- Storage object read policy
CREATE POLICY "Authenticated users can read PDFs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'acca-pdfs');

-- Allow admin to insert/upload files to the acca-pdfs storage bucket
CREATE POLICY "Admins can upload PDFs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'acca-pdfs' AND 
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

-- Allow admin to delete files from the acca-pdfs storage bucket
CREATE POLICY "Admins can delete PDFs" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'acca-pdfs' AND 
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

-- =========================================================================
-- 5. SUPPORT MESSAGES (FOR DIRECT ADMIN CONTACT)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users and admins can insert support messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Users and admins can view support messages" ON public.support_messages
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

-- =========================================================================
-- 6. ADMIN FULL PRIVILEGES (JWT-BASED RLS OVERRIDES)
-- =========================================================================

CREATE POLICY "Admins have full access to users" ON public.users
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to content" ON public.content
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to quizzes" ON public.quizzes
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to quiz_questions" ON public.quiz_questions
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to quiz_attempts" ON public.quiz_attempts
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to notifications" ON public.notifications
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to study_tasks" ON public.study_tasks
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to comments" ON public.comments
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );

CREATE POLICY "Admins have full access to device_registrations" ON public.device_registrations
  FOR ALL TO authenticated USING (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  ) WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@accafr.in'
  );


