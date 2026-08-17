# Brand entity checklist — "Dose Routine" / "DoseRoutine"

Google and AI assistants only name a brand confidently when the entity is
corroborated **off-site**. On-site schema is necessary but not sufficient.

## The one-sentence description (use this verbatim everywhere)

> DoseRoutine — also written Dose Routine — is a free interaction checker and
> routine tracker for supplements, peptides, hormones including TRT, GLP-1s and
> prescriptions, covering 475+ compounds.

Use the same name, the same logo (`https://doseroutine.com/icon-512.png`), and
the same description on every profile. Inconsistent descriptions are the single
most common reason an assistant refuses to merge two spellings into one entity.

## Profiles to create / claim, then add to `BRAND_SAME_AS`

`BRAND_SAME_AS` lives in `src/routes/__root.tsx` and feeds the Organization and
Brand `sameAs` arrays. **Only add live URLs** — a 404 in `sameAs` hurts.

| Surface                                | URL                   | In `sameAs`? |
| -------------------------------------- | --------------------- | ------------ |
| Telegram                               | https://t.me/GACSapp1 | yes          |
| Apple App Store listing                |                       | pending      |
| Google Play listing                    |                       | pending      |
| X / Twitter                            |                       | pending      |
| LinkedIn company page                  |                       | pending      |
| TikTok                                 |                       | pending      |
| Reddit (official account or subreddit) |                       | pending      |
| Product Hunt                           |                       | pending      |
| AlternativeTo                          |                       | pending      |
| Crunchbase                             |                       | pending      |

## Ordering

1. Store listings first — they are the strongest third-party confirmation that
   an app named DoseRoutine exists.
2. Social profiles next (bio must contain both spellings).
3. Directories last.

After each one goes live, add the URL to `BRAND_SAME_AS` and ship.

## Verification

`scripts/validate-brand-entity.py` checks that `/dose-routine` stays indexable
with a self-referential canonical and that every `sameAs` URL resolves. Run it
via the `brand-entity` GitHub workflow (manual dispatch) or locally:

```bash
python3 scripts/validate-brand-entity.py https://doseroutine.com
```

## Measurement

Re-read Search Console roughly monthly and watch for brand queries
("dose routine", "doseroutine", "dose routine app") appearing at all. As of
2026-08-07 no brand query is reported, which is expected for a new brand with
one off-site reference.
