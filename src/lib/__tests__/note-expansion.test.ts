import { describe, expect, it } from "vitest";
import {
  ruleCardKey,
  userNoteCardKey,
  isNoteExpanded,
  toggleNoteKey,
  pruneNoteKeys,
  expandAllNoteKeys,
  collapseAllNoteKeys,
} from "@/lib/note-expansion";

describe("note expansion memory", () => {
  const a = ruleCardKey("c1", "c2");
  const b = userNoteCardKey("n1");

  it("builds stable keys", () => {
    expect(a).toBe("rule-c1-c2");
    expect(b).toBe("note-n1");
  });

  it("toggles a single card without touching others", () => {
    let state = toggleNoteKey([], a);
    expect(state).toEqual([a]);
    expect(isNoteExpanded(state, a)).toBe(true);
    expect(isNoteExpanded(state, b)).toBe(false);

    state = toggleNoteKey(state, b);
    expect(state).toEqual([a, b]);

    state = toggleNoteKey(state, a);
    expect(state).toEqual([b]);
  });

  it("treats undefined memory as all collapsed", () => {
    expect(isNoteExpanded(undefined, a)).toBe(false);
    expect(toggleNoteKey(undefined, a)).toEqual([a]);
  });

  it("prunes keys for cards that no longer exist", () => {
    expect(pruneNoteKeys([a, b], [a])).toEqual([a]);
  });

  it("never prunes while the card list is still empty (loading)", () => {
    expect(pruneNoteKeys([a, b], [])).toEqual([a, b]);
  });

  it("expand all adds every known card and de-duplicates", () => {
    expect(expandAllNoteKeys([a], [a, b]).sort()).toEqual([a, b].sort());
  });

  it("collapse all clears known cards but keeps unrelated memory", () => {
    const hidden = userNoteCardKey("n2");
    expect(collapseAllNoteKeys([a, hidden], [a])).toEqual([hidden]);
  });
});
