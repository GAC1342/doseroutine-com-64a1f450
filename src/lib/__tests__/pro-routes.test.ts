import { describe, it, expect } from "vitest";
import { matchProRoute, PRO_ROUTES } from "@/lib/pro-routes";

describe("matchProRoute", () => {
  it("matches Pro screens and their sub-paths", () => {
    expect(matchProRoute("/timeline")?.title).toBe("Timeline");
    expect(matchProRoute("/timeline/")?.title).toBe("Timeline");
    expect(matchProRoute("/insights/adherence")?.title).toBe("Insights");
  });

  it("leaves free screens open", () => {
    for (const path of ["/today", "/stack", "/more", "/upgrade", "/trial", "/redeem", "/safety"]) {
      expect(matchProRoute(path)).toBeNull();
    }
  });

  it("has copy for every gated route", () => {
    for (const r of PRO_ROUTES) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.blurb.length).toBeGreaterThan(0);
    }
  });
});
