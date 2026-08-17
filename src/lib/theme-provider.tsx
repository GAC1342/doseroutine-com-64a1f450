import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** useLayoutEffect on the client, useEffect on the server (avoids SSR warning). */
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

import { supabase } from "@/integrations/supabase/client";
import {
  applyTheme,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_COLOR_THEME,
  isColorScheme,
  isColorTheme,
  persistThemeLocally,
  readBootedTheme,
  resolveScheme,
  SCHEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type ColorScheme,
  type ColorTheme,
} from "./theme";

type ThemeContextValue = {
  theme: ColorTheme;
  scheme: ColorScheme;
  resolvedScheme: "light" | "dark";
  setTheme: (theme: ColorTheme) => void;
  setScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored<T>(key: string, guard: (v: unknown) => v is T, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return guard(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start from defaults so SSR and the first client render agree; the boot
  // script has already painted the real theme, and the effect below adopts it
  // without ever repainting through the default palette.
  const [theme, setThemeState] = useState<ColorTheme>(DEFAULT_COLOR_THEME);
  const [scheme, setSchemeState] = useState<ColorScheme>(DEFAULT_COLOR_SCHEME);
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Adopt whatever the pre-hydration boot script already painted. Runs before
  // the browser paints the hydrated tree, so the accent never flickers back to
  // the default. Falls back to storage if the boot script was blocked.
  useIsomorphicLayoutEffect(() => {
    const booted = readBootedTheme();
    const t = booted?.theme ?? readStored(THEME_STORAGE_KEY, isColorTheme, DEFAULT_COLOR_THEME);
    const s = booted?.scheme ?? readStored(SCHEME_STORAGE_KEY, isColorScheme, DEFAULT_COLOR_SCHEME);
    setThemeState(t);
    setSchemeState(s);
    setResolved(resolveScheme(s));
    applyTheme(t, s);
    // Mirror into cookie storage so the next cold load boots straight into it.
    persistThemeLocally(t, s);
  }, []);

  // React owns <html> and can drop the attributes the pre-hydration boot
  // script wrote (observed intermittently during hydration), which silently
  // reverts the accent to the default. Watch <html> and re-assert our state
  // whenever it drifts, so a saved theme survives every refresh.
  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
    const root = document.documentElement;
    const reassert = () => {
      const wantDark = resolveScheme(scheme) === "dark";
      if (root.getAttribute("data-theme") !== theme || root.classList.contains("dark") !== wantDark) {
        applyTheme(theme, scheme);
      }
    };
    reassert();
    const mo = new MutationObserver(reassert);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => mo.disconnect();
  }, [theme, scheme]);


  // Reconcile with the signed-in profile (cross-device sync). Local choice
  // wins on first paint; the profile is the durable source of truth.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("theme, color_scheme")
          .eq("id", userRes.user.id)
          .maybeSingle();
        if (cancelled || !data) return;
        const row = data as { theme?: string | null; color_scheme?: string | null };
        const hadLocal =
          typeof window !== "undefined" && !!window.localStorage.getItem(THEME_STORAGE_KEY);
        if (hadLocal) return;
        const t = isColorTheme(row.theme) ? row.theme : DEFAULT_COLOR_THEME;
        const s = isColorScheme(row.color_scheme) ? row.color_scheme : DEFAULT_COLOR_SCHEME;
        setThemeState(t);
        setSchemeState(s);
        setResolved(resolveScheme(s));
        applyTheme(t, s);
        // Cache the profile choice so the *next* load paints it pre-hydration
        // instead of flashing the default accent first.
        persistThemeLocally(t, s);
      } catch {
        /* theme sync is best-effort — never block the app */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Follow the OS when the user picked "system".
  useEffect(() => {
    if (scheme !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolved(mq.matches ? "dark" : "light");
      applyTheme(theme, "system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [scheme, theme]);

  const persist = useCallback(async (patch: { theme?: ColorTheme; color_scheme?: ColorScheme }) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      await supabase.from("profiles").update(patch).eq("id", userRes.user.id);
    } catch {
      /* best-effort */
    }
  }, []);

  const setTheme = useCallback(
    (next: ColorTheme) => {
      setThemeState(next);
      applyTheme(next, scheme);
      persistThemeLocally(next, scheme);
      void persist({ theme: next });
    },
    [scheme, persist],
  );

  const setScheme = useCallback(
    (next: ColorScheme) => {
      setSchemeState(next);
      setResolved(resolveScheme(next));
      applyTheme(theme, next);
      persistThemeLocally(theme, next);
      void persist({ color_scheme: next });
    },
    [theme, persist],
  );

  const value = useMemo(
    () => ({ theme, scheme, resolvedScheme: resolved, setTheme, setScheme }),
    [theme, scheme, resolved, setTheme, setScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Non-fatal: components outside the provider (tests, isolated stories)
    // get an inert no-op rather than a crash.
    return {
      theme: DEFAULT_COLOR_THEME,
      scheme: DEFAULT_COLOR_SCHEME,
      resolvedScheme: "light",
      setTheme: () => {},
      setScheme: () => {},
    };
  }
  return ctx;
}
