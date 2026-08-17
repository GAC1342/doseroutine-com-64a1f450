
CREATE TABLE public.vial_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_compound_id uuid NOT NULL UNIQUE REFERENCES public.user_compounds(id) ON DELETE CASCADE,
  doses_remaining numeric NOT NULL DEFAULT 0,
  total_doses numeric,
  low_threshold numeric NOT NULL DEFAULT 3,
  last_refilled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vial_inventory TO authenticated;
GRANT ALL ON public.vial_inventory TO service_role;

ALTER TABLE public.vial_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_vial_inventory"
  ON public.vial_inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_compounds uc
      WHERE uc.id = vial_inventory.user_compound_id
        AND uc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_compounds uc
      WHERE uc.id = vial_inventory.user_compound_id
        AND uc.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_vial_inventory_updated_at
  BEFORE UPDATE ON public.vial_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-decrement/increment on dose status change
CREATE OR REPLACE FUNCTION public.adjust_vial_on_dose_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta numeric := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'taken' THEN delta := -1; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'taken' AND (OLD.status IS DISTINCT FROM 'taken') THEN
      delta := -1;
    ELSIF OLD.status = 'taken' AND (NEW.status IS DISTINCT FROM 'taken') THEN
      delta := 1;
    END IF;
  END IF;

  IF delta <> 0 AND NEW.user_compound_id IS NOT NULL THEN
    UPDATE public.vial_inventory
       SET doses_remaining = GREATEST(0, doses_remaining + delta)
     WHERE user_compound_id = NEW.user_compound_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER schedule_events_adjust_vial
  AFTER INSERT OR UPDATE OF status ON public.schedule_events
  FOR EACH ROW EXECUTE FUNCTION public.adjust_vial_on_dose_change();
