
-- Lock down helper functions (they are only invoked by triggers/views)
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Recreate admin views as SECURITY DEFINER so is_admin() runs as owner
drop view if exists public.admin_overview;
drop view if exists public.admin_signups_by_day;
drop view if exists public.admin_tier_breakdown;
drop view if exists public.admin_top_categories;

create view public.admin_overview
  with (security_invoker = false) as
  select
    (select count(*) from public.profiles)                                as total_users,
    (select count(*) from public.profiles where consented_at is not null) as onboarded_users,
    (select count(*) from public.subscriptions where tier = 'plus')       as plus_users,
    (select count(*) from public.subscriptions where tier = 'pro')        as pro_users,
    (select count(*) from public.profiles where created_at > now() - interval '7 days')  as signups_7d,
    (select count(*) from public.profiles where created_at > now() - interval '30 days') as signups_30d
  where public.is_admin();

create view public.admin_signups_by_day
  with (security_invoker = false) as
  select date_trunc('day', created_at) as day, count(*) as signups
  from public.profiles
  where public.is_admin()
  group by 1 order by 1 desc;

create view public.admin_tier_breakdown
  with (security_invoker = false) as
  select coalesce(tier::text,'free') as tier, count(*) as users
  from public.subscriptions
  where public.is_admin()
  group by 1;

create view public.admin_top_categories
  with (security_invoker = false) as
  select c.category, count(*) as adds
  from public.user_compounds uc join public.compounds c on c.id = uc.compound_id
  where public.is_admin()
  group by 1 order by 2 desc;

grant select on public.admin_overview, public.admin_signups_by_day,
  public.admin_tier_breakdown, public.admin_top_categories to authenticated;
