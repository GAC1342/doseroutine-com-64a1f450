CREATE TABLE public.standing_skip_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_compound_id uuid REFERENCES public.user_compounds(id) ON DELETE CASCADE,
  days_of_week smallint[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.standing_skip_rules TO authenticated;
GRANT ALL ON public.standing_skip_rules TO service_role;

ALTER TABLE public.standing_skip_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own standing skip rules"
  ON public.standing_skip_rules FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX standing_skip_rules_user_idx ON public.standing_skip_rules (user_id) WHERE enabled;

CREATE TRIGGER standing_skip_rules_set_updated_at
  BEFORE UPDATE ON public.standing_skip_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.standing_skip_rules_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE d smallint;
BEGIN
  IF NEW.days_of_week IS NULL OR array_length(NEW.days_of_week, 1) IS NULL THEN
    RAISE EXCEPTION 'A standing skip rule needs at least one weekday';
  END IF;
  FOREACH d IN ARRAY NEW.days_of_week LOOP
    IF d < 1 OR d > 7 THEN
      RAISE EXCEPTION 'Weekday must be 1 (Monday) through 7 (Sunday), got %', d;
    END IF;
  END LOOP;
  IF NEW.user_compound_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_compounds uc
       WHERE uc.id = NEW.user_compound_id AND uc.user_id = NEW.user_id
     ) THEN
    RAISE EXCEPTION 'Compound does not belong to this user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER standing_skip_rules_validate_trg
  BEFORE INSERT OR UPDATE ON public.standing_skip_rules
  FOR EACH ROW EXECUTE FUNCTION public.standing_skip_rules_validate();