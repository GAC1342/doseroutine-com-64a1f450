# Social previews, food search, content QA, and deep links

## Goal
Make food-name lookup reliable, standardize branded share cards, harden SEO validation in pull requests, complete the 10 low-FAQ articles, and fix fragment/skip-link navigation.

## Implementation

### 1. Reliable food search
- Replace the deprecated Open Food Facts search endpoint with its current search API and send the required DoseRoutine user-agent.
- Normalize current API responses into the existing food-result shape.
- Merge results with DoseRoutine’s food catalog and USDA lookup so common foods such as eggs work even when the product service is unavailable.
- Preserve transient failure details instead of showing them as a genuine zero-result search; give the sheet distinct “no match” and “service unavailable” states.
- Add regression tests for eggs/yogurt results, transient upstream failures, empty results, and fallback behavior.

### 2. Automatic branded social images
- Extend the existing 1200×630 DoseRoutine card renderer to accept a page title and optional hero image, using a consistent coral/teal branded template.
- Generate cards and a manifest from route/article metadata, while preserving curated hero imagery as the visual source where available.
- Use one shared helper for `og:image` and `twitter:image`, including width, height, type, and descriptive alt text.
- Add a drift check so a PR fails when page metadata changes but its generated card/manifest was not refreshed.

### 3. Social-preview PR gates and reports
- Enhance `validate-social-meta.py` with JSON and Markdown reports and a baseline comparison that lists each changed tag per page (`old → new`).
- Validate both `og:image` and `twitter:image` URLs return HTTP 200 with an image content type and that decoded dimensions are at least 1200×630 with the expected share-card ratio.
- Add a key-route crawler smoke test using Facebook, X/Twitter, LinkedIn, and generic bot user agents; compare each rendered tag set for missing or inconsistent values. This validates scraper-facing responses without depending on third-party debugger endpoints that require authentication or cache published URLs.
- Run generation drift, image validation, and scraper smoke checks in the existing PR workflow and upload their reports.

### 4. Complete the 10 CMS article FAQs
- Add five topic-specific, medically cautious FAQs for: armodafinil, carbetocin, carbetocin dose, clonidine, Intuniv, longevity, longevity peptides, science of longevity, guanfacine uses, and Yuka app.
- Add an app-side fallback keyed by article slug so all ten pages immediately render at least five visible FAQs and valid `FAQPage` JSON-LD, merging without duplicating any FAQs returned by Opinly.
- Produce a CMS-ready editorial file containing the same questions and answers for long-term entry into Opinly.
- Raise content QA to require five FAQ questions on article/peptide pages and remove the warning-only exemption for these resolved routes.

### 5. Fertility fragments and skip links
- Harden compound hash navigation so `#benefits`, `#timing`, and `#side-effects` waits for accordion content to mount, opens the target, focuses/scrolls it with reduced-motion support, and responds to both first load and later hash navigation.
- Add an automated browser test that follows the three fertility deep links and verifies the correct accordion opens and receives focus/scroll targeting.
- Add `id="main-content"` and `tabIndex={-1}` to the genuinely missing public/supporting route landmarks, while retaining shared-shell targets already present on `/articles`.
- Add a static accessibility test to prevent future public routes from losing their skip-link target.

### 6. Actionable CI PR comment
- Generate one updateable PR comment from the internal-link, content-QA, social-meta, and image reports.
- Summarize pass/fail counts, list P0/P1 findings first, and include direct repository file/line references where route ownership can be resolved.
- Upload complete JSON/Markdown artifacts and post the comment even when an earlier gate fails.

## Verification
- Run focused food-search, social-meta, FAQ/JSON-LD, fragment-navigation, and skip-link tests.
- Run the updated validators against the local server and verify their generated reports.
- Test the food search in the authenticated preview with “eggs” and “vanilla yogurt.”
- Re-run live content QA to confirm the ten CMS-backed routes expose five FAQs each.
