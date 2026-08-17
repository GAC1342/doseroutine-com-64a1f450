-- Update appreview identity to match Supabase Auth expectations
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'appreview@doseroutine.com';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_email;
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.identities
    SET provider_id = v_user_id::text,
        identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false)
    WHERE user_id = v_user_id AND provider = 'email';
  END IF;
END $$;