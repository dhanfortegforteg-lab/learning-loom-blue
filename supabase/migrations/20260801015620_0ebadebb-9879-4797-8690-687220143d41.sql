CREATE TABLE public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id text NOT NULL,
  kind text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_claims TO authenticated;
GRANT ALL ON public.reward_claims TO service_role;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reward claims" ON public.reward_claims FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);