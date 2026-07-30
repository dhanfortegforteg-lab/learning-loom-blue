CREATE TABLE public.fox_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fox_tasks TO authenticated;
GRANT ALL ON public.fox_tasks TO service_role;
ALTER TABLE public.fox_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fox tasks" ON public.fox_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.fox_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fox_rewards TO authenticated;
GRANT ALL ON public.fox_rewards TO service_role;
ALTER TABLE public.fox_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fox rewards" ON public.fox_rewards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);