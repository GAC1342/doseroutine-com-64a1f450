-- Grandfather the appreview account created via public signup
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'appreview@doseroutine.com';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'appreview user not found';
  END IF;

  INSERT INTO public.profiles (id, display_name, grandfathered, has_used_trial, is_adult, consented_at)
  VALUES (v_user_id, 'Apple Reviewer', true, false, true, now())
  ON CONFLICT (id) DO UPDATE
  SET grandfathered = true,
      display_name = COALESCE(public.profiles.display_name, 'Apple Reviewer');

  INSERT INTO public.subscriptions (user_id, tier, status, provider, current_period_end, environment, entitlement)
  VALUES (v_user_id, 'pro', 'active', 'grandfathered', now() + interval '10 years', 'production', 'pro')
  ON CONFLICT DO NOTHING;
END $$;