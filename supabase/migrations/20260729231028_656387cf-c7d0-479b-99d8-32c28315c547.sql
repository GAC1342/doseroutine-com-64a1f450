ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS comp_access_until timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  new.has_used_trial := old.has_used_trial;
  new.grandfathered := old.grandfathered;
  new.comp_access_until := old.comp_access_until;
  return new;
end
$function$;

CREATE TABLE IF NOT EXISTS public.comp_codes (
  code text PRIMARY KEY,
  months integer NOT NULL DEFAULT 2,
  issued_to_email text,
  reason text NOT NULL DEFAULT 'closed_testing',
  redeemed_by uuid,
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.comp_codes TO service_role;

ALTER TABLE public.comp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view comp codes"
  ON public.comp_codes FOR SELECT
  TO authenticated
  USING (public.is_admin());