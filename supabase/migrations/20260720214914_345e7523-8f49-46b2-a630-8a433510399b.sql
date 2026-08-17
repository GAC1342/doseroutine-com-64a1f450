
-- ENUMS
create type audience_tier as enum ('optimizer','glp1','everyday');
create type unit_pref     as enum ('metric','imperial');
create type sex_enum      as enum ('male','female','other','prefer_not');
create type compound_cat  as enum ('vitamin','mineral','supplement','peptide','hormone','glp1','medication');
create type dose_unit_enum as enum ('mg','mcg','iu','g','ml');
create type timing_enum   as enum ('morning','evening','pre_workout','with_meal','bedtime','any');
create type food_rule_enum as enum ('with_food','empty_stomach','either');
create type freq_enum      as enum ('daily','weekly','custom');
create type severity_enum  as enum ('synergy','note','caution','avoid');
create type event_status   as enum ('pending','taken','skipped','missed');
create type channel_enum   as enum ('push','email','sms');
create type sub_tier       as enum ('free','plus','pro');

-- PROFILES
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  dob            date,
  sex            sex_enum,
  height_cm      numeric,
  weight_kg      numeric,
  unit_pref      unit_pref default 'metric',
  timezone       text default 'UTC',
  audience_tier  audience_tier default 'everyday',
  goals          text[] default '{}',
  is_adult       boolean default false,
  consented_at   timestamptz,
  notify_email   boolean default true,
  notify_push    boolean default false,
  notify_sms     boolean default false,
  quiet_hours_start time,
  quiet_hours_end   time,
  coach_enabled  boolean default true,
  coach_tone     text default 'kind',
  created_at     timestamptz default now()
);

-- COMPOUNDS
create table public.compounds (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text unique not null,
  aliases        text[] default '{}',
  category       compound_cat not null,
  default_unit   dose_unit_enum,
  half_life_hours numeric,
  typical_timing timing_enum default 'any',
  food_rule      food_rule_enum default 'either',
  is_controlled  boolean default false,
  is_injectable  boolean default false,
  hypo_risk      boolean default false,
  rda_low        numeric,
  rda_high       numeric,
  upper_limit    numeric,
  education_md   text,
  created_at     timestamptz default now(),
  constraint no_dose_for_controlled check (
    is_controlled = false
    or (rda_low is null and rda_high is null and upper_limit is null)
  )
);

-- USER STACK
create table public.user_compounds (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  compound_id    uuid references public.compounds(id),
  custom_name    text,
  custom_category compound_cat,
  rxcui          text,
  is_prescription boolean default false,
  dose_amount    numeric,
  dose_unit      dose_unit_enum,
  frequency      freq_enum default 'daily',
  days_of_week   int[] default '{}',
  times_of_day   text[] default '{}',
  with_food      boolean,
  post_workout   boolean default false,
  start_date     date default current_date,
  end_date       date,
  cycle_on_days  int,
  cycle_off_days int,
  active         boolean default true,
  notes          text,
  created_at     timestamptz default now(),
  constraint library_or_custom check (
    compound_id is not null or custom_name is not null
  )
);

-- INTERACTION RULES
create table public.interaction_rules (
  id             uuid primary key default gen_random_uuid(),
  compound_a_id  uuid references public.compounds(id),
  compound_b_id  uuid references public.compounds(id),
  category_a     compound_cat,
  category_b     compound_cat,
  severity       severity_enum not null,
  mechanism      text not null,
  recommendation text not null,
  separation_hours numeric,
  same_axis      boolean default false,
  source_refs    text[] default '{}',
  created_at     timestamptz default now(),
  constraint pair_or_category check (
    (compound_a_id is not null and compound_b_id is not null)
    or (category_a is not null and category_b is not null)
  )
);

-- SCHEDULE EVENTS
create table public.schedule_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  user_compound_id uuid not null references public.user_compounds(id) on delete cascade,
  scheduled_at     timestamptz not null,
  dose_amount      numeric,
  dose_unit        dose_unit_enum,
  status           event_status default 'pending',
  taken_at         timestamptz,
  note             text,
  created_at       timestamptz default now()
);
create index on public.schedule_events (user_id, scheduled_at);
create index on public.schedule_events (status, scheduled_at);

-- REMINDERS
create table public.reminders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  user_compound_id uuid references public.user_compounds(id) on delete cascade,
  channel          channel_enum not null,
  lead_time_minutes int default 0,
  enabled          boolean default true,
  created_at       timestamptz default now()
);

-- NOTIFICATION LOG
create table public.notification_log (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  schedule_event_id uuid references public.schedule_events(id) on delete cascade,
  channel           channel_enum not null,
  sent_at           timestamptz default now(),
  status            text
);

-- PLANS
create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  goal          text not null,
  generated_at  timestamptz default now(),
  plan_json     jsonb,
  warnings_json jsonb
);

-- INJECTION SITES
create table public.injection_sites (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  user_compound_id uuid references public.user_compounds(id) on delete cascade,
  site             text not null,
  used_at          timestamptz default now()
);

-- MEALS
create table public.meals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  photo_url      text,
  label          text,
  est_calories   numeric,
  est_protein_g  numeric,
  est_carbs_g    numeric,
  est_fat_g      numeric,
  adj_calories   numeric,
  adj_protein_g  numeric,
  adj_carbs_g    numeric,
  adj_fat_g      numeric,
  was_adjusted   boolean default false,
  logged_at      timestamptz default now()
);
create index on public.meals (user_id, logged_at);

-- ADMINS
create table public.admins (
  email      text primary key,
  added_at   timestamptz default now()
);

-- WORKOUT SESSIONS
create table public.workout_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  label          text,
  kind           text default 'weights',
  days_of_week   int[] default '{}',
  planned_time   text,
  pre_lead_min   int default 60,
  pre_alert_on   boolean default true,
  at_time_alert_on boolean default true,
  post_window_min int default 45,
  started_at     timestamptz,
  ended_at       timestamptz,
  active         boolean default true,
  created_at     timestamptz default now()
);
create index on public.workout_sessions (user_id, planned_time);

-- ACKNOWLEDGMENTS
create table public.acknowledgments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  subject         text not null,
  ref_a           text,
  ref_b           text,
  severity        severity_enum,
  warning_text    text,
  acknowledged_at timestamptz default now()
);

-- SUBSCRIPTIONS
create table public.subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  tier               sub_tier default 'free',
  status             text default 'active',
  provider           text,
  current_period_end timestamptz
);

-- ============================================================
-- GRANTS
-- ============================================================
grant select, insert, update, delete on public.profiles         to authenticated;
grant select, insert, update, delete on public.user_compounds   to authenticated;
grant select, insert, update, delete on public.schedule_events  to authenticated;
grant select, insert, update, delete on public.reminders        to authenticated;
grant select, insert, update, delete on public.notification_log to authenticated;
grant select, insert, update, delete on public.plans            to authenticated;
grant select, insert, update, delete on public.injection_sites  to authenticated;
grant select, insert, update, delete on public.subscriptions    to authenticated;
grant select, insert, update, delete on public.acknowledgments  to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.meals            to authenticated;
grant select on public.compounds         to authenticated;
grant select on public.interaction_rules to authenticated;
grant select on public.admins            to authenticated;
grant all on public.profiles, public.user_compounds, public.schedule_events,
  public.reminders, public.notification_log, public.plans, public.injection_sites,
  public.subscriptions, public.acknowledgments, public.workout_sessions,
  public.meals, public.compounds, public.interaction_rules, public.admins
  to service_role;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.user_compounds    enable row level security;
alter table public.schedule_events   enable row level security;
alter table public.reminders         enable row level security;
alter table public.notification_log  enable row level security;
alter table public.plans             enable row level security;
alter table public.injection_sites   enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.acknowledgments   enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.meals             enable row level security;
alter table public.compounds         enable row level security;
alter table public.interaction_rules enable row level security;
alter table public.admins            enable row level security;

create policy own_profiles on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_user_compounds on public.user_compounds
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_schedule_events on public.schedule_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_reminders on public.reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_notification_log on public.notification_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_plans on public.plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_injection_sites on public.injection_sites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_subscriptions on public.subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_acknowledgments on public.acknowledgments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_workout_sessions on public.workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_meals on public.meals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy read_compounds on public.compounds
  for select to authenticated using (true);
create policy read_rules on public.interaction_rules
  for select to authenticated using (true);

create policy admin_self_read on public.admins
  for select to authenticated using (lower(email) = lower(auth.jwt()->>'email'));

-- Admin helper
create or replace function public.is_admin() returns boolean
  language sql stable security definer
  set search_path = public
  as $$
    select exists (
      select 1 from public.admins where lower(email) = lower(auth.jwt()->>'email')
    );
  $$;

-- ============================================================
-- ADMIN AGGREGATE VIEWS
-- ============================================================
create view public.admin_overview
  with (security_invoker = true) as
  select
    (select count(*) from public.profiles)                                as total_users,
    (select count(*) from public.profiles where consented_at is not null) as onboarded_users,
    (select count(*) from public.subscriptions where tier = 'plus')       as plus_users,
    (select count(*) from public.subscriptions where tier = 'pro')        as pro_users,
    (select count(*) from public.profiles where created_at > now() - interval '7 days')  as signups_7d,
    (select count(*) from public.profiles where created_at > now() - interval '30 days') as signups_30d
  where public.is_admin();

create view public.admin_signups_by_day
  with (security_invoker = true) as
  select date_trunc('day', created_at) as day, count(*) as signups
  from public.profiles
  where public.is_admin()
  group by 1 order by 1 desc;

create view public.admin_tier_breakdown
  with (security_invoker = true) as
  select coalesce(tier::text,'free') as tier, count(*) as users
  from public.subscriptions
  where public.is_admin()
  group by 1;

create view public.admin_top_categories
  with (security_invoker = true) as
  select c.category, count(*) as adds
  from public.user_compounds uc join public.compounds c on c.id = uc.compound_id
  where public.is_admin()
  group by 1 order by 2 desc;

grant select on public.admin_overview, public.admin_signups_by_day,
  public.admin_tier_breakdown, public.admin_top_categories to authenticated;

-- ============================================================
-- Auto-create profile row on new auth user
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
