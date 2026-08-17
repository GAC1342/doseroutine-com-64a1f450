DELETE FROM public.schedule_events se
USING public.user_compounds uc
WHERE se.user_compound_id = uc.id
  AND uc.frequency = 'weekly'
  AND uc.days_of_week IS NOT NULL
  AND array_length(uc.days_of_week, 1) > 0
  AND NOT (
    EXTRACT(ISODOW FROM (se.scheduled_at AT TIME ZONE COALESCE(
      (SELECT p.timezone FROM public.profiles p WHERE p.id = se.user_id),
      'UTC'
    )))::int = ANY(uc.days_of_week)
  );