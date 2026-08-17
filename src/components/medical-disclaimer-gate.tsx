import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ACK_SUBJECT = "medical-disclaimer:v1-2026-07";

/**
 * One-time medical disclaimer acknowledgement gate.
 *
 * Apple 1.4.1 and Google Health policies require an explicit user
 * acknowledgement that the app is not medical advice. Stored in the
 * `acknowledgments` table under a versioned `subject` string.
 */
export function MedicalDisclaimerGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "needs-ack" | "ok">("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Fail-open: if the network stalls or errors, never leave the app blank.
    const timer = setTimeout(() => {
      if (!cancelled) setState((s) => (s === "loading" ? "ok" : s));
    }, 5000);

    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) {
          if (!cancelled) setState("ok");
          return;
        }
        const { data, error } = await supabase
          .from("acknowledgments")
          .select("id")
          .eq("user_id", uid)
          .eq("subject", ACK_SUBJECT)
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setState("ok");
          return;
        }
        setState(data ? "ok" : "needs-ack");
      } catch {
        if (!cancelled) setState("ok");
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  async function accept() {
    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (uid) {
        await supabase.from("acknowledgments").insert({
          user_id: uid,
          subject: ACK_SUBJECT,
          warning_text: "Medical disclaimer accepted (v1 2026-07).",
        });
      }
    } catch {
      // Never trap the user behind the modal if the write fails.
    } finally {
      setState("ok");
      setSubmitting(false);
    }
  }

  // The app always renders underneath — the disclaimer is an overlay, never a
  // replacement. A stalled or failed check must never produce a blank screen.
  if (state !== "needs-ack") return <>{children}</>;

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <AlertTriangle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Before you continue</h2>
              <p className="mt-1 text-sm text-muted-foreground">Please read this carefully.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-foreground">
            <p>
              <strong>DoseRoutine is an information and tracking tool.</strong> It is not a medical
              device and does not provide medical advice, diagnosis, or treatment.
            </p>
            <p>
              The information here — including compound data, interactions, and AI-generated plans —
              is for educational purposes and is not a substitute for professional medical guidance.
            </p>
            <p>
              <strong>Always consult a qualified healthcare provider</strong> before starting,
              changing, or stopping any supplement, peptide, hormone, or medication. If you
              experience adverse effects, contact a medical professional or emergency services
              immediately.
            </p>
            <p>
              By continuing, you confirm you understand and accept full responsibility for how you
              use this app.
            </p>
          </div>

          <button
            onClick={accept}
            disabled={submitting}
            className="tap-target mt-6 w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "Saving…" : "I understand and accept"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You can review this any time in Legal & disclaimers.
          </p>
        </div>
      </div>
    </>
  );
}
