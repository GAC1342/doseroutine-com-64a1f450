-- product_labels is only read through the server-side service-role client
-- (src/lib/product-lookup-cache.server.ts). No app user needs direct access,
-- so remove the blanket authenticated read.
DROP POLICY IF EXISTS "Signed-in users can read cached product labels" ON public.product_labels;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.product_labels FROM anon, authenticated;
GRANT ALL ON public.product_labels TO service_role;