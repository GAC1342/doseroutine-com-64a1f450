CREATE TABLE public.onboarding_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  event TEXT NOT NULL,
  step TEXT,
  path TEXT,
  landing_path TEXT,
  ok BOOLEAN,
  error_message TEXT,
  elapsed_ms INTEGER,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.onboarding_events TO authenticated;
GRANT ALL ON public.onboarding_events TO service_role;

ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own onboarding events"
ON public.onboarding_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own onboarding events"
ON public.onboarding_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX onboarding_events_created_at_idx ON public.onboarding_events (created_at DESC);
CREATE INDEX onboarding_events_user_idx ON public.onboarding_events (user_id, created_at DESC);