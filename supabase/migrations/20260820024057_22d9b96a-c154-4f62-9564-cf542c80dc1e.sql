-- One-time deterministic cleanup of legacy stack items, plus guards so the
-- bad shapes cannot come back.

-- 1. Orphans: no library compound AND no usable custom name. Nothing can edit
--    or identify these rows, so they are removed.
DELETE FROM public.user_compounds
WHERE compound_id IS NULL
  AND (custom_name IS NULL OR btrim(custom_name) = '');

-- 2. Duplicates: same user + same identity (library compound, or custom name
--    compared case/whitespace-insensitively). Deterministic rule: keep the
--    earliest created row, then the lowest id as a tiebreak; delete the rest.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id,
                        COALESCE(compound_id::text, 'custom:' || lower(btrim(custom_name)))
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.user_compounds
)
DELETE FROM public.user_compounds uc
USING ranked r
WHERE uc.id = r.id AND r.rn > 1;

-- 3. Prevent recurrence at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS user_compounds_unique_compound_idx
  ON public.user_compounds (user_id, compound_id)
  WHERE compound_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_compounds_unique_custom_idx
  ON public.user_compounds (user_id, lower(btrim(custom_name)))
  WHERE compound_id IS NULL;