import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionSafe, readStoredSession } from "@/lib/auth-session";

export type SessionState = "unknown" | "signed-in" | "signed-out";

/**
 * Lightweight, client-only session flag for PUBLIC pages so they can swap a
 * "Sign in" CTA for an "Open app" link. Returns "unknown" until hydrated so
 * we never flash the wrong label.
 */
export function useSessionState(): SessionState {
  const [state, setState] = useState<SessionState>("unknown");

  useEffect(() => {
    let active = true;

    // Silent restore: reflect the persisted session immediately so the header
    // never shows "Sign in" to an already signed-in visitor while the SDK
    // resolves. The awaited call below corrects it if the session is gone.
    if (readStoredSession()) setState("signed-in");

    getSessionSafe().then((session) => {
      if (!active) return;
      setState(session ? "signed-in" : "signed-out");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
