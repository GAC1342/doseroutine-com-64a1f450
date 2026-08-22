-- Scope public reference-catalog reads to explicit roles instead of the
-- catch-all `public` role, so future non-app roles are not implicitly granted.
DROP POLICY IF EXISTS "Food catalog is readable by everyone" ON public.foods;
CREATE POLICY "Food catalog is readable by anon and authenticated"
  ON public.foods FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Food portions are readable by everyone" ON public.food_portions;
CREATE POLICY "Food portions are readable by anon and authenticated"
  ON public.food_portions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Food aliases are readable by everyone" ON public.food_aliases;
CREATE POLICY "Food aliases are readable by anon and authenticated"
  ON public.food_aliases FOR SELECT TO anon, authenticated USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.foods FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.food_portions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.food_aliases FROM anon, authenticated;
GRANT SELECT ON public.foods, public.food_portions, public.food_aliases TO anon, authenticated;
GRANT ALL ON public.foods, public.food_portions, public.food_aliases TO service_role;

-- product_labels: cached third-party label data. Reads for signed-in users,
-- writes are server-side only. Make the deny explicit rather than implicit.
REVOKE INSERT, UPDATE, DELETE ON public.product_labels FROM anon, authenticated;
GRANT SELECT ON public.product_labels TO authenticated;
GRANT ALL ON public.product_labels TO service_role;

DROP POLICY IF EXISTS "Only service role can write cached product labels" ON public.product_labels;
CREATE POLICY "Only service role can write cached product labels"
  ON public.product_labels FOR ALL TO service_role USING (true) WITH CHECK (true);