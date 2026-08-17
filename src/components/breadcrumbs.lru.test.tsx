/**
 * Focused unit tests for the LRU write helpers behind the breadcrumb
 * expansion memo. These target the pure state transitions directly —
 * no React render, no router, no user events — so any regression in
 * ordering semantics (delete-then-add, recency bump, trim-to-cap)
 * surfaces as a precise, fast failure.
 *
 * The broader integration behaviour is covered by
 * breadcrumbs.eviction.test.tsx (component + effects) and the SSR
 * hydration suite. This file is intentionally the narrowest slice.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  __rememberExpansion,
  __touchExpansion,
  __resetBreadcrumbExpansions,
  __getBreadcrumbExpansionState,
  __BREADCRUMB_EXPANSION_LIMIT,
} from "./breadcrumbs";

beforeEach(() => {
  __resetBreadcrumbExpansions();
});

describe("rememberExpansion — delete-then-add ordering", () => {
  it("appends a brand-new pathname to the end of the insertion order", () => {
    __rememberExpansion("/a");
    __rememberExpansion("/b");
    __rememberExpansion("/c");
    expect(__getBreadcrumbExpansionState().keys).toEqual(["/a", "/b", "/c"]);
  });

  it("keeps size at 1 when the same pathname is remembered repeatedly", () => {
    __rememberExpansion("/a");
    __rememberExpansion("/a");
    __rememberExpansion("/a");
    const state = __getBreadcrumbExpansionState();
    expect(state.size).toBe(1);
    expect(state.keys).toEqual(["/a"]);
  });

  it("moves an existing pathname to the most-recent slot (delete-then-add)", () => {
    __rememberExpansion("/a");
    __rememberExpansion("/b");
    __rememberExpansion("/c");
    // Without delete-then-add, Set.add on an existing key is a no-op and
    // "/a" would remain the oldest — this assertion catches that regression.
    __rememberExpansion("/a");
    expect(__getBreadcrumbExpansionState().keys).toEqual(["/b", "/c", "/a"]);
  });

  it("preserves relative order of untouched entries when one is promoted", () => {
    __rememberExpansion("/a");
    __rememberExpansion("/b");
    __rememberExpansion("/c");
    __rememberExpansion("/d");
    __rememberExpansion("/b"); // promote middle entry
    expect(__getBreadcrumbExpansionState().keys).toEqual(["/a", "/c", "/d", "/b"]);
  });
});

describe("rememberExpansion — deterministic trimming to the cap", () => {
  it("never exceeds MAX_EXPANDED_PATHS after any single insert", () => {
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT + 25; i++) {
      __rememberExpansion(`/p/${i}`);
      expect(__getBreadcrumbExpansionState().size).toBeLessThanOrEqual(
        __BREADCRUMB_EXPANSION_LIMIT,
      );
    }
  });

  it("evicts the least-recently-added entry first when overflowing", () => {
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT; i++) {
      __rememberExpansion(`/p/${i}`);
    }
    // Cap reached — one more insert must evict "/p/0", not anyone else.
    __rememberExpansion("/overflow");
    const keys = __getBreadcrumbExpansionState().keys;
    expect(keys.includes("/p/0")).toBe(false);
    expect(keys.includes("/p/1")).toBe(true);
    expect(keys.at(-1)).toBe("/overflow");
    expect(keys.length).toBe(__BREADCRUMB_EXPANSION_LIMIT);
  });

  it("evicts multiple oldest entries when the cap is exceeded by more than one", () => {
    // Fill exactly to the cap.
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT; i++) {
      __rememberExpansion(`/p/${i}`);
    }
    // Add 5 fresh entries — the 5 oldest ("/p/0".."/p/4") must be gone.
    for (let i = 0; i < 5; i++) {
      __rememberExpansion(`/new/${i}`);
    }
    const keys = __getBreadcrumbExpansionState().keys;
    expect(keys.length).toBe(__BREADCRUMB_EXPANSION_LIMIT);
    for (let i = 0; i < 5; i++) {
      expect(keys.includes(`/p/${i}`)).toBe(false);
    }
    expect(keys.at(-1)).toBe("/new/4");
    expect(keys[0]).toBe("/p/5");
  });

  it("keeps a re-promoted entry alive across an overflow", () => {
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT; i++) {
      __rememberExpansion(`/p/${i}`);
    }
    // Promote the oldest entry to the newest slot.
    __rememberExpansion("/p/0");
    // Now overflow — "/p/1" should be evicted, not "/p/0".
    __rememberExpansion("/overflow");
    const keys = __getBreadcrumbExpansionState().keys;
    expect(keys.includes("/p/0")).toBe(true);
    expect(keys.includes("/p/1")).toBe(false);
  });
});

describe("touchExpansion — read-side recency bump", () => {
  it("is a no-op when the pathname is not currently in the memo", () => {
    __rememberExpansion("/a");
    __rememberExpansion("/b");
    __touchExpansion("/never-expanded");
    // Set stays exactly as it was — no phantom entry, no reordering.
    expect(__getBreadcrumbExpansionState().keys).toEqual(["/a", "/b"]);
  });

  it("promotes an existing entry to the most-recent slot without changing size", () => {
    __rememberExpansion("/a");
    __rememberExpansion("/b");
    __rememberExpansion("/c");
    __touchExpansion("/a");
    const state = __getBreadcrumbExpansionState();
    expect(state.size).toBe(3);
    expect(state.keys).toEqual(["/b", "/c", "/a"]);
  });

  it("preserves order of the other entries when the middle one is touched", () => {
    __rememberExpansion("/a");
    __rememberExpansion("/b");
    __rememberExpansion("/c");
    __rememberExpansion("/d");
    __touchExpansion("/b");
    expect(__getBreadcrumbExpansionState().keys).toEqual(["/a", "/c", "/d", "/b"]);
  });

  it("repeated touches of the same entry are idempotent once it's at the tail", () => {
    __rememberExpansion("/a");
    __rememberExpansion("/b");
    __touchExpansion("/a"); // /a -> tail
    __touchExpansion("/a"); // already tail, still tail
    __touchExpansion("/a");
    expect(__getBreadcrumbExpansionState().keys).toEqual(["/b", "/a"]);
  });

  it("keeps a touched entry alive across a subsequent overflow", () => {
    __rememberExpansion("/hot");
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT - 1; i++) {
      __rememberExpansion(`/p/${i}`);
    }
    // Cache is now full. "/hot" is the oldest entry — one more remember
    // would evict it. Touch it first to promote it to the tail.
    __touchExpansion("/hot");
    __rememberExpansion("/overflow");
    const keys = __getBreadcrumbExpansionState().keys;
    expect(keys.includes("/hot")).toBe(true);
    expect(keys.includes("/p/0")).toBe(false); // the new oldest was evicted instead
    expect(keys.at(-1)).toBe("/overflow");
  });

  it("does not itself trigger trimming — cap is enforced only on writes", () => {
    // Fill exactly to the cap.
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT; i++) {
      __rememberExpansion(`/p/${i}`);
    }
    // Touch every entry; size stays at the cap and no entries drop.
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT; i++) {
      __touchExpansion(`/p/${i}`);
    }
    const state = __getBreadcrumbExpansionState();
    expect(state.size).toBe(__BREADCRUMB_EXPANSION_LIMIT);
    for (let i = 0; i < __BREADCRUMB_EXPANSION_LIMIT; i++) {
      expect(state.keys.includes(`/p/${i}`)).toBe(true);
    }
    // Touches applied in ascending order of i, so the final tail is the
    // last-touched entry.
    expect(state.keys.at(-1)).toBe(`/p/${__BREADCRUMB_EXPANSION_LIMIT - 1}`);
  });
});
