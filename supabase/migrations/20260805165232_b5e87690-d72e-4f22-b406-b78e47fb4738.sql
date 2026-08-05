CREATE TABLE public.late_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  subject text,
  recall_pct integer NOT NULL DEFAULT 50,
  mode text NOT NULL DEFAULT 'estudo',
  plan jsonb,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric NOT NULL DEFAULT 0,
  percent integer NOT NULL DEFAULT 0,
  essay_score numeric,
  essay_feedback text,
  review_started_at date,
  review_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.late_studies TO authenticated;
GRANT ALL ON public.late_studies TO service_role;

ALTER TABLE public.late_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own late studies" ON public.late_studies FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_late_studies_updated_at BEFORE UPDATE ON public.late_studies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();