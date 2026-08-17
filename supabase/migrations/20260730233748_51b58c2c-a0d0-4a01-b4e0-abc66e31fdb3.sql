ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS sleep_quality smallint,
  ADD COLUMN IF NOT EXISTS stress_level smallint;

CREATE OR REPLACE FUNCTION public.validate_workout_session_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sleep_quality IS NOT NULL AND (NEW.sleep_quality < 1 OR NEW.sleep_quality > 5) THEN
    RAISE EXCEPTION 'sleep_quality must be between 1 and 5';
  END IF;
  IF NEW.stress_level IS NOT NULL AND (NEW.stress_level < 1 OR NEW.stress_level > 5) THEN
    RAISE EXCEPTION 'stress_level must be between 1 and 5';
  END IF;
  IF NEW.tags IS NULL THEN
    NEW.tags := '{}'::text[];
  END IF;
  IF array_length(NEW.tags, 1) > 12 THEN
    RAISE EXCEPTION 'a workout can have at most 12 tags';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_workout_session_context_trg ON public.workout_logs;
CREATE TRIGGER validate_workout_session_context_trg
  BEFORE INSERT OR UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_workout_session_context();

CREATE INDEX IF NOT EXISTS workout_logs_tags_idx ON public.workout_logs USING GIN (tags);