import { Globe } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { SUPPORTED_LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n-provider";

export function LanguageSwitcher({
  variant = "select",
  className = "",
}: {
  variant?: "select" | "minimal";
  className?: string;
}) {
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { lang?: string };

  const handleChange = (value: string) => {
    const next = value as Locale;
    setLocale(next);
    const langQuery = next === DEFAULT_LOCALE ? undefined : next;
    navigate({
      to: ".",
      search: { ...search, lang: langQuery } as Record<string, string | undefined>,
      replace: true,
    }).catch(() => {});
  };

  if (variant === "minimal") {
    return (
      <select
        aria-label="Select language"
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className={
          "appearance-none rounded-lg border border-border bg-background px-2 py-1 pr-6 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary " +
          className
        }
        style={{ backgroundPosition: "right 0.4rem center" }}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {loc.toUpperCase()}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={"relative inline-flex items-center " + className}>
      <Globe className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
      <select
        aria-label="Select language"
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="tap-target appearance-none rounded-xl border border-border bg-background py-2 pl-9 pr-8 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
