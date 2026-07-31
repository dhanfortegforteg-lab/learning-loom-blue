ALTER TABLE public.track_contents
  ADD COLUMN IF NOT EXISTS min_score numeric NOT NULL DEFAULT 6.0,
  ADD COLUMN IF NOT EXISTS min_attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlock_rule text NOT NULL DEFAULT 'score';

ALTER TABLE public.track_contents
  ADD CONSTRAINT track_contents_unlock_rule_check
  CHECK (unlock_rule IN ('score', 'attempts', 'both', 'any', 'free'));