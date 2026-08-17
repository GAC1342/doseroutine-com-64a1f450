import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

// Temporary internal endpoint to batch-generate rich compound content.
// Protected by LIBRARY_GEN_ADMIN_SECRET (x-admin-secret header).
// Mirrors src/lib/generate-library-content.functions.ts but callable server-to-server.

const SYSTEM_PROMPT = `You are the DoseRoutine content team writing an in-depth
educational reference entry for one compound (peptide, hormone, vitamin, mineral,
supplement or medication). Your output will be published on a public medical
reference page that must NOT read as thin content to Google, and must NOT expose
DoseRoutine to liability.

RULES — non-negotiable:
1. Neutral, evidence-oriented, plain English. No hype. Write like Mayo Clinic /
   NIH / MedlinePlus / DrugBank — sober, cautious, well-cited in prose.
2. NEVER prescribe or recommend a dose. If a range is well-established, describe
   as "commonly studied at X" with "individual needs vary — talk to a licensed
   clinician." For controlled/prescription compounds say "dose is user-directed
   and must be set by a licensed clinician." Never compute per-kg amounts.
3. Cite source *type* in prose (NIH ODS, MedlinePlus, PubChem, Mayo Clinic, FDA
   label, EMA SmPC, Cochrane, Examine.com, DrugBank). Do NOT fabricate titles,
   DOIs or URLs.
4. Aim 900–1400 words across sections combined. No repetition.
5. Plain prose or short markdown bullets. NO H1/H2 in sections. No code fences.
   No tables.
6. warnings/side_effects/do_not_mix each end with the exact sentence:
   "This is educational information, not medical advice — consult a qualified
   clinician before starting, stopping or combining any compound."

Return ONLY a JSON object with all required non-empty string fields:
meta_title (<=60 chars, includes name + DoseRoutine), meta_description (<=155),
overview_md, mechanism_md, benefits_md, evidence_md, side_effects_md,
warnings_md, contraindications_md, do_not_mix_md, timing_md, faq_md (3–5 Q&A),
sources_md (bulleted org list).`;

async function callAI(apiKey: string, payload: unknown): Promise<any> {
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
            "Return ONLY the JSON object described in the system prompt. Compound context:\n\n" +
            JSON.stringify(payload),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok)
    throw new Error(`AI ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const j = await res.json();
  return JSON.parse(j?.choices?.[0]?.message?.content ?? "{}");
}

async function fetchPubChem(name: string): Promise<{ cid: string; imageUrl: string } | null> {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/cids/JSON`,
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

const FIELD_MINS: Array<[string, number]> = [
  ["overview_md", 50],
  ["mechanism_md", 50],
  ["benefits_md", 100],
  ["evidence_md", 50],
  ["side_effects_md", 50],
  ["warnings_md", 50],
  ["contraindications_md", 30],
  ["do_not_mix_md", 30],
  ["timing_md", 30],
  ["faq_md", 50],
  ["sources_md", 20],
];

const ALL_TARGETS: string[] = [...FIELD_MINS.map(([f]) => f), "structure_image_url"];
const FIELD_MIN_MAP = new Map<string, number>(FIELD_MINS);

/**
 * Compact per-compound content summary returned by the `compound_content_status`
 * RPC: section lengths instead of section bodies. Reading the full table was the
 * single most expensive query in the project (450+ long articles per call).
 */
type ContentStatus = {
  compound_id: string;
  updated_at: string;
  structure_image_url: string | null;
  has_meta_title: boolean;
  has_meta_description: boolean;
  has_body_md: boolean;
  lens: Record<string, number> | null;
};

function statusMissing(row: ContentStatus | undefined, field: string): boolean {
  if (field === "structure_image_url") return !row?.structure_image_url;
  const min = FIELD_MIN_MAP.get(field) ?? 30;
  return (row?.lens?.[field] ?? 0) < min;
}

function checkSecret(request: Request): Response | null {
  const expected = process.env.LIBRARY_GEN_ADMIN_SECRET;
  const provided = request.headers.get("x-admin-secret") ?? "";
  if (!expected) return new Response("Unauthorized", { status: 401 });
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

export const Route = createFileRoute("/api/public/admin/generate-library")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const unauth = checkSecret(request);
        if (unauth) return unauth;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [{ data: compounds, error: e1 }, { data: content, error: e2 }] = await Promise.all([
          supabaseAdmin.from("compounds").select("id, slug, name, category").order("name"),
          // Length-only summary instead of pulling every article body (huge payload).
          supabaseAdmin.rpc("compound_content_status"),
        ]);
        if (e1 || e2) return new Response((e1 || e2)!.message, { status: 500 });
        const byId = new Map<string, ContentStatus>(
          ((content ?? []) as ContentStatus[]).map((r) => [r.compound_id, r]),
        );
        const rows = (compounds ?? []).map((c: any) => {
          const cc = byId.get(c.id);
          const missing = ALL_TARGETS.filter((f) => statusMissing(cc, f));
          return {
            slug: c.slug,
            name: c.name,
            category: c.category,
            missing,
            missing_count: missing.length,
          };
        });
        const complete = rows.filter((r) => r.missing_count === 0).length;
        const byField: Record<string, number> = {};
        for (const [f] of FIELD_MINS) byField[f] = 0;
        byField.structure_image_url = 0;
        for (const r of rows) for (const f of r.missing) byField[f]++;
        const url = new URL(request.url);
        const format = url.searchParams.get("format");
        if (format === "csv") {
          const header = "slug,name,category,missing_count,missing_fields";
          const body = rows
            .map((r) =>
              [
                r.slug,
                JSON.stringify(r.name),
                r.category,
                r.missing_count,
                JSON.stringify(r.missing.join("|")),
              ].join(","),
            )
            .join("\n");
          return new Response(header + "\n" + body, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": 'attachment; filename="library-report.csv"',
            },
          });
        }
        return Response.json({
          total: rows.length,
          complete,
          incomplete: rows.length - complete,
          missing_by_field: byField,
          incomplete_compounds: rows
            .filter((r) => r.missing_count > 0)
            .sort((a, b) => b.missing_count - a.missing_count),
        });
      },
      POST: async ({ request }) => {
        const unauth = checkSecret(request);
        if (unauth) return unauth;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 25);
        const force = url.searchParams.get("force") === "1";
        // mode=full (default): generate all fields for compounds with no/thin content.
        // mode=repair: only fill missing/short fields on existing rows without overwriting good ones.
        const mode = url.searchParams.get("mode") === "repair" ? "repair" : "full";
        const fieldsParam = url.searchParams.get("fields"); // csv subset (repair only)
        const allTargets = ALL_TARGETS;
        const targetFields = fieldsParam
          ? fieldsParam
              .split(",")
              .map((s) => s.trim())
              .filter((f) => allTargets.includes(f))
          : allTargets;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: compounds, error } = await supabaseAdmin
          .from("compounds")
          .select("*")
          .order("name");
        if (error) return new Response(error.message, { status: 500 });

        // Length-only summary; bodies are never shipped over the wire here.
        const { data: existing } = await supabaseAdmin.rpc("compound_content_status");
        const contentById = new Map<string, ContentStatus>(
          ((existing ?? []) as ContentStatus[]).map((r) => [r.compound_id, r]),
        );

        const isMissing = statusMissing;

        type Todo = { c: any; missing: string[] };
        const todo: Todo[] = [];
        for (const c of (compounds ?? []) as any[]) {
          const row = contentById.get(c.id);
          if (mode === "repair") {
            if (!row) continue; // repair only touches existing rows
            const missing = targetFields.filter((f) => isMissing(row, f));
            if (!force && missing.length === 0) continue;
            todo.push({ c, missing: force ? targetFields : missing });
          } else {
            const complete = row && !isMissing(row, "benefits_md");
            if (!force && complete) continue;
            todo.push({ c, missing: allTargets });
          }
        }

        todo.sort((a, b) => {
          const aTime = Date.parse(contentById.get(a.c.id)?.updated_at ?? "1970-01-01T00:00:00Z");
          const bTime = Date.parse(contentById.get(b.c.id)?.updated_at ?? "1970-01-01T00:00:00Z");
          return aTime - bTime || String(a.c.name).localeCompare(String(b.c.name));
        });
        const batch = todo.slice(0, limit);

        const results: any[] = [];
        for (const { c, missing } of batch) {
          try {
            const needsAI = missing.some((f) => f !== "structure_image_url");
            const needsImg = missing.includes("structure_image_url");

            const [gen, pubchem] = await Promise.all([
              needsAI
                ? callAI(apiKey, {
                    name: c.name,
                    category: c.category,
                    aliases: c.aliases ?? [],
                    goals: c.goal_tags ?? [],
                    half_life_hours: c.half_life_hours,
                    typical_timing: c.typical_timing,
                    food_rule: c.food_rule,
                    is_injectable: c.is_injectable,
                    is_controlled: c.is_controlled,
                  })
                : Promise.resolve(null as any),
              needsImg ? fetchPubChem(c.name) : Promise.resolve(null),
            ]);

            const patch: Record<string, any> = {
              compound_id: c.id,
              updated_at: new Date().toISOString(),
            };
            if (needsAI && gen) {
              for (const f of missing) {
                if (f === "structure_image_url") continue;
                if (gen[f]) patch[f] = gen[f];
              }
              // Meta fields piggy-back on any AI call when the row is missing them
              const row = contentById.get(c.id);
              if (!row?.has_meta_title && gen.meta_title)
                patch.meta_title = String(gen.meta_title).slice(0, 120);
              if (!row?.has_meta_description && gen.meta_description)
                patch.meta_description = String(gen.meta_description).slice(0, 300);
              if (!row?.has_body_md) {
                const legacy = [
                  gen.overview_md,
                  gen.mechanism_md,
                  gen.benefits_md,
                  gen.side_effects_md,
                ]
                  .filter(Boolean)
                  .join("\n\n");
                if (legacy) patch.body_md = legacy;
              }
            }
            if (needsImg && pubchem) {
              patch.structure_image_url = pubchem.imageUrl;
              patch.pubchem_cid = pubchem.cid;
            }

            const rowExists = Boolean(contentById.get(c.id));
            const updatePatch = Object.fromEntries(
              Object.entries(patch).filter(([key]) => key !== "compound_id"),
            ) as any;
            const { error: upErr } =
              mode === "repair" && rowExists
                ? await supabaseAdmin
                    .from("compound_content")
                    .update(updatePatch)
                    .eq("compound_id", c.id)
                : await supabaseAdmin
                    .from("compound_content")
                    .upsert(patch, { onConflict: "compound_id" });
            if (upErr) throw upErr;
            results.push({
              slug: c.slug,
              ok: true,
              patched: Object.keys(patch).filter((k) => k !== "compound_id" && k !== "updated_at"),
            });
          } catch (e) {
            const err = e instanceof Error ? e.message : JSON.stringify(e);
            results.push({ slug: c.slug, ok: false, err: String(err).slice(0, 200) });
          }
        }

        const succeeded = results.filter((r) => r.ok).length;
        const failed = results.filter((r) => !r.ok).length;
        const errors = results
          .filter((r) => !r.ok)
          .map((r) => ({ slug: r.slug, err: r.err ?? "" }));
        const total = (compounds ?? []).length;

        // Recompute remaining across all target fields (accurate for both modes)
        const { data: postContent } = await supabaseAdmin.rpc("compound_content_status");
        const postById = new Map<string, ContentStatus>(
          ((postContent ?? []) as ContentStatus[]).map((r) => [r.compound_id, r]),
        );
        let remaining = 0;
        for (const c of (compounds ?? []) as any[]) {
          const row = postById.get(c.id);
          const stillMissing = targetFields.some((f) => isMissing(row, f));
          if (stillMissing) remaining++;
        }

        const notifyTo = process.env.LIBRARY_GEN_NOTIFY_EMAIL;
        const isDone = remaining === 0 && batch.length > 0;
        const shouldNotify = notifyTo && (isDone || failed > 0);
        if (shouldNotify) {
          try {
            const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
            await sendTemplateEmail("library-gen-report", notifyTo!, {
              templateData: {
                status: isDone ? "complete" : "batch_errors",
                processed: results.length,
                succeeded,
                failed,
                remaining,
                total,
                errors,
              },
              idempotencyKey: `libgen-${mode}-${isDone ? "done" : "err"}-${new Date().toISOString().slice(0, 16)}`,
            });
          } catch (e) {
            console.error("[library-gen] notify failed:", e);
          }
        }

        return Response.json({
          mode,
          target_fields: targetFields,
          processed: results.length,
          succeeded,
          failed,
          remaining,
          total,
          results,
        });
      },
    },
  },
});
