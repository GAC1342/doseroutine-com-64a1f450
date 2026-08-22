import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards left/right illustration correctness on workout pages.
 *
 * The booty workout reuses one illustration per movement and flips it with
 * `mirror` for the opposite side. Verified against the source art:
 *  - donkey kick art is a left-facing profile → near (working) leg is the LEFT
 *    leg, so the RIGHT set must be mirrored.
 *  - fire hydrant art is a rear view with the RIGHT knee abducted, so the LEFT
 *    set must be mirrored.
 */

const source = readFileSync(resolve(process.cwd(), "src/routes/booty-workout.tsx"), "utf8");

type Entry = { name: string; side?: string; mirror: boolean };

function parseMoves(): Entry[] {
  const start = source.indexOf("const MOVES: Move[] = [");
  expect(start).toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf("\n];", start));
  return body
    .split(/\n\s{2}\{\n/)
    .slice(1)
    .map((block) => ({
      name: /name:\s*"([^"]+)"/.exec(block)?.[1] ?? "",
      side: /side:\s*"([^"]+)"/.exec(block)?.[1],
      mirror: /mirror:\s*true/.test(block),
    }));
}

describe("booty workout side illustrations", () => {
  const moves = parseMoves();

  it("parses every move", () => {
    expect(moves.length).toBeGreaterThanOrEqual(8);
    expect(moves.every((m) => m.name.length > 0)).toBe(true);
  });

  it("mirrors exactly one of each left/right pair", () => {
    const pairs = new Map<string, Entry[]>();
    for (const move of moves) {
      if (!move.side) continue;
      const list = pairs.get(move.name) ?? [];
      list.push(move);
      pairs.set(move.name, list);
    }
    expect(pairs.size).toBeGreaterThan(0);
    for (const [name, list] of pairs) {
      expect(list.map((m) => m.side).sort(), name).toEqual(["Left", "Right"]);
      expect(list.filter((m) => m.mirror).length, name).toBe(1);
    }
  });

  it("mirrors the side that does not match the source artwork", () => {
    const mirrored = (name: string) => moves.find((m) => m.name === name && m.mirror)?.side;
    expect(mirrored("Donkey kicks")).toBe("Right");
    expect(mirrored("Fire hydrants")).toBe("Left");
  });

  it("never labels a side without naming it in the alt text", () => {
    for (const move of moves) {
      if (!move.side) continue;
      const block = source.slice(source.indexOf(`name: "${move.name}",\n    side: "${move.side}"`));
      const alt = /alt:\s*"([^"]+)"/.exec(block)?.[1] ?? "";
      expect(alt.toLowerCase(), `${move.name} ${move.side}`).toContain(move.side.toLowerCase());
    }
  });

  it("bilateral moves carry no side label or mirror flag", () => {
    for (const move of moves) {
      if (move.side) continue;
      expect(move.mirror, move.name).toBe(false);
    }
  });
});
