CREATE TABLE public.outrank_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    target_keyword TEXT,
    answer TEXT,
    body TEXT NOT NULL,
    body_format TEXT DEFAULT 'markdown',
    faqs JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft',
    featured_image_url TEXT,
    lang TEXT DEFAULT 'en',
    published_at TIMESTAMPTZ,
    modified_at TIMESTAMPTZ DEFAULT now(),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.outrank_articles TO anon;
GRANT SELECT ON public.outrank_articles TO authenticated;
GRANT ALL ON public.outrank_articles TO service_role;

ALTER TABLE public.outrank_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published outrank articles are publicly readable"
    ON public.outrank_articles
    FOR SELECT
    USING (status = 'published');

CREATE OR REPLACE FUNCTION public.update_outrank_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_outrank_articles_updated_at
    BEFORE UPDATE ON public.outrank_articles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_outrank_articles_updated_at();