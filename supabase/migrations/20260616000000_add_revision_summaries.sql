-- supabase/migrations/20260616000000_add_revision_summaries.sql

-- Create revision_summaries table
CREATE TABLE IF NOT EXISTS public.revision_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('topic', 'exam')),
  title TEXT NOT NULL,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  bullets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.revision_summaries ENABLE ROW LEVEL SECURITY;

-- Select policy: authenticated users can read all summaries
CREATE POLICY "Allow authenticated users to read revision summaries"
  ON public.revision_summaries
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin control policy: admin@accafr.in has full access
CREATE POLICY "Admins have full access to revision summaries"
  ON public.revision_summaries
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@accafr.in')
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@accafr.in');
