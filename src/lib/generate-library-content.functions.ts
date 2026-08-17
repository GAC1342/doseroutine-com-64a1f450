import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Minimum-viable content schema. Required prose fields must be non-empty;
// missing optional sub-sections are coerced to "" so an upsert never NULLs
// the whole row on a partial AI response. A totally malformed payload throws.
const contentSchema = z.object({
  meta_title: z.string().min(1),
  meta_description: z.string().min(1),
  overview_md: z.string().min(50),
  mechanism_md: z.string().min(50),
  benefits_md: z.string().min(50),
  evidence_md: z.string().default(""),
  side_effects_md: z.string().min(20),
  warnings_md: z.string().min(20),
  contraindications_md: z.string().default(""),
  do_not_mix_md: z.string().default(""),
  timing_md: z.string().default(""),
  faq_md: z.string().default(""),
  sources_md: z.string().default(""),
});

const SYSTEM_PROMPT = `You are the DoseRoutine content team writing an in-depth
educational reference entry for one compound (peptide, hormone, vitamin, mineral,
supplement or medication). Your output will be published on a public medical
reference page that must NOT read as thin content to Google, and must NOT expose
DoseRoutine to liability.

RULES — non-negotiable:
1. Neutral, evidence-oriented, plain English. No hype, no "burn fat fast", no
   marketing claims. Write like Mayo Clinic / NIH / MedlinePlus / DrugBank —
   sober, cautious, well-cited in prose.
2. NEVER prescribe or recommend a dose. If a dose range is well-established in
   the literature (e.g. vitamin D 1000–4000 IU/day, creatine 3–5 g/day), you may
   describe it as "commonly studied at X" with the caveat "individual needs
   vary — talk to a licensed clinician." For controlled or prescription
   compounds (TRT, GLP-1, SARMs, anabolics, benzos, opioids, stimulants) say
   "dose is user-directed and must be set by a licensed clinician." Never
   compute per-kg amounts.
3. Every substantive claim in benefits, side effects or warnings should refer
   to the type of source in prose ("according to the NIH Office of Dietary
   Supplements", "meta-analyses in Cochrane", "Mayo Clinic's patient monograph",
   "the FDA prescribing information", etc.). Do NOT fabricate specific paper
   titles, DOIs, or URLs. Do include a plain-text "sources" list naming ONLY
   recognised authority publishers, drawn from this set (pick the ones actually
   relevant to this compound, 4–7 entries, most authoritative first):
   NIH Office of Dietary Supplements (ODS), MedlinePlus, PubChem, PubMed,
   DailyMed, FDA prescribing information, EMA SmPC, Cochrane Library,
   ClinicalTrials.gov, LiverTox, DrugBank, Linus Pauling Institute,
   Mayo Clinic, Cleveland Clinic, NHS, CDC, WHO, WADA Prohibited List,
   Examine.com, or a named clinical practice guideline body (Endocrine
   Society, American Heart Association, American Diabetes Association).
   Prefer government, regulatory and systematic-review sources over consumer
   sites. Never list blogs, forums, retailers, supplement vendors, Reddit,
   YouTube, or "general internet sources".
4. Cover the compound in real depth — aim for a total of 900–1400 words across
   the sections combined. Do not repeat the same sentence in multiple sections.
5. Every section is plain prose or short markdown bullet lists. NO H1 or H2
   headings inside sections (the site renders the headings). NO markdown code
   fences. No tables.
6. Every warnings / side_effects / do_not_mix section MUST end with the exact
   sentence: "This is educational information, not medical advice — consult a
   qualified clinician before starting, stopping or combining any compound."

Return ONLY a JSON object with these string fields (all required, non-empty):
  meta_title           <= 60 chars, includes compound name and "DoseRoutine"
  meta_description     <= 155 chars, factual, no clickbait
  overview_md          2–3 short paragraphs. What it is, drug/molecule class,
                       how it's usually taken (oral, injectable, transdermal),
                       and a one-line "commonly studied for X".
  mechanism_md         2–3 paragraphs on the biological mechanism in plain
                       English (receptor, pathway, enzyme). Explain like you
                       would to a curious patient.
  benefits_md          Bulleted list of the effects with credible evidence,
                       each bullet citing the type of source in prose.
                       Distinguish "well-supported" from "preliminary" or
                       "animal-only" evidence.
  evidence_md          1–2 paragraphs on the state of clinical evidence —
                       what large trials, meta-analyses or regulatory reviews
                       (FDA, EMA, Cochrane, NIH) have concluded. Note where
                       evidence is thin.
  side_effects_md      Bulleted list. Group by common (>1%), less common, and
                       serious/rare. Use the FDA/EMA label wording style. End
                       with the required "educational information" sentence.
  warnings_md          Paragraphs and/or bullets covering black-box warnings,
                       populations who should avoid (pregnancy, breastfeeding,
                       liver/kidney disease, cardiovascular history, minors,
                       history of hormone-sensitive cancer, etc.), and any
                       monitoring recommended (labs, blood pressure). End with
                       the required "educational information" sentence.
  contraindications_md Bulleted list of absolute and relative contraindications
                       from the FDA label / SmPC / clinical guidelines.
  do_not_mix_md        Bulleted list of well-documented drug/supplement
                       combinations to avoid or use with caution, each with a
                       one-sentence mechanism ("MAOI + SSRI: serotonin
                       syndrome", "warfarin + high-dose fish oil: bleeding
                       risk"). End with the required "educational information"
                       sentence.
  timing_md            1 paragraph on typical timing, food rules, half-life
                       and interactions with meals / sleep / other supplements.
  faq_md               3–5 Q&A pairs formatted as "Q: ...\\nA: ..." separated
                       by a blank line. Focus on the questions people actually
                       search: "Is X safe long term?", "Does X affect sleep?",
                       "Can I take X with Y?", "How long until X works?"
  sources_md           Bulleted list of 4–7 authority publishers from the
                       approved set in rule 3, most authoritative first.
                       Do not invent URLs; do not list non-authority sites.
`;

type CompoundRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  aliases: string[] | null;
  goal_tags: string[] | null;
  half_life_hours: number | null;
  typical_timing: string | null;
  food_rule: string | null;
  is_injectable: boolean | null;
  is_controlled: boolean | null;
};

type GeneratedContent = {
  meta_title: string;
  meta_description: string;
  overview_md: string;
  mechanism_md: string;
  benefits_md: string;
  evidence_md: string;
  side_effects_md: string;
  warnings_md: string;
  contraindications_md: string;
  do_not_mix_md: string;
  timing_md: string;
  faq_md: string;
  sources_md: string;
};

async function callAI(payload: unknown): Promise<GeneratedContent> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            "Return ONLY the JSON object described in the system prompt. Compound context follows:\n\n" +
            JSON.stringify(payload),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text().catch(() => "")}`);
  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
  const validated = contentSchema.safeParse(parsed);
  if (!validated.success) {
    const summary = validated.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`AI content missing required fields: ${summary}`);
  }
  return validated.data as GeneratedContent;
}

// Free, no-auth PubChem structure lookup. Returns a stable image URL for the
// molecule, or null when PubChem has no match (common for peptides / biologics).
async function fetchPubChem(name: string): Promise<{ cid: string; imageUrl: string } | null> {
  try {
    const encoded = encodeURIComponent(name);
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const j = await res.json();
    const cid = j?.IdentifierList?.CID?.[0];
    if (!cid) return null;
    return {
      cid: String(cid),
      imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?record_type=2d&image_size=large`,
    };
  } catch {
    return null;
  }
}

async function requireAdmin(supabase: any): Promise<void> {
  const { data } = await supabase.rpc("is_admin");
  if (!data) throw new Error("Forbidden — admin only");
}

export const generateLibraryContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number; force?: boolean; slug?: string }) => ({
    limit: Math.min(Math.max(Number(input?.limit ?? 5), 1), 25),
    force: !!input?.force,
    slug: typeof input?.slug === "string" ? input.slug : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await requireAdmin(supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin.from("compounds").select("*").order("name");
    if (data.slug) query = query.eq("slug", data.slug);
    const { data: compounds, error } = await query;
    if (error) throw error;

    const { data: existing } = await supabaseAdmin
      .from("compound_content")
      .select("compound_id, benefits_md");
    const done = new Set(
      (existing ?? [])
        .filter((r: any) => r.benefits_md && r.benefits_md.length > 100)
        .map((r: any) => r.compound_id),
    );

    const todo = (compounds ?? [])
      .filter((c: any) => data.force || !done.has(c.id))
      .slice(0, data.limit);

    const results: Array<{ slug: string; ok: boolean; err?: string }> = [];

    for (const c of todo as CompoundRow[]) {
      try {
        const [gen, pubchem] = await Promise.all([
          callAI({
            name: c.name,
            category: c.category,
            aliases: c.aliases ?? [],
            goals: c.goal_tags ?? [],
            half_life_hours: c.half_life_hours,
            typical_timing: c.typical_timing,
            food_rule: c.food_rule,
            is_injectable: c.is_injectable,
            is_controlled: c.is_controlled,
          }),
          fetchPubChem(c.name),
        ]);

        const legacyBody = [gen.overview_md, gen.mechanism_md, gen.benefits_md, gen.side_effects_md]
          .filter(Boolean)
          .join("\n\n");

        const { error: upErr } = await supabaseAdmin.from("compound_content").upsert({
          compound_id: c.id,
          meta_title: (gen.meta_title || `${c.name} — DoseRoutine`).slice(0, 120),
          meta_description: (gen.meta_description || "").slice(0, 300),
          body_md: legacyBody, // legacy fallback for existing render path
          overview_md: gen.overview_md ?? null,
          mechanism_md: gen.mechanism_md ?? null,
          benefits_md: gen.benefits_md ?? null,
          evidence_md: gen.evidence_md ?? null,
          side_effects_md: gen.side_effects_md ?? null,
          warnings_md: gen.warnings_md ?? null,
          contraindications_md: gen.contraindications_md ?? null,
          do_not_mix_md: gen.do_not_mix_md ?? null,
          timing_md: gen.timing_md ?? null,
          faq_md: gen.faq_md ?? null,
          sources_md: gen.sources_md ?? null,
          structure_image_url: pubchem?.imageUrl ?? null,
          pubchem_cid: pubchem?.cid ?? null,
          updated_at: new Date().toISOString(),
        });
        if (upErr) throw upErr;
        results.push({ slug: c.slug, ok: true });
      } catch (e) {
        results.push({ slug: c.slug, ok: false, err: String(e).slice(0, 200) });
      }
    }

    return { processed: results.length, results };
  });
