CREATE TABLE public.routine_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  public_id text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  show_owner_name boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  view_count bigint NOT NULL DEFAULT 0,
  save_count bigint NOT NULL DEFAULT 0,
  CONSTRAINT routine_shares_public_id_len CHECK (char_length(public_id) BETWEEN 10 AND 64)
);

CREATE INDEX routine_shares_owner_idx ON public.routine_shares (owner_user_id, created_at DESC);
CREATE INDEX routine_shares_routine_idx ON public.routine_shares (routine_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_shares TO authenticated;
GRANT ALL ON public.routine_shares TO service_role;

ALTER TABLE public.routine_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own routine shares"
  ON public.routine_shares FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Public read path. Returns ONLY whitelisted workout fields: no notes, no
-- stack/compound/dose/bloodwork/body data, no photos. Owner display name is
-- included only when the owner explicitly opted in on the share sheet.
CREATE OR REPLACE FUNCTION public.get_shared_routine(_public_id text)
RETURNS TABLE(
  public_id text,
  created_at timestamptz,
  view_count bigint,
  save_count bigint,
  owner_name text,
  routine_name text,
  workout_type text,
  duration_min integer,
  rpe numeric,
  distance_m numeric,
  target_pace_s numeric,
  target_hr integer,
  exercises jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.public_id,
    s.created_at,
    s.view_count,
    s.save_count,
    CASE WHEN s.show_owner_name THEN NULLIF(trim(p.display_name), '') ELSE NULL END,
    t.name,
    t.workout_type,
    t.duration_min::integer,
    t.rpe::numeric,
    t.distance_m::numeric,
    t.target_pace_s::numeric,
    t.target_hr::integer,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'exercise', e.exercise,
          'set_index', e.set_index,
          'sets', e.sets,
          'reps', e.reps,
          'weight_kg', e.weight_kg,
          'rest_seconds', e.rest_seconds,
          'tempo', e.tempo
        ) ORDER BY e.set_index
      )
      FROM public.workout_template_exercises e
      WHERE e.template_id = t.id
    ), '[]'::jsonb)
  FROM public.routine_shares s
  JOIN public.workout_templates t ON t.id = s.routine_id
  LEFT JOIN public.profiles p ON p.id = s.owner_user_id
  WHERE s.public_id = _public_id
    AND s.is_active
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_routine(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_routine_share_view(_public_id text)
RETURNS void
LANGUAGE sql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.routine_shares
     SET view_count = view_count + 1
   WHERE public_id = _public_id AND is_active;
$$;

GRANT EXECUTE ON FUNCTION public.increment_routine_share_view(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_routine_share_save(_public_id text)
RETURNS void
LANGUAGE sql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.routine_shares
     SET save_count = save_count + 1
   WHERE public_id = _public_id AND is_active;
$$;

GRANT EXECUTE ON FUNCTION public.increment_routine_share_save(text) TO authenticated, service_role;