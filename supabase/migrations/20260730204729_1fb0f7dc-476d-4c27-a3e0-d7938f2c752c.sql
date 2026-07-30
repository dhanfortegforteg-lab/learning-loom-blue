CREATE TABLE public.study_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year_level text NOT NULL,
  subject text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_tracks TO authenticated;
GRANT ALL ON public.study_tracks TO service_role;
ALTER TABLE public.study_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tracks" ON public.study_tracks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.track_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.study_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  sessions jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_contents TO authenticated;
GRANT ALL ON public.track_contents TO service_role;
ALTER TABLE public.track_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own track contents" ON public.track_contents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_track_contents_track ON public.track_contents(track_id, position);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_study_tracks_updated_at BEFORE UPDATE ON public.study_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_track_contents_updated_at BEFORE UPDATE ON public.track_contents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();