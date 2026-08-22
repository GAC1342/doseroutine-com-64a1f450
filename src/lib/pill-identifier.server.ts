/**
 * Server-only helper that identifies a pill from a photo via the Lovable AI
 * Gateway. Never import this from a component — only from a server function
 * handler (see pill-identifier.functions.ts).
 */
import { normalizePillIdentification, type PillIdentification } from "@/lib/pill-identifier";

// Same vision model the meal scanner uses — see meal-scan.server.ts.
const PILL_VISION_MODEL = "google/gemini-2.5-flash";

const PILL_SYSTEM_PROMPT = `You are a pill-identification assistant for a medication-tracking app.
This is NOT a medical diagnosis tool — you are only reading what is visibly printed or molded on
the pill so a person can double-check it against a pharmacist or the imprint code database.

Look closely at:
- The imprint: letters/numbers printed or debossed on the pill (front and back if visible).
- The shape: round, oval, oblong, capsule, triangle, etc.
- The color(s), including any coating or capsule split-color.
- Any scoring lines.

Return ONLY a JSON object with this exact shape:
{
  "candidates": [
    {
      "name": "most likely product or generic name and strength, e.g. Lisinopril 10 mg",
      "imprint": "exact imprint text you read, or empty string if none is legible",
      "shape": "round | oval | oblong | capsule | ... ",
      "color": "plain color name(s)",
      "strength": "e.g. 10 mg",
      "dosage_form": "tablet | capsule | ...",
      "confidence": number 0-100,
      "caution": "one short sentence noting anything uncertain about THIS candidate"
    }
  ],
  "note": "one short sentence, or empty string"
}

Rules:
- List at most 3 candidates, most likely first.
- If the imprint is not legible, or the pill could be any of many common products, return an EMPTY
  candidates array rather than guessing. Do not invent a plausible-sounding name — an empty list is
  the correct, honest answer when you are not confident.
- Never claim certainty. Every candidate is a possible match for the user to verify, not a
  confirmed identification.
- confidence should reflect how much of the imprint/shape/color you could actually read, not how
  common the medication is.`;

export async function identifyPillFromImage(imageDataUrl: string): Promise<PillIdentification> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: PILL_VISION_MODEL,
      messages: [
        { role: "system", content: PILL_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify this pill from the imprint, shape, and color. Return only the JSON object.",
            },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) {
    throw new Error("The AI is busy right now — wait a moment and try the photo again.");
  }
  if (res.status === 402) {
    throw new Error("AI credits are exhausted. Add credits to keep using pill identification.");
  }
  if (res.status === 403) {
    throw new Error("AI access isn't available for this account right now.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pill identification failed (${res.status}). ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI returned something we couldn't read. Try the photo again.");
  }
  return normalizePillIdentification(parsed);
}
