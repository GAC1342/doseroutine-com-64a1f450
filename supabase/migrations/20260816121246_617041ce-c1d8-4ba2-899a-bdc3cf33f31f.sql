ALTER TABLE public.manual_bookmarks
  ADD COLUMN IF NOT EXISTS removed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

GRANT UPDATE ON public.manual_bookmarks TO authenticated;

DROP POLICY IF EXISTS "Users can update their own manual bookmarks" ON public.manual_bookmarks;
CREATE POLICY "Users can update their own manual bookmarks"
  ON public.manual_bookmarks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);