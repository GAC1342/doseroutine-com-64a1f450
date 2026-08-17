import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * CLS guard: every <img> and <video> rendered by the app must declare explicit
 * width and height so the browser can reserve layout space before decode.
 */

const SRC = join(process.cwd(), "src");
const SKIP_DIRS = new Set(["node_modules", "components/ui"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full, out);
    } else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Extracts each `<img ...>` / `<video ...>` opening tag from JSX source. */
function mediaTags(source: string): { tag: string; text: string }[] {
  const found: { tag: string; text: string }[] = [];
  const re = /<(img|video)\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    let depth = 0;
    let end = match.index;
    for (let i = match.index; i < source.length; i++) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) {
        end = i;
        break;
      }
    }
    found.push({ tag: match[1]!, text: source.slice(match.index, end + 1) });
  }
  return found;
}

describe("media elements declare intrinsic dimensions", () => {
  const files = walk(SRC);

  it("finds source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("every <img> and <video> has width and height", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const { tag, text } of mediaTags(source)) {
        const hasWidth = /\bwidth[=\s]/.test(text);
        const hasHeight = /\bheight[=\s]/.test(text);
        if (!hasWidth || !hasHeight) {
          offenders.push(
            `${file.replace(process.cwd() + "/", "")}: <${tag}> missing ${!hasWidth ? "width" : ""}${!hasWidth && !hasHeight ? " and " : ""}${!hasHeight ? "height" : ""}`,
          );
        }
      }
    }
    expect(
      offenders,
      `Add explicit width/height to avoid layout shift:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
