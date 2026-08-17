create type public.interaction_confidence as enum ('established','plausible','theoretical','disputed');

alter table public.interaction_rules
  add column confidence public.interaction_confidence not null default 'theoretical',
  add column mechanism_shared_with text,
  add column no_known_interaction boolean not null default false;

with shared as (
  select mechanism from public.interaction_rules
  where mechanism is not null and btrim(mechanism) <> ''
  group by mechanism having count(*) > 1
)
update public.interaction_rules ir
set mechanism_shared_with = s.mechanism
from shared s
where s.mechanism = ir.mechanism;