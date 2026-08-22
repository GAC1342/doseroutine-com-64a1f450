import { describe, expect, it } from "vitest";
import { isAppSchemeUrl, isExternalUrl } from "@/lib/external-link";

describe("isExternalUrl", () => {
  it("treats same-origin and relative links as internal", () => {
    expect(isExternalUrl("/today")).toBe(false);
    expect(isExternalUrl("#section")).toBe(false);
    expect(isExternalUrl("?tab=doses")).toBe(false);
    expect(isExternalUrl(window.location.origin + "/manual")).toBe(false);
    // Same host, explicit default port / trailing FQDN dot.
    expect(isExternalUrl(`http://${window.location.hostname}:${window.location.port}/x`)).toBe(
      false,
    );
  });

  it("treats other hosts, subdomains and custom domains as external", () => {
    expect(isExternalUrl("https://doseroutine.com/legal#terms")).toBe(true);
    expect(isExternalUrl("https://blog.doseroutine.com/post")).toBe(true);
    expect(isExternalUrl("https://www.doseroutine.com/")).toBe(true);
    expect(isExternalUrl("https://pubmed.ncbi.nlm.nih.gov/123/")).toBe(true);
    expect(isExternalUrl("//example.com/x")).toBe(true);
  });

  it("treats mail, phone and message links as external app schemes", () => {
    for (const href of [
      "mailto:support@doseroutine.com",
      "MAILTO:Support@DoseRoutine.com?subject=Hi",
      "tel:+15551234567",
      "  tel:5551234567  ",
      "sms:+15551234567",
    ]) {
      expect(isAppSchemeUrl(href)).toBe(true);
      expect(isExternalUrl(href)).toBe(true);
    }
  });

  it("ignores unsupported schemes and junk", () => {
    expect(isExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isExternalUrl("data:text/html,<b>x</b>")).toBe(false);
    expect(isExternalUrl("")).toBe(false);
    expect(isExternalUrl("   ")).toBe(false);
    expect(isAppSchemeUrl("https://example.com")).toBe(false);
  });
});
