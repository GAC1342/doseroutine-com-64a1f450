CREATE TABLE public.meal_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  planned_time TIME NOT NULL,
  days_of_week SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_times TO authenticated;
GRANT ALL ON public.meal_times TO service_role;

ALTER TABLE public.meal_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own meal times"
  ON public.meal_times FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX meal_times_user_idx ON public.meal_times (user_id, sort_order);

CREATE TRIGGER update_meal_times_updated_at
  BEFORE UPDATE ON public.meal_times
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();