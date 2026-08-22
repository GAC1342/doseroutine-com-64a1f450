import { describe, expect, it } from "vitest";
import {
  CALCULATOR_LINK,
  PEPTIDE_CLUSTER_PATHS,
  PILLAR_LINK,
  clusterRelated,
} from "@/lib/peptide-cluster-links";

describe("peptide cluster internal linking", () => {
  it("links every guide to both the pillar and the calculator hub", () => {
    for (const path of PEPTIDE_CLUSTER_PATHS) {
      const links = clusterRelated(path);
      const destinations = links.map((l) => l.to);
      if (path !== PILLAR_LINK.to) expect(destinations).toContain(PILLAR_LINK.to);
      if (path !== CALCULATOR_LINK.to) expect(destinations).toContain(CALCULATOR_LINK.to);
    }
  });

  it("never links a page to itself", () => {
    for (const path of PEPTIDE_CLUSTER_PATHS) {
      expect(clusterRelated(path).map((l) => l.to)).not.toContain(path);
    }
  });

  it("de-duplicates destinations, including extras", () => {
    const links = clusterRelated("/peptides/bpc-157", [
      { to: "/peptides", label: "duplicate pillar" },
      { to: "/library/bpc-157", label: "duplicate sibling" },
      { to: "/faq", label: "new" },
    ]);
    const destinations = links.map((l) => l.to);
    expect(new Set(destinations).size).toBe(destinations.length);
    expect(destinations).toContain("/faq");
  });

  it("uses keyword-relevant anchor text rather than a bare slug", () => {
    for (const path of PEPTIDE_CLUSTER_PATHS) {
      for (const link of clusterRelated(path)) {
        expect(link.label.length).toBeGreaterThan(6);
        expect(link.label.toLowerCase()).not.toMatch(/click here|read more|learn more/);
        expect(link.label).not.toBe(link.to);
      }
    }
  });

  it("gives the hub links different anchors from different sources", () => {
    const fromBpc = clusterRelated("/peptides/bpc-157").find((l) => l.to === CALCULATOR_LINK.to);
    const fromSemax = clusterRelated("/peptides/semax").find((l) => l.to === CALCULATOR_LINK.to);
    expect(fromBpc?.label).not.toBe(fromSemax?.label);
  });
});
