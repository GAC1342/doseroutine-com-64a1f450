create policy "No direct app access — server-side only"
on public.closed_testing_signups
for all
using (false)
with check (false);
