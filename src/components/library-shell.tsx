import { assetUrl } from "@/lib/asset-url";
import { BrandLogo } from "@/components/brand-logo";
import { Link, useRouter, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { IndexStatusBadge } from "@/components/index-status-badge";
import { useSessionState } from "@/hooks/use-session";
import { BLOG_POSTS_NEWEST_FIRST } from "@/lib/blog-posts";


export function LibraryShell({ children }: { children: ReactNode }) {
  const session = useSessionState();
  const router = useRouter();
  const navigate = useNavigate();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: "/today" });
    }
  };
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="tap-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-card"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <BrandLogo
                size={32}
                alt="DoseRoutine supplement library logo"
                className="h-8 w-8 rounded-lg"
                priority
              />
              <span className="truncate font-display text-lg font-semibold tracking-tight">
                DoseRoutine
              </span>
            </Link>
          </div>
          <nav className="flex min-w-0 shrink items-center gap-1 text-sm">
            <span className="hidden min-w-0 max-w-[40vw] overflow-hidden sm:inline-flex">
              <IndexStatusBadge />
            </span>
            <LanguageSwitcher variant="minimal" className="sm:hidden" />
            <span className="hidden sm:inline-flex">
              <LanguageSwitcher />
            </span>
            <Link
              to="/library"
              className="hidden rounded-lg px-3 py-2 font-medium text-foreground hover:bg-card sm:inline-block"
            >
              Library
            </Link>
            {session === "signed-in" ? (
              <Link
                to="/today"
                className="inline-flex h-9 min-w-[86px] shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-3 font-semibold text-primary-foreground hover:bg-[color:var(--primary-hover)]"
              >
                Open app
              </Link>
            ) : session === "signed-out" ? (
              <Link
                to="/auth"
                className="inline-flex h-9 min-w-[86px] shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-3 font-semibold text-primary-foreground hover:bg-[color:var(--primary-hover)]"
              >
                Sign in
              </Link>
            ) : (
              <span aria-hidden="true" className="h-9 w-[86px] shrink-0 rounded-lg bg-card" />
            )}

          </nav>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-5xl px-4 py-8 focus:outline-none"
      >
        {children}
      </main>
      {/* Research links: gives every library / interaction page a crawlable
          path into the blog so posts are not orphaned from the main corpus. */}
      <section
        aria-labelledby="library-research-heading"
        className="mx-auto mt-12 max-w-5xl px-4"
      >
        <h2 id="library-research-heading" className="text-sm font-semibold text-foreground">
          Latest research from DoseRoutine
        </h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {BLOG_POSTS_NEWEST_FIRST.slice(0, 6).map((post) => (
            <li key={post.slug} className="leading-snug">
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                aria-label={`${post.heading} — DoseRoutine research update`}
                className="text-muted-foreground underline underline-offset-2 hover:text-primary"
              >
                {post.heading}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/blog"
          aria-label="Browse all DoseRoutine research updates"
          className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2"
        >
          Browse all DoseRoutine research updates
        </Link>
      </section>
      <footer className="mt-10 border-t border-border py-8 text-center text-xs leading-relaxed text-muted-foreground">
        <p className="mx-auto max-w-2xl px-4">

          <span className="font-semibold text-foreground">
            © {new Date().getFullYear()} DoseRoutine
          </span>{" "}
          — content originally published at{" "}
          <a
            href="https://doseroutine.com"
            className="font-semibold text-foreground underline underline-offset-2"
          >
            doseroutine.com
          </a>
          . All content is the intellectual property of DoseRoutine and provided for educational
          purposes only. Reproduction without attribution is prohibited.
        </p>
        <p className="mx-auto mt-3 max-w-2xl px-4">
          <strong className="text-foreground">Not medical advice.</strong> Nothing on this page is
          intended to diagnose, treat, cure, or prevent any disease. DoseRoutine and its authors
          accept no liability for how this information is used. Always consult a licensed clinician
          before starting, stopping, or combining any compound.{" "}
          <a href="/legal" className="underline underline-offset-2 hover:text-foreground">
            Terms, privacy & full disclaimer
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
