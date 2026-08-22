CREATE TABLE public.food_admin_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  food_id uuid,
  label text,
  before jsonb,
  after jsonb,
  reverted_at timestamp with time zone,
  reverted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX food_admin_audit_created_idx ON public.food_admin_audit (created_at DESC);
CREATE INDEX food_admin_audit_food_idx ON public.food_admin_audit (food_id);

GRANT SELECT ON public.food_admin_audit TO authenticated;
GRANT ALL ON public.food_admin_audit TO service_role;

ALTER TABLE public.food_admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read the food catalog audit log"
ON public.food_admin_audit
FOR SELECT
TO authenticated
USING (public.is_admin());