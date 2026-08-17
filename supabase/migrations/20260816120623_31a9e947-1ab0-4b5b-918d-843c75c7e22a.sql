CREATE TABLE public.manual_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'confusing',
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_feedback ADD CONSTRAINT manual_feedback_message_len CHECK (char_length(message) BETWEEN 1 AND 2000);
ALTER TABLE public.manual_feedback ADD CONSTRAINT manual_feedback_kind_valid CHECK (kind IN ('confusing','suggestion','error'));
ALTER TABLE public.manual_feedback ADD CONSTRAINT manual_feedback_chapter_len CHECK (char_length(chapter_id) <= 100 AND char_length(chapter_title) <= 200);

GRANT SELECT, INSERT ON public.manual_feedback TO authenticated;
GRANT ALL ON public.manual_feedback TO service_role;

ALTER TABLE public.manual_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own manual feedback"
  ON public.manual_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit their own manual feedback"
  ON public.manual_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX manual_feedback_chapter_idx ON public.manual_feedback (chapter_id, created_at DESC);