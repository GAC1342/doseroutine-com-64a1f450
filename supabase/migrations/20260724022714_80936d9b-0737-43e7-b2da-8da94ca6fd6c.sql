
DROP POLICY IF EXISTS "Anyone can read shared protocols" ON public.shared_protocols;

CREATE POLICY "Owners can read their own shared protocols"
  ON public.shared_protocols
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.get_shared_protocol(_token text)
RETURNS TABLE (
  token text,
  title text,
  snapshot jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.token, sp.title, sp.snapshot, sp.created_at
  FROM public.shared_protocols sp
  WHERE sp.token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_protocol(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_protocol(text) TO anon, authenticated;
