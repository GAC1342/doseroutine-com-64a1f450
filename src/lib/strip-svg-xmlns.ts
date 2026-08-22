/**
 * Inline `<svg>` inside an HTML document does not need an `xmlns` attribute —
 * the HTML parser already puts it in the SVG namespace. Our icon library emits
 * `xmlns="http://www.w3.org/2000/svg"` on every icon, which makes SEO audits
 * report ~100 "is http" (insecure URL) hits per page. Stripping it from the
 * streamed SSR HTML removes the false positives without touching rendering.
 */
const NEEDLES = [
  ' xmlns="http://www.w3.org/2000/svg"',
  ' xmlns:xlink="http://www.w3.org/1999/xlink"',
];

/** Longest needle minus one: how much tail we must keep between chunks. */
const CARRY = Math.max(...NEEDLES.map((n) => n.length)) - 1;

export function stripSvgXmlns(input: string): string {
  let out = input;
  for (const needle of NEEDLES) out = out.split(needle).join("");
  return out;
}

/** Streaming version: safe across chunk boundaries. */
export function stripSvgXmlnsStream(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let carry = "";
  return new TransformStream({
    transform(chunk, controller) {
      const text = carry + decoder.decode(chunk, { stream: true });
      const cleaned = stripSvgXmlns(text);
      // Hold back the tail that could still be the start of a needle.
      const keep = Math.min(CARRY, cleaned.length);
      carry = cleaned.slice(cleaned.length - keep);
      controller.enqueue(encoder.encode(cleaned.slice(0, cleaned.length - keep)));
    },
    flush(controller) {
      if (carry) controller.enqueue(encoder.encode(stripSvgXmlns(carry)));
    },
  });
}
