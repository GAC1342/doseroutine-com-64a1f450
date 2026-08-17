CREATE OR REPLACE FUNCTION public.compound_content_status()
RETURNS TABLE (
  compound_id uuid,
  updated_at timestamptz,
  structure_image_url text,
  has_meta_title boolean,
  has_meta_description boolean,
  has_body_md boolean,
  lens jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cc.compound_id,
    cc.updated_at,
    cc.structure_image_url,
    coalesce(length(cc.meta_title), 0) > 0,
    coalesce(length(cc.meta_description), 0) > 0,
    coalesce(length(cc.body_md), 0) > 0,
    jsonb_build_object(
      'overview_md', coalesce(length(cc.overview_md), 0),
      'mechanism_md', coalesce(length(cc.mechanism_md), 0),
      'benefits_md', coalesce(length(cc.benefits_md), 0),
      'evidence_md', coalesce(length(cc.evidence_md), 0),
      'side_effects_md', coalesce(length(cc.side_effects_md), 0),
      'warnings_md', coalesce(length(cc.warnings_md), 0),
      'contraindications_md', coalesce(length(cc.contraindications_md), 0),
      'do_not_mix_md', coalesce(length(cc.do_not_mix_md), 0),
      'timing_md', coalesce(length(cc.timing_md), 0),
      'faq_md', coalesce(length(cc.faq_md), 0),
      'sources_md', coalesce(length(cc.sources_md), 0)
    )
  FROM public.compound_content cc
$$;

REVOKE ALL ON FUNCTION public.compound_content_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compound_content_status() TO service_role;