ALTER TABLE public.profiles DISABLE TRIGGER profiles_protect_billing_cols;
UPDATE public.profiles p
SET grandfathered = true, is_adult = true, consented_at = COALESCE(p.consented_at, now())
FROM auth.users u
WHERE u.id = p.id AND lower(u.email) = 'playreview@doseroutine.com';
ALTER TABLE public.profiles ENABLE TRIGGER profiles_protect_billing_cols;