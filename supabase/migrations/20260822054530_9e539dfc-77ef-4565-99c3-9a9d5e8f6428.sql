ALTER TABLE public.barcode_scan_events
  ADD COLUMN IF NOT EXISTS scan_source text,
  ADD COLUMN IF NOT EXISTS symbology text,
  ADD COLUMN IF NOT EXISTS api_results jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS barcode_scan_events_created_at_idx
  ON public.barcode_scan_events (created_at DESC);
CREATE INDEX IF NOT EXISTS barcode_scan_events_unresolved_idx
  ON public.barcode_scan_events (code) WHERE NOT resolved;

CREATE POLICY "Admins read all scan events"
  ON public.barcode_scan_events FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins read all barcode corrections"
  ON public.barcode_corrections FOR SELECT TO authenticated
  USING (public.is_admin());

-- Aggregates for the admin scan dashboard. Security definer so the admin page
-- reads project-wide counts without opening raw rows to every signed-in user;
-- the is_admin() guard inside keeps it admin-only.
CREATE OR REPLACE FUNCTION public.barcode_scan_stats(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(1, least(_days, 365)));
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  SELECT jsonb_build_object(
    'since', since,
    'totals', (
      SELECT jsonb_build_object(
        'scans', count(*),
        'resolved', count(*) FILTER (WHERE resolved),
        'unresolved', count(*) FILTER (WHERE NOT resolved),
        'p50_ms', percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms),
        'p95_ms', percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms)
      )
      FROM public.barcode_scan_events WHERE created_at >= since
    ),
    'by_scan_source', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT COALESCE(scan_source, 'unknown') AS scan_source,
               count(*) AS scans,
               count(*) FILTER (WHERE resolved) AS resolved,
               percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms
        FROM public.barcode_scan_events WHERE created_at >= since
        GROUP BY 1 ORDER BY count(*) DESC
      ) t
    ), '[]'::jsonb),
    'by_winning_source', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT COALESCE(source, 'none') AS source, count(*) AS scans
        FROM public.barcode_scan_events WHERE created_at >= since AND resolved
        GROUP BY 1 ORDER BY count(*) DESC
      ) t
    ), '[]'::jsonb),
    'by_category', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT COALESCE(category, 'unknown') AS category, count(*) AS scans
        FROM public.barcode_scan_events WHERE created_at >= since AND resolved
        GROUP BY 1 ORDER BY count(*) DESC
      ) t
    ), '[]'::jsonb),
    'by_api', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT r->>'api' AS api,
               count(*) AS calls,
               count(*) FILTER (WHERE (r->>'hit')::boolean) AS hits,
               count(*) FILTER (WHERE (r->>'error')::boolean) AS errors,
               round(avg((r->>'ms')::numeric)) AS avg_ms
        FROM public.barcode_scan_events e
        CROSS JOIN LATERAL jsonb_array_elements(e.api_results) r
        WHERE e.created_at >= since AND r->>'api' IS NOT NULL
        GROUP BY 1 ORDER BY count(*) DESC
      ) t
    ), '[]'::jsonb),
    'daily', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT date_trunc('day', created_at)::date AS day,
               count(*) AS scans,
               count(*) FILTER (WHERE resolved) AS resolved
        FROM public.barcode_scan_events WHERE created_at >= since
        GROUP BY 1 ORDER BY 1
      ) t
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.barcode_scan_stats(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.barcode_scan_stats(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.barcode_miss_report(_days integer DEFAULT 90, _limit integer DEFAULT 100)
RETURNS TABLE(
  code text,
  misses bigint,
  last_seen timestamptz,
  scan_sources text[],
  resolved_later boolean,
  cached_name text,
  cached_source text,
  cached_category text,
  corrections bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(1, least(_days, 365)));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  RETURN QUERY
  SELECT
    e.code,
    count(*)::bigint AS misses,
    max(e.created_at) AS last_seen,
    ARRAY(SELECT DISTINCT COALESCE(x.scan_source, 'unknown')
          FROM public.barcode_scan_events x
          WHERE x.code = e.code AND NOT x.resolved AND x.created_at >= since) AS scan_sources,
    EXISTS (
      SELECT 1 FROM public.barcode_scan_events r
      WHERE r.code = e.code AND r.resolved AND r.created_at >= since
    ) AS resolved_later,
    c.payload->>'name' AS cached_name,
    c.source AS cached_source,
    c.category AS cached_category,
    (SELECT count(*) FROM public.barcode_corrections bc WHERE bc.code = e.code)::bigint AS corrections
  FROM public.barcode_scan_events e
  LEFT JOIN public.barcode_cache c ON c.code = e.code
  WHERE NOT e.resolved AND e.created_at >= since
  GROUP BY e.code, c.payload, c.source, c.category
  ORDER BY count(*) DESC, max(e.created_at) DESC
  LIMIT greatest(1, least(_limit, 500));
END;
$$;

REVOKE ALL ON FUNCTION public.barcode_miss_report(integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.barcode_miss_report(integer, integer) TO authenticated;