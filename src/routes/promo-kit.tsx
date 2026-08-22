import { createFileRoute } from "@tanstack/react-router";
import { canonicalLinks } from "@/lib/hreflang";
import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { PublicBackHeader } from "@/components/public-back-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import square from "@/assets/promo/testers-square.jpg";
import landscape from "@/assets/promo/testers-landscape.jpg";
import portrait from "@/assets/promo/testers-portrait.jpg";
// WebP previews. The download links still point at the original JPGs so the
// files people upload to Facebook/X/LinkedIn stay maximally compatible.
import squareW540 from "@/assets/promo/testers-square-540.webp";
import squareW1088 from "@/assets/promo/testers-square-1088.webp";
import landscapeW540 from "@/assets/promo/testers-landscape-540.webp";
import landscapeW1200 from "@/assets/promo/testers-landscape-1200.webp";
import portraitW540 from "@/assets/promo/testers-portrait-540.webp";
import portraitW1088 from "@/assets/promo/testers-portrait-1088.webp";
import { ResponsiveImage } from "@/components/responsive-image";

const pageUrl = "https://doseroutine.com/promo-kit";
const pageTitle = "DoseRoutine Tester Recruitment Kit — Ads & Captions";
const pageDescription =
  "Copy-paste captions and downloadable branded images for recruiting Android testers for DoseRoutine, with 3 months of Pro free.";

export const Route = createFileRoute("/promo-kit")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: pageUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
    ],
    links: [...canonicalLinks(pageUrl)],
  }),
  component: PromoKitPage,
});

const SIGNUP = "https://doseroutine.com/closed-testing";

const CAPTIONS: { platform: string; note: string; text: string }[] = [
  {
    platform: "Facebook",
    note: "Best for groups (biohacking, TRT, GLP-1, fitness). Post the square image.",
    text: `📱 ANDROID TESTERS WANTED — 3 MONTHS OF PRO FREE

I'm launching DoseRoutine, a tracker for people who take more than a multivitamin — supplements, peptides, TRT/HRT, GLP-1s, NAD+, nootropics — all in one private place.

Before it goes live on Google Play I need Android testers (phones AND tablets both work).

What you get:
✅ 3 months of DoseRoutine Pro, free
✅ Early access before anyone else
✅ Direct say in what gets built next

What I need:
• An Android phone or tablet
• Install it and open it here and there over the test period
• Tell me anything that feels broken or confusing

Takes about 10 minutes to join. Sign up here 👇
${SIGNUP}

#Android #BetaTesting #Supplements #Peptides #TRT #GLP1 #Biohacking`,
  },
  {
    platform: "X / Twitter",
    note: "Short version. Attach the landscape image.",
    text: `Android testers wanted 📱

I'm launching DoseRoutine — a tracker for supplements, peptides, TRT/HRT and GLP-1s. Now in Android testing on Google Play.

Test it before launch and get 3 months of Pro free.
Phones + tablets. ~10 min to join.

${SIGNUP}`,
  },
  {
    platform: "LinkedIn",
    note: "Professional framing. Attach the landscape image.",
    text: `We're opening closed testing for DoseRoutine on Android — and I'm looking for testers.

DoseRoutine is a health-tracking app for people managing more than a multivitamin: supplements, peptides, TRT/HRT, GLP-1s and more, with reminders, adherence tracking, combination notes and clinician-ready summaries.

Before we publish to Google Play, we need real testers on real devices.

Testers receive 3 months of DoseRoutine Pro at no cost, early access ahead of public launch, and direct influence on the roadmap.

Requirements: an Android phone or tablet, and honest feedback over the test period. Sign-up takes about 10 minutes.

Join here: ${SIGNUP}

#Android #BetaTesting #HealthTech #DigitalHealth #ProductLaunch`,
  },
  {
    platform: "Reddit / forums",
    note: "No emoji, no hype — communities react badly to ad-speak.",
    text: `[Android] Looking for testers for my supplement/peptide tracking app — 3 months Pro free

I built DoseRoutine because I was tracking my stack in notes and screenshots. It handles supplements, peptides, TRT/HRT, GLP-1s and more: multi-time reminders, cycles and tapers, reconstitution calculator, adherence history, combination notes with sources.

Google Play requires a group of testers before an app can go public, so I'm recruiting. Android phones and tablets both work.

Testers get 3 months of Pro free and early access. All I ask is that you actually open it now and then and tell me what's broken.

Sign-up: ${SIGNUP}

Happy to answer anything in the comments.`,
  },
  {
    platform: "SMS / DM to friends",
    note: "One-liner for personal asks — highest conversion of all.",
    text: `Hey — I'm launching my app DoseRoutine on Android and need a handful of testers before Google will publish it. Takes ~10 min and you get 3 months of Pro free. Got an Android phone or tablet? ${SIGNUP}`,
  },
];

const IMAGES: {
  src: string;
  webpSrcSet: string;
  label: string;
  note: string;
  file: string;
  alt: string;
  w: number;
  h: number;
}[] = [
  {
    src: square,
    webpSrcSet: `${squareW540} 540w, ${squareW1088} 1088w`,
    alt: "Square DoseRoutine ad: the app logo above the headline \u201cAndroid testers wanted\u201d and the offer of 3 months of Pro free for testing DoseRoutine before it launches on Google Play",
    label: "Square 1080×1080",
    note: "Facebook, Instagram, LinkedIn feed",
    file: "doseroutine-testers-square.jpg",
    w: 1088,
    h: 1088,
  },
  {
    src: landscape,
    webpSrcSet: `${landscapeW540} 540w, ${landscapeW1200} 1200w`,
    alt: "Wide DoseRoutine link-card ad: \u201cAndroid testers wanted \u2014 3 months of Pro free\u201d beside a phone showing the daily dose checklist",
    label: "Landscape 1200×630",
    note: "X / Twitter, LinkedIn link cards, Facebook link posts",
    file: "doseroutine-testers-landscape.jpg",
    w: 1200,
    h: 640,
  },
  {
    src: portrait,
    webpSrcSet: `${portraitW540} 540w, ${portraitW1088} 1088w`,
    alt: "Tall DoseRoutine story ad: \u201cAndroid testers wanted\u201d headline, the 3-months-Pro-free offer and the doseroutine.com/closed-testing sign-up link",
    label: "Portrait 1080×1350",
    note: "Stories, Reels covers, Pinterest",
    file: "doseroutine-testers-portrait.jpg",
    w: 1088,
    h: 1360,
  },
];

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" aria-hidden="true" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden="true" /> Copy text
        </>
      )}
    </Button>
  );
}

function captionsTextFile() {
  const lines = [
    "DoseRoutine — Android tester recruitment captions",
    `Sign-up link: ${SIGNUP}`,
    "",
  ];
  for (const c of CAPTIONS) {
    lines.push(
      "==============================",
      c.platform,
      `(${c.note})`,
      "==============================",
      "",
      c.text,
      "",
      "",
    );
  }
  return lines.join("\n");
}

function DownloadAllButton() {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  async function handleDownload() {
    setState("working");
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      zip.file("captions.txt", captionsTextFile());
      await Promise.all(
        IMAGES.map(async (img) => {
          const res = await fetch(img.src);
          zip.file(img.file, await res.blob());
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "doseroutine-tester-ad-kit.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <div>
      <Button type="button" onClick={handleDownload} disabled={state === "working"}>
        <Download className="h-4 w-4" aria-hidden="true" />
        {state === "working" ? "Preparing ZIP…" : "Download all assets (ZIP)"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {state === "error"
          ? "Couldn't build the ZIP — download the images individually below."
          : state === "done"
            ? "Downloaded — 3 images + captions.txt."
            : "One file with all 3 images plus captions.txt for every platform."}
      </p>
    </div>
  );
}

function PromoKitPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-16">
      <PublicBackHeader />

      <header className="mt-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Android tester ads — copy, paste, post
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Branded images plus ready-made captions offering <strong>3 months of Pro free</strong> to
          Android testers. Every caption links to{" "}
          <a href={SIGNUP} className="font-medium text-primary underline underline-offset-2">
            doseroutine.com/closed-testing
          </a>
          .
        </p>
      </header>

      <div className="mt-6">
        <DownloadAllButton />
      </div>

      <section aria-labelledby="images" className="mt-8">
        <h2 id="images" className="font-display text-lg font-semibold text-foreground">
          1. Download an image
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap Download, then attach it to your post. On phones, long-press the image to save it.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {IMAGES.map((img) => (
            <Card key={img.file} className="p-4">
              <ResponsiveImage
                src={img.src}
                webpSrcSet={img.webpSrcSet}
                // Two-up grid on desktop inside a max-w-3xl page.
                sizes="(min-width: 640px) 340px, 100vw"
                alt={img.alt}
                width={img.w}
                height={img.h}
                loading="lazy"
                className="rounded-lg border border-border"
              />
              <div className="mt-3">
                <p className="text-sm font-semibold text-foreground">{img.label}</p>
                <p className="text-xs text-muted-foreground">{img.note}</p>
              </div>
              <a
                href={img.src}
                download={img.file}
                className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--primary-hover)]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </a>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="captions" className="mt-10">
        <h2 id="captions" className="font-display text-lg font-semibold text-foreground">
          2. Copy a caption
        </h2>
        <div className="mt-4 space-y-4">
          {CAPTIONS.map((c) => (
            <Card key={c.platform} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{c.platform}</h3>
                  <p className="text-xs text-muted-foreground">{c.note}</p>
                </div>
                <CopyBlock text={c.text} />
              </div>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
                {c.text}
              </pre>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="tips" className="mt-10">
        <h2 id="tips" className="font-display text-lg font-semibold text-foreground">
          3. Posting tips
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Facebook and LinkedIn suppress posts with links in the first line — put the link at the
            end, as the captions do.
          </li>
          <li>
            On X, the landscape image becomes a clickable card when the link is in the post text.
          </li>
          <li>
            Post in places where the audience already is: TRT, GLP-1, peptide, biohacking and
            fitness groups; read each group's self-promo rules first.
          </li>
          <li>Personal DMs to friends and family convert far better than any public post.</li>
        </ul>
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        © {new Date().getFullYear()} DoseRoutine · doseroutine.com
      </p>
    </main>
  );
}
