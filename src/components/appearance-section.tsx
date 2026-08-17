import { Link } from "@tanstack/react-router";
import { Check, Lock, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { COLOR_THEMES, type ColorScheme } from "@/lib/theme";
import { useIsPaid } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

const SCHEMES: Array<{ id: ColorScheme; label: string; icon: typeof Sun }> = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function AppearanceSection() {
  const { theme, scheme, setTheme, setScheme } = useTheme();
  const isPaid = useIsPaid();

  return (
    <section aria-labelledby="appearance-heading" className="rounded-2xl bg-card p-4">
      <h2 id="appearance-heading" className="font-display text-sm font-semibold text-foreground">
        Appearance
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Safety and warning colors never change — only the accent does.
      </p>

      <div
        role="radiogroup"
        aria-label="Color scheme"
        className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
      >
        {SCHEMES.map((s) => {
          const active = scheme === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setScheme(s.id)}
              className={cn(
                "tap-target flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <s.icon className="h-4 w-4" aria-hidden="true" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label="Accent color" className="mt-4 flex flex-wrap gap-3">
        {COLOR_THEMES.map((t) => {
          const locked = t.pro && !isPaid;
          const active = theme === t.id;
          const common =
            "relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform hover:scale-105";
          const style = { backgroundColor: t.swatch } as const;
          const borderClass = active ? "border-foreground" : "border-transparent";

          if (locked) {
            return (
              <Link
                key={t.id}
                to="/upgrade"
                search={{}}
                aria-label={`${t.label} — Pro only, upgrade to unlock`}
                title={`${t.label} — Pro`}
                className={cn(common, borderClass, "opacity-60")}
                style={style}
              >
                <Lock className="h-4 w-4 text-white drop-shadow" aria-hidden="true" />
              </Link>
            );
          }

          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t.label}
              title={t.label}
              onClick={() => setTheme(t.id)}
              className={cn(common, borderClass)}
              style={style}
            >
              {active ? (
                <Check className="h-5 w-5 text-white drop-shadow" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      {!isPaid ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Teal and Blue are free.{" "}
          <Link to="/upgrade" search={{}} className="font-medium text-primary underline">
            Upgrade to Pro
          </Link>{" "}
          for the full palette.
        </p>
      ) : null}
    </section>
  );
}
