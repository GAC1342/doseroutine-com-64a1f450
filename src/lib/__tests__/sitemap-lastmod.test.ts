import { describe, expect, it } from "vitest";
import { isFutureTimestamp, safeTimestamp } from "@/lib/sitemap-lastmod";
import { LOCAL_ARTICLES } from "@/lib/local-articles";

const NOW = new Date("2026-08-22T06:00:00.000Z");

describe("safeTimestamp", () => {
  it("clamps future dates to now so Google keeps trusting lastmod", () => {
    expect(safeTimestamp("2026-08-27T09:00:00.000Z", NOW)).toBe("2026-08-22T06:00:00.000Z");
  });

  it("keeps past dates untouched", () => {
    expect(safeTimestamp("2026-08-18T09:00:00.000Z", NOW)).toBe("2026-08-18T09:00:00.000Z");
    expect(safeTimestamp("2026-08-13", NOW)).toBe("2026-08-13");
  });

  it("drops unusable values instead of inventing a build date", () => {
    expect(safeTimestamp(undefined, NOW)).toBeNull();
    expect(safeTimestamp("not a date", NOW)).toBeNull();
  });

  it("flags future timestamps", () => {
    expect(isFutureTimestamp("2026-08-27T09:00:00.000Z", NOW)).toBe(true);
    expect(isFutureTimestamp("2026-08-01T09:00:00.000Z", NOW)).toBe(false);
  });
});

describe("local articles", () => {
  it("never advertises a publish or modified date in the future", () => {
    const now = new Date();
    for (const article of LOCAL_ARTICLES) {
      expect(
        isFutureTimestamp(article.firstPublishedAt, now),
        `${article.slug} firstPublishedAt`,
      ).toBe(false);
      expect(isFutureTimestamp(article.modifiedAt, now), `${article.slug} modifiedAt`).toBe(false);
    }
  });
});
