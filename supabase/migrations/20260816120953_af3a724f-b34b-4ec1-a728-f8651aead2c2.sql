CREATE TABLE public.manual_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_id)
);

ALTER TABLE public.manual_bookmarks ADD CONSTRAINT manual_bookmarks_section_len CHECK (char_length(section_id) BETWEEN 1 AND 100);

GRANT SELECT, INSERT, DELETE ON public.manual_bookmarks TO authenticated;
GRANT ALL ON public.manual_bookmarks TO service_role;

ALTER TABLE public.manual_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own manual bookmarks"
  ON public.manual_bookmarks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own manual bookmarks"
  ON public.manual_bookmarks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own manual bookmarks"
  ON public.manual_bookmarks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);