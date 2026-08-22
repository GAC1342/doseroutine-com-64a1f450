# Opinly AI blog setup for DoseRoutine

Copy-paste settings and instructions for the "Add item" form, tuned for AI search bots (ChatGPT, Perplexity, Google AI Overviews) and for driving signups to doseroutine.com.

## Form settings

- Mode: Full Post
- Location: United States (biggest search volume for these terms; Canada gets picked up anyway). Use Canada only if you want CA-first.
- Language: Default (English)
- Schedule: 2-3 posts per week, same days each week. Consistency matters more than volume.

## Keywords to start with

One keyword per item. Long, specific phrases win for a newer site:

1. retatrutide dosage calculator
2. how to reconstitute peptides step by step
3. tirzepatide vs semaglutide dosing schedule
4. bpc-157 dosage chart by body weight
5. peptide injection site rotation guide
6. how to track macros from a photo
7. glute workout at home 10 minutes
8. how many calories in a chicken breast (portion size guide)
9. peptide storage temperature and shelf life
10. blood work markers to track on a peptide protocol

## Custom instructions to paste into the AI (brand + linking rules)

Paste this block into the AI instruction / brief field (or into the keyword prompt if that's the only field):

```text
Brand: DoseRoutine (doseroutine.com) — an app for tracking peptide and
supplement doses, injection sites, workouts, and AI photo-based meal
macro logging.

Audience: adults self-managing peptide, GLP-1, supplement, and fitness
protocols. Informed but not clinicians. Plain English, no hype.

Voice: direct, practical, evidence-first. Short sentences. No fluff
intros ("In today's fast-paced world"). No emojis. No exclamation marks.

Structure every post:
- One H1 that contains the exact keyword.
- A 40-60 word direct answer paragraph immediately under the H1 that
  answers the query in full. This is the paragraph AI engines quote.
- H2 sections, each answering one specific sub-question phrased the way
  people search it.
- At least one table or numbered step list with concrete numbers
  (doses, mg, ml, grams, minutes, calories).
- A short "Common mistakes" H2.
- A 4-6 question FAQ H2, each answer 40-60 words, self-contained.
- A one-line "Last reviewed: <month year>" note.

Accuracy rules (non-negotiable):
- Never invent studies, statistics, or dosages. If a number is not
  verifiable, describe the range and say it varies.
- Cite sources inline with the source name and a link (PubMed, NIH,
  USDA FoodData Central, manufacturer labels, peer-reviewed journals).
- Include a one-sentence safety note: this is educational information,
  not medical advice; talk to a clinician before starting or changing a
  protocol.
- Never claim DoseRoutine diagnoses, treats, or prescribes anything.

Branding and links (include in every post):
- Mention DoseRoutine by name 2-3 times, naturally, only where the app
  actually solves the problem being discussed.
- Include exactly 3 links to our site:
  1. One contextual in-body link to the most relevant tool page, e.g.
     https://doseroutine.com/library/retatrutide-dosage for dosing
     posts, https://doseroutine.com/booty-workout for workout posts,
     https://doseroutine.com/manual for how-to posts.
  2. One link to https://doseroutine.com in the author/closing line.
  3. One closing call to action linking to
     https://doseroutine.com/auth?mode=signup with anchor text like
     "track this protocol free in DoseRoutine".
- Anchor text must describe the destination. Never "click here".
- Close with 2-3 sentences on how DoseRoutine handles the exact thing
  the article covers (dose logging, injection site rotation, photo meal
  macros, blood work trends) — feature-specific, not a generic pitch.

SEO fields:
- Title: under 60 characters, keyword near the front.
- Meta description: under 155 characters, states the answer, ends with
  a reason to click.
- Slug: short, hyphenated, keyword only, no dates or stop words.
- 1-2 internal links to other DoseRoutine blog posts on related topics.

Do not: keyword-stuff, pad word count, write hidden text, invent
testimonials or user counts, or compare us by name to competitors.
Target 1,200-1,800 words — long enough to be complete, no filler.
```

## Why this shape works for AI search

AI engines quote self-contained blocks: the 40-60 word answer under the H1, the FAQ answers, and the tables. Concrete numbers with named sources get cited far more than general prose. The links keep the citation attributable to doseroutine.com so mentions convert to visits.

## After the first few posts

- Check `/admin/blog-seo` for impressions and clicks per post.
- Add each new post URL to the sitemap feed so it gets discovered fast (this already runs automatically for our own blog routes; Opinly posts under `/articles` need a check that they appear in sitemap.xml).

## Technical follow-up in the app (optional, say the word)

- Verify Opinly-generated posts at `/articles` are listed in `sitemap.xml`.
- Add Article + FAQPage JSON-LD to the `/articles/$slug` route if Opinly does not emit it.
- Add a persistent signup CTA block to the article template so every post links to signup even if the AI omits it.
