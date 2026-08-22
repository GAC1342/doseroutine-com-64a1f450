# Winning more traffic from Google and AI answer engines

Your library is the asset almost no competitor has: hundreds of compound
reference pages. Right now those pages explain what a compound is, but they
never say how to actually track it — which is exactly the sentence an AI answer
would quote DoseRoutine for. This plan turns the library into a tracking-intent
engine and builds the competitor pages that are missing.

## What exists today

- Library compound pages (`/library/<slug>`) with mechanism, benefits, dosing,
  side effects, interactions — no "how to track doses" section, and no link
  from a compound page into the comparison or roundup pages.
- Roundup pages already live: best peptide / supplement / TRT / GLP-1 /
  medication-reminder trackers, plus `/alternatives` and a `/vs` hub.
- Comparison pages exist for Medisafe, MyTherapy, Cronometer, Round Health,
  Pill Reminder, Supplement Planner.
- No page anywhere mentions Peptide Tracker or OptiPin — the two competitors
  most likely to be cited in peptide roundups and Reddit threads.

## The work, in the sequence you outlined

### 1. Roundup post first (ranks for many queries at once)

Build one flagship roundup: **Best peptide and hormone dose trackers** — a
single page that names every real competitor (Peptide Tracker, OptiPin,
Medisafe, MyTherapy, Round Health, Cronometer, spreadsheets) with an honest
comparison table: reconstitution math, injection-site rotation, interaction
checking, labs, cost, platforms. Honest coverage of rivals is what gets a page
quoted by AI engines; a page that only praises itself gets skipped.

### 2. "Alternatives" pages for the highest-volume competitors

Add `/vs/peptide-tracker` and `/vs/optipin`, matching the existing `/vs/*`
template exactly (comparison table, when-to-pick-them section, FAQ, schema).
Before building, validate which competitor names actually get searched using
Semrush keyword data, so we build the two with real demand rather than
guessing.

### 3. Tracking sections on compound pages

Add a "How to track <compound> doses" block to every compound page, generated
from the data already on that record so no two are identical:

- The practical schedule (frequency, timing, with/without food) pulled from the
  existing dosing and timing content.
- What to log for this specific compound (units, reconstitution for peptides,
  labs to re-check for hormones, side effects to watch).
- A short "Track <compound> in DoseRoutine" step list.
- Links out to the matching calculator, the interaction checker, and the
  relevant roundup or `/vs` page.

This section is the AI-citation surface: a self-contained, compound-specific
answer to "how do I track my <compound> doses", which is the exact query shape
answer engines resolve.

### 4. Interlinking

- Every compound page links to its category roundup and one `/vs` page.
- Every roundup and `/vs` page links back to 5–8 relevant compound pages.
- The `/vs` hub and `/alternatives` link to the new roundup.

This closes the loop so crawlers and AI retrievers see the library and the
commercial pages as one connected topic cluster instead of two islands.

### 5. Sitemap and structured data

New pages get added to `sitemap.xml` with the right priority, and the tracking
section gets a `HowTo`-style block inside the existing compound schema graph so
the steps are machine-readable.

## Off-site: getting on pages that already mention competitors

This part cannot be built in code — it is outreach — but I can prepare it:

- A generated **source-gap list**: pages and threads citing Peptide Tracker,
  OptiPin, or Medisafe that never mention DoseRoutine, with the author or
  subreddit and a suggested angle for each.
- Ready-to-send outreach drafts for roundup authors, and a short honest
  "what DoseRoutine does differently" paragraph you can paste into forum
  replies without it reading as spam.

Say the word and I'll pull that gap list; it needs Semrush/Opinly data rather
than a code change.

## Technical notes

- Tracking sections render from existing `compound_content` fields plus a
  category-aware template in a new `src/lib/compound-tracking.ts`; nothing is
  invented, and any compound missing dosing data simply omits the block.
- New routes reuse `PageProse` / `ProseContainer` / `RelatedLinks` and the
  `/vs/medisafe` head pattern, so canonical, og, twitter and Article schema stay
  consistent.
- Interlinks come from a single mapping module so a compound's category decides
  its roundup and comparison targets — no hand-maintained link lists.
- Head-node budget and micromarkup CI gates still apply; the new schema goes
  into the existing `@graph` rather than a new script tag.

## Order of delivery

1. Flagship roundup page.
2. Semrush check, then the two competitor alternatives pages.
3. Compound tracking sections + interlinking + sitemap/schema.
4. Source-gap outreach list on request.
