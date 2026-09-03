CREATE TABLE public.custom_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  request TEXT NOT NULL,
  subject TEXT,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_plans TO authenticated;
GRANT ALL ON public.custom_plans TO service_role;
ALTER TABLE public.custom_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom_plans" ON public.custom_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.keyword_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.keyword_sets TO authenticated;
GRANT ALL ON public.keyword_sets TO service_role;
ALTER TABLE public.keyword_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own keyword_sets" ON public.keyword_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.error_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  topic TEXT NOT NULL,
  content JSONB NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_reviews TO authenticated;
GRANT ALL ON public.error_reviews TO service_role;
ALTER TABLE public.error_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own error_reviews" ON public.error_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.language_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  language TEXT NOT NULL,
  stage TEXT,
  topic TEXT NOT NULL,
  content JSONB NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.language_lessons TO authenticated;
GRANT ALL ON public.language_lessons TO service_role;
ALTER TABLE public.language_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own language_lessons" ON public.language_lessons FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pdf_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  last_page INTEGER NOT NULL DEFAULT 1,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_docs TO authenticated;
GRANT ALL ON public.pdf_docs TO service_role;
ALTER TABLE public.pdf_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pdf_docs" ON public.pdf_docs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);