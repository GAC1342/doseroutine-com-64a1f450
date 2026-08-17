import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const TOOLS_LINKS = [
  { to: "/calculators", label: "All calculators" },
  { to: "/calculator", label: "Calculator hub" },
  { to: "/trt-dosage-calculator", label: "TRT dosage calculator" },
  { to: "/peptide-dosage-calculator", label: "Peptide dosage calculator" },
  { to: "/peptide-reconstitution-calculator", label: "Peptide reconstitution" },
  { to: "/dosage-units-guide", label: "Dosage units guide" },
  { to: "/library/peptide-stacks-for-muscle-growth", label: "Peptide stacks for muscle growth" },
];

const COMPARE_LINKS = [
  { to: "/compare", label: "Compare compounds" },
  { to: "/vs/medisafe", label: "vs. Medisafe" },
  { to: "/vs/mytherapy", label: "vs. MyTherapy" },
  { to: "/vs/round-health", label: "vs. Round Health" },
  { to: "/vs/pill-reminder", label: "vs. Pill Reminder" },
  { to: "/vs/cronometer", label: "vs. Cronometer" },
];

const MENS_HEALTH_LINKS = [
  { to: "/library/mens-health", label: "Men's Health hub" },
  { to: "/library/prostate-health", label: "Prostate health" },
  { to: "/library/testosterone-support", label: "Testosterone support" },
  { to: "/library/compare/tongkat-ali-vs-fadogia-agrestis", label: "Tongkat Ali vs Fadogia" },
  {
    to: "/library/compare/saw-palmetto-vs-beta-sitosterol",
    label: "Saw Palmetto vs Beta-Sitosterol",
  },
  { to: "/library/compare/ashwagandha-vs-tongkat-ali", label: "Ashwagandha vs Tongkat Ali" },
  { to: "/library/guides/bph-natural-support", label: "BPH natural support" },
  { to: "/library/guides/low-testosterone-symptoms", label: "Low testosterone symptoms" },
  { to: "/library/guides/erectile-dysfunction-supplements", label: "ED supplements guide" },
];

const LEGAL_LINKS = [
  { to: "/about", label: "About" },
  { to: "/install", label: "Install app" },
  { to: "/status", label: "Status" },
  { to: "/privacy", label: "Privacy" },
  { to: "/legal", label: "Terms" },
  { to: "/medical-disclaimer", label: "Medical disclaimer" },
  { to: "/refund-policy", label: "Refunds" },
  { to: "/ai-policy", label: "AI policy" },
  { to: "/cookies", label: "Cookies" },
  { to: "/data-deletion", label: "Delete account" },
];

function FooterColumn({
  title,
  links,
  isOpen,
  onToggle,
}: {
  title: string;
  links: Array<{ to: string; label: string }>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border sm:border-b-0 sm:border-l sm:first:border-l-0 sm:pl-6 sm:first:pl-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="tap-target flex w-full items-center justify-between py-3 text-xs font-semibold uppercase tracking-wider text-foreground sm:mb-3 sm:cursor-default sm:justify-start sm:py-0"
      >
        <span>{title}</span>
        <span className="sm:hidden">
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      </button>
      <ul
        className={`space-y-2 overflow-hidden text-sm transition-all ${
          isOpen ? "max-h-[28rem] pb-4 opacity-100" : "max-h-0 opacity-0"
        } sm:max-h-full sm:pb-0 sm:opacity-100 sm:block`}
      >
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TodayFooterBlock() {
  const [openSection, setOpenSection] = useState<string | null>("tools");

  function toggle(section: string) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  return (
    <footer aria-label="DoseRoutine links" className="mt-10">
      <Card className="rounded-2xl border-border p-5 sm:p-6">
        <div className="mb-5 text-sm leading-relaxed text-foreground/90">
          <h2 className="mb-1 font-display text-base font-semibold text-foreground">
            About DoseRoutine
          </h2>
          <p>
            DoseRoutine surfaces educational combination notes across 475+ supplements, hormones,
            peptides and everything else you take — and tracks your full routine in one place.{" "}
            <Link
              to="/"
              className="font-semibold text-primary underline underline-offset-2 hover:opacity-90"
            >
              7-day free trial at doseroutine.com
            </Link>
            .
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn
            title="Tools & Calculators"
            links={TOOLS_LINKS}
            isOpen={openSection === "tools"}
            onToggle={() => toggle("tools")}
          />
          <FooterColumn
            title="Men's Health"
            links={MENS_HEALTH_LINKS}
            isOpen={openSection === "mens"}
            onToggle={() => toggle("mens")}
          />
          <FooterColumn
            title="Compare DoseRoutine"
            links={COMPARE_LINKS}
            isOpen={openSection === "compare"}
            onToggle={() => toggle("compare")}
          />
          <FooterColumn
            title="Legal & Company"
            links={LEGAL_LINKS}
            isOpen={openSection === "legal"}
            onToggle={() => toggle("legal")}
          />
        </div>

        <p className="mt-6 border-t border-border pt-4 text-center text-xs leading-relaxed text-muted-foreground">
          Educational, not medical advice. Consult a qualified clinician before changing any
          regimen.{" "}
          <Link to="/legal" className="underline underline-offset-2 hover:text-foreground">
            Terms, privacy & disclaimer
          </Link>
          .
        </p>
      </Card>
    </footer>
  );
}
