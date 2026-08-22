import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { authPrewarmProps } from "@/lib/auth-prewarm";

type NavItem = { to: string; label: string; description: string };

const TOOLS: NavItem[] = [
  { to: "/calculators", label: "All calculators", description: "Every dosing tool in one place" },
  {
    to: "/peptides",
    label: "What are peptides?",
    description: "Plain-English guide to peptides and how they're dosed",
  },
  {
    to: "/peptides-calculator",
    label: "Peptides calculator",
    description: "Reconstitution math and syringe units",
  },

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
    to: "/articles",
    label: "Articles",
    description: "Guides on reminders, adherence and longevity",
  },
  { to: "/blog", label: "Research & Updates", description: "New studies and product notes" },

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  /** Set when Escape / outside click closed the drawer, so focus returns to the toggle. */
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(null);
        setMobileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen((wasOpen) => {
          if (wasOpen) restoreFocusRef.current = true;
          return false;
        });
      }
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Move focus into the drawer when it opens, and back to the toggle when a
  // keyboard user dismisses it.
  useEffect(() => {
    if (mobileOpen) {
      const first = mobilePanelRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
      return;
    }
    if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      mobileToggleRef.current?.focus();
    }
  }, [mobileOpen]);

  // Focus trap: Tab cycles within the drawer (toggle button included) while open.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const panel = mobilePanelRef.current;
      const toggle = mobileToggleRef.current;
      if (!panel) return;
      const focusables = [
        ...(toggle ? [toggle] : []),
        ...Array.from(
          panel.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
          ),
        ),
      ].filter((el) => el.offsetParent !== null || el === toggle);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !active || !focusables.includes(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const activeMobileMenu = MENUS.find((m) => m.id === mobileSection) ?? null;

  return (
    <div
      ref={wrapRef}
      className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md"
    >
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
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
          className="hidden min-w-0 flex-1 items-center justify-end gap-1 md:flex"
          aria-label="Main"
        >
          {MENUS.map((menu) => (
            <div key={menu.id} className="relative min-w-0">
              <button
                type="button"
                aria-expanded={open === menu.id}
                aria-haspopup="true"
                onClick={() => setOpen((v) => (v === menu.id ? null : menu.id))}
                className="tap-target inline-flex max-w-full items-center gap-1 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-card"
              >
                <span className="truncate">{menu.label}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${open === menu.id ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {open === menu.id ? (
                <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-card p-2 shadow-xl">
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
            className="tap-target inline-flex shrink-0 items-center rounded-lg px-3 text-sm font-medium text-foreground hover:bg-card"
          >
            Manual
          </Link>

          <span className="inline-flex">
            <LanguageSwitcher variant="minimal" />
          </span>

          <Link
            {...authPrewarmProps}
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

        {/* Mobile: only the primary CTA plus a menu button, so the row can never
            overflow on narrow phones or at large iOS text sizes. */}
        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
          <Link
            {...authPrewarmProps}
            to={signedIn ? "/today" : "/auth"}
            onClick={() => {
              setMobileOpen(false);
              onCta("nav_signin");
            }}
            className={`tap-target inline-flex shrink-0 items-center rounded-lg px-3 text-sm font-semibold ${
              signedIn
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-cta text-cta-foreground hover:bg-cta-hover"
            }`}
          >
            {signedIn ? "Open app" : signInLabel}
          </Link>
          <button
            type="button"
            ref={mobileToggleRef}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            aria-controls="home-mobile-menu"
            onClick={() => {
              setMobileOpen((v) => {
                if (v) restoreFocusRef.current = true;
                return !v;
              });
              setOpen(null);
            }}
            className="tap-target inline-flex shrink-0 items-center justify-center rounded-lg border border-border px-2 text-foreground hover:bg-card"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div
          id="home-mobile-menu"
          ref={mobilePanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="max-h-[75vh] overflow-y-auto overscroll-contain border-t border-border bg-background px-4 pb-6 pt-2 md:hidden"
        >
          {MENUS.map((menu) => (
            <div key={menu.id} className="border-b border-border/60 last:border-b-0">
              <button
                type="button"
                aria-expanded={mobileSection === menu.id}
                onClick={() => setMobileSection((v) => (v === menu.id ? null : menu.id))}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-card"
              >
                <span className="min-w-0 truncate">{menu.label}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${mobileSection === menu.id ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {activeMobileMenu?.id === menu.id ? (
                <ul className="pb-2">
                  {menu.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => {
                          setMobileOpen(false);
                          setMobileSection(null);
                          onCta(`nav_mobile_${menu.id}`);
                        }}
                        className="block rounded-xl px-3 py-3 hover:bg-card active:bg-card"
                      >
                        <span className="block text-sm font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          <Link
            to="/manual"
            onClick={() => {
              setMobileOpen(false);
              onCta("nav_mobile_manual");
            }}
            className="mt-1 block rounded-xl px-3 py-3 text-sm font-semibold text-foreground hover:bg-card"
          >
            Manual
          </Link>

          <div className="mt-2 border-t border-border px-3 pt-3">
            <LanguageSwitcher variant="minimal" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
