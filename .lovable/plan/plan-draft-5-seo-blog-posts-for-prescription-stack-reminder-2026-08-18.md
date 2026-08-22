# Plan: Draft 5 SEO Blog Posts for Prescription & Stack Reminder Keywords

## Goal
Create 5 publish-ready SEO article drafts targeting the high-intent keywords Semrush surfaced around prescription management, medication reminders, and stack tracking. Drafts will be formatted so they can be pasted into Opinly or used as static content.

## Target keyword map

| # | Primary keyword | Volume | Post angle | Slug |
|---|---|---|---|---|
| 1 | best apps for managing prescriptions | 2,900/mo | Comparison/listicle for prescription + supplement stack management | best-apps-managing-prescriptions |
| 2 | medication reminder app | 1,900/mo | Buyer’s guide: features, privacy, dosing accuracy | medication-reminder-app |
| 3 | pill reminder app | 1,600/mo | Focused review of simple pill reminders vs full protocol trackers | pill-reminder-app |
| 4 | best apps for health | 14,800/mo | Broad listicle with a stack/protocol tracking angle | best-apps-for-health |
| 5 | how to set up medication reminder in health app | 50/mo + related | Tutorial-style post showing setup best practices | set-up-medication-reminder-health-app |

## Draft format for each post
Each draft file will include:
- Title (H1)
- Meta title (≤ 60 chars)
- Meta description (≤ 160 chars)
- Target keyword
- Suggested slug
- Recommended Open Graph image concept
- Answer-first intro (`.dr-speakable-answer`)
- 4–6 H2 sections with bullet/numbered content
- 3–5 FAQ items (for `buildFaqJsonLd`)
- Internal link suggestions to DoseRoutine features
- Editorial disclaimer footnote

## File output
Create 5 Markdown drafts under `src/content/article-drafts/`:
- `01-best-apps-managing-prescriptions.md`
- `02-medication-reminder-app.md`
- `03-pill-reminder-app.md`
- `04-best-apps-for-health.md`
- `05-set-up-medication-reminder-health-app.md`

## Validation
- Run each title/description through length checks.
- Confirm primary keyword appears in H1, first paragraph, and one H2.
- Ensure no disallowed medical claims; add "consult your provider" disclaimer.

## Next step after approval
User can review drafts and either:
- Paste them into Opinly as new `/articles` posts, or
- Ask me to publish them directly via the Opinly API if credentials allow.
