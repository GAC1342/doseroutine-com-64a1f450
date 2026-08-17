import { describe, expect, it } from "vitest";
import {
  brandedImageAlt,
  isGenericImageAlt,
  pageCardMeta,
  pageCardUrl,
  socialImageMeta,
} from "../social-image-meta";

describe("brandedImageAlt", () => {
  it("names DoseRoutine and the page subject", () => {
    const alt = brandedImageAlt("Best GLP-1 Tracking App", "roundup");
    expect(alt).toMatch(/DoseRoutine/);
    expect(alt).toMatch(/Best GLP-1 Tracking App/);
    expect(isGenericImageAlt(alt)).toBe(false);
  });

  it("does not repeat the brand suffix", () => {
    const alt = brandedImageAlt("Retatrutide Dosage Calculator | DoseRoutine", "calculator");
    expect(alt.match(/DoseRoutine/g)).toHaveLength(1);
  });

  it("stays within a readable length", () => {
    const alt = brandedImageAlt(
      "The best app for tracking peptides, supplements and hormones together in one place",
      "roundup",
    );
    expect(alt.length).toBeLessThanOrEqual(125);
  });
});

describe("isGenericImageAlt", () => {
  it.each(["", "image", "og image", "preview", "banner", "DoseRoutine"])(
    "rejects %s",
    (value) => {
      expect(isGenericImageAlt(value)).toBe(true);
    },
  );
});

describe("socialImageMeta", () => {
  it("emits og + twitter image metadata with alt text", () => {
    const meta = socialImageMeta({
      url: "https://doseroutine.com/og/pages/best-glp-1-tracking-app.png",
      alt: "DoseRoutine app card for GLP-1 tracking",
    });
    const props = meta.map((m) => ("property" in m ? m.property : m.name));
    expect(props).toEqual([
      "og:image",
      "og:image:secure_url",
      "og:image:type",
      "og:image:width",
      "og:image:height",
      "og:image:alt",
      "twitter:image",
      "twitter:image:alt",
    ]);
    expect(meta.find((m) => "property" in m && m.property === "og:image:type")?.content).toBe(
      "image/png",
    );
  });

  it("emits nothing without an image", () => {
    expect(socialImageMeta(null)).toEqual([]);
  });
});

describe("pageCardMeta", () => {
  it("uses the generated brand card for a known marketing slug", () => {
    expect(pageCardUrl("best-glp-1-tracking-app")).toMatch(
      /\/og\/pages\/best-glp-1-tracking-app\.png$/,
    );
    const meta = pageCardMeta("best-glp-1-tracking-app", "Best GLP-1 Tracking App", "roundup");
    expect(meta.find((m) => "property" in m && m.property === "og:image:alt")?.content).toMatch(
      /DoseRoutine/,
    );
  });

  it("returns nothing for a slug with no branded card", () => {
    expect(pageCardMeta("no-such-page", "Nothing", "app")).toEqual([]);
  });
});
