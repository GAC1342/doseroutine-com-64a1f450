/**
 * Regenerate src/lib/robots-baseline.ts from public/robots.txt.
 * Run after an INTENTIONAL robots.txt change:  bun run scripts/gen-robots-baseline.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fingerprintRules } from "../src/lib/robots-health";

const body = readFileSync("public/robots.txt", "utf8");
const rules = fingerprintRules(body);
const out = `// AUTO-GENERATED from public/robots.txt by scripts/gen-robots-baseline.ts.
// Approved robots.txt rule baseline. The daily health check alerts when the
// live file no longer matches this list. After an INTENTIONAL robots.txt edit,
// re-run: bun run scripts/gen-robots-baseline.ts
export const ROBOTS_BASELINE: string[] = [
${rules.map((r) => `  ${JSON.stringify(r)},`).join("\n")}
]
`;
writeFileSync("src/lib/robots-baseline.ts", out);
console.log(`wrote ${rules.length} baseline rules`);
