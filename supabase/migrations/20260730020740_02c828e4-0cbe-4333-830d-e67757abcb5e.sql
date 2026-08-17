CREATE TABLE public.plan_schedule_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('original', 'previous')),
  goal text,
  snapshot_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_schedule_snapshots TO authenticated;
GRANT ALL ON public.plan_schedule_snapshots TO service_role;

ALTER TABLE public.plan_schedule_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own schedule snapshots"
  ON public.plan_schedule_snapshots
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_plan_schedule_snapshots_updated_at
  BEFORE UPDATE ON public.plan_schedule_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();