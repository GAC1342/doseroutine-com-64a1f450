
-- Prevent duplicate library entries: enforce case-insensitive unique names
-- and reject names that collide with existing aliases (and vice versa).

CREATE UNIQUE INDEX IF NOT EXISTS compounds_name_ci_key
  ON public.compounds (lower(trim(name)));

CREATE OR REPLACE FUNCTION public.compounds_prevent_duplicates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_name_norm text := lower(trim(NEW.name));
  conflict_row record;
  alias_norm text;
BEGIN
  -- Guard: name must not equal any alias on another row
  SELECT id, slug, name INTO conflict_row
  FROM public.compounds
  WHERE id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND EXISTS (
      SELECT 1 FROM unnest(COALESCE(aliases, ARRAY[]::text[])) a
      WHERE lower(trim(a)) = new_name_norm
    )
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Duplicate compound: name "%" already exists as an alias of "%" (slug: %)',
      NEW.name, conflict_row.name, conflict_row.slug
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Guard: none of the new aliases may equal another row's name or alias
  IF NEW.aliases IS NOT NULL THEN
    FOREACH alias_norm IN ARRAY NEW.aliases LOOP
      alias_norm := lower(trim(alias_norm));
      IF alias_norm = '' THEN CONTINUE; END IF;

      SELECT id, slug, name INTO conflict_row
      FROM public.compounds
      WHERE id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
          lower(trim(name)) = alias_norm
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(aliases, ARRAY[]::text[])) a
            WHERE lower(trim(a)) = alias_norm
          )
        )
      LIMIT 1;
      IF FOUND THEN
        RAISE EXCEPTION 'Duplicate compound alias "%": already used by "%" (slug: %)',
          alias_norm, conflict_row.name, conflict_row.slug
          USING ERRCODE = 'unique_violation';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compounds_prevent_duplicates_trg ON public.compounds;
CREATE TRIGGER compounds_prevent_duplicates_trg
  BEFORE INSERT OR UPDATE OF name, aliases ON public.compounds
  FOR EACH ROW EXECUTE FUNCTION public.compounds_prevent_duplicates();
