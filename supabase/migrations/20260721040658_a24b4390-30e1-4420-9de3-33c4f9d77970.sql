
ALTER TABLE public.compound_content
  ADD COLUMN IF NOT EXISTS overview_md text,
  ADD COLUMN IF NOT EXISTS mechanism_md text,
  ADD COLUMN IF NOT EXISTS benefits_md text,
  ADD COLUMN IF NOT EXISTS evidence_md text,
  ADD COLUMN IF NOT EXISTS side_effects_md text,
  ADD COLUMN IF NOT EXISTS warnings_md text,
  ADD COLUMN IF NOT EXISTS contraindications_md text,
  ADD COLUMN IF NOT EXISTS do_not_mix_md text,
  ADD COLUMN IF NOT EXISTS timing_md text,
  ADD COLUMN IF NOT EXISTS faq_md text,
  ADD COLUMN IF NOT EXISTS sources_md text,
  ADD COLUMN IF NOT EXISTS structure_image_url text,
  ADD COLUMN IF NOT EXISTS pubchem_cid text;
