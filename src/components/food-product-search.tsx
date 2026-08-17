import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchFoodLabels } from "@/lib/meal-scan.functions";
import type { FoodLabelMatch as FoodProductMatch } from "@/lib/meal-nutrition";

/**
 * Pick the right manufacturer panel by name when a barcode didn't resolve —
 * a published label beats a photo estimate, so this runs before OCR fallback.
 */
export function FoodProductSearch({
  open,
  onOpenChange,
  initialQuery,
  onPick,
  onSkip,
  skipLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onPick: (match: FoodProductMatch) => void;
  /** Fallback action, e.g. "Use the photo estimate instead". */
  onSkip?: () => void;
  skipLabel?: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [results, setResults] = useState<FoodProductMatch[] | null>(null);
  const search = useServerFn(searchFoodLabels);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery ?? "");
    setResults(null);
  }, [open, initialQuery]);

  const searchMutation = useMutation({
    mutationFn: async (terms: string) => search({ data: { query: terms } }),
    onSuccess: (matches) => setResults(matches as FoodProductMatch[]),
    onError: () => setResults([]),
  });

  function run() {
    const terms = query.trim();
    if (terms.length < 2) return;
    searchMutation.mutate(terms);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85svh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-4"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Find the right label</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs text-muted-foreground">
          We couldn't match that barcode to a published nutrition panel. Search the product by
          name and brand to use its real numbers.
        </p>

        <div className="mt-3 flex gap-2">
          <Input
            autoFocus
            aria-label="Product name"
            placeholder="e.g. Chobani vanilla yogurt"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                run();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            aria-label="Search products"
            disabled={searchMutation.isPending || query.trim().length < 2}
            onClick={run}
          >
            {searchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {results?.length === 0 && !searchMutation.isPending && (
            <p className="text-sm text-muted-foreground">
              No published panel matched that search. Try the brand name, or fall back to the
              photo estimate below.
            </p>
          )}
          {(results ?? []).map((match) => (
            <button
              key={`${match.barcode}-${match.name}`}
              type="button"
              onClick={() => onPick(match)}
              className="tap-target w-full rounded-xl border border-border p-3 text-left transition hover:bg-muted"
            >
              <div className="text-sm font-medium">
                {match.brand ? `${match.brand} — ` : ""}
                {match.name}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {match.perServing?.calories ?? 0} kcal · {match.perServing?.protein_g ?? 0}g protein
                · {match.perServing?.carbs_g ?? 0}g carbs · {match.perServing?.fat_g ?? 0}g fat
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {match.basis === "100g" ? "Per 100 g" : `Per serving${match.servingSize ? ` (${match.servingSize})` : ""}`}
                {match.barcode ? ` · ${match.barcode}` : ""}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {onSkip && (
            <Button type="button" className="flex-1" onClick={onSkip}>
              {skipLabel ?? "Use photo estimate"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
