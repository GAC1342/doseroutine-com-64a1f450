/**
 * Property-based fuzz tests for duplicate detection.
 *
 * Catalog names arrive from USDA, Open Food Facts and hand entry, so the same
 * food shows up as "Chicken breast, cooked", "CHICKEN BREAST (COOKED)" and
 * "Poulet — crème". The rule that must never bend: two foods whose names
 * disagree on a preparation/form qualifier (cooked vs frozen, whole vs skim)
 * are NOT duplicates — no amount of casing, punctuation or accent noise may
 * turn that conflict into a merge suggestion.
 *
 * These tests generate thousands of noisy name pairs instead of listing
 * fixtures, so a normalization change that swallows a qualifier fails here
 * even for spellings nobody thought to write down.
 *
 * Set FUZZ_RUNS to raise the per-property sample count locally.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  classifyDuplicate,
  conflictingQualifiers,
  explainDuplicate,
  foldName,
  normalizeTokens,
  type DedupeFood,
} from "@/lib/food-dedupe";

const RUNS = Number(process.env["FUZZ_RUNS"] ?? 300) || 300;
const params = { numRuns: RUNS } as const;

/** Base foods, free of any preparation/form token. */
const BASE_NAMES = [
  "chicken breast",
  "salmon fillet",
  "cheddar cheese",
  "jalapeno pepper",
  "creme fraiche",
  "basmati rice",
  "black beans",
  "greek yogurt",
  "sweet potato",
  "almond butter",
];

/**
 * Qualifier pairs that must always block a merge. Each entry differs on at
 * least one token the scorer treats as distinguishing.
 */
const CONFLICTING_QUALIFIERS: [string, string][] = [
  ["cooked", "frozen"],
  ["roasted", "canned"],
  ["grilled", "dried"],
  ["whole", "skim"],
  ["sweetened", "unsweetened"],
  ["salted", "unsalted"],
  ["boneless", "smoked"],
  ["powder", "oil"],
  ["cooked", ""],
  ["", "dried"],
];

const ACCENTS: Record<string, string[]> = {
  a: ["á", "à", "â", "ä", "ã", "å"],
  e: ["é", "è", "ê", "ë"],
  i: ["í", "ì", "î", "ï"],
  o: ["ó", "ò", "ô", "ö", "õ"],
  u: ["ú", "ù", "û", "ü"],
  n: ["ñ"],
  c: ["ç"],
};

const PUNCTUATION = [",", " -", " —", ".", ";", " /", " (nfs)", " ()", "  ", " \u00a0"];

type Noise = {
  caseSeeds: number[];
  accentSeeds: number[];
  punctuation: string[];
  positions: number[];
  padStart: string;
  padEnd: string;
};

const noiseArb: fc.Arbitrary<Noise> = fc.record({
  caseSeeds: fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 1, maxLength: 60 }),
  accentSeeds: fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 60 }),
  punctuation: fc.array(fc.constantFrom(...PUNCTUATION), { maxLength: 4 }),
  positions: fc.array(fc.integer({ min: 0, max: 40 }), { maxLength: 4 }),
  padStart: fc.constantFrom("", " ", "  ", "\t"),
  padEnd: fc.constantFrom("", " ", "  ", "\n"),
});

/**
 * Apply casing, accent and punctuation noise deterministically from a seed.
 *
 * `boundaryOnly` keeps punctuation at word boundaries. Mid-word punctuation
 * genuinely splits a token ("chi,cken"), which is a different name — use it
 * for conflict tests, not for "same food, noisier spelling" tests.
 */
function roughen(text: string, noise: Noise, boundaryOnly = false): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const upper = noise.caseSeeds[i % noise.caseSeeds.length]! === 1;
    const cased = upper ? ch.toUpperCase() : ch.toLowerCase();
    const variants = ACCENTS[cased];
    if (variants) {
      const seed = noise.accentSeeds[i % noise.accentSeeds.length]!;
      // Only some occurrences get accented, so both plain and accented forms appear.
      out += seed < 4 ? variants[seed % variants.length]! : cased;
    } else {
      out += cased;
    }
  }
  for (let i = 0; i < noise.punctuation.length; i += 1) {
    const raw = noise.positions[i] ?? 0;
    // Boundaries are recomputed per insertion: an earlier insertion shifts them.
    const boundaries = [0, out.length, ...[...out].flatMap((c, k) => (c === " " ? [k] : []))];
    const at = boundaryOnly ? boundaries[raw % boundaries.length]! : Math.min(raw, out.length);
    out = `${out.slice(0, at)}${noise.punctuation[i]}${out.slice(at)}`;
  }
  return `${noise.padStart}${out}${noise.padEnd}`;
}

function food(name: string, extra: Partial<DedupeFood> = {}): DedupeFood {
  return {
    name,
    kcal100: 165,
    protein100: 31,
    carbs100: 0,
    fat100: 3.6,
    ...extra,
  };
}

/** Failure output that shows the generated names and the full signal table. */
function why(a: DedupeFood, b: DedupeFood): string {
  return `\n  A: ${JSON.stringify(a.name)}\n  B: ${JSON.stringify(b.name)}\n${explainDuplicate(a, b).text}`;
}

describe("dedupe fuzz: qualifier conflicts survive noisy names", () => {
  it("never merges foods that disagree on a preparation/form qualifier", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS),
        noiseArb,
        noiseArb,
        (base, [qualA, qualB], noiseA, noiseB) => {
          // Noise is applied to the base name only; the qualifier is the signal
          // under test and appears verbatim, as real catalog rows spell it.
          const a = food(`${roughen(base, noiseA)} ${qualA}`.trim());
          const b = food(`${roughen(base, noiseB)} ${qualB}`.trim());
          const match = classifyDuplicate(a, b);
          expect(match.verdict, why(a, b)).toBe("none");
        },
      ),
      params,
    );
  });

  it("keeps the conflict even when identical macros and brand would push a merge", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS),
        noiseArb,
        noiseArb,
        (base, [qualA, qualB], noiseA, noiseB) => {
          const shared = {
            brand: "Kirkland",
            kcal100: 200,
            protein100: 20,
            carbs100: 10,
            fat100: 8,
          };
          const a = food(`${roughen(base, noiseA)} ${qualA}`.trim(), shared);
          const b = food(`${roughen(base, noiseB)} ${qualB}`.trim(), shared);
          const explanation = explainDuplicate(a, b);
          expect(explanation.rule, why(a, b)).toBe("qualifier-conflict");
          expect(explanation.verdict, why(a, b)).toBe("none");
        },
      ),
      params,
    );
  });

  it("reports the conflict symmetrically in both directions", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS),
        noiseArb,
        noiseArb,
        (base, [qualA, qualB], noiseA, noiseB) => {
          const nameA = `${roughen(base, noiseA)} ${qualA}`.trim();
          const nameB = `${roughen(base, noiseB)} ${qualB}`.trim();
          expect(conflictingQualifiers(nameA, nameB)).toBe(true);
          expect(conflictingQualifiers(nameB, nameA)).toBe(true);
          expect(classifyDuplicate(food(nameA), food(nameB)).verdict).toBe("none");
          expect(classifyDuplicate(food(nameB), food(nameA)).verdict).toBe("none");
        },
      ),
      params,
    );
  });

  it("does not let an alias on the wrong form sneak a merge through", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS),
        noiseArb,
        noiseArb,
        (base, [qualA, qualB], noiseA, noiseB) => {
          const incoming = food(`${roughen(base, noiseA)} ${qualA}`.trim());
          // The existing row lists a *differently prepared* alias. Aliases only
          // win on an exact normalized name, never on a conflicting form.
          const existing = food(`${roughen(base, noiseB)} ${qualB}`.trim(), {
            aliases: [`${base} ${qualB}`, `${base.toUpperCase()} ${qualB}`],
          });
          expect(classifyDuplicate(incoming, existing).verdict, why(incoming, existing)).toBe(
            "none",
          );
        },
      ),
      params,
    );
  });
});

describe("dedupe fuzz: noise alone does not change the answer", () => {
  it("still recognizes the same food when only casing/punctuation vary", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS.map(([q]) => q)),
        noiseArb,
        (base, qualifier, noise) => {
          // Reuse the same accent decisions on both sides so only casing,
          // punctuation and padding differ — the pair is one food.
          const plain = `${base} ${qualifier}`.trim();
          const noisy =
            `${roughen(base, { ...noise, accentSeeds: [9] }, true)} ${qualifier}`.trim();
          const a = food(plain);
          const b = food(noisy);
          const verdict = classifyDuplicate(a, b).verdict;
          expect(["exact", "strong"], why(a, b)).toContain(verdict);
        },
      ),
      params,
    );
  });

  it("tokenizes noisy names into the same token set as the clean name", () => {
    fc.assert(
      fc.property(fc.constantFrom(...BASE_NAMES), noiseArb, (base, noise) => {
        const noisy = roughen(base, { ...noise, accentSeeds: [9] }, true);
        expect(new Set(normalizeTokens(noisy))).toEqual(new Set(normalizeTokens(base)));
      }),
      params,
    );
  });

  it("is deterministic: the same noisy pair always scores the same", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS),
        noiseArb,
        noiseArb,
        (base, [qualA, qualB], noiseA, noiseB) => {
          const a = food(`${roughen(base, noiseA)} ${qualA}`.trim());
          const b = food(`${roughen(base, noiseB)} ${qualB}`.trim());
          expect(explainDuplicate(a, b).text).toBe(explainDuplicate(a, b).text);
        },
      ),
      params,
    );
  });
});

/**
 * Unicode normalization coverage.
 *
 * The same accented food name can arrive in composed (NFC, "é" as one code
 * point) or decomposed (NFD, "e" + combining acute) form depending on the
 * source and the operating system that typed it. Those two strings are not
 * equal in JavaScript, so every comparison has to fold them first. These
 * properties pin both directions: folding must never split an accented pair
 * apart, and it must never fold away a real preparation/form conflict.
 */
const ACCENTED_NAMES = [
  "crème fraîche",
  "jalapeño pepper",
  "café au lait",
  "purée de pommes",
  "açaí bowl",
  "gruyère cheese",
  "piña colada mix",
  "entrée salad",
  "smörgåsbord platter",
  "fráîchë blénd",
];

/** Plain-ASCII spelling of the same food, as a second catalog would store it. */
function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Randomly re-encode each character as NFC or NFD, so forms are mixed. */
function mixForms(text: string, seeds: number[]): string {
  return [...text]
    .map((ch, i) =>
      (seeds[i % seeds.length] ?? 0) % 2 === 0 ? ch.normalize("NFC") : ch.normalize("NFD"),
    )
    .join("");
}

const formSeeds = fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 1, maxLength: 40 });

describe("dedupe fuzz: unicode normalization (NFC/NFD) and accent stripping", () => {
  it("treats NFC, NFD and mixed-form spellings of one name as the same tokens", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ACCENTED_NAMES), formSeeds, (name, seeds) => {
        const nfc = name.normalize("NFC");
        const nfd = name.normalize("NFD");
        const mixed = mixForms(name, seeds);
        const tokens = normalizeTokens(nfc);
        expect(tokens.length).toBeGreaterThan(0);
        expect(normalizeTokens(nfd)).toEqual(tokens);
        expect(normalizeTokens(mixed)).toEqual(tokens);
      }),
      params,
    );
  });

  it("matches an accented name against its accent-stripped ASCII twin", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ACCENTED_NAMES), formSeeds, formSeeds, (name, s1, s2) => {
        const a = food(mixForms(name, s1));
        const b = food(stripAccents(mixForms(name, s2)));
        const verdict = classifyDuplicate(a, b).verdict;
        expect(["exact", "strong"], why(a, b)).toContain(verdict);
      }),
      params,
    );
  });

  it("keeps casing changes on accented characters harmless", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ACCENTED_NAMES), noiseArb, formSeeds, (name, noise, seeds) => {
        const upper = mixForms(name, seeds).toUpperCase();
        const noisy = roughen(stripAccents(name), { ...noise, accentSeeds: [9] }, true);
        expect(new Set(normalizeTokens(upper))).toEqual(new Set(normalizeTokens(noisy)));
      }),
      params,
    );
  });

  it("still refuses to merge accented names that disagree on a qualifier", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACCENTED_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS),
        formSeeds,
        formSeeds,
        (name, [qualA, qualB], s1, s2) => {
          const shared = {
            brand: "Kirkland",
            kcal100: 200,
            protein100: 20,
            carbs100: 10,
            fat100: 8,
          };
          // One side keeps its diacritics, the other is the ASCII twin: the only
          // real difference left is the preparation/form word.
          const a = food(`${mixForms(name, s1)} ${qualA}`.trim(), shared);
          const b = food(`${stripAccents(mixForms(name, s2))} ${qualB}`.trim(), shared);
          expect(conflictingQualifiers(a.name, b.name), why(a, b)).toBe(true);
          expect(classifyDuplicate(a, b).verdict, why(a, b)).toBe("none");
        },
      ),
      params,
    );
  });

  it("folds names idempotently and identically for NFC and NFD input", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ACCENTED_NAMES), formSeeds, (name, seeds) => {
        const mixed = mixForms(name, seeds);
        const folded = foldName(mixed);
        expect(foldName(name.normalize("NFC"))).toBe(folded);
        expect(foldName(name.normalize("NFD"))).toBe(folded);
        expect(foldName(folded)).toBe(folded);
        // Folding leaves no combining marks behind for a later regex to eat.
        expect(/[\u0300-\u036f]/.test(folded)).toBe(false);
      }),
      params,
    );
  });
});

/**
 * Zero-width and non-printing character coverage.
 *
 * Names copied out of spreadsheets, PDFs, label OCR and web pages routinely
 * carry invisible passengers: zero-width spaces, joiners, soft hyphens, byte
 * order marks and stray control characters. They render as nothing, so a
 * human reviewing the catalog sees two identical names while the matcher sees
 * two different strings. Worse, the old normalizer replaced them with a space
 * and cut a word in half ("chi<ZWSP>cken" -> "chi" + "cken").
 *
 * Two invariants: invisible characters must never turn a duplicate into a
 * miss, and they must never turn a genuine qualifier conflict into a merge.
 */
const INVISIBLES = [
  "\u200b", // zero-width space
  "\u200c", // zero-width non-joiner
  "\u200d", // zero-width joiner
  "\u200e", // left-to-right mark
  "\u200f", // right-to-left mark
  "\u2060", // word joiner
  "\u2061", // function application
  "\ufeff", // byte order mark / zero-width no-break space
  "\u00ad", // soft hyphen
  "\u180e", // Mongolian vowel separator
  "\u202a", // left-to-right embedding
  "\u202c", // pop directional formatting
];

const CONTROLS = ["\u0000", "\u0001", "\u0007", "\u000b", "\u000c", "\u001b", "\u007f", "\u009f"];

type Invisible = { chars: string[]; positions: number[] };

const invisibleArb: fc.Arbitrary<Invisible> = fc.record({
  chars: fc.array(fc.constantFrom(...INVISIBLES), { minLength: 1, maxLength: 6 }),
  positions: fc.array(fc.integer({ min: 0, max: 60 }), { minLength: 1, maxLength: 6 }),
});

/** Sprinkle invisible characters anywhere in the string, including mid-word. */
function haunt(text: string, ghost: Invisible): string {
  let out = text;
  for (let i = 0; i < ghost.chars.length; i += 1) {
    const at = (ghost.positions[i] ?? 0) % (out.length + 1);
    out = `${out.slice(0, at)}${ghost.chars[i]}${out.slice(at)}`;
  }
  return out;
}

describe("dedupe fuzz: zero-width and non-printing characters", () => {
  it("tokenizes a haunted name exactly like the clean one", () => {
    fc.assert(
      fc.property(fc.constantFrom(...BASE_NAMES), invisibleArb, (base, ghost) => {
        const haunted = haunt(base, ghost);
        // Sanity: the strings really do differ before folding.
        expect(haunted).not.toBe(base);
        expect(normalizeTokens(haunted)).toEqual(normalizeTokens(base));
      }),
      params,
    );
  });

  it("never splits a word: no token is a fragment of the clean tokens", () => {
    fc.assert(
      fc.property(fc.constantFrom(...BASE_NAMES), invisibleArb, (base, ghost) => {
        const clean = new Set(normalizeTokens(base));
        for (const token of normalizeTokens(haunt(base, ghost))) {
          expect(clean.has(token), `unexpected fragment ${JSON.stringify(token)}`).toBe(true);
        }
      }),
      params,
    );
  });

  it("still matches a haunted catalog row against the clean one", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS.map(([q]) => q)),
        invisibleArb,
        invisibleArb,
        (base, qualifier, g1, g2) => {
          const a = food(haunt(`${base} ${qualifier}`.trim(), g1));
          const b = food(haunt(`${base} ${qualifier}`.trim(), g2));
          expect(["exact", "strong"], why(a, b)).toContain(classifyDuplicate(a, b).verdict);
        },
      ),
      params,
    );
  });

  it("cannot smuggle a merge past a preparation/form conflict", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONFLICTING_QUALIFIERS),
        invisibleArb,
        invisibleArb,
        (base, [qualA, qualB], g1, g2) => {
          const shared = {
            brand: "Kirkland",
            kcal100: 200,
            protein100: 20,
            carbs100: 10,
            fat100: 8,
          };
          // Invisible characters land inside the qualifier too, so a matcher
          // that "loses" the qualifier word would wrongly merge here.
          const a = food(haunt(`${base} ${qualA}`.trim(), g1), shared);
          const b = food(haunt(`${base} ${qualB}`.trim(), g2), shared);
          expect(conflictingQualifiers(a.name, b.name), why(a, b)).toBe(true);
          expect(classifyDuplicate(a, b).verdict, why(a, b)).toBe("none");
        },
      ),
      params,
    );
  });

  it("survives invisibles combined with accents, casing and punctuation noise", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACCENTED_NAMES),
        noiseArb,
        invisibleArb,
        (name, noise, ghost) => {
          const a = food(haunt(roughen(name, { ...noise, accentSeeds: [9] }, true), ghost));
          const b = food(stripAccents(name));
          expect(["exact", "strong"], why(a, b)).toContain(classifyDuplicate(a, b).verdict);
        },
      ),
      params,
    );
  });

  it("treats control characters as separators, never as letters", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BASE_NAMES),
        fc.constantFrom(...CONTROLS),
        fc.integer({ min: 0, max: 60 }),
        (base, control, at) => {
          const folded = foldName(`${base.slice(0, at % (base.length + 1))}${control}${base}`);
          // A control byte may split a word, but it must never survive folding
          // into a token, which would make the name unmatchable forever.
          // eslint-disable-next-line no-control-regex -- asserts control characters were stripped.
          expect(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(folded)).toBe(false);
          for (const token of normalizeTokens(folded)) {
            expect(/^[a-z0-9]+$/.test(token)).toBe(true);
          }
        },
      ),
      params,
    );
  });

  it("leaves no invisible characters in the folded output", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACCENTED_NAMES, ...BASE_NAMES),
        invisibleArb,
        (name, ghost) => {
          const folded = foldName(haunt(name, ghost));
          for (const ch of INVISIBLES) expect(folded.includes(ch)).toBe(false);
          expect(foldName(folded)).toBe(folded);
        },
      ),
      params,
    );
  });
});
