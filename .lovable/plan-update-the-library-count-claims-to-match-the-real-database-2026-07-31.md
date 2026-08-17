# Update the library count claims to match the real database

## What the numbers actually are

I queried the live compound library. Current real counts:

| Card | Says now | Actual | Verdict |
| --- | --- | --- | --- |
| Supplements | 300+ | 220 (168 supplement + 27 vitamin + 25 mineral) | **Overstated** |
| Peptides | 40+ | 94 (80 peptide + 14 GLP-1) | Understated |
| Hormones / HRT / TRT | 30+ | 42 | Understated |
| Everything else | 80+ | 120 | Understated |
| Total ("450+ compounds") | 450+ | 476 | Slightly understated |

So: three of the four are too low, but "Supplements 300+" is a claim we can't back — that's the one that actually matters, since an inaccurate marketing number is a real risk.

## Proposed changes

1. **Stat cards** (homepage and the app capability showcase, which share the same four cards):
   - Supplements: 300+ → **200+**
   - Peptides: 40+ → **90+**
   - Hormones / HRT / TRT: 30+ → **40+**
   - Everything else: 80+ → **120+**
2. **"450+ compounds"** → **"475+ compounds"** across public marketing copy (homepage, interaction checker, library pages, auth, trial, comparison page, calculators, about block, i18n strings including the Hindi copy).
3. Leave the code comment in the library generator alone — it's internal, not a claim.

## Technical notes

- Cards live in `src/routes/index.tsx` (~line 514) and `src/components/app-capability-showcase.tsx` (~line 58).
- The "450+" string appears in ~20 places; it will be swapped consistently, including the two i18n locales, so no locale drifts.
- Counts are rounded down to the nearest safe threshold so normal library growth never makes them false again.
