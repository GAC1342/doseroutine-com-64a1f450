ALTER TABLE public.user_compounds
  ADD CONSTRAINT user_compounds_identity_ck
  CHECK (compound_id IS NOT NULL OR (custom_name IS NOT NULL AND btrim(custom_name) <> ''));