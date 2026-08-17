CREATE TABLE public.meal_photo_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('download','cleanup','delete')),
  item_count integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.meal_photo_events TO authenticated;
GRANT ALL ON public.meal_photo_events TO service_role;

ALTER TABLE public.meal_photo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal photo events"
  ON public.meal_photo_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record their own meal photo events"
  ON public.meal_photo_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX meal_photo_events_user_created_idx
  ON public.meal_photo_events (user_id, created_at DESC);