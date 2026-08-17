import { useRouter, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { AvatarMenu } from "@/components/avatar-menu";

type PageHeaderProps = {
  title: string;
  /** Where to go if there's no in-app history to pop (e.g. deep link). */
  fallbackTo?: string;
  /** Optional right-side actions (buttons, etc.). */
  actions?: ReactNode;
  /**
   * Hide the built-in back button. Use on pages inside <AppShell>, which
   * already renders a global back button via <Breadcrumbs />.
   */
  hideBack?: boolean;
};

export function PageHeader({
  title,
  fallbackTo = "/today",
  actions,
  hideBack = false,
}: PageHeaderProps) {
  const router = useRouter();
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: fallbackTo });
    }
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-2 py-2">
        {hideBack ? (
          <div className="w-2" aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="tap-target inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-card"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-tight">
          {title}
        </h1>
        <div className="flex items-center gap-1">
          {actions}
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}
