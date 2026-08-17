CREATE TABLE public.cron_run_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  db_queries INTEGER NOT NULL DEFAULT 0,
  db_rows_read INTEGER NOT NULL DEFAULT 0,
  query_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  users_scanned INTEGER NOT NULL DEFAULT 0,
  candidates INTEGER NOT NULL DEFAULT 0,
  push_sent INTEGER NOT NULL DEFAULT 0,
  email_sent INTEGER NOT NULL DEFAULT 0,
  inbox_queued INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  capped INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  over_budget BOOLEAN NOT NULL DEFAULT false,
  budget_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cron_run_metrics_job_started_idx ON public.cron_run_metrics (job, started_at DESC);

GRANT SELECT ON public.cron_run_metrics TO authenticated;
GRANT ALL ON public.cron_run_metrics TO service_role;

ALTER TABLE public.cron_run_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron run metrics"
ON public.cron_run_metrics FOR SELECT TO authenticated
USING (public.is_admin());