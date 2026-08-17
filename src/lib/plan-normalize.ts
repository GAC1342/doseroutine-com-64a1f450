import { z } from "zod";

/**
 * Plan payload shapes + a tolerant normaliser for the AI response.
 *
 * Why this file exists: the model reliably returns *nearly* the right shape
 * (`"Morning"` instead of `"morning"`, `compounds` instead of `items`,
 * `reason` instead of `education`). The previous strict schema used
 * `z.array(blockSchema).catch([])`, so a single mismatched block silently
 * wiped the ENTIRE schedule and the user saw a summary sentence with no
 * plan under it. We now repair what we can, drop only what we can't, and
 * let the caller fail loudly when nothing survives.
 */

export const TIME_SLOTS = ["morning", "midday", "afternoon", "evening", "bedtime"] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export type PlanItem = {
  user_compound_id?: string;
  name: string;
  dose: string;
  controlled: boolean;
  note?: string;
};

export type PlanBlock = {
  time_of_day: TimeSlot;
  clock_hint?: string;
  items: PlanItem[];
  education?: string;
};

export type PlanWarning = {
  a: string;
  b: string;
  severity: "avoid" | "caution" | "note" | "synergy";
  mechanism: string;
  recommendation?: string;
};

export type PlanPayload = {
  goal: string;
  disclaimer: string;
  summary: string;
  blocks: PlanBlock[];
  warnings: PlanWarning[];
};

/** Default clock time we apply to a slot when the model gives no hint. */
export const SLOT_DEFAULT_TIME: Record<TimeSlot, string> = {
  morning: "08:00",
  midday: "12:00",
  afternoon: "15:00",
  evening: "19:00",
  bedtime: "22:00",
};

/** Aliases the model actually emits, mapped onto our five real slots. */
const SLOT_ALIASES: Record<string, TimeSlot> = {
  morning: "morning",
  "early morning": "morning",
  "upon waking": "morning",
  wake: "morning",
  am: "morning",
  breakfast: "morning",
  "pre workout": "morning",
  "pre-workout": "morning",
  preworkout: "morning",
  midday: "midday",
  "mid day": "midday",
  noon: "midday",
  lunch: "midday",
  afternoon: "afternoon",
  "mid afternoon": "afternoon",
  "post workout": "afternoon",
  "post-workout": "afternoon",
  postworkout: "afternoon",
  pm: "afternoon",
  evening: "evening",
  dinner: "evening",
  "with dinner": "evening",
  bedtime: "bedtime",
  "before bed": "bedtime",
  "before sleep": "bedtime",
  night: "bedtime",
  nighttime: "bedtime",
  "late evening": "bedtime",
};

const SEVERITIES = new Set(["avoid", "caution", "note", "synergy"]);

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

/** Map any label the model produced onto one of the five slots. */
export function normalizeSlot(raw: unknown): TimeSlot | null {
  const key = asString(raw).trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!key) return null;
  if (SLOT_ALIASES[key]) return SLOT_ALIASES[key];
  // Substring fallback: "Morning (with food)", "Evening block", "8pm / night"
  for (const [alias, slot] of Object.entries(SLOT_ALIASES)) {
    if (key.includes(alias)) return slot;
  }
  return null;
}

function normalizeItem(raw: unknown): PlanItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = asString(r.name ?? r.compound ?? r.compound_name ?? r.title).trim();
  if (!name) return null;
  const id = asString(r.user_compound_id ?? r.id).trim();
  const note = asString(r.note ?? r.reason ?? r.why).trim();
  return {
    ...(id ? { user_compound_id: id } : {}),
    name,
    dose: asString(r.dose ?? r.dosage ?? r.amount).trim(),
    controlled: r.controlled === true,
    ...(note ? { note } : {}),
  };
}

function normalizeBlock(raw: unknown): PlanBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const slot = normalizeSlot(
    r.time_of_day ?? r.timeOfDay ?? r.time ?? r.slot ?? r.block ?? r.period,
  );
  if (!slot) return null;

  const rawItems = r.items ?? r.compounds ?? r.supplements ?? r.entries ?? r.doses ?? [];
  const items = (Array.isArray(rawItems) ? rawItems : [])
    .map(normalizeItem)
    .filter((i): i is PlanItem => i !== null);
  if (items.length === 0) return null;

  const education = asString(r.education ?? r.reason ?? r.why ?? r.rationale).trim();
  const clock = asString(r.clock_hint ?? r.clockHint ?? r.suggested_time).trim();

  return {
    time_of_day: slot,
    ...(clock ? { clock_hint: clock } : {}),
    items,
    ...(education ? { education } : {}),
  };
}

function normalizeWarning(raw: unknown): PlanWarning | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const a = asString(r.a ?? r.compound_a ?? r.first).trim();
  const b = asString(r.b ?? r.compound_b ?? r.second).trim();
  const mechanism = asString(r.mechanism ?? r.reason).trim();
  if (!a || !b || !mechanism) return null;
  const sev = asString(r.severity).trim().toLowerCase();
  const recommendation = asString(r.recommendation ?? r.advice).trim();
  return {
    a,
    b,
    severity: (SEVERITIES.has(sev) ? sev : "note") as PlanWarning["severity"],
    mechanism,
    ...(recommendation ? { recommendation } : {}),
  };
}

const SLOT_ORDER = new Map(TIME_SLOTS.map((s, i) => [s, i]));

/**
 * Repair whatever the model returned into a PlanPayload.
 * Blocks that can't be repaired are dropped individually — never the whole
 * schedule. Blocks sharing a slot are merged so the UI shows five at most.
 */
export function normalizePlanPayload(raw: unknown, goal: string): PlanPayload {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const rawBlocks = r.blocks ?? r.schedule ?? r.plan ?? r.timeline ?? [];
  const normalized = (Array.isArray(rawBlocks) ? rawBlocks : [])
    .map(normalizeBlock)
    .filter((b): b is PlanBlock => b !== null);

  // Merge duplicate slots ("Morning" + "Early morning" -> one morning block).
  const bySlot = new Map<TimeSlot, PlanBlock>();
  for (const b of normalized) {
    const existing = bySlot.get(b.time_of_day);
    if (!existing) {
      bySlot.set(b.time_of_day, b);
      continue;
    }
    const seen = new Set(existing.items.map((i) => i.name.toLowerCase()));
    for (const it of b.items) {
      if (!seen.has(it.name.toLowerCase())) {
        existing.items.push(it);
        seen.add(it.name.toLowerCase());
      }
    }
    if (!existing.education && b.education) existing.education = b.education;
  }

  const blocks = [...bySlot.values()].sort(
    (x, y) => (SLOT_ORDER.get(x.time_of_day) ?? 0) - (SLOT_ORDER.get(y.time_of_day) ?? 0),
  );

  const rawWarnings = r.warnings ?? r.interactions ?? [];
  const warnings = (Array.isArray(rawWarnings) ? rawWarnings : [])
    .map(normalizeWarning)
    .filter((w): w is PlanWarning => w !== null);

  return {
    goal,
    disclaimer: "This is educational, not medical advice.",
    summary: asString(r.summary ?? r.overview ?? r.explanation).trim(),
    blocks,
    warnings,
  };
}

/**
 * Final shape guard applied AFTER normalisation. This validates our own
 * output, not the model's, so a failure here is a real bug rather than a
 * model quirk.
 */
export const planPayloadSchema = z.object({
  goal: z.string(),
  disclaimer: z.string(),
  summary: z.string(),
  blocks: z.array(
    z.object({
      time_of_day: z.enum(TIME_SLOTS),
      clock_hint: z.string().optional(),
      items: z.array(
        z.object({
          user_compound_id: z.string().optional(),
          name: z.string(),
          dose: z.string(),
          controlled: z.boolean(),
          note: z.string().optional(),
        }),
      ),
      education: z.string().optional(),
    }),
  ),
  warnings: z.array(
    z.object({
      a: z.string(),
      b: z.string(),
      severity: z.enum(["avoid", "caution", "note", "synergy"]),
      mechanism: z.string(),
      recommendation: z.string().optional(),
    }),
  ),
});

// Verbatim from 05-SAFETY-GUARDS.md guard #3. DO NOT modify this string.
export const PLAN_SYSTEM_PROMPT = `You help organize and explain a supplement/medication schedule the USER has
already chosen. You must obey ALL of the following:
1. NEVER suggest, recommend, calculate, or imply a dose, range, or "low/high
   end" for any item marked controlled (peptides, hormones, TRT, anabolics,
   GLP-1). Use only the dose the user entered.
2. NEVER add a new controlled compound to a plan.
3. For interaction SAFETY, use only the provided curated rules. Do not invent
   interactions, mechanisms, or severities. If no rule exists for a pair, say
   there is no rule on file and suggest asking a provider — do not guess.
4. Always include: "This is educational, not medical advice."
5. If the user asks for a controlled-compound dose, decline and suggest a
   licensed provider.
Output only the schedule/explanation requested.`;

/**
 * Explicit field-level contract sent to the model. The old prompt only said
 * `blocks: { type: "array" }`, which is why the model invented its own field
 * names every single call.
 */
export const PLAN_OUTPUT_SCHEMA = {
  type: "object",
  required: ["goal", "disclaimer", "summary", "blocks", "warnings"],
  properties: {
    goal: { type: "string" },
    disclaimer: { type: "string", const: "This is educational, not medical advice." },
    summary: { type: "string" },
    blocks: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        required: ["time_of_day", "items"],
        properties: {
          time_of_day: {
            type: "string",
            enum: [...TIME_SLOTS],
            description: "MUST be exactly one of these five lowercase values.",
          },
          clock_hint: { type: "string", description: '24h time e.g. "08:00".' },
          education: { type: "string", description: "One or two sentences on WHY this block." },
          items: {
            type: "array",
            description: "MUST be named `items` (not `compounds`).",
            items: {
              type: "object",
              required: ["user_compound_id", "name", "dose", "controlled"],
              properties: {
                user_compound_id: { type: "string", description: "Copy verbatim from stack." },
                name: { type: "string", description: "Copy verbatim from stack." },
                dose: { type: "string", description: "Copy the user's dose verbatim." },
                controlled: { type: "boolean" },
                note: { type: "string" },
              },
            },
          },
        },
      },
    },
    warnings: {
      type: "array",
      items: {
        type: "object",
        required: ["a", "b", "severity", "mechanism"],
        properties: {
          a: { type: "string" },
          b: { type: "string" },
          severity: { type: "string", enum: ["avoid", "caution", "note", "synergy"] },
          mechanism: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
} as const;

export const PLAN_INSTRUCTIONS = [
  "Sequence the EXISTING stack across the five slots: morning, midday, afternoon, evening, bedtime.",
  "Return AT LEAST two blocks. Every compound in `stack` must appear in exactly one block — do not omit any.",
  "Use the exact field names in output_schema: `blocks[].time_of_day` (lowercase, one of the five), `blocks[].items` (NOT `compounds`), `blocks[].education`.",
  "Copy `user_compound_id`, `name` and `dose` verbatim from the stack entry. Never output a dose for controlled items — reuse the user's dose exactly.",
  "Explain briefly WHY each block supports the goal in `education`.",
  "If recent_progress is present, acknowledge the trend in the summary (one sentence).",
  "Cite only curated_rules for warnings. If a pair has no rule, say 'no rule on file'. Never introduce a new compound.",
].join(" ");

/**
 * Call the AI gateway once and normalise the response.
 * Lives here (not in the .functions.ts wrapper) because server-function
 * modules get split and any runtime sibling in them is deleted from the
 * server bundle. It only ever executes inside a handler.
 */
export async function requestPlanFromAI(
  userPayload: Record<string, unknown>,
  goal: string,
  attempt: number,
): Promise<PlanPayload> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const retryNudge =
    attempt > 0
      ? "\n\nYour previous response could not be used: `blocks` was empty or used the wrong field names. Return at least two blocks, each with a lowercase `time_of_day` from [morning, midday, afternoon, evening, bedtime] and a non-empty `items` array.\n"
      : "";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: PLAN_SYSTEM_PROMPT },
        {
          role: "user",
          content:
            "Return ONLY valid JSON matching output_schema. No markdown, no prose outside JSON." +
            retryNudge +
            "\n\n" +
            JSON.stringify(userPayload),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("The AI coach is busy right now. Try again in a moment.");
  if (res.status === 402)
    throw new Error("AI credits are exhausted. Add credits to keep generating plans.");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
  return normalizePlanPayload(rawParsed, goal);
}
