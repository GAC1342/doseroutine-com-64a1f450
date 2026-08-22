import { useState } from "react";
import { Link } from "@tanstack/react-router";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LegalDoc = "terms" | "privacy";

const COPY: Record<
  LegalDoc,
  { label: string; title: string; summary: string; body: string[]; to: string; hash?: string }
> = {
  terms: {
    label: "Terms of Use (EULA)",
    title: "Terms of Use (EULA)",
    summary: "The agreement that governs your DoseRoutine subscription.",
    to: "/legal",
    hash: "terms",
    body: [
      "DoseRoutine Pro is sold as an auto-renewing subscription. Payment is charged to your Apple ID or Google account at purchase confirmation.",
      "Your subscription renews for the same period and price unless you cancel at least 24 hours before the current period ends. Manage or cancel any time in your device Settings.",
      "Any unused portion of a free trial is forfeited when you buy a subscription.",
      "DoseRoutine is a tracking and education tool. It is not a medical device and does not provide medical advice, diagnosis, or treatment. Always follow the guidance of a qualified clinician.",
      "You are responsible for the accuracy of the data you enter and for keeping your account credentials secure. We may suspend accounts used for unlawful activity or abuse of the service.",
      'The app is provided "as is" without warranties. To the extent permitted by law, our liability is limited to the amount you paid in the previous 12 months.',
    ],
  },
  privacy: {
    label: "Privacy Policy",
    title: "Privacy Policy",
    summary: "What DoseRoutine collects and how it is used.",
    to: "/privacy",
    body: [
      "We collect the account details you provide (email) and the health data you choose to log: compounds, doses, workouts, meals, and body metrics.",
      "Your health data is stored in your own account and is never sold. It is used only to run the features you use in the app.",
      "Purchases are processed by Apple or Google; we receive only subscription status, never your payment card details.",
      "We use privacy-respecting analytics and crash reporting to keep the app stable. These never include your health log contents.",
      "You can export or permanently delete your account and all associated data from Settings at any time.",
    ],
  },
};

export function PaywallLegalDialog({ doc }: { doc: LegalDoc }) {
  const [open, setOpen] = useState(false);
  const copy = COPY[doc];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="underline underline-offset-2">{copy.label}</DialogTrigger>
      {/* Rendered in a dialog on top of the paywall so the purchase sheet is
          never unmounted — a route navigation would tear down the in-flight
          RevenueCat flow. */}
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.summary}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {copy.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>
            <Link
              to={copy.to}
              hash={copy.hash}
              onClick={() => setOpen(false)}
              className="underline underline-offset-2"
            >
              Read the full {copy.title}
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
