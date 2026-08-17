import { describe, it, expect, beforeEach } from "vitest";
import {
  captureAttribution,
  getAttribution,
  attributionProperties,
  readCurrentTouch,
} from "@/lib/utm";

function setUrl(search: string, referrer = "") {
  window.history.replaceState({}, "", `/closed-testing${search}`);
  Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
}

describe("utm attribution", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setUrl("", "");
  });

  it("reads utm params from the URL", () => {
    setUrl("?utm_source=reddit&utm_medium=social&utm_campaign=testers");
    const t = readCurrentTouch();
    expect(t?.utm_source).toBe("reddit");
    expect(t?.utm_medium).toBe("social");
    expect(t?.utm_campaign).toBe("testers");
    expect(t?.landing_path).toBe("/closed-testing");
  });

  it("returns null when there is no attribution signal", () => {
    expect(readCurrentTouch()).toBeNull();
  });

  it("derives a source from an ad click id", () => {
    setUrl("?gclid=abc123");
    const t = readCurrentTouch();
    expect(t?.utm_source).toBe("google");
    expect(t?.utm_medium).toBe("cpc");
  });

  it("falls back to the referring host", () => {
    setUrl("", "https://www.reddit.com/r/peptides/");
    const t = readCurrentTouch();
    expect(t?.utm_source).toBe("reddit.com");
    expect(t?.utm_medium).toBe("referral");
  });

  it("ignores same-site referrers", () => {
    setUrl("", `${window.location.origin}/library`);
    expect(readCurrentTouch()).toBeNull();
  });

  it("keeps the first touch across later visits", () => {
    setUrl("?utm_source=reddit&utm_medium=social");
    captureAttribution();
    setUrl("?utm_source=twitter&utm_medium=social");
    const attr = captureAttribution();
    expect(attr.first?.utm_source).toBe("reddit");
    expect(attr.last?.utm_source).toBe("twitter");
    expect(getAttribution().first?.utm_source).toBe("reddit");
  });

  it("credits first touch in the flat properties", () => {
    setUrl("?utm_source=discord&utm_campaign=beta");
    const props = attributionProperties(captureAttribution());
    expect(props.utm_source).toBe("discord");
    expect(props.utm_campaign).toBe("beta");
    expect(props.landing_path).toBe("/closed-testing");
  });

  it("defaults to direct with no data", () => {
    const props = attributionProperties(getAttribution());
    expect(props.utm_source).toBe("direct");
    expect(props.utm_medium).toBe("none");
  });

  it("expires a first touch older than 90 days", () => {
    const old = {
      utm_source: "stale",
      utm_medium: "social",
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      referrer: null,
      landing_path: "/closed-testing",
      at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem("dr_attr_first", JSON.stringify(old));
    expect(getAttribution().first).toBeNull();
  });
});
