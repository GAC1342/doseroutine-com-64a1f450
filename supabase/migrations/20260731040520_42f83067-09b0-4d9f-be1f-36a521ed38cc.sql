alter table public.closed_testing_signups drop constraint if exists closed_testing_signups_platform_preference_check;
alter table public.closed_testing_signups add constraint closed_testing_signups_platform_preference_check
  check (platform_preference in ('android', 'android_phone', 'android_tablet', 'ios', 'both'));