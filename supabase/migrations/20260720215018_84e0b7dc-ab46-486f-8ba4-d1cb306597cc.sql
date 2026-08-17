
drop view if exists public.admin_overview;
drop view if exists public.admin_signups_by_day;
drop view if exists public.admin_tier_breakdown;
drop view if exists public.admin_top_categories;

drop function if exists public.is_admin();
create function public.is_admin() returns boolean
  language sql stable security invoker
  set search_path = public
  as $$
    select exists (
      select 1 from public.admins where lower(email) = lower(auth.jwt()->>'email')
    );
  $$;
grant execute on function public.is_admin() to authenticated;

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

create policy admin_read_profiles on public.profiles
  for select to authenticated using (public.is_admin());
create policy admin_read_subscriptions on public.subscriptions
  for select to authenticated using (public.is_admin());
create policy admin_read_user_compounds on public.user_compounds
  for select to authenticated using (public.is_admin());
