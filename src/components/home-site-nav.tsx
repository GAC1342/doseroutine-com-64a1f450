import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";

type NavItem = { to: string; label: string; description: string };

const TOOLS: NavItem[] = [
  { to: "/calculators", label: "All calculators", description: "Every dosing tool in one place" },
  {
    to: "/trt-dosage-calculator",
    label: "TRT dosage calculator",
    description: "Weekly mg to per-injection volume",
  },
  {
    to: "/peptide-dosage-calculator",
    label: "Peptide dosage calculator",
    description: "Convert mcg/mg to units on a syringe",
  },
  {
    to: "/peptide-reconstitution-calculator",
    label: "Peptide reconstitution",
    description: "How much water to add to a vial",
  },
  {
    to: "/dosage-units-guide",
    label: "Dosage units guide",
    description: "mg, mcg, IU and units explained",
  },
  {
    to: "/library",
    label: "Compound library",
    description: "475+ supplements, peptides and hormones",
  },
  { to: "/help", label: "Help Center", description: "Setup guides and troubleshooting" },
  {
    to: "/manual",
    label: "Instruction manual",
    description: "Step-by-step guide to every feature",
  },
];

const COMPARE: NavItem[] = [
  { to: "/vs", label: "All comparisons", description: "How DoseRoutine stacks up" },
  { to: "/compare", label: "Compare compounds", description: "Two compounds side by side" },
  {
    to: "/vs/medisafe",
    label: "vs. Medisafe",
    description: "Peptides, TRT and stacks Medisafe skips",
  },
  { to: "/vs/mytherapy", label: "vs. MyTherapy", description: "Tracking depth and reminders" },
  { to: "/vs/round-health", label: "vs. Round Health", description: "Scheduling and adherence" },
  {
    to: "/vs/pill-reminder",
    label: "vs. Pill Reminder",
    description: "Reminders plus safety checks",
  },
  { to: "/vs/cronometer", label: "vs. Cronometer", description: "Supplements vs. food logging" },
];

const MORE: NavItem[] = [
  { to: "/about", label: "About", description: "Who builds DoseRoutine and why" },
  { to: "/install", label: "Install app", description: "Add it to your phone in seconds" },
  { to: "/privacy", label: "Privacy", description: "No ads, no data selling" },
  {
    to: "/medical-disclaimer",
    label: "Medical disclaimer",
    description: "Educational, not medical advice",
  },
  { to: "/status", label: "Status", description: "Live uptime for the app" },
];

const MENUS: { id: string; label: string; hint: string; items: NavItem[] }[] = [
  { id: "tools", label: "Tools", hint: "Calculators, compound library and help", items: TOOLS },
  { id: "compare", label: "Compare", hint: "DoseRoutine vs. other tracking apps", items: COMPARE },
  { id: "more", label: "More", hint: "About, install, privacy and status", items: MORE },
];

export function HomeSiteNav({
  signedIn,
  onCta,
  signInLabel,
}: {
  signedIn: boolean;
  onCta: (source: string) => void;
  signInLabel: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const activeMenu = MENUS.find((m) => m.id === open) ?? null;

  return (
    <div
      ref={wrapRef}
      className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md"
    >
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <BrandLogo
            size={32}
            alt="DoseRoutine app logo"
            className="h-8 w-8 shrink-0 rounded-lg"
            priority
          />
          <span className="truncate font-display text-lg font-semibold tracking-tight">
            DoseRoutine
          </span>
        </Link>

        <nav
          className="flex w-full min-w-0 items-center justify-between gap-0.5 md:w-auto md:flex-1 md:justify-end md:gap-1"
          aria-label="Main"
        >
          {MENUS.map((menu) => (
            <div key={menu.id} className="relative">
              <button
                type="button"
                aria-expanded={open === menu.id}
                aria-haspopup="true"
                onClick={() => setOpen((v) => (v === menu.id ? null : menu.id))}
                className="tap-target inline-flex items-center gap-1 rounded-lg px-2 text-sm font-medium text-foreground hover:bg-card sm:px-3"
              >
                {menu.label}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${open === menu.id ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {open === menu.id ? (
                <div className="absolute left-0 top-full z-50 mt-2 hidden w-80 rounded-2xl border border-border bg-card p-2 shadow-xl md:block">
                  {menu.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        setOpen(null);
                        onCta(`nav_${menu.id}`);
                      }}
                      className="block rounded-xl px-3 py-2 hover:bg-background"
                    >
                      <span className="block text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          <Link
            to="/manual"
            onClick={() => onCta("nav_manual")}
            className="tap-target inline-flex shrink-0 items-center rounded-lg px-2 text-sm font-medium text-foreground hover:bg-card sm:px-3"
          >
            Manual
          </Link>

          <LanguageSwitcher variant="minimal" />


          <Link
            to={signedIn ? "/today" : "/auth"}
            onClick={() => {
              setOpen(null);
              onCta("nav_signin");
            }}
            className={`tap-target ml-1 inline-flex shrink-0 items-center rounded-lg px-3 text-sm font-semibold ${
              signedIn
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-cta text-cta-foreground hover:bg-cta-hover"
            }`}
          >
            {signedIn ? "Open app" : signInLabel}
          </Link>
        </nav>
      </header>

      {activeMenu ? (
        <div
          id={`mobile-section-${activeMenu.id}`}
          className="max-h-[70vh] overflow-y-auto overscroll-contain border-t border-border bg-background px-4 pb-6 pt-2 md:hidden"
        >
          <p className="px-1 pb-1 text-xs text-muted-foreground">{activeMenu.hint}</p>
          <ul>
            {activeMenu.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => {
                    setOpen(null);
                    onCta(`nav_mobile_${activeMenu.id}`);
                  }}
                  className="block rounded-xl px-3 py-3 hover:bg-card active:bg-card"
                >
                  <span className="block text-sm font-medium text-foreground">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
