-- Recreate App Store reviewer account to fix auth 500
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'appreview@doseroutine.com';
  v_password text := 'DoseReview2026!';
BEGIN
  -- Remove existing account and cascaded rows
  DELETE FROM auth.users WHERE lower(email) = v_email;

  -- Create fresh user (confirmed_at is generated, do not insert)
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(v_password, gen_salt('bf')),
    now(), now(), now(),
    jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
    jsonb_build_object('name','Apple Reviewer'),
    false,
    false, false
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id,
          jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
          'email', v_user_id::text, now(), now(), now());

  -- Ensure profile exists and is grandfathered
  INSERT INTO public.profiles (id, display_name, grandfathered, has_used_trial, is_adult, consented_at)
  VALUES (v_user_id, 'Apple Reviewer', true, false, true, now())
  ON CONFLICT (id) DO UPDATE
  SET grandfathered = true,
      display_name = COALESCE(public.profiles.display_name, 'Apple Reviewer');

  -- Ensure active Pro subscription
  INSERT INTO public.subscriptions (user_id, tier, status, provider, current_period_end, environment, entitlement)
  VALUES (v_user_id, 'pro', 'active', 'grandfathered', now() + interval '10 years', 'production', 'pro')
  ON CONFLICT DO NOTHING;
END $$;