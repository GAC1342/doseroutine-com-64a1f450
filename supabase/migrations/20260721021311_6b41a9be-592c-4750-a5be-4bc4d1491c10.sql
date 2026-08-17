CREATE TABLE public.payment_go_live_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  UNIQUE (user_id)
);

CREATE INDEX payment_go_live_waitlist_user_id_idx ON public.payment_go_live_waitlist(user_id);

GRANT SELECT, INSERT ON public.payment_go_live_waitlist TO authenticated;
GRANT ALL ON public.payment_go_live_waitlist TO service_role;

ALTER TABLE public.payment_go_live_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add themselves to the waitlist" 
  ON public.payment_go_live_waitlist 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own waitlist entry" 
  ON public.payment_go_live_waitlist 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);