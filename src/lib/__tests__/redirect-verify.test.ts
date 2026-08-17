import { describe, expect, it } from "vitest";
import {
  REDIRECT_CASES,
  collectIssues,
  issuesForObservation,
  robotsAllows,
  sameUrl,
  shouldAlert,
  summarize,
  type RedirectObservation,
} from "../redirect-verify";

const base: RedirectObservation = {
  from: "https://doseroutine.com/library/clomiphene",
  expected: "https://doseroutine.com/library/clomiphene-citrate",
  reason: "legacy slug alias",
  status: 301,
  location: "https://doseroutine.com/library/clomiphene-citrate",
  targetStatus: 200,
  targetRedirects: false,
  fromRobotsAllowed: true,
  toRobotsAllowed: true,
  fetchError: null,
};

describe("redirect verification rules", () => {
  it("passes a clean 301 to the expected canonical URL", () => {
    expect(issuesForObservation(base)).toEqual([]);
  });

  it("flags a 302 as a wrong status", () => {
    const issues = issuesForObservation({ ...base, status: 302 });
    expect(issues.map((i) => i.code)).toContain("wrong_status");
    expect(shouldAlert(issues)).toBe(true);
  });

  it("flags a URL that no longer redirects", () => {
    const issues = issuesForObservation({ ...base, status: 200, location: null, targetStatus: null });
    expect(issues.map((i) => i.code)).toContain("not_redirecting");
  });

  it("flags a redirect pointing at the wrong destination", () => {
    const issues = issuesForObservation({
      ...base,
      location: "https://doseroutine.com/library",
    });
    expect(issues.map((i) => i.code)).toContain("wrong_target");
  });

  it("warns on a redirect chain", () => {
    const issues = issuesForObservation({ ...base, targetStatus: 301, targetRedirects: true });
    expect(issues.map((i) => i.code)).toContain("redirect_chain");
    expect(shouldAlert(issues)).toBe(false);
  });

  it("errors when the destination is not 200", () => {
    const issues = issuesForObservation({ ...base, targetStatus: 404 });
    expect(issues.map((i) => i.code)).toContain("target_not_ok");
  });

  it("errors when robots.txt blocks the redirecting URL or its destination", () => {
    expect(issuesForObservation({ ...base, fromRobotsAllowed: false }).map((i) => i.code)).toContain(
      "robots_blocked_source",
    );
    expect(issuesForObservation({ ...base, toRobotsAllowed: false }).map((i) => i.code)).toContain(
      "robots_blocked_target",
    );
  });

  it("reports a fetch error and stops there", () => {
    const issues = issuesForObservation({ ...base, fetchError: "timeout" });
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("fetch_error");
  });

  it("treats only trailing-slash-on-path differences as equal", () => {
    expect(sameUrl("https://a.com/x/", "https://a.com/x")).toBe(true);
    expect(sameUrl("https://a.com/x?lang=fr", "https://a.com/x")).toBe(false);
  });

  it("summarizes passing and failing redirects", () => {
    const bad = { ...base, from: "https://doseroutine.com/blog/", status: 302 };
    const observations = [base, bad];
    const issues = collectIssues(observations);
    expect(summarize(observations, issues)).toMatchObject({ total: 2, passing: 1, failing: 1 });
  });
});

describe("robots verdicts", () => {
  const robots = `User-agent: Googlebot\nAllow: /\nDisallow: /admin\n\nUser-agent: *\nAllow: /\nDisallow: /admin\n`;

  it("allows public redirect URLs including ?lang= variants", () => {
    expect(robotsAllows(robots, "https://doseroutine.com/?lang=fr")).toBe(true);
    expect(robotsAllows(robots, "https://doseroutine.com/library/clomiphene")).toBe(true);
  });

  it("detects a blocked path", () => {
    expect(robotsAllows(robots, "https://doseroutine.com/admin")).toBe(false);
  });

  it("says the live robots.txt does not block any verified redirect", () => {
    for (const c of REDIRECT_CASES) {
      expect(robotsAllows(robots, c.from), c.from).toBe(true);
      expect(robotsAllows(robots, c.to), c.to).toBe(true);
    }
  });
});
