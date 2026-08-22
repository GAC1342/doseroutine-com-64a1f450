# Harder tests for food matching: dosage forms, casing, missing synonyms

Add focused unit/integration tests around the parts of food matching that quietly go wrong when USDA data is messy: the same food in a different *form* (raw vs cooked, powder vs oil, juice vs whole fruit), names that differ only by casing/punctuation, and foods whose synonym is simply missing from our alias list.

## What gets tested

**1. Name normalization (`normalizeFoodName`)**
- Casing, extra whitespace, tabs/newlines, and punctuation collapse to the same key ("Chicken Breast", "CHICKEN  BREAST", "chicken-breast," style inputs).
- Characters USDA actually ships: registered/trademark marks, em dashes, accented letters ("Jalapeño", "Crème fraîche"), emoji, and "UPC: 0001234" suffixes.
- Preserved characters (`% , / -`) stay, since "2% milk" and "1/2 cup" must not lose meaning.
- 120-character cap and empty/whitespace/null-ish inputs return "".

**2. Dosage/preparation-form differences must never merge (`classifyDuplicate`)**
- raw vs cooked/roasted/grilled/fried/boiled chicken → verdict `none`, even when macros are close.
- whole vs skim vs lowfat milk; salted vs unsalted butter; sweetened vs unsweetened almond milk.
- Form pairs: orange vs orange juice, peanuts vs peanut butter powder vs peanut oil, wheat vs wheat flour, fresh vs dried vs frozen vs canned.
- Regression guard: a preparation conflict outranks a high token overlap and a matching barcode-less high score.
- Same GTIN still wins as `exact` (barcode is authoritative) — asserted explicitly so the conflict rule doesn't over-reach.

**3. Casing and punctuation insensitivity**
- ALL-CAPS branded USDA rows ("GREEK YOGURT, PLAIN") match mixed-case catalog rows as `exact` on identical normalized names.
- Alias matching is case-insensitive and punctuation-tolerant.
- Brand comparison ("Chobani" vs "CHOBANI ") treated as the same brand for the `probable` verdict.

**4. Missing-synonym behaviour (documenting the safe failure mode)**
- Known synonym pairs with no shared tokens — chickpeas/garbanzo beans, cilantro/coriander, courgette/zucchini, aubergine/eggplant, shrimp/prawns, soda/pop — currently produce `none`. Tests assert they fail *safely* (no false merge), not that they match.
- Spelling variants that do share tokens — "yoghurt" vs "yogurt", "doughnut" vs "donut" — asserted for current behaviour so a future synonym table changing them is a deliberate, visible change.
- Adding the synonym as an alias flips the pair to a `strong` alias match — proves the intended fix path works.

**5. USDA-shaped integration cases**
- Rows carrying `, NFS`, `, raw`, `Includes foods for USDA's Food Distribution Program`, and `UPC:` noise still dedupe correctly against clean catalog names.
- `bestDuplicate` / `findDuplicatePairs` ranking when several near-matches exist and one has a conflicting form.
- Macro tolerance edges: tiny absolute macro differences (0.4 g vs 0.6 g fat) count as close; a 40% kcal gap does not.

## Technical notes

- New file `src/lib/__tests__/food-matching-edge-cases.test.ts` (vitest, pure functions only — no network, no database).
- Imports `classifyDuplicate`, `bestDuplicate`, `findDuplicatePairs`, `normalizeTokens`, `tokenOverlap`, `conflictingQualifiers`, `macrosClose` from `src/lib/food-dedupe.ts` and `normalizeFoodName` from `src/lib/food-db.server.ts` (a pure string helper — importing it pulls no client).
- Add a `test:food-matching` script to `package.json` and include it in the existing test/CI grouping alongside `test:usda-contract`.
- No production code changes planned. If a test uncovers a real defect (for example a form word missing from the distinguishing-token list), the fix is a minimal addition to `food-dedupe.ts` reported back with the test that caught it.
